const CACHE_NAME = "pwa-shell-v1";
const SHELL_URLS = ["/offline"];
const PROTECTED_PATH_PATTERNS = [
  /\/api\//i,
  /\/client\/me/i,
  /\/identity/i,
  /\/booking-identity/i,
  /\/upcoming/i,
  /\/appointments/i,
  /\/agendamentos/i,
  /\/meus-dados/i
];

function isProtectedUrl(url) {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isProtectedUrl(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
  }
});
