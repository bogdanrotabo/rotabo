/*
 * selfies.lol
 *
 * Everything a visitor sees is a file in ../public, served by the assets
 * binding. This script sits in front of it for three things a static file
 * cannot do on its own:
 *
 *   1. www.selfies.lol -> selfies.lol, 301, so there is one address for
 *      Google to index rather than two copies of every page.
 *   2. Security headers on every response.
 *   3. A place for the application script to go when it arrives: anything
 *      under /api/ is answered here, with the Supabase keys in env, and never
 *      falls through to the asset store.
 */

const APEX = "selfies.lol";

const HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, site: APEX, supabase: Boolean(env.SUPABASE_URL) });
    }

    if (url.pathname.startsWith("/api/")) {
      // The application script goes here. env.SUPABASE_URL and
      // env.SUPABASE_SERVICE_ROLE_KEY are set with `wrangler secret put`.
      return json({ error: "not implemented" }, 501);
    }

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v);
    return out;
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...HEADERS },
  });
}
