const CACHE_VERSION = "2026-11-10-build";
const SHELL_CACHE = `gidireads-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gidireads-runtime-${CACHE_VERSION}`;
// With the Vite production build, JS/CSS assets are fingerprinted. Precache only stable URLs;
// hashed app assets are cached at runtime when fetched.
const SHELL_FILES = [
  "/manifest.webmanifest",
  "/assets/gidireads-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_FILES.map(async (file) => {
      try { await cache.add(new Request(file, { cache: "reload" })); }
      catch (error) { console.warn("GidiReads shell asset was not cached:", file, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("gidireads-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Supabase/API-like or user-specific responses.
  if (/\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\/|\/functions\/v1\//i.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        const cached = await caches.match(request) || await caches.match(new URL(request.url).pathname);
        return cached || new Response("<main><h1>You're offline</h1><p>This page hasn't been saved on this device yet. Reconnect and open it once to make it available offline.</p><a href='/library.html'>Return to your library</a></main>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetchAndStore = async () => {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    };
    if (cached) {
      event.waitUntil(fetchAndStore().catch(() => {}));
      return cached;
    }
    try { return await fetchAndStore(); }
    catch { return new Response("This GidiReads resource is not available offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }); }
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data?.text() || "There is a new update on GidiReads." }; }
  const title = data.title || "GidiReads";
  const options = {
    body: data.body || "There is a new announcement on GidiReads.",
    icon: "/assets/icon-512.png",
    badge: "/assets/gidireads-badge.png",
    ...(data.image ? { image: data.image } : {}),
    tag: data.tag || "gidireads-announcement",
    renotify: false,
    data: { url: data.url || "/notifications.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications.html", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
