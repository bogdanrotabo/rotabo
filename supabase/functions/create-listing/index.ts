import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The only way a listing row gets created now. Direct anon inserts to
// public.listings are no longer allowed (see the migration that drops
// that RLS policy) -- everything must go through here, which requires
// a verified_emails token proving the submitter's email was confirmed
// via a one-time code (see verify-email). Uses the service role.
//
// FREE LISTING PERIOD, from 2026-08-22. Listings used to be inserted
// invisible (visible_until null) and were flipped visible by
// stripe-webhook once the lister paid 1 CHF for a month or 2 CHF for a
// year. That step is gone: 16 listings had been created and only 2 were
// ever paid for -- everyone else filled the form, verified their email,
// and abandoned at Stripe. So the row is now born visible, for
// FREE_MONTHS months, and no checkout follows.
//
// To charge for listings again: drop visible_until from the row below,
// restore the Stripe redirect at the end of createListing() in
// index.html, and put the tier radios back in the three listing forms.
// stripe-webhook was left untouched and still knows how to flip a
// listing visible, so nothing has to be rebuilt on that side.
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const FREE_MONTHS = 12;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

// Must match listings_category_check and the category lists in
// index.html / browse.html / account.html / admin.html -- "translator"
// is the hero CTA and was rejected here with "invalid category".
// "pets" is the lost-and-found category: losing one is a seeking
// listing, finding one is an offering listing, so VALID_ROLES is
// unchanged.
const VALID_CATEGORIES = ["drive", "translator", "move", "build", "tools", "home", "auto", "care", "learn", "stay", "pets", "other"];
const VALID_ROLES = ["seeking", "offering"];

function nonEmptyString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const category = body.category;
  const role = body.role;
  const name = nonEmptyString(body.name);
  const phone = nonEmptyString(body.phone);
  const city = nonEmptyString(body.city);
  const country = nonEmptyString(body.country);
  // Canonical ISO-3166 alpha-2 resolved by the client from whatever
  // spelling the lister typed, so browse can filter by country across
  // languages. Optional and advisory -- an unrecognised spelling simply
  // arrives empty, and the free-text country is still stored.
  const countryCodeRaw = nonEmptyString(body.country_code).toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(countryCodeRaw) ? countryCodeRaw : null;

  if (!email || !token) return json({ error: "missing verification" }, 400);
  if (VALID_CATEGORIES.indexOf(category) === -1) return json({ error: "invalid category" }, 400);
  if (VALID_ROLES.indexOf(role) === -1) return json({ error: "invalid role" }, 400);
  if (!name || !phone || !city || !country) {
    return json({ error: "name, phone, city, and country are required" }, 400);
  }

  const { data: verified } = await supabase
    .from("verified_emails")
    .select("id, email, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!verified || verified.email !== email || new Date(verified.expires_at).getTime() < Date.now()) {
    return json({ error: "email not verified or verification expired" }, 401);
  }

  // One address belongs to one side of the site. A company registers on the
  // business side and a person on the private side, and neither posts on the
  // other -- so an address already carrying a live company registration is
  // turned away here rather than quietly growing a second identity for the
  // same email in the other table.
  //
  // After the token check, not before: this says no to a real person about a
  // real address, so it should only speak once the address is proven theirs.
  const { data: asCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("email", email)
    .gt("visible_until", new Date().toISOString())
    .limit(1);
  if (asCompany && asCompany.length) {
    return json({ error: "registered as a company", side: "company" }, 409);
  }

  // Born visible. Computed with setMonth so a listing made on the 31st
  // lands on a real date twelve months out rather than drifting by the
  // day count of the months in between.
  const until = new Date();
  until.setMonth(until.getMonth() + FREE_MONTHS);

  const row: Record<string, unknown> = {
    category,
    role,
    name: name.slice(0, 200),
    phone: phone.slice(0, 60),
    email,
    city: city.slice(0, 120),
    country: country.slice(0, 120),
    country_code: countryCode,
    address: typeof body.address === "string" ? body.address.slice(0, 300) : null,
    visible_until: until.toISOString(),
  };
  if (typeof body.note === "string") row.note = body.note.slice(0, 1000);
  if (typeof body.license_year === "number") row.license_year = body.license_year;
  if (typeof body.declaration_accepted === "boolean") row.declaration_accepted = body.declaration_accepted;

  const { data: inserted, error } = await supabase
    .from("listings")
    .insert(row)
    .select("id, visible_until")
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  // visible_until goes back to the browser so index.html can say the
  // listing is live, and until when, without a second round trip.
  return json({ ok: true, id: inserted.id, visible_until: inserted.visible_until, free: true });
});
