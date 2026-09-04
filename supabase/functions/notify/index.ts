import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The owner's bell, for all three sites.
//
// Everything that happens while nobody is watching -- a payment on
// rotabo.app, topten.one or gift.ceo, or somebody registering here --
// arrives at this one endpoint and leaves as one email. It lives on the
// Rotabo project because that is where the sending account and the one
// verified sending domain are; the other two sites have neither, and
// giving each of them their own copy of the key would be three places to
// rotate instead of one.
//
// Nothing that arrives here is believed. The POST carries a site and the
// id of a row, and nothing else: the words in the email are read back
// from that row, through each site's alerta_plata() function, which
// answers only for a row written in the last half hour. So the whole of
// what a forged request could achieve is an email about a real payment
// that really happened, and only if the sender already knew its uuid.
//
// Deployed with verify_jwt = false, because the callers are Postgres
// triggers and pg_net has no Supabase JWT to send.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("ROTABO_FROM_EMAIL") || "Rotabo <no-reply@rotabo.app>";

// How long after an event it may still be announced. Long enough for
// pg_net's queue to drain after a hiccup, short enough that an id which
// leaks later is not a permanent doorbell. It must stay inside the window
// the alerta_plata() functions themselves enforce.
const FRESH_MS = 15 * 60_000;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The three sites, and how to ask each one what happened.
//
// The keys below are publishable ones -- the same string every visitor's
// browser already holds -- so they are not a secret being kept here. They
// reach exactly one function on each project, alerta_plata(), which
// returns nothing that is not already printed on the site's own pages.
// Rotabo is read with the service role instead, because its payments
// carry the buyer's address and that is not for anon to read.
const SITES: Record<string, { url: string; key: string | null }> = {
  "rotabo.app": { url: SUPABASE_URL, key: null },
  "topten.one": {
    url: "https://iezclmijwrtjibgflfqj.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllemNsbWlqd3J0amliZ2ZsZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NDA0ODMsImV4cCI6MjEwMzIxNjQ4M30.BmuhHNFFG28hlI0UkaFMXsEWkbYk0W_9VIlZVI_VKEA",
  },
  "gift.ceo": {
    url: "https://gcfurwexhxqxuveojoih.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZnVyd2V4aHhxeHV2ZW9qb2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODc5NjcsImV4cCI6MjEwMzY2Mzk2N30.FF38Fw_p3kxKam7F2A884Q8K7lXeYk18K-oWki0355k",
  },
};

// Currencies Stripe reports without a minor unit: their amount must not
// be divided by a hundred before a human reads it.
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function bani(cents: number | null, currency: string | null): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  const cur = (currency || "chf").toLowerCase();
  const value = ZERO_DECIMAL.has(cur) ? cents : cents / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur.toUpperCase() }).format(value);
  } catch {
    return value + " " + cur.toUpperCase();
  }
}

// Who to tell. admin_emails is the same one-row table the admin console
// authenticates against, so the address lives in the database and not in
// this file -- which is public, on GitHub, like the rest of the site.
async function destinatari(): Promise<string[]> {
  const { data, error } = await supabase.from("admin_emails").select("email");
  if (error) {
    console.error("admin_emails unreadable", error);
    return [];
  }
  return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
}

async function trimite(subject: string, lines: string[]): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set; owner alert not sent:", subject);
    return false;
  }
  const to = await destinatari();
  if (!to.length) {
    console.error("no admin_emails row; owner alert not sent:", subject);
    return false;
  }
  const text = lines.join("\n");
  const html = "<pre style=\"font:14px/1.6 ui-monospace,monospace\">" + esc(text) + "</pre>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, text, html }),
    });
    if (!res.ok) {
      console.error("resend refused the owner alert", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("could not send owner alert", err);
    return false;
  }
}

// Written down first, sent second. The row is the claim: if two
// deliveries of the same event race, one of them loses on the primary key
// and stops there, and a duplicate is a no-op instead of a second email
// at three in the morning.
async function deja(kind: string, ref: string): Promise<boolean> {
  const { error } = await supabase.from("owner_alerts").insert({ kind, ref });
  if (!error) return false;
  if (error.code === "23505") return true;
  // The ledger is unavailable. An alert that arrives twice is a smaller
  // failure than one that never arrives, so carry on.
  console.error("owner_alerts unavailable", error);
  return false;
}

// Ask a site what its own row says. Null means there is nothing to
// announce: no such row, or one too old to still be news.
type Alerta = {
  amount_cents: number | null;
  currency: string | null;
  what: string | null;
  needs_you?: boolean;
  lines: string[];
};

async function citeste(site: string, ref: string): Promise<Alerta | null> {
  const s = SITES[site];
  if (!s) return null;

  if (!s.key) {
    const { data, error } = await supabase.rpc("alerta_plata", { p_ref: ref });
    if (error) {
      console.error("alerta_plata failed on " + site, error);
      return null;
    }
    return (data as Alerta) ?? null;
  }

  try {
    const res = await fetch(s.url + "/rest/v1/rpc/alerta_plata", {
      method: "POST",
      headers: {
        "apikey": s.key,
        "Authorization": "Bearer " + s.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_ref: ref }),
    });
    if (!res.ok) {
      console.error("alerta_plata refused on " + site, res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json()) as Alerta | null;
  } catch (err) {
    console.error("could not reach " + site, err);
    return null;
  }
}

async function plata(site: string, ref: string): Promise<Response> {
  if (!SITES[site]) return json({ error: "unknown site" }, 400);
  if (!UUID_RE.test(ref)) return json({ error: "invalid ref" }, 400);

  const a = await citeste(site, ref);
  if (!a) return json({ ignored: "nothing to announce" }, 200);

  if (await deja("payment", site + ":" + ref)) return json({ duplicate: true }, 200);

  const suma = bani(a.amount_cents ?? null, a.currency ?? null);
  const cap = [site, suma ?? "paid", a.what || null, a.needs_you ? "NEEDS YOU" : null]
    .filter(Boolean).join(" · ");

  const sent = await trimite(cap, [
    a.needs_you
      ? "A payment went through on " + site + " and nothing was granted for it."
      : "A payment went through on " + site + ".",
    "",
    "amount:     " + (suma ?? "(not recorded here — see Stripe)"),
    ...(Array.isArray(a.lines) ? a.lines : []),
    "",
    "when:       " + new Date().toISOString(),
  ]);

  return json({ ok: true, sent }, 200);
}

async function inregistrare(userId: string): Promise<Response> {
  if (!UUID_RE.test(userId)) return json({ error: "invalid user_id" }, 400);

  // The whole gate: the id must name a real account, and a young one.
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error) console.error("getUserById failed", error);
  if (!user) return json({ ignored: "no such user" }, 200);

  const age = Date.now() - new Date(user.created_at).getTime();
  if (!Number.isFinite(age) || age > FRESH_MS) {
    return json({ ignored: "not a fresh signup" }, 200);
  }

  if (await deja("signup", userId)) return json({ duplicate: true }, 200);

  // How they got in, in the words of whoever let them in. Google sign-in
  // leaves "google" here; the password modal and verify-email leave "email".
  const via = (user.app_metadata?.provider as string) ||
    (Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers[0] : "") ||
    "email";

  const email = user.email || "(no address)";
  const sent = await trimite("rotabo.app · new account · " + email, [
    "Somebody registered on rotabo.app.",
    "",
    "email:      " + email,
    "signed up:  " + via,
    "created:    " + new Date(user.created_at).toISOString(),
    "user id:    " + user.id,
    "",
    "https://rotabo.app/account.html",
  ]);

  return json({ ok: true, sent }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: { kind?: unknown; site?: unknown; ref?: unknown; user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (body.kind === "payment") {
    return await plata(
      typeof body.site === "string" ? body.site : "",
      typeof body.ref === "string" ? body.ref : "",
    );
  }

  if (body.kind === "signup") {
    return await inregistrare(typeof body.user_id === "string" ? body.user_id : "");
  }

  return json({ error: "unknown kind" }, 400);
});
