export function registerPwaUpdater() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register("/sw.js");

    console.log("[PWA] SW registrado");

    // Busca una nueva versión cada minuto
    setInterval(() => {
      registration.update();
    }, 60000);

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("[PWA] Nueva versión encontrada");

          newWorker.postMessage({
            type: "SKIP_WAITING",
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}