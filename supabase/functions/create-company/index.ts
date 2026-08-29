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
// one of a hundred and thirteen professional domains, and a website. They
// were sharing a table until now, which is how private individuals ended up
// listed under "here the registered companies appear" on the business side.
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

// The 113 fields from domains.js, each with the Rotabo category it lands in.
// domains.js is where the list is edited and where the business-side search
// reads it; this is the same pairs. Regenerate with:
//
//   grep -oP '^\s*\["\K[a-z0-9_]+", "[a-z]+' domains.js
//
// The category is taken from here rather than from the form, so a company
// filed under "plumbing" is in "build" because domains.js says so -- the two
// cannot drift apart, whatever a request claims.
const DOMAIN_CATEGORY: Record<string, string> = {
  taxi:"drive",ride_hailing:"drive",chauffeur:"drive",
  driving_school:"drive",translation:"translator",interpreting:"translator",
  sworn_translation:"translator",language_school:"translator",
  removals:"move",international_removals:"move",courier:"move",
  freight_forwarding:"move",refrigerated_transport:"move",haulage:"move",
  storage_warehousing:"move",customs_brokerage:"move",excavation:"build",
  crane_hire:"build",scaffolding:"build",demolition:"build",
  concrete_works:"build",surveying:"build",tool_hire:"tools",
  machinery_rental:"tools",generator_hire:"tools",
  electrical_installation:"home",plumbing:"home",heating_hvac:"home",
  air_conditioning:"home",painting_decorating:"home",carpentry:"home",
  flooring:"home",roofing:"home",locksmith:"home",cleaning_services:"home",
  gardening_landscaping:"home",renovation:"home",car_repair:"auto",
  mobile_mechanic:"auto",tyre_service:"auto",bodywork_paint:"auto",
  towing_recovery:"auto",childcare:"care",elderly_care:"care",
  home_nursing:"care",private_tutoring:"learn",music_lessons:"learn",
  sports_coaching:"learn",it_training:"learn",vocational_training:"learn",
  holiday_lettings:"stay",guesthouse_bnb:"stay",property_management:"stay",
  veterinary:"pets",dog_walking:"pets",pet_grooming:"pets",
  general_practice:"other",dentistry:"other",physiotherapy:"other",
  psychology:"other",pharmacy:"other",optometry:"other",
  medical_laboratory:"other",software_development:"other",
  web_development:"other",it_support:"other",cybersecurity:"other",
  data_ai:"other",cloud_hosting:"other",accounting:"other",
  audit_tax:"other",legal_services:"other",hr_recruitment:"other",
  management_consulting:"other",insurance_brokerage:"other",
  real_estate_agency:"other",architecture:"other",manufacturing:"other",
  cnc_machining:"other",metalwork_welding:"other",restaurant:"other",
  catering:"other",hotel:"other",event_management:"other",
  agriculture:"other",forestry:"other",waste_recycling:"other",
  renewable_energy:"other",marketing_agency:"other",graphic_design:"other",
  photography:"other",video_production:"other",printing_signage:"other",
  wholesale:"other",ecommerce:"other",security_services:"other",
  shop_general:"other",shop_bicycle:"other",shop_auto_parts:"auto",
  shop_hardware:"tools",shop_furniture:"home",shop_electronics:"other",
  shop_clothing:"other",shop_grocery:"other",shop_sports:"other",
  shop_books:"other",shop_florist:"other",shop_pet:"pets",
  motorcycle_repair:"auto",hairdressing:"other",beauty_salon:"other",
  massage_therapy:"other",fitness_training:"other"
};

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
  const domain = body.domain;
  const role = body.role;
  const name = nonEmptyString(body.name);
  const phone = nonEmptyString(body.phone);
  const city = nonEmptyString(body.city);
  const country = nonEmptyString(body.country);
  const countryCodeRaw = nonEmptyString(body.country_code).toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(countryCodeRaw) ? countryCodeRaw : null;

  if (!email || !token) return json({ error: "missing verification" }, 400);
  /* hasOwnProperty, not a plain lookup: DOMAIN_CATEGORY["constructor"]
     answers with a function off Object's prototype, which is truthy, and a
     request naming one of those would sail past this check and fail later
     against the category constraint as a 500 instead of an honest 400. */
  const known = typeof domain === "string"
    && Object.prototype.hasOwnProperty.call(DOMAIN_CATEGORY, domain);
  const category = known ? DOMAIN_CATEGORY[domain] : "";
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

  return json({ ok: true, id: inserted.id, visible_until: inserted.visible_until, free: true });
});
