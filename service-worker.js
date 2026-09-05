/* Written by scripts/build-sw.mjs from a hash of everything precached below.
   Do not edit by hand: it was a number someone had to remember to raise, and
   for many deploys nobody did. */
const CACHE_VERSION = "v9757f71551";
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
  "/afise.html",
  "/lang.js",
  "/viewer.js",
  "/countries.js",
  "/domains.js",
  "/fx.js",
  "/account.html",
  "/after-payment.html",
  "/crypto.html",
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

/* The network, with the cached page waiting behind it.
 *
 * Three ways out, and every one of them answers:
 *   the network answers      -> that, and the cache is refreshed with it
 *   it is slower than 2.5s   -> the cached page now, the fresh one stored
 *                               when it lands, for next time
 *   it fails outright        -> the cached page, or index.html, or the error
 *
 * TIMEOUT is a judgement, not a measurement: long enough that a normal
 * mobile connection is never cut off and shown yesterday's page, short
 * enough that a dead one does not leave somebody looking at nothing.
 */
var TIMEOUT = 2500;

function din_cache(url) {
  return caches.match(url.pathname, { ignoreSearch: true }).then(function (c) {
    return c || caches.match("/index.html");
  });
}

function retea_intai(request, url) {
  return new Promise(function (resolve) {
    var raspuns = false;
    var da = function (r) {
      if (raspuns || !r) return;
      raspuns = true;
      clearTimeout(ceas);
      resolve(r);
    };

    // Whatever the cache holds, ready to go the moment the network is late.
    var ceas = setTimeout(function () {
      din_cache(url).then(da);
    }, TIMEOUT);

    fetch(request).then(function (res) {
      // Stored even when the timeout has already answered from cache: the
      // point of the slow visit is that the next one is fast and current.
      if (res && res.status === 200 && !res.redirected) {
        var clona = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(url.pathname, clona);
        });
      }
      da(res);
    }).catch(function () {
      din_cache(url).then(function (c) {
        // Nothing cached and no network: let the browser show its own
        // offline page rather than hanging on a promise that never settles.
        da(c || Response.error());
      });
    });
  });
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

  // A page asked for by the browser goes to the network first; everything
  // else keeps coming out of the cache.
  //
  // Cache-first was right for assets and wrong for pages, and the way it was
  // wrong is that every visitor saw every deploy one visit late. The cached
  // page was served, refreshed in the background, and the new copy only
  // reached the screen the next time they came. On this site, where the owner
  // changes something and opens it on his phone to look, that reads exactly
  // like the change not having happened -- twice now it did.
  //
  // Network-first costs nothing on a working connection: the page comes from
  // Cloudflare either way. On a bad one the cached copy is served after two
  // and a half seconds, and offline it is served immediately, which is what
  // the cache was put there for. The fresh copy is stored either way, so the
  // slow path is still correct next time.
  if (event.request.mode === "navigate") {
    event.respondWith(retea_intai(event.request, url));
    return;
  }

  event.respondWith(
    // ignoreSearch: every real browse.html visit carries ?category=...&
    // role=..., but the precache stores the bare path. Without this the
    // precached page was unreachable -- offline deep links fell through
    // to the index.html fallback, and post-deploy visits could pin the
    // previous release from the CDN edge. The query only matters to the
    // page's own JS, never to the static file server.
    caches.match(event.request, { ignoreSearch: true }).then(function (cached) {
      if (cached) {
        // The scripts and dictionaries a page calls into: refreshing only
        // the HTML left a new index.html running an old viewer.js until the
        // next version bump. Pages themselves no longer come through here --
        // they are fetched above -- so this is the asset half of the same
        // rule.
        var dest = event.request.destination;
        if (dest === "script" || url.pathname.indexOf("/locales/") === 0) {
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
