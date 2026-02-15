const CACHE_NAME = 'qrguardian-generator-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/all.min.css',
  './webfonts/fa-solid-900.woff2',
  './webfonts/fa-regular-400.woff2',
  './webfonts/fa-brands-400.woff2',
  './js/qrcode.min.js',
  './js/jspdf.umd.min.js',
  './js/database.js',
  './js/auth.js',
  './js/bulk-generator.js',
  './js/app.js',
  // Icônes PWA
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Installation : mise en cache atomique
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mise en cache des ressources du générateur');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Erreur lors du cache initial :', error);
      })
  );
});

// Interception des requêtes : stale-while-revalidate
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Ressource en cache → servir immédiatement + mise à jour asynchrone
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return response;
        }
        // Première visite → récupérer depuis le réseau et mettre en cache
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            // Optionnel : page hors ligne personnalisée
            // return caches.match('/offline.html');
          });
      })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activé, cache prêt');
      return self.clients.claim();
    })
  );
});