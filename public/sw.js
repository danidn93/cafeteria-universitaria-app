const CACHE_NAME = "cafeteria-unemi-v1.0.1";

self.addEventListener("install", (event) => {
  console.log("[SW] Instalando...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activando...");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});