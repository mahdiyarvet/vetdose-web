// VetDose Pro Service Worker
const CACHE = "vetdose-v5";
const OFFLINE_URLS = ["/", "/api/drugs"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(OFFLINE_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // API calls: network first, no cache
  if (e.request.url.includes("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response("{}", {headers:{"Content-Type":"application/json"}})));
    return;
  }
  // Static assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
    ).catch(() => caches.match("/"))
  );
});
