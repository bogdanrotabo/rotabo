/*
 * selfies.lol
 *
 * One Worker in front of everything. It serves the files in ../public,
 * answers /api, proxies the pictures, renders one page per selfie, and
 * writes the sitemap. The browser never talks to Supabase: it talks here,
 * and the service-role key stays in this Worker.
 *
 * Identity is a cookie and nothing else. The first request from a browser
 * gets a random token, one row in poster_sessions, one row in posters, and
 * from then on that browser can post. Nobody types an address, waits for a
 * mail, or picks a password. The cost is that identity is per browser --
 * clear the cookie and you are somebody new -- which for a wall of selfies
 * is the right trade and, when it stops being, Supabase auth can be laid
 * on top of the same posters table.
 *
 * env:
 *   SUPABASE_URL                public, in wrangler.toml
 *   SUPABASE_SERVICE_ROLE_KEY   secret, `wrangler secret put`
 */

const APEX = "selfies.lol";
const BUCKET = "selfies";
const COOKIE = "sl_id";
const YEAR = 60 * 60 * 24 * 365;

/* What one browser may put on the wall, and what one address may, in an
   hour. The second number is the one that matters: the first is trivially
   reset by clearing a cookie. */
const POSTS_PER_POSTER_HOUR = 12;
const POSTS_PER_IP_HOUR = 30;

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // One address for Google to index: no www.
    //
    // The other half of "one address", http -> https, is deliberately not
    // here. `wrangler dev` serves the real hostname over plain http, so a
    // scheme redirect in this Worker fires on every local request and the
    // dev server rewrites the Location back to localhost -- a redirect to
    // itself, forever -- and nothing the runtime exposes tells a local run
    // apart from the edge: cf-connecting-ip and request.cf are both
    // simulated, down to the colo. Two things already cover it in front of
    // this code, and neither can loop: the zone's "Always Use HTTPS", and
    // the HSTS header every response below carries. If that zone setting is
    // ever turned off, turn it back on -- this Worker will not catch it.
    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }

    try {
      const res = await route(request, url, env, ctx);
      if (res) return withHeaders(res);
    } catch (err) {
      console.error("unhandled", err && err.stack ? err.stack : String(err));
      if (url.pathname.startsWith("/api/")) {
        return withHeaders(json({ error: "server_error" }, 500));
      }
      return withHeaders(new Response("Something went wrong.", { status: 500 }));
    }

    return withHeaders(await env.ASSETS.fetch(request));
  },
};

async function route(request, url, env, ctx) {
  const path = url.pathname;

  if (path === "/api/health") return health(env);
  if (path.startsWith("/i/")) return servePicture(request, path, env);
  if (path === "/sitemap.xml") return sitemap(env);
  if (path.startsWith("/s/")) return permalink(path.slice(3), env, request, ctx);

  if (path.startsWith("/api/admin/")) return admin(request, path, env);

  if (path === "/api/me" && request.method === "GET") return me(request, env, ctx);
  if (path === "/api/feed" && request.method === "GET") return feed(request, url, env, ctx);
  if (path === "/api/post" && request.method === "POST") return post(request, env);
  if (path === "/api/like" && request.method === "POST") return like(request, env);
  if (path === "/api/report" && request.method === "POST") return report(request, env);
  if (path === "/api/handle" && request.method === "POST") return handle(request, env);
  if (path === "/api/remove" && request.method === "POST") return removeOwn(request, env);

  if (path.startsWith("/api/")) return json({ error: "not_found" }, 404);
  return null; // fall through to the static files
}

/* ---------------------------------------------------------------- Supabase */

function db(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };

  return {
    async rest(pathAndQuery, init = {}) {
      const res = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
        ...init,
        headers: { ...headers, ...(init.headers || {}) },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`supabase ${res.status} on ${pathAndQuery}: ${body.slice(0, 300)}`);
      }
      return res.status === 204 ? null : res.json();
    },
    async select(table, query) {
      return this.rest(`${table}?${query}`);
    },
    async insert(table, row, prefer = "return=representation") {
      const out = await this.rest(table, {
        method: "POST",
        headers: { prefer },
        body: JSON.stringify(row),
      });
      return Array.isArray(out) ? out[0] : out;
    },
    async patch(table, query, row) {
      return this.rest(`${table}?${query}`, {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify(row),
      });
    },
    async remove(table, query) {
      return this.rest(`${table}?${query}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
    },
    async upload(path, body, contentType) {
      const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": contentType },
        body,
      });
      if (!res.ok) throw new Error(`storage ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return true;
    },
    async unlink(path) {
      const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
        method: "DELETE",
        headers: { apikey: key, authorization: `Bearer ${key}` },
      });
      return res.ok;
    },
    picture(path) {
      return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
    },
  };
}

/* Values that live in the database because they must not live in this file:
   the salt the address hashes are made with, and the admin token's hash.
   Read once per isolate. */
const configCache = new Map();
async function config(env, key) {
  if (configCache.has(key)) return configCache.get(key);
  const rows = await db(env).select("app_config", `key=eq.${key}&select=value&limit=1`);
  const value = rows && rows[0] ? rows[0].value : null;
  configCache.set(key, value);
  return value;
}

/* ---------------------------------------------------------------- identity */

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* The signed-in poster, or null. Never creates anything: a crawler, and a
   visitor who only ever looks, should not leave a row behind. */
async function currentPoster(request, env) {
  const token = cookieValue(request, COOKIE);
  if (!token || token.length < 32 || token.length > 128 || !/^[a-f0-9]+$/.test(token)) return null;

  const rows = await db(env).select(
    "poster_sessions",
    `token=eq.${token}&select=token,poster_id,posters(id,handle,blocked)&limit=1`
  );
  const row = rows && rows[0];
  if (!row || !row.posters) return null;
  return { token, ...row.posters };
}

/* The poster, made on the spot if this browser has never posted. Called
   only where something is about to be written. */
async function requirePoster(request, env) {
  const existing = await currentPoster(request, env);
  if (existing) return { poster: existing, setCookie: null };

  const d = db(env);
  const poster = await d.insert("posters", {});
  const token = newToken();
  await d.insert("poster_sessions", { token, poster_id: poster.id }, "return=minimal");

  return {
    poster: { id: poster.id, handle: null, blocked: false, token },
    setCookie: `${COOKIE}=${token}; Path=/; Max-Age=${YEAR}; HttpOnly; Secure; SameSite=Lax`,
  };
}

async function ipHash(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip) return null;
  const salt = await config(env, "ip_salt");
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ routes */

/* Enough to tell the three ways this goes wrong apart without printing
   anything that is a secret: no key bound at all, a key the project
   rejects, or a table that is not there. The status is the whole of what
   is repeated back; the body of the upstream error is not. */
async function health(env) {
  const out = {
    ok: true,
    site: APEX,
    supabase_url: Boolean(env.SUPABASE_URL),
    service_key: env.SUPABASE_SERVICE_ROLE_KEY ? "bound" : "missing",
  };

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    out.ok = false;
    out.database = "no_key";
    return json(out, 503);
  }

  // The failure worth naming, because it is the one that looks like every
  // other 401: a perfectly good key belonging to a different project. The
  // legacy keys are JWTs carrying the project ref they were minted for, so
  // it can be said outright rather than guessed at. Neither ref is repeated
  // back -- knowing which one it is does not help whoever is asking.
  if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) {
    const mine = new URL(env.SUPABASE_URL).hostname.split(".")[0];
    const its = jwtRef(env.SUPABASE_SERVICE_ROLE_KEY);
    if (its && its !== mine) {
      out.ok = false;
      out.service_key = "bound, but minted for another project";
      out.database = "wrong_project";
      return json(out, 503);
    }
  }

  try {
    await db(env).select("posters", "select=id&limit=1");
    out.database = "ok";
  } catch (err) {
    out.ok = false;
    const status = /supabase (\d{3})/.exec(String(err));
    out.database = status ? `http_${status[1]}` : "unreachable";
  }
  return json(out, out.ok ? 200 : 503);
}

async function me(request, env, ctx) {
  const poster = await currentPoster(request, env);
  if (!poster) return json({ signed_in: false });

  ctx.waitUntil(
    db(env)
      .patch("poster_sessions", `token=eq.${poster.token}`, { last_seen_at: new Date().toISOString() })
      .catch(() => {})
  );

  const mine = await db(env).select(
    "selfies",
    `poster_id=eq.${poster.id}&select=id&order=created_at.desc&limit=100`
  );
  const liked = await db(env).select("likes", `poster_id=eq.${poster.id}&select=selfie_id&limit=500`);

  return json({
    signed_in: true,
    handle: poster.handle,
    blocked: poster.blocked,
    mine: mine.map((r) => r.id),
    liked: liked.map((r) => r.selfie_id),
  });
}

async function feed(request, url, env, ctx) {
  const before = url.searchParams.get("before");
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit")) || 24));

  let query = `visible=eq.true&select=id,caption,width,height,like_count,created_at,storage_path,posters(handle)&order=created_at.desc&limit=${limit}`;
  if (before && !Number.isNaN(Date.parse(before))) {
    query += `&created_at=lt.${encodeURIComponent(before)}`;
  }

  const rows = await db(env).select("selfies", query);

  ctx.waitUntil(logVisit(request, url, env));

  return json(
    { selfies: rows.map(publicSelfie), next: rows.length === limit ? rows[rows.length - 1].created_at : null },
    200,
    { "cache-control": "no-store" }
  );
}

async function post(request, env) {
  // Judged before anybody is created for it: a bot posting nonsense at this
  // endpoint should not leave a row in posters behind.
  const form = await request.formData();
  const file = form.get("photo");
  const caption = (form.get("caption") || "").toString().trim().slice(0, 140);
  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;

  if (!file || typeof file === "string") return json({ error: "no_photo" }, 400);
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: "wrong_type" }, 415);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "too_big" }, 413);
  if (file.size < 1024) return json({ error: "too_small" }, 400);

  const { poster, setCookie } = await requirePoster(request, env);
  if (poster.blocked) return json({ error: "blocked" }, 403, setCookie ? { "set-cookie": setCookie } : {});

  const d = db(env);
  const ip = await ipHash(request, env);
  const since = new Date(Date.now() - 3600_000).toISOString();

  const mine = await d.select("selfies", `poster_id=eq.${poster.id}&created_at=gte.${since}&select=id`);
  if (mine.length >= POSTS_PER_POSTER_HOUR) return json({ error: "slow_down" }, 429);

  if (ip) {
    const near = await d.select("selfies", `ip_hash=eq.${ip}&created_at=gte.${since}&select=id`);
    if (near.length >= POSTS_PER_IP_HOUR) return json({ error: "slow_down" }, 429);
  }

  const id = crypto.randomUUID();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${poster.id}/${id}.${ext}`;

  await d.upload(storagePath, file.stream(), file.type);

  let row;
  try {
    row = await d.insert("selfies", {
      id,
      poster_id: poster.id,
      storage_path: storagePath,
      caption: caption || null,
      width,
      height,
      ip_hash: ip,
    });
  } catch (err) {
    await d.unlink(storagePath); // never leave a picture nothing points at
    throw err;
  }

  const headers = setCookie ? { "set-cookie": setCookie } : {};
  return json({ selfie: publicSelfie({ ...row, posters: { handle: poster.handle } }) }, 201, headers);
}

async function like(request, env) {
  const { id, on } = await request.json().catch(() => ({}));
  if (!isUuid(id)) return json({ error: "bad_id" }, 400);

  const { poster, setCookie } = await requirePoster(request, env);
  const d = db(env);
  const headers = setCookie ? { "set-cookie": setCookie } : {};

  if (on === false) {
    await d.remove("likes", `selfie_id=eq.${id}&poster_id=eq.${poster.id}`);
  } else {
    try {
      await d.insert("likes", { selfie_id: id, poster_id: poster.id }, "return=minimal");
    } catch (err) {
      if (!/duplicate key/i.test(String(err))) throw err; // liking twice is not an error
    }
  }

  const rows = await d.select("selfies", `id=eq.${id}&select=like_count&limit=1`);
  return json({ like_count: rows[0] ? rows[0].like_count : 0, liked: on !== false }, 200, headers);
}

async function report(request, env) {
  const { id, reason } = await request.json().catch(() => ({}));
  if (!isUuid(id)) return json({ error: "bad_id" }, 400);

  const { poster, setCookie } = await requirePoster(request, env);
  const headers = setCookie ? { "set-cookie": setCookie } : {};
  try {
    await db(env).insert(
      "reports",
      { selfie_id: id, poster_id: poster.id, reason: (reason || "").toString().slice(0, 200) || null },
      "return=minimal"
    );
  } catch (err) {
    if (!/duplicate key/i.test(String(err))) throw err; // reporting twice is once
  }
  return json({ reported: true }, 200, headers);
}

async function handle(request, env) {
  const body = await request.json().catch(() => ({}));
  const wanted = (body.handle || "").toString().trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(wanted)) return json({ error: "bad_handle" }, 400);

  const { poster, setCookie } = await requirePoster(request, env);
  const headers = setCookie ? { "set-cookie": setCookie } : {};

  try {
    await db(env).patch("posters", `id=eq.${poster.id}`, { handle: wanted });
  } catch (err) {
    if (/duplicate key/i.test(String(err))) return json({ error: "taken" }, 409, headers);
    throw err;
  }
  return json({ handle: wanted }, 200, headers);
}

/* Taking your own picture down. The row stays, so the same file cannot be
   re-posted into the same address, but the picture itself goes. */
async function removeOwn(request, env) {
  const poster = await currentPoster(request, env);
  if (!poster) return json({ error: "not_yours" }, 403);

  const { id } = await request.json().catch(() => ({}));
  if (!isUuid(id)) return json({ error: "bad_id" }, 400);

  const d = db(env);
  const rows = await d.select("selfies", `id=eq.${id}&poster_id=eq.${poster.id}&select=id,storage_path&limit=1`);
  if (!rows.length) return json({ error: "not_yours" }, 403);

  await d.patch("selfies", `id=eq.${id}`, { visible: false, hidden_reason: "poster" });
  await d.unlink(rows[0].storage_path);
  return json({ removed: true });
}

/* ------------------------------------------------------------- the picture */

async function servePicture(request, path, env) {
  const key = path.slice(3); // "<poster>/<id>.<ext>"
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(db(env).picture(key), { cf: { cacheEverything: true, cacheTtl: 86400 } });
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  const out = new Response(upstream.body, upstream);
  out.headers.set("cache-control", "public, max-age=31536000, immutable");
  out.headers.delete("set-cookie");
  return out;
}

/* --------------------------------------------------- one page per selfie */

async function permalink(id, env, request, ctx) {
  if (!isUuid(id)) return null; // let the 404 page answer

  const rows = await db(env).select(
    "selfies",
    `id=eq.${id}&select=id,caption,width,height,like_count,created_at,storage_path,visible,posters(handle)&limit=1`
  );
  const row = rows && rows[0];

  if (!row || !row.visible) {
    return new Response(gonePage(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  ctx.waitUntil(logVisit(request, new URL(request.url), env));

  return new Response(selfiePage(row), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}

function selfiePage(row) {
  const who = row.posters && row.posters.handle ? `@${esc(row.posters.handle)}` : "someone";
  const caption = row.caption ? esc(row.caption) : "";
  const title = caption ? `${caption} — selfies.lol` : `A selfie by ${who} — selfies.lol`;
  const description = caption
    ? `${caption} · posted by ${who} on selfies.lol`
    : `A selfie posted by ${who} on selfies.lol, where a selfie gets its moment.`;
  const image = `https://${APEX}/i/${row.storage_path}`;
  const href = `https://${APEX}/s/${row.id}`;
  const when = new Date(row.created_at).toISOString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${href}">
<meta name="theme-color" content="#0b0b10">
<link rel="icon" href="/favicon.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="selfies.lol">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${href}">
<meta property="og:image" content="${image}">
${row.width ? `<meta property="og:image:width" content="${row.width}">` : ""}
${row.height ? `<meta property="og:image:height" content="${row.height}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ImageObject",
  contentUrl: image,
  url: href,
  datePublished: when,
  caption: row.caption || undefined,
  creator: row.posters && row.posters.handle ? { "@type": "Person", name: `@${row.posters.handle}` } : undefined,
  isPartOf: { "@type": "WebSite", name: "selfies.lol", url: `https://${APEX}/` },
})}
</script>
<link rel="stylesheet" href="/app.css">
</head>
<body class="permalink">
<header class="bar">
  <a class="wordmark" href="/">selfies<span>.lol</span></a>
  <a class="btn btn-ghost" href="/">See the wall</a>
</header>
<main class="one">
  <figure>
    <img src="${image}" alt="${caption || `A selfie by ${who}`}"${row.width ? ` width="${row.width}"` : ""}${row.height ? ` height="${row.height}"` : ""}>
    <figcaption>
      ${caption ? `<p class="cap">${caption}</p>` : ""}
      <p class="by">${who} · <time datetime="${when}">${when.slice(0, 10)}</time> · ${row.like_count} ♥</p>
    </figcaption>
  </figure>
  <a class="btn btn-primary" href="/#post">Post yours</a>
</main>
<footer class="foot">
  <a href="/">selfies.lol</a> · <a href="mailto:hello@selfies.lol">hello@selfies.lol</a>
</footer>
</body>
</html>`;
}

function gonePage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Not here · selfies.lol</title>
<link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="/app.css">
</head>
<body class="permalink">
<main class="one empty">
  <h1>Not here</h1>
  <p>This selfie was taken down, or never existed.</p>
  <a class="btn btn-primary" href="/">See the wall</a>
</main>
</body>
</html>`;
}

/* ----------------------------------------------------------------- sitemap */

async function sitemap(env) {
  const urls = [{ loc: `https://${APEX}/`, changefreq: "hourly", priority: "1.0" }];

  try {
    const rows = await db(env).select(
      "selfies",
      "visible=eq.true&select=id,created_at&order=created_at.desc&limit=2000"
    );
    for (const row of rows) {
      urls.push({
        loc: `https://${APEX}/s/${row.id}`,
        lastmod: new Date(row.created_at).toISOString().slice(0, 10),
        changefreq: "monthly",
        priority: "0.6",
      });
    }
  } catch (err) {
    console.error("sitemap: database unreachable, serving the front page alone", String(err));
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" },
  });
}

/* ------------------------------------------------------------------- admin */

async function admin(request, path, env) {
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!given) return json({ error: "no_token" }, 401);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(given));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expected = await config(env, "admin_token_sha256");
  if (!expected || !timingSafeEqual(hex, expected)) return json({ error: "bad_token" }, 403);

  const d = db(env);

  if (path === "/api/admin/queue" && request.method === "GET") {
    const reported = await d.select(
      "selfies",
      "report_count=gt.0&select=id,caption,storage_path,visible,like_count,report_count,hidden_reason,created_at,poster_id,posters(handle,blocked)&order=report_count.desc,created_at.desc&limit=100"
    );
    const latest = await d.select(
      "selfies",
      "select=id,caption,storage_path,visible,like_count,report_count,hidden_reason,created_at,poster_id,posters(handle,blocked)&order=created_at.desc&limit=60"
    );
    return json({ reported, latest });
  }

  if (path === "/api/admin/hide" && request.method === "POST") {
    const { id, visible } = await request.json().catch(() => ({}));
    if (!isUuid(id)) return json({ error: "bad_id" }, 400);
    await d.patch("selfies", `id=eq.${id}`, {
      visible: visible === true,
      hidden_reason: visible === true ? null : "admin",
    });
    return json({ ok: true });
  }

  if (path === "/api/admin/delete" && request.method === "POST") {
    const { id } = await request.json().catch(() => ({}));
    if (!isUuid(id)) return json({ error: "bad_id" }, 400);
    const rows = await d.select("selfies", `id=eq.${id}&select=storage_path&limit=1`);
    if (rows.length) await d.unlink(rows[0].storage_path);
    await d.remove("selfies", `id=eq.${id}`);
    return json({ ok: true });
  }

  if (path === "/api/admin/block" && request.method === "POST") {
    const { poster_id, blocked } = await request.json().catch(() => ({}));
    if (!isUuid(poster_id)) return json({ error: "bad_id" }, 400);
    await d.patch("posters", `id=eq.${poster_id}`, { blocked: blocked !== false });
    if (blocked !== false) {
      await d.patch("selfies", `poster_id=eq.${poster_id}&visible=eq.true`, {
        visible: false,
        hidden_reason: "admin",
      });
    }
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

/* ------------------------------------------------------------------ shared */

function publicSelfie(row) {
  return {
    id: row.id,
    src: `/i/${row.storage_path}`,
    caption: row.caption,
    width: row.width,
    height: row.height,
    likes: row.like_count || 0,
    handle: row.posters ? row.posters.handle : null,
    at: row.created_at,
  };
}

async function logVisit(request, url, env) {
  try {
    await db(env).insert(
      "site_visits",
      {
        path: url.pathname.slice(0, 200),
        referrer: (request.headers.get("referer") || "").slice(0, 300) || null,
        country: request.headers.get("cf-ipcountry") || null,
      },
      "return=minimal"
    );
  } catch (err) {
    /* A visit that goes unrecorded is not worth a failed request. */
  }
}

/* The "ref" claim out of a Supabase legacy key, or null if it is not a JWT
   or does not carry one. Nothing here trusts the token; it is only read to
   say something useful about a key the project has already refused. */
function jwtRef(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).ref || null;
  } catch (err) {
    return null;
  }
}

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function withHeaders(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}
