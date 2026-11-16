/* SatsPilot service worker — caches non-sensitive static assets only.
 * Never caches /api/*, authenticated HTML, or wallet/receipt private data.
 */
const CACHE = "satspilot-static-v1";
// Never precache "/" — it may include session-specific HTML.
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;

  // Never touch private/dynamic API or receipt tokens.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/r/") ||
    url.pathname.startsWith("/verify/")
  ) {
    return;
  }

  // Cache-first only for hashed Next static assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Network-first for navigations; fall back to offline shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline")),
    );
  }
});
