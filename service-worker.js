const CACHE_VERSION = "v21";
const CACHE_NAME = "rotabo-cache-" + CACHE_VERSION;

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
  "/searching.html",
  "/driver-dashboard.html",
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
      return cache.addAll(PRECACHE_URLS);
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

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* ignore malformed payload */ }

  var title = data.title || "Rotabo";
  var options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32.png",
    data: { url: data.url || "/searching.html" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/searching.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(url) !== -1 && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  // Only cache same-origin site assets. Cross-origin requests (Supabase
  // REST/API calls, the Supabase JS CDN script, Stripe, etc.) must always
  // hit the network so dynamic data is never served stale from cache.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
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
