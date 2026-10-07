const PREFIX = "suslik-kras-" + new URL(self.registration.scope).pathname;
const CACHE = PREFIX + "pixel-world-3";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "locations.js",
  "game.js",
  "storage.js",
  "sprites.js",
  "city.js",
  "story.js",
  "dialogue.js",
  "assets/krasnoyarsk-world.png",
  "assets/map-suslik.png",
  "assets/menu-map.svg",
  "assets/menu-home.svg",
  "assets/fonts/PressStart2P-Regular.ttf",
  "manifest.webmanifest",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/concepts/01-adventurers.png",
  "assets/concepts/02-umbrella-medic-obrada-teacher.png",
  "assets/concepts/03-inspector-klim-cosmonaut-cook.png",
  "assets/concepts/04-sail-it-sauna-vovchik-miner.png",
  "assets/concepts/05-wrestler.png",
  "assets/concepts/06-football-coins-artist-reader-newlyweds.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(FILES);
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
      for (const client of await self.clients.matchAll())
        client.postMessage("OFFLINE_READY");
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data === "CACHE_STATUS")
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const entries = await Promise.all(
          FILES.map((file) =>
            cache.match(new URL(file, self.registration.scope).href),
          ),
        );
        event.source?.postMessage(
          entries.every(Boolean) ? "OFFLINE_READY" : "OFFLINE_FAILED",
        );
      })(),
    );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(new URL(self.registration.scope).pathname)
  )
    return;
  if (event.request.mode === "navigate")
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(new URL("./", self.registration.scope).href)) ||
          fetch(event.request)
        );
      })(),
    );
  else if (
    FILES.some(
      (file) =>
        new URL(file, self.registration.scope).pathname === url.pathname,
    )
  )
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(event.request, { ignoreSearch: true })) ||
          fetch(event.request)
        );
      })(),
    );
});
