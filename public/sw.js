// RunCoach AI — Service Worker
// Only active in production. In development, this file self-unregisters.

const CACHE_NAME = "runcoach-v2";
const PRECACHE_URLS = ["/dashboard", "/run", "/history"];

// Self-unregister if running on localhost (dev mode)
if (
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1"
) {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((c) => c.navigate(c.url)))
    );
  });
} else {
  // --- Production SW ---

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(PRECACHE_URLS))
        .catch(() => {})
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Network-first for API calls
    if (event.request.url.includes("/api/")) {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
    }

    // Network-first for navigation (HTML pages)
    if (event.request.mode === "navigate") {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
      return;
    }

    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  });
}
