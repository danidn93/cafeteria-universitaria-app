const SW_VERSION = "2026-07-02-04";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || "Notificación", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data,
    })
  );
});