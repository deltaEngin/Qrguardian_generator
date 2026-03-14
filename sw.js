const CACHE_NAME = 'qrguardian-generator-v2';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',

  '/js/qrcode.min.js',
  '/js/jspdf.umd.min.js',
  '/js/database.js',
  '/js/bulk-generator.js',
  '/js/app.js',

  // CDN
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',

  // FONTS POPPINS LOCAL
  '/css/fonts/poppins-v24-latin_latin-ext-300.woff2',
  '/css/fonts/poppins-v24-latin_latin-ext-regular.woff2',
  '/css/fonts/poppins-v24-latin_latin-ext-500.woff2',
  '/css/fonts/poppins-v24-latin_latin-ext-600.woff2',
  '/css/fonts/poppins-v24-latin_latin-ext-700.woff2',
  '/css/fonts/poppins-v24-latin_latin-ext-800.woff2',

  // icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];


// INSTALL
self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME).then(async cache => {

      for (const url of urlsToCache) {

        try {

          const response = await fetch(url, { mode: 'no-cors' });

          await cache.put(url, response);

        } catch (err) {

          console.warn("Impossible de cacher :", url);

        }

      }

    })

  );

});


// FETCH
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  event.respondWith(

    caches.match(event.request)
      .then(cached => {

        const fetchPromise = fetch(event.request)
          .then(networkResponse => {

            if (networkResponse && networkResponse.status === 200) {

              const clone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));

            }

            return networkResponse;

          })
          .catch(() => cached);

        return cached || fetchPromise;

      })
      .catch(() => {

        if (event.request.mode === 'navigate') {

          return caches.match('/index.html');

        }

      })

  );

});


// ACTIVATE
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(cacheNames => {

      return Promise.all(

        cacheNames.map(name => {

          if (name !== CACHE_NAME) {

            console.log("Suppression cache :", name);

            return caches.delete(name);

          }

        })

      );

    })

  );

  return self.clients.claim();

});
