/**
 * Service worker de la carte de fidélité.
 *
 * Volontairement minimal : il ne met rien en cache. Son seul rôle est de
 * recevoir les notifications push et d'ouvrir la carte quand on clique dessus.
 * Mettre la carte en cache donnerait un solde de points périmé, ce qui est pire
 * que pas de carte du tout.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Fidelia", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Fidelia", {
      body: payload.body ?? "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      // Une seule notification par commerce à la fois : on remplace la
      // précédente plutôt que d'empiler des rappels périmés.
      tag: payload.tag ?? "fidelia",
      renotify: true,
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Si la carte est déjà ouverte quelque part, on y revient au lieu
      // d'ouvrir un énième onglet.
      for (const client of windows) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
