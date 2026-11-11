/* Service Worker custom (injectManifest) — Bayt Mustaqbal.
   Menangani precache aset + push notification. */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// API: network first, fallback cache.
// Pengecualian: foto momen (path /api/moment/photo/) ditangani route gambar
// di bawah — URL-nya immutable, jadi tak perlu network-first tiap kali.
registerRoute(
  ({ url }) =>
    url.origin === 'https://api.baytmustaqbal.my.id' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/moment/photo/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Gambar: cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// Push notification
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : null;
  const title = data?.title || 'Bayt Mustaqbal';
  const options = {
    body: data?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: data?.url || '/' },
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.preventDefault();
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) { client.navigate(target); return client.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
