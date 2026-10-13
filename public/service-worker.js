// service-worker.js
// Naikkan nomor versi setiap kali ada perubahan tampilan/aset,
// supaya HP yang sudah memasang PWA mengambil berkas baru (bukan cache lama).
const CACHE_NAME = 'family-manager-v3';
const API_CACHE = 'family-api-v3';
const STATIC_CACHE = 'family-static-v3';

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Hanya aset app-shell yang pasti ada di root (jangan cache file sumber .jsx —
      // di dev Vite menyajikannya sebagai modul, di build sudah jadi bundle ber-hash).
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icons/favicon.ico',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/brand/logo.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
 self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== API_CACHE && 
                   cacheName !== STATIC_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
 self.addEventListener('fetch', (event) => {
   // API requests - network first, then cache
   if (event.request.url.includes('/api/')) {
     event.respondWith(
       fetch(event.request)
         .then((response) => {
           // Cache successful responses
           if (response.ok) {
             const responseClone = response.clone();
             caches.open(API_CACHE).then((cache) => {
               cache.put(event.request, responseClone);
             });
           }
           return response;
         })
         .catch(() => {
           // Fallback to cache
           return caches.open(API_CACHE).then((cache) => {
             return cache.match(event.request);
           });
         })
     );
     return;
   }

   // Static assets - cache first
   event.respondWith(
     caches.match(event.request).then((response) => {
       if (response) {
         return response;
       }
       return fetch(event.request).then((response) => {
         // Hanya cache request GET (jangan cache POST/PUT)
         if (event.request.method !== 'GET') {
           return response;
         }
         // Clone response for cache
         const responseClone = response.clone();
         caches.open(STATIC_CACHE).then((cache) => {
           cache.put(event.request, responseClone);
         });
         return response;
       });
     })
   );
 });

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'family-api-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

async function syncFailedRequests() {
  const failedQueue = await getFailedRequests();
  const baseURL = 'https://your-api-domain.com'; // Replace with your API domain
  
  for (const item of failedQueue) {
    try {
      const response = await fetch(`${baseURL}${item.url}`, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      
      if (response.ok) {
        // Remove from failed queue
        await removeFailedRequest(item.id);
      } else {
        throw new Error(`Failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // Keep in queue for next sync
      return;
    }
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : null;
  
  const title = data?.title || 'Family Update';
  const options = {
    body: data?.body || 'You have a new update from your family',
    icon: '/icons/icon-144.png',
    badge: '/icons/icon-72.png',
    data: data?.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/icon-72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-72.png'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.preventDefault();
  
  if (event.action === 'view') {
    event.notification.close();
    // Navigate to the relevant page
    clients.openWindow(event.notification.data.url || '/');
  } else {
    // Dismiss notification
    event.notification.close();
  }
});

async function getFailedRequests() {
  // Implementation for retrieving failed requests from storage
  return [];
}

async function removeFailedRequest(id) {
  // Implementation for removing failed requests
}