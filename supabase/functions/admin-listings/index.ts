import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One way in: a Supabase session made by signing in with Google, on an address
// listed in admin_emails. This function reads with the service role, past every
// RLS policy, so the check below is the whole lock.
//
// There is no password door any more. There were two. A shared secret read
// from ADMIN_SECRET, and any Auth session on an admin address -- which meant
// a session made by typing a password counted. Both are gone, and gone is
// stronger than unset: a password can be guessed, reused from a site that
// leaked it, filled in by a browser that saved it years ago, or read over a
// shoulder, and any password ever saved for this page stopped opening it the
// moment this was deployed. Nothing this function accepts can be typed.
//
// Three conditions, all required:
//
//   1. The session was made by a provider, not by a typed password. This is
//      asked of the database rather than read from the token. GoTrue records
//      the method in auth.mfa_amr_claims, one row per session, and the row
//      outlives every hourly refresh -- sessions here have been refreshed nine
//      times over thirteen days and still carry the method they started with.
//      The token does carry an amr claim saying the same thing, and reading it
//      would have been one line, but a claim is only as good as the assumption
//      that it is present: if it ever moved, this check would either fail open
//      or lock the only admin out of their own dashboard, and neither is a
//      thing to find out in production. The table can be queried and was.
//   2. The account carries a Google identity. The recorded method says
//      "oauth" without naming the provider, and Google is the only one
//      configured on this project; this pins it even if a second is turned on.
//   3. The address is in admin_emails -- one row, and no insert policy on the
//      table, so nobody can add themselves to it.
//
// All three failures answer with the same 401, for the same reason a wrong
// password and a non-admin address always answered alike: telling them apart
// would make this endpoint a way to find out who the admins are.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// A Google Ads click always lands with a gclid in the query string, so that
// single marker is what separates paid traffic from organic everywhere.
const GCLID_PATTERN = "%gclid=%";

// The session the token was minted for.
//
// This reads the payload without checking the signature, which is safe only
// because nothing is decided on it alone. getUser() below hands the same token
// to Auth, which does check it, so a forged or edited token is rejected there;
// and the id read here is spent on a question the database answers, not on a
// claim about who the holder is. A token cannot carry a session id other than
// its own without breaking its signature.
function sessionIdOf(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const sid = payload?.session_id;
    return typeof sid === "string" && /^[0-9a-f-]{36}$/i.test(sid) ? sid : null;
  } catch {
    return null;
  }
}

async function isAuthorized(token: string): Promise<boolean> {
  if (!token) return false;

  const sessionId = sessionIdOf(token);
  if (!sessionId) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) return false;
  const user = userData.user;

  const { data: byProvider, error: rpcError } = await supabase
    .rpc("session_made_by_oauth", { p_session: sessionId });
  if (rpcError || byProvider !== true) return false;

  const providers = (user.app_metadata?.providers ?? []) as string[];
  if (!providers.includes("google")) return false;

  const { data: adminRow } = await supabase
    .from("admin_emails")
    .select("email")
    .ilike("email", user.email)
    .maybeSingle();

  return !!adminRow;
}

function fail(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  // POST joined GET on 2026-08-29, for approving company logos. It is the
  // only thing in this function that writes, and it writes exactly two
  // columns on one table.
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!(await isAuthorized(token))) {
    return fail("unauthorized", 401);
  }

  /* Approving or removing a company logo.

     A company uploads a picture to our own storage, and nobody sees it until
     it has been looked at -- which is the whole reason the upload is allowed
     at all. A stranger putting a file on your own origin is a thing you want
     to have said yes to.

     reject_logo deletes the file rather than merely leaving it unapproved. An
     unapproved file still sits in the bucket at a real URL, and "we decided
     not to show it" is not the same as "it is gone". The company keeps its
     registration either way: the picture was the problem, not the firm. */
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return fail("invalid json", 400);
    }

    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("bad id", 400);

    if (body.action === "approve_logo") {
      const { error } = await supabase
        .from("companies")
        .update({ logo_approved: true })
        .eq("id", id);
      if (error) return fail(error.message);
      return ok({ ok: true });
    }

    if (body.action === "reject_logo") {
      const { data: row } = await supabase
        .from("companies")
        .select("logo_path")
        .eq("id", id)
        .maybeSingle();

      if (row?.logo_path) {
        const { error: rmErr } = await supabase.storage
          .from("company-logos")
          .remove([row.logo_path]);
        // A file that is already gone is not a failure: the point was that it
        // should not be there, and it is not.
        if (rmErr) console.error("logo remove failed for", id, rmErr.message);
      }

      const { error } = await supabase
        .from("companies")
        .update({ logo_path: null, logo_approved: false })
        .eq("id", id);
      if (error) return fail(error.message);
      return ok({ ok: true });
    }

    return fail("unknown action", 400);
  }

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource") || "listings";

  if (resource === "visits") {
    // The rows below are only the recent slice shown in the table --
    // PostgREST clamps any select to db.max_rows (1000), so they must
    // never be used to derive totals. The headline counters come from
    // site_visit_stats(), which aggregates in SQL over every row.
    const tzParam = url.searchParams.get("tz") || "UTC";
    const tz = /^[A-Za-z0-9_+\-\/]{1,64}$/.test(tzParam) ? tzParam : "UTC";

    // Paid/organic must be split here and not in the dashboard, for the same
    // db.max_rows reason: an ad campaign that sends thousands of clicks in a
    // day fills all 1000 rows with paid traffic, so filtering the slice
    // client-side would show an empty table for the organic segment.
    const segParam = url.searchParams.get("segment") || "all";
    const segment = segParam === "paid" || segParam === "organic" ? segParam : "all";

    let rowsQuery = supabase
      .from("site_visits")
      .select("id, path, country, referrer, language, session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (segment === "paid") {
      rowsQuery = rowsQuery.ilike("path", GCLID_PATTERN);
    } else if (segment === "organic") {
      rowsQuery = rowsQuery.not("path", "ilike", GCLID_PATTERN);
    }

    const [rowsRes, statsRes] = await Promise.all([
      rowsQuery,
      supabase.rpc("site_visit_stats", { p_tz: tz }),
    ]);

    if (rowsRes.error) return fail(rowsRes.error.message);
    if (statsRes.error) return fail(statsRes.error.message);

    const s = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    const stats = {
      total: Number(s?.total ?? 0),
      unique_visitors: Number(s?.unique_visitors ?? 0),
      today: Number(s?.today ?? 0),
      paid_total: Number(s?.paid_total ?? 0),
      paid_unique: Number(s?.paid_unique ?? 0),
      paid_today: Number(s?.paid_today ?? 0),
      organic_total: Number(s?.organic_total ?? 0),
      organic_unique: Number(s?.organic_unique ?? 0),
      organic_today: Number(s?.organic_today ?? 0),
    };

    return ok({ data: rowsRes.data, stats, segment });
  }

  if (resource === "access") {
    // Paid viewer access -- the paywall revenue, which the dashboard had
    // no view of at all. Same split as visits: a capped row slice for the
    // table, real counters from SQL.
    //
    // category was added on 2026-08-22, when access stopped being sold for
    // the whole site and started being sold one category at a time. Without
    // it the table showed one buyer as several identical rows, with nothing
    // to tell them apart. '*' means every category, which is what the rows
    // from before the change were migrated to.
    const [rowsRes, statsRes] = await Promise.all([
      supabase
        .from("viewer_access")
        .select("email, category, access_until, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase.rpc("viewer_access_stats"),
    ]);

    if (rowsRes.error) return fail(rowsRes.error.message);
    if (statsRes.error) return fail(statsRes.error.message);

    const a = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    const stats = {
      total: Number(a?.total ?? 0),
      active: Number(a?.active ?? 0),
      expired: Number(a?.expired ?? 0),
      granted_30d: Number(a?.granted_30d ?? 0),
    };

    return ok({ data: rowsRes.data, stats });
  }

  /* What the ads delivered, read from the addresses they landed on.

     Google Ads reports what it billed for; this reports who actually arrived,
     from where, and whether they stayed past the first page. The two are not
     the same question, and the second one is the one nobody could answer
     without opening the Ads account -- which is exactly the wrong dependency
     for a number that decides where money goes.

     Every paid click carries gad_campaignid in the query string and lands in
     site_visits like any other visit, so the whole record is already here. */
  if (resource === "ads") {
    const daysParam = Number(url.searchParams.get("days") || "30");
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 30;

    const { data, error } = await supabase.rpc("ad_traffic_stats", { p_days: days });
    if (error) return fail(error.message);

    const rows = (data ?? []) as any[];
    const clicks = rows.reduce((n, r) => n + Number(r.clicks || 0), 0);
    const visitors = rows.reduce((n, r) => n + Number(r.visitors || 0), 0);
    const bounced = rows.reduce((n, r) => n + Number(r.bounced || 0), 0);
    const campaigns = new Set(rows.map((r) => r.campaign)).size;

    return ok({
      data: rows,
      stats: {
        clicks,
        visitors,
        bounced,
        campaigns,
        countries: new Set(rows.map((r) => r.country)).size,
        days,
      },
    });
  }

  if (resource === "payments") {
    // The money ledger: one row per completed checkout, with what it was
    // for and what the listing behind it says. Rows whose stripe_event_id
    // is null were reconstructed from older listings rather than observed
    // at payment time -- the dashboard marks them so the two are never
    // confused.
    //
    // Same split as visits and access: the rows are a capped slice for the
    // table, and the counters come from SQL over every row. Deriving them
    // from the slice was the db.max_rows trap again -- harmless while
    // there are two payments, wrong and silent from the 1001st.
    const [rowsRes, statsRes] = await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, created_at, kind, product, months, amount_total, currency, email, payment_link, stripe_event_id, stripe_session_id, listing_id, " +
          "listings(category, role, name, phone, email, city, country, address, note, visible_until)",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("payment_stats"),
    ]);

    if (rowsRes.error) return fail(rowsRes.error.message);
    if (statsRes.error) return fail(statsRes.error.message);

    const p = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    const stats = {
      total: Number(p?.total ?? 0),
      listings: Number(p?.listings ?? 0),
      viewer: Number(p?.viewer ?? 0),
      sponsor: Number(p?.sponsor ?? 0),
      manual: Number(p?.manual ?? 0),
      by_currency: p?.by_currency ?? {},
    };

    return ok({ data: rowsRes.data, stats });
  }

  /* The companies, which are a separate table from the listings and always
     were -- a private listing is a person and a company is a company, and
     mixing them is what put private individuals under "registered companies"
     on the business side.

     pending_logos is the number that matters: it is the count of things
     waiting for somebody to look at them. */
  if (resource === "companies") {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, domain, category, role, email, phone, city, country, address, " +
        "website_url, reg_no, note, logo_path, logo_approved, visible_until, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return fail(error.message);

    const rows = (data ?? []) as any[];
    const now = Date.now();

    return ok({
      data: rows,
      stats: {
        total: rows.length,
        live: rows.filter((r) => r.visible_until && new Date(r.visible_until).getTime() > now).length,
        with_logo: rows.filter((r) => r.logo_path).length,
        pending_logos: rows.filter((r) => r.logo_path && !r.logo_approved).length,
      },
    });
  }

  // Unlike visits, the listings table IS the whole record and its counters
  // (TOTAL SUBMISSIONS / LIVE NOW / EXPIRED / NEVER PUBLISHED) are derived
  // from these rows, so it cannot live with the same db.max_rows clamp that
  // once froze TOTAL VISITS at 1000. Page through until a page comes back
  // short. The id tiebreaker keeps the order total, so no row is repeated
  // or skipped across pages.
  const PAGE_SIZE = 1000;
  const LISTING_COLUMNS =
    "id, category, role, name, phone, email, address, city, country, note, license_year, declaration_accepted, stripe_session_id, visible_until, created_at";
  const listings: unknown[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("listings")
      .select(LISTING_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return fail(error.message);

    listings.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return ok({ data: listings });
});
