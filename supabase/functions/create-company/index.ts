import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The only way a company row gets created. public.companies allows no direct
// API access at all -- reads go through companies_public(), writes come
// through here on the service role, and both require the same
// verified_emails token that create-listing does: proof the submitter
// confirmed their address with a one-time code (see verify-email).
//
// Why a second function rather than a flag on create-listing: the two things
// are not the same shape. A private listing is a person, one of twelve
// categories, and which side of the deal they are on. A company is a name,
// one of the professional domains, and a website. They were sharing a table
// until now, which is how private individuals ended up listed under "here
// the registered companies appear" on the business side.
//
// FREE, like listings have been since 2026-08-22: the row is born visible for
// FREE_MONTHS months and no checkout follows. The yellow band says as much --
// "your company can be visible after free registration". To charge later,
// drop visible_until from the row below and send the browser to Stripe;
// stripe-webhook already knows how to flip a row visible.
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

const VALID_ROLES = ["seeking", "offering"];

function nonEmptyString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/* The logo, if one came with the form.

   Uploaded after the row exists, because the file is stored under the
   company's own id and there is no id until the insert returns. A failure
   here must not undo a registration that has already succeeded: the company
   is registered either way and simply has no logo, which is the state every
   company was in until this existed.

   Three checks, and the third is the one that matters. The declared type is
   not trusted -- anyone can label anything image/png -- so the first bytes
   are read and have to be what that format actually starts with. Without
   that, "logo.png" could be a script, an HTML page, or anything else, sitting
   on our own origin under a name the page will happily put in an <img>. */
const MAGIC: Record<string, { ext: string; test: (b: Uint8Array) => boolean }> = {
  "image/png": {
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  "image/jpeg": {
    ext: "jpg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/webp": {
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
};

const LOGO_MAX_BYTES = 512 * 1024;

async function storeLogo(companyId: string, raw: unknown): Promise<string | null> {
  if (typeof raw !== "string" || !raw) return null;

  // A data URL from the browser's FileReader: "data:image/png;base64,AAAA".
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw.trim());
  if (!m) return null;

  const kind = MAGIC[m[1]];
  if (!kind) return null;

  let bytes: Uint8Array;
  try {
    const bin = atob(m[2]);
    if (bin.length > LOGO_MAX_BYTES) return null;
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return null;
  }

  if (bytes.length < 16 || !kind.test(bytes)) return null;

  const path = `${companyId}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await supabase.storage
    .from("company-logos")
    .upload(path, bytes, { contentType: m[1], upsert: false });

  if (error) {
    console.error("logo upload failed for", companyId, error.message);
    return null;
  }
  return path;
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
  const domain = nonEmptyString(body.domain);
  const role = body.role;
  const name = nonEmptyString(body.name);
  const phone = nonEmptyString(body.phone);
  const city = nonEmptyString(body.city);
  const country = nonEmptyString(body.country);
  const countryCodeRaw = nonEmptyString(body.country_code).toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(countryCodeRaw) ? countryCodeRaw : null;

  if (!email || !token) return json({ error: "missing verification" }, 400);

  /* The field decides the category, and the pairs live in
     public.domain_categories rather than in a map here.

     They used to be hard-coded. The list went from 113 fields to 163 to 213
     in two days, and each time the whole function had to be redeployed to
     carry a lookup table -- a great deal of ceremony for a row of data, and
     one more place for it to fall out of step with domains.js. A table also
     ends the prototype-lookup problem the map had: asking Postgres for
     "constructor" returns nothing, the same as any other unknown word. */
  const { data: dom } = await supabase
    .from("domain_categories")
    .select("category")
    .eq("slug", domain)
    .maybeSingle();

  const category = dom ? dom.category : "";
  if (!category) return json({ error: "invalid domain" }, 400);
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

  // One address belongs to one side of the site. The mirror of the check in
  // create-listing: an address already carrying a live private listing does
  // not also become a company here.
  //
  // After the token check, not before: this says no to a real person about a
  // real address, so it should only speak once the address is proven theirs.
  const { data: asPerson } = await supabase
    .from("listings")
    .select("id")
    .eq("email", email)
    .gt("visible_until", new Date().toISOString())
    .limit(1);
  if (asPerson && asPerson.length) {
    return json({ error: "registered as a private person", side: "private" }, 409);
  }

  // Computed with setMonth so a registration made on the 31st lands on a real
  // date twelve months out rather than drifting by the day count between.
  const until = new Date();
  until.setMonth(until.getMonth() + FREE_MONTHS);

  // A website typed without a scheme is the common case and is not an error:
  // "rotabo.app" becomes https://rotabo.app. Anything that still will not
  // parse is dropped rather than stored as a link that goes nowhere.
  let website: string | null = null;
  const rawSite = nonEmptyString(body.website_url);
  if (rawSite) {
    const candidate = /^https?:\/\//i.test(rawSite) ? rawSite : "https://" + rawSite;
    try {
      const u = new URL(candidate);
      if (u.hostname.includes(".")) website = u.toString().slice(0, 300);
    } catch { /* not a web address; the company stands without one */ }
  }

  const row: Record<string, unknown> = {
    name: name.slice(0, 200),
    domain,
    category,
    role,
    email,
    phone: phone.slice(0, 60),
    city: city.slice(0, 120),
    country: country.slice(0, 120),
    country_code: countryCode,
    address: typeof body.address === "string" ? body.address.slice(0, 300) : null,
    website_url: website,
    reg_no: typeof body.reg_no === "string" ? body.reg_no.slice(0, 60) : null,
    visible_until: until.toISOString(),
  };
  if (typeof body.note === "string") row.note = body.note.slice(0, 1000);

  const { data: inserted, error } = await supabase
    .from("companies")
    .insert(row)
    .select("id, visible_until")
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  /* The logo comes second, and its failure is not the registration's. If the
     file is rejected or the upload falls over, the company still exists and
     the answer is still ok -- with logo: false, so the browser can say the
     picture did not go through without implying the registration did not. */
  const logoPath = await storeLogo(inserted.id, body.logo);
  if (logoPath) {
    const { error: logoErr } = await supabase
      .from("companies")
      .update({ logo_path: logoPath })
      .eq("id", inserted.id);
    if (logoErr) console.error("logo path not stored for", inserted.id, logoErr.message);
  }

  return json({
    ok: true,
    id: inserted.id,
    visible_until: inserted.visible_until,
    free: true,
    // Uploaded, but not shown to anyone until it has been looked at.
    logo: !!logoPath,
  });
});
