const CACHE_VERSION = "v183";
const CACHE_NAME = "rotabo-cache-" + CACHE_VERSION;

// Where Google tag gateway serves gtag.js and receives its measurement
// requests, on this site's own domain. Must stay identical to the
// measurement path set in the Google tag gateway configuration.
const TAG_GATEWAY_PATH = "/mx";

const LOCALE_CODES = [
  "en","it","ro","es","fr","de","pt","zh","ar","ja","ko","ru","ms","hi","sw",
  "vi","th","id","tr","bn","ur","bg","cs","hr","da","et","fi","el","ga","lv",
  "lt","hu","mt","nl","pl","sk","sl","sv"
];

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/terms.html",
  "/privacy.html",
  "/browse.html",
  "/business.html",
  "/viewer.js",
  "/countries.js",
  "/domains.js",
  "/fx.js",
  "/account.html",
  "/after-payment.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/favicon-32.png",
  "/icons/apple-touch-icon-180.png"
].concat(LOCALE_CODES.map(function (code) {
  return "/locales/" + code + ".json";
}));

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Fetch every asset with a version query, but store it under the
      // plain URL the pages actually request. The query gives each cache
      // version a fresh CDN cache key: Pages serves through Fastly with
      // max-age=600, so fetching the bare URL within ten minutes of a
      // deploy can return the previous release -- which a cache-first
      // worker would then serve for the whole life of this version.
      // ("no-store" only bypasses the local HTTP cache; nothing short of
      // a new cache key gets past the edge.)
      return Promise.all(PRECACHE_URLS.map(function (url) {
        return fetch(url + "?swv=" + CACHE_VERSION, { cache: "no-store" }).then(function (res) {
          if (!res || res.status !== 200) throw new Error("precache " + url);
          return cache.put(url, res);
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key.indexOf("rotabo-cache-") === 0 && key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Re-fetch a page in the background and refresh its cached copy, so a
// deploy that forgot the CACHE_VERSION bump still reaches returning
// visitors on their next navigation instead of never. The version query
// gives the request a fresh CDN cache key (see the install comment).
function revalidate(url) {
  return fetch(url.pathname + "?swr=" + CACHE_VERSION + "-" + Date.now(), { cache: "no-store" })
    .then(function (res) {
      if (!res || res.status !== 200 || res.redirected) return;
      return caches.open(CACHE_NAME).then(function (cache) {
        return cache.put(url.pathname, res);
      });
    })
    .catch(function () { /* offline: the cached copy stands */ });
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  // Only cache same-origin site assets. Cross-origin requests (Supabase
  // REST/API calls, the Supabase JS CDN script, Stripe, etc.) must always
  // hit the network so dynamic data is never served stale from cache.
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Cloudflare's own endpoints are live answers, not site assets: caching
  // /cdn-cgi/trace froze the visitor's country at their first-ever visit.
  if (url.pathname.indexOf("/cdn-cgi/") === 0) return;
  // Same trap, worse blast radius: Google tag gateway moves gtag.js and
  // every measurement hit onto this origin, where they look like ordinary
  // site assets. Cached -- and matched with ignoreSearch, so one entry
  // answers every ?query -- the tag would freeze at whatever version was
  // fetched first and the analytics hits would be served from cache
  // instead of reaching Google at all.
  if (url.pathname === TAG_GATEWAY_PATH || url.pathname.indexOf(TAG_GATEWAY_PATH + "/") === 0) return;

  event.respondWith(
    // ignoreSearch: every real browse.html visit carries ?category=...&
    // role=..., but the precache stores the bare path. Without this the
    // precached page was unreachable -- offline deep links fell through
    // to the index.html fallback, and post-deploy visits could pin the
    // previous release from the CDN edge. The query only matters to the
    // page's own JS, never to the static file server.
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) {
        // Pages AND the scripts/dictionaries they call into: refreshing
        // only the HTML left a new index.html running an old viewer.js
        // until the next version bump.
        var dest = event.request.destination;
        if (event.request.mode === "navigate" || dest === "script" || url.pathname.indexOf("/locales/") === 0) {
          event.waitUntil(revalidate(url));
        }
        return cached;
      }

      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === "opaque" || response.redirected) {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          // Keyed by bare path: one entry per page instead of one per
          // ?fbclid/?utm combination (unbounded growth), and the entry
          // ignoreSearch serves stays the one revalidate() refreshes.
          cache.put(url.pathname, responseClone);
        });
        return response;
      }).catch(function () {
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
