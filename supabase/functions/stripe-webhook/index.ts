import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stripe requires this endpoint to verify webhook authenticity via a
// signed header rather than a Supabase auth JWT, so this function is
// deployed with verify_jwt=false and implements its own auth: HMAC
// signature verification against STRIPE_WEBHOOK_SECRET.
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("ROTABO_FROM_EMAIL") || "Rotabo <no-reply@rotabo.app>";
// Replies to any of these go to a mailbox a human reads, not to no-reply@.
const REPLY_TO_EMAIL = Deno.env.get("ROTABO_REPLY_TO_EMAIL") || "support@rotabo.app";
// Where to send payments that need a human: sponsorships, and anything
// that cannot be mapped to an access tier.
const ADMIN_EMAIL = Deno.env.get("ROTABO_ADMIN_EMAIL");

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TOLERANCE_SECONDS = 5 * 60;

// Viewer-access checkouts reuse the SAME two Payment Links as listing
// checkouts; they are told apart by the client_reference_id. A listing
// checkout passes the listing's UUID; a viewer checkout passes
// "viewer-<token>" where <token> is a verified_emails token (64 hex
// chars, no dashes) so the two shapes can never be confused. Stripe
// forbids ':' in client_reference_id, hence the '-' separator.
const VIEWER_PREFIX = "viewer-";
// A sponsorship checkout opened from the supporters form passes
// "sponsor-<uuid>" pointing at the pending sponsors row it should make
// visible. A sponsor link paid with no such reference (someone given
// the raw Stripe URL) still lands in the manual path below.
const SPONSOR_PREFIX = "sponsor-";

// listings.id is a uuid column, so anything else handed to PostgREST as
// an id is a 22P02 cast error rather than a miss -- and writing one into
// payments.listing_id used to throw away the whole payments row, leaving
// a charged customer with no trace anywhere in the dashboard.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------
// Payment Link identity
// ---------------------------------------------------------------------
//
// Adaptive Pricing is ALWAYS on for Payment Links and cannot be turned
// off, so a buyer outside Switzerland is charged in their own currency
// and amount_total arrives in that currency's minor units. Reading the
// tier off the amount alone was therefore wrong: ~190 JPY for the
// 1-month tier lands in the 12-month range and hands out a year for the
// price of a month, while ~440 HUF matches nothing at all.
//
// The Payment Link id is the only currency-proof discriminator.
//
// ACCESS_TIERS decides how many months of visibility/access a checkout
// buys. The CHF-only amount fallback below is a last resort for a
// payload that arrives without a payment_link: correct for Swiss buyers,
// and deliberately refusing to guess for everyone else.
const ACCESS_TIERS: Record<string, number> = {
  "plink_1U2yHl2eIfG2oegbnHkxmQYi": 1,   // Rotabo — 1 month visibility   (1.00 CHF)
  "plink_1U2yNI2eIfG2oegbKtbg21Cs": 12,  // Rotabo — 12 months visibility (2.00 CHF)
};

// Named products that are NOT access tiers. A sponsorship carrying a
// "sponsor-<uuid>" reference is fulfilled automatically below; one
// without it, and anything unlisted, is fulfilled by hand.
const MANUAL_PRODUCTS: Record<string, string> = {
  "plink_1U2Mxv2eIfG2oegbxokbntdI": "Sponsorship Bronze", //    100.00 CHF
  "plink_1U2NRb2eIfG2oegb127hBP7y": "Sponsorship Silver", //    300.00 CHF
  "plink_1U2Myx2eIfG2oegbxzbWvKy1": "Sponsorship Gold",   //    750.00 CHF
  "plink_1U2QPw2eIfG2oegbQDQ9BY9R": "Sponsorship Platinium", // 10 000.00 CHF
};

// Links that belong to a different site on the same Stripe account.
//
// Stripe delivers every event on an account to every endpoint on that
// account, and topten.one sells through the same one. From the day that
// site opened, its checkouts arrived here as well -- 147 of them by the
// time anybody noticed. Each was correctly signed, so each verified;
// none could be matched to a Rotabo tier, so each wrote a "manual" row
// into payments, told the admin a checkout had gone unmatched, and told
// the buyer that "your Rotabo purchase" would be set up by hand and
// somebody would be in touch. Two of the four addresses that received
// that had never heard of Rotabo: they had bought a rank on topten.one.
//
// A link belonging to another site is not an unmatched payment. It is
// not this site's payment at all -- it has already been fulfilled by
// that site's own webhook -- so it is acknowledged and dropped before
// anything is written or sent. Only known foreign links are dropped:
// anything unrecognised still falls through to the manual path, so a new
// Rotabo link nobody remembered to add above is escalated rather than
// silently swallowed.
const ALTE_SITURI: Record<string, string> = {
  "plink_1U8F7c2eIfG2oegb4npVFInN": "topten.one",
};

// The same four links, as the tier slug sponsors_tier_check accepts.
// What was PAID wins over what the form had chosen: if someone picks
// silver in the form and then pays the gold link, the list shows gold.
const SPONSOR_TIERS: Record<string, string> = {
  "plink_1U2Mxv2eIfG2oegbxokbntdI": "bronze",
  "plink_1U2NRb2eIfG2oegb127hBP7y": "silver",
  "plink_1U2Myx2eIfG2oegbxzbWvKy1": "gold",
  "plink_1U2QPw2eIfG2oegbQDQ9BY9R": "platinum",
};

// Stripe reports these currencies without a minor unit, so their
// amount_total must not be divided by 100 when shown to a human.
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  // Stripe sends every currently valid v1 signature, so during a secret
  // rotation the header carries more than one. Keeping only the last would
  // reject perfectly good deliveries for the length of the rotation.
  const v1s: string[] = [];
  let timestamp = "";
  for (const piece of signatureHeader.split(",")) {
    const idx = piece.indexOf("=");
    if (idx === -1) continue;
    const k = piece.slice(0, idx).trim();
    const v = piece.slice(idx + 1).trim();
    if (k === "t") timestamp = v;
    else if (k === "v1") v1s.push(v);
  }
  if (!timestamp || v1s.length === 0) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return v1s.some((v1) => timingSafeEqual(expectedHex, v1));
}

// Visibility/access tiers: 1 CHF buys 1 month, 2 CHF buys 12 months.
function tierMonthsFor(
  amountTotal: number | null | undefined,
  currency: string | null | undefined,
  paymentLink: string | null | undefined,
): number | null {
  if (paymentLink && ACCESS_TIERS[paymentLink] != null) return ACCESS_TIERS[paymentLink];
  if (paymentLink && MANUAL_PRODUCTS[paymentLink] != null) return null;
  if (amountTotal == null) return null;
  if ((currency || "").toLowerCase() !== "chf") return null;
  if (amountTotal >= 50 && amountTotal <= 150) return 1;
  if (amountTotal >= 151 && amountTotal <= 300) return 12;
  return null;
}

function monthsToIso(months: number): string {
  const until = new Date();
  until.setUTCMonth(until.getUTCMonth() + months);
  return until.toISOString();
}

function fmtAmount(amountTotal: number | null, currency: string | null): string {
  if (amountTotal == null) return "unknown amount";
  const cur = (currency || "chf").toLowerCase();
  const value = ZERO_DECIMAL.has(cur) ? amountTotal : amountTotal / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur.toUpperCase() }).format(value);
  } catch {
    return value + " " + cur.toUpperCase();
  }
}

function escHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

// Every completed checkout, written down. This runs after the buyer has
// already been served, and a bookkeeping failure must never cost anyone
// their purchase -- so it only logs. stripe_event_id is unique, which
// makes a Stripe redelivery a no-op (23505) rather than a second row.
//
// Since 0008 this insert is also what raises the owner's alert: a trigger
// on the row posts to the notify function. One row per payment, so one
// email per payment.
async function recordPayment(row: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.from("payments").insert(row);
    if (error && error.code !== "23505") console.error("could not record payment", error);
  } catch (err) {
    console.error("could not record payment", err);
  }
}

async function sendEmail(email: string, subject: string, text: string, html: string): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, reply_to: REPLY_TO_EMAIL, to: [email], subject, text, html }),
    });
  } catch (err) {
    console.error("Failed to send email", err);
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

// Everything that is not an access tier: sponsorships, and any checkout
// whose tier could not be determined. Money changed hands, so neither
// side may be left in silence -- the buyer gets an acknowledgement, and
// the admin gets what is needed to fulfil or grant access by hand.
async function handleManualPayment(opts: {
  productName: string | null;
  sessionId: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentLink: string | null;
  refId: string | null;
  customerEmail: string | null;
  note?: string | null;
  // Whether the person who paid should hear from Rotabo at all. False
  // when we cannot tell whose sale this was -- see alNostru below.
  notifyBuyer?: boolean;
}): Promise<void> {
  const amount = fmtAmount(opts.amountTotal, opts.currency);
  const what = opts.productName || "your Rotabo purchase";

  if (opts.customerEmail && opts.notifyBuyer !== false) {
    await sendEmail(
      opts.customerEmail,
      "We received your payment",
      "Thank you — we received your payment of " + amount + " for " + what +
        ". This one is set up by hand rather than automatically, so we will be in touch shortly to get everything running. If you need anything in the meantime, just reply to this email.",
      "<p>Thank you — we received your payment of <strong>" + escHtml(amount) + "</strong> for <strong>" + escHtml(what) +
        "</strong>.</p><p>This one is set up by hand rather than automatically, so we will be in touch shortly to get everything running. If you need anything in the meantime, just reply to this email.</p>",
    );
  }

  if (!ADMIN_EMAIL) return;
  const details: Record<string, unknown> = {
    product: opts.productName || "UNKNOWN — could not be matched to a tier",
    amount: amount,
    raw_amount_total: opts.amountTotal,
    currency: opts.currency,
    payment_link: opts.paymentLink,
    client_reference_id: opts.refId,
    customer_email: opts.customerEmail || "(none provided)",
    session: opts.sessionId,
  };
  const lines = Object.entries(details)
    .map(([k, v]) => k + ": " + (v == null ? "-" : String(v)))
    .join("\n");
  const subject = opts.productName
    ? "Rotabo: " + opts.productName + " purchased — needs fulfilment"
    : "Rotabo: paid checkout could not be matched to a tier";
  const lead = opts.note
    ? opts.note
    : (opts.productName
      ? "A manually fulfilled product was purchased. No access was granted automatically."
      : "A checkout completed but its tier could not be determined, so no access was granted. Check the payment link mapping and grant it by hand.");
  await sendEmail(
    ADMIN_EMAIL,
    subject,
    lead + "\n\n" + lines,
    "<p>" + escHtml(lead) + "</p><pre>" + escHtml(lines) + "</pre>",
  );
}

// A sponsorship bought through the supporters form: the pending row was
// created by create-sponsor and the checkout carries its id. Make it
// visible -- that is the whole product: the name on the list.
async function handleSponsor(opts: {
  sponsorId: string;
  sessionId: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentLink: string | null;
  customerEmail: string | null;
}): Promise<string | null> {
  const { data: pending } = await supabase
    .from("sponsors")
    .select("id, display_name, tier, email, phone, country, city, website_url")
    .eq("id", opts.sponsorId)
    .is("stripe_session_id", null)
    .maybeSingle();

  if (!pending) {
    console.log("sponsor reference matched no pending row", opts.sponsorId);
    return null;
  }

  // The paid link decides the tier shown; the form's choice was only a
  // default for which link to open.
  const paidTier = opts.paymentLink ? (SPONSOR_TIERS[opts.paymentLink] ?? null) : null;
  const tier = paidTier ?? pending.tier;

  const { error } = await supabase
    .from("sponsors")
    .update({ stripe_session_id: opts.sessionId, visible: true, tier })
    .eq("id", opts.sponsorId)
    .is("stripe_session_id", null);
  if (error) throw error;

  const sponsorEmail = pending.email || opts.customerEmail;
  const amount = fmtAmount(opts.amountTotal, opts.currency);
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (sponsorEmail) {
    await sendEmail(
      sponsorEmail,
      "You are now a Rotabo supporter",
      "Thank you — we received your payment of " + amount + " for the " + tierName + " sponsorship. \"" + pending.display_name + "\" is now on the supporters list at https://rotabo.app/#sponsor. If anything should read differently, just reply to this email.",
      "<p>Thank you — we received your payment of <strong>" + escHtml(amount) + "</strong> for the <strong>" + escHtml(tierName) + "</strong> sponsorship.</p><p><strong>" + escHtml(pending.display_name) + "</strong> is now on the supporters list at <a href=\"https://rotabo.app/#sponsor\">rotabo.app</a>.</p><p>If anything should read differently, just reply to this email.</p>",
    );
  }

  if (ADMIN_EMAIL) {
    const lines = [
      "display_name: " + pending.display_name,
      "tier: " + tierName + (paidTier && paidTier !== pending.tier ? " (form had chosen " + pending.tier + ")" : ""),
      "amount: " + amount,
      "email: " + (pending.email || "-"),
      "phone: " + (pending.phone || "-"),
      "location: " + [pending.city, pending.country].filter(Boolean).join(", "),
      "website: " + (pending.website_url || "-"),
      "session: " + (opts.sessionId || "-"),
    ].join("\n");
    await sendEmail(
      ADMIN_EMAIL,
      "Rotabo: new " + tierName + " sponsor — " + pending.display_name,
      "A sponsorship was paid and the name is already visible on the supporters list.\n\n" + lines,
      "<p>A sponsorship was paid and the name is already visible on the supporters list.</p><pre>" + escHtml(lines) + "</pre>",
    );
  }

  return sponsorEmail;
}

// Returns the email the access was actually granted to, so the payment
// record names the buyer rather than whatever Stripe happened to collect.
async function handleViewerAccess(token: string, fallbackEmail: string | null, months: number, sessionId: string | null): Promise<string | null> {
  let email: string | null = null;
  if (token) {
    const { data: ve } = await supabase
      .from("verified_emails")
      .select("email")
      .eq("token", token)
      .maybeSingle();
    email = ve?.email ?? null;
  }
  if (!email) email = fallbackEmail;
  if (!email) {
    console.log("viewer checkout with no resolvable email", token);
    return null;
  }

  // p_session_id makes the grant idempotent. This was the one money path
  // with no such protection: the listing and sponsor handlers both
  // re-assert "stripe_session_id is null" on their UPDATE, while
  // grant_viewer_access simply added months, so a grant that committed
  // and then lost its response was applied twice on Stripe's retry.
  const { data: until, error } = await supabase.rpc("grant_viewer_access", {
    p_email: email,
    p_months: months,
    p_session_id: sessionId,
  });
  if (error) throw error;

  const period = months === 1 ? "1 month" : "12 months";
  const untilStr = until ? fmtDate(until as string) : "";
  await sendEmail(
    email,
    "Your Rotabo access is active",
    "Your payment was received. You now have full access to every active Rotabo listing for " + period + ", until " + untilStr + ". You can see phone numbers, addresses and descriptions, and contact anyone directly.",
    "<p>Your payment was received. You now have <strong>full access</strong> to every active Rotabo listing for <strong>" + period + "</strong>, until <strong>" + untilStr + "</strong>.</p><p>You can see phone numbers, addresses and descriptions, and contact anyone directly.</p>",
  );
  return email;
}

// Returns the listing's own email, plus whether this checkout actually
// fulfilled anything. "unmatched" means the money is real but nothing was
// granted for it, and the caller must escalate rather than swallow it.
async function handleListing(refId: string, sessionId: string | null, months: number, visibleUntil: string): Promise<{ email: string | null; unmatched: boolean }> {
  const { data: existing } = await supabase
    .from("listings")
    .select("id, email, category, stripe_session_id")
    .eq("id", refId)
    .maybeSingle();

  // No such row, or refId was not a uuid at all (PostgREST answers 22P02,
  // which lands here as no data).
  if (!existing) {
    console.log("client_reference_id matched no listing", refId);
    return { email: null, unmatched: true };
  }

  if (existing.stripe_session_id) {
    console.log("listing already fulfilled; second payment", refId, sessionId);
    return { email: existing.email ?? null, unmatched: true };
  }

  const { error } = await supabase
    .from("listings")
    .update({ stripe_session_id: sessionId, visible_until: visibleUntil })
    .eq("id", refId)
    .is("stripe_session_id", null);
  if (error) throw error;

  let rotaboNumber: number | null = null;
  if (existing.email) {
    const { data: num, error: numErr } = await supabase.rpc("assign_rotabo_number", {
      p_email: existing.email,
    });
    if (numErr) console.error("assign_rotabo_number failed", numErr);
    else rotaboNumber = (num as number) ?? null;
  }

  const period = months === 1 ? "1 month" : "12 months";
  const untilStr = fmtDate(visibleUntil);
  const numLine = rotaboNumber
    ? "Your Rotabo number is #" + rotaboNumber + " — it is yours forever."
    : "";
  const numHtml = rotaboNumber
    ? "<p>Your Rotabo number is <strong>#" + rotaboNumber + "</strong> — it is yours forever.</p>"
    : "";
  await sendEmail(
    existing.email,
    "Your Rotabo listing is now live",
    "Your payment was received and your " + existing.category + " listing is now visible on Rotabo for " + period + ", until " + untilStr + ". " + numLine + " People who unlock viewer access can now see and contact you directly.",
    "<p>Your payment was received and your <strong>" + existing.category + "</strong> listing is now visible on Rotabo.</p><p>Visible for <strong>" + period + "</strong>, until <strong>" + untilStr + "</strong>.</p>" + numHtml + "<p>People who unlock viewer access can now see and contact you directly.</p>",
  );
  return { email: existing.email ?? null, unmatched: false };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Server not configured", { status: 500 });
  }

  const signatureHeader = req.headers.get("stripe-signature");
  const payload = await req.text();

  if (!signatureHeader || !(await verifyStripeSignature(payload, signatureHeader, webhookSecret))) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data?.object;
  const refId: string | null = session?.client_reference_id ?? null;
  const sessionId: string | null = session?.id ?? null;
  const amountTotal: number | null = session?.amount_total ?? null;
  const currency: string | null = session?.currency ?? null;
  const paymentLink: string | null = typeof session?.payment_link === "string"
    ? session.payment_link
    : (session?.payment_link?.id ?? null);
  const customerEmail: string | null = session?.customer_details?.email ?? session?.customer_email ?? null;

  // Somebody else's sale, arriving here only because Stripe fans every
  // event on the account out to every endpoint on it. Dropped before the
  // claim, the row, and the two emails -- see ALTE_SITURI above.
  if (paymentLink && ALTE_SITURI[paymentLink]) {
    console.log("not ours, belongs to " + ALTE_SITURI[paymentLink], sessionId);
    return new Response(JSON.stringify({ received: true, ignored: ALTE_SITURI[paymentLink] }), { status: 200 });
  }

  // Replay guard. Stripe redelivers whenever this endpoint fails to answer
  // 2xx in time, and a human can resend an event from the dashboard. The
  // claim is taken BEFORE the work, so two deliveries racing each other
  // cannot both win, and it is released in the catch below so a retry
  // after a genuine failure still gets its chance.
  //
  // completed_at is what tells a finished event from an abandoned claim.
  // Without it, an isolate killed between claiming and finishing (recycle,
  // OOM, timeout) left a claim with no work done, and every Stripe retry
  // was answered "duplicate, already handled" -- the payment silently
  // never fulfilled. All three handlers are idempotent, so re-running an
  // unfinished one is safe; refusing to re-run it is not.
  const eventId: string | null = typeof event.id === "string" ? event.id : null;
  if (eventId) {
    const { error: claimErr } = await supabase
      .from("processed_stripe_events")
      .insert({ event_id: eventId, type: event.type });
    if (claimErr) {
      if (claimErr.code === "23505") {
        const { data: prior } = await supabase
          .from("processed_stripe_events")
          .select("completed_at")
          .eq("event_id", eventId)
          .maybeSingle();
        if (prior?.completed_at) {
          console.log("duplicate delivery ignored", eventId);
          return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
        }
        console.log("claim exists but was never completed; redoing", eventId);
      } else {
        // The ledger is a safety net, not a gate: if it is unavailable, a
        // real payment must still be fulfilled rather than dropped.
        console.error("could not claim stripe event", eventId, claimErr);
      }
    }
  }

  const months = tierMonthsFor(amountTotal, currency, paymentLink);

  const tierVia = paymentLink && ACCESS_TIERS[paymentLink] != null
    ? "payment_link"
    : (months ? "chf_amount_fallback" : "unresolved");
  console.log("tier resolved", { months, via: tierVia, paymentLink, currency, amountTotal });

  // Was this sale even ours?
  //
  // ALTE_SITURI names the one foreign link we have already been bitten
  // by, but all three sites sell through the same Stripe account -- their
  // links are numbered in one sequence -- so the next one to make its
  // first sale would arrive here just as unrecognised, and gift.ceo's
  // first sale is 10,000 CHF.
  //
  // An unknown link is therefore not evidence of a Rotabo purchase. The
  // admin is still told, loudly, because money did change hands and it
  // might be a Rotabo link nobody added above. But the person who paid
  // hears nothing: writing to a stranger about "your Rotabo purchase"
  // when they bought something else entirely is worse than silence.
  const alNostru = !paymentLink ||
    ACCESS_TIERS[paymentLink] != null ||
    MANUAL_PRODUCTS[paymentLink] != null;

  const isViewer = !!(refId && refId.startsWith(VIEWER_PREFIX));
  const isSponsor = !isViewer && !!(refId && refId.startsWith(SPONSOR_PREFIX));
  let kind = !months ? (isSponsor ? "sponsor" : "manual") : (isViewer ? "viewer" : (refId ? "listing" : "manual"));
  let paidBy: string | null = customerEmail;

  try {
    if (!months) {
      const productName = paymentLink ? (MANUAL_PRODUCTS[paymentLink] ?? null) : null;
      let sponsorHandled = false;
      if (isSponsor) {
        const sponsorEmail = await handleSponsor({
          sponsorId: refId!.slice(SPONSOR_PREFIX.length),
          sessionId, amountTotal, currency, paymentLink, customerEmail,
        });
        if (sponsorEmail !== null) {
          paidBy = sponsorEmail;
          sponsorHandled = true;
        }
      }
      if (!sponsorHandled) {
        if (isSponsor) kind = "manual";
        console.log("checkout.session.completed handled manually", {
          sessionId, amountTotal, currency, paymentLink, productName,
        });
        await handleManualPayment({
          productName, sessionId, amountTotal, currency, paymentLink, refId, customerEmail,
          notifyBuyer: alNostru,
        });
      }
    } else if (isViewer) {
      paidBy = (await handleViewerAccess(refId!.slice(VIEWER_PREFIX.length), customerEmail, months, sessionId)) ?? customerEmail;
    } else if (refId) {
      const result = await handleListing(refId, sessionId, months, monthsToIso(months));
      paidBy = result.email ?? customerEmail;
      if (result.unmatched) {
        // Charged, and nothing granted for it. Somebody has to be told, or
        // the only trace is a payments row that looks exactly like a
        // successful purchase and a customer owed a refund nobody knows about.
        kind = "manual";
        await handleManualPayment({
          productName: months === 1 ? "1 month listing (nothing to apply it to)" : "12 months listing (nothing to apply it to)",
          sessionId, amountTotal, currency, paymentLink, refId,
          customerEmail: paidBy,
          note: "A listing checkout was paid but granted nothing: the reference points at a listing that is already live, was deleted, or is not a listing id at all. Most likely someone re-opened an old checkout URL to renew. Extend it by hand or refund.",
        });
      }
    } else {
      console.log("checkout.session.completed with no client_reference_id", sessionId);
      await handleManualPayment({
        productName: months === 1 ? "1 month access (no listing attached)" : "12 months access (no listing attached)",
        sessionId, amountTotal, currency, paymentLink, refId, customerEmail,
      });
    }

    // The buyer has been served; now write down what happened. Last on
    // purpose, so a bookkeeping problem can never swallow a fulfilment.
    // listing_id only takes a real uuid: payments.listing_id is a uuid FK,
    // so anything else made Postgres reject the whole row.
    await recordPayment({
      stripe_event_id: eventId,
      stripe_session_id: sessionId,
      kind,
      product: paymentLink ? (MANUAL_PRODUCTS[paymentLink] ?? null) : null,
      months: months ?? null,
      amount_total: amountTotal,
      currency,
      email: paidBy,
      listing_id: kind === "listing" && refId && UUID_RE.test(refId) ? refId : null,
      payment_link: paymentLink,
    });

    // Only now is the claim a record of work done rather than work begun.
    if (eventId) {
      const { error: doneErr } = await supabase
        .from("processed_stripe_events")
        .update({ completed_at: new Date().toISOString() })
        .eq("event_id", eventId);
      if (doneErr) console.error("could not mark stripe event complete", eventId, doneErr);
    }
  } catch (err) {
    console.error("Error processing Stripe webhook", err);
    // Hand the claim back so Stripe's retry is allowed to do the work.
    if (eventId) {
      const { error: releaseErr } = await supabase
        .from("processed_stripe_events")
        .delete()
        .eq("event_id", eventId);
      if (releaseErr) console.error("could not release stripe event claim", eventId, releaseErr);
    }
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
