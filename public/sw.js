const CACHE_VERSION = "nhimbe-v3";

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Only http(s) GET responses can be safely cached. chrome-extension://, data:,
// blob: and partial/opaque responses must be skipped to avoid runtime errors.
function isCacheable(request, response) {
  if (!response || !response.ok) return false;
  if (response.type === "opaque" || response.type === "opaqueredirect") return false;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return true;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(request, response)) {
      const clone = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone)).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(request, response)) {
      const clone = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone)).catch(() => {});
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Skip non-http(s) schemes (chrome-extension://, blob:, data:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Skip cross-origin requests entirely — let the browser handle them
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for immutable hashed assets (_next/static)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Network-first for HTML pages and everything else
  event.respondWith(networkFirst(event.request));
});
