const CACHE_NAME = 'noor-islam-v4';
const API_CACHE_NAME = 'noor-islam-api-v4';
const OFFLINE_AUDIO_CACHE = 'noor-quran-audio-v1';
const OFFLINE_TEXT_CACHE = 'noor-quran-pages-v1';
const OFFLINE_MEDIA_CACHE = 'noor-media-downloads-v1';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/images/kaaba.jpg',
  '/images/aqsa.jpg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = new Set([
    CACHE_NAME,
    API_CACHE_NAME,
    OFFLINE_AUDIO_CACHE,
    OFFLINE_TEXT_CACHE,
    OFFLINE_MEDIA_CACHE,
  ]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept continuous live radio streams
  if (
    url.hostname.includes('qurango.net') ||
    url.hostname.includes('radiojar.com') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts')
  ) {
    return;
  }

  // Offline-first lookup for downloaded Quran Audio & Prophets/Sharawi Archive Audio
  if (
    url.hostname.includes('everyayah.com') ||
    url.hostname.includes('cdn.mp3quran.net') ||
    url.hostname.includes('cdn.islamic.network') ||
    url.hostname.includes('archive.org')
  ) {
    const cacheTarget = url.hostname.includes('archive.org')
      ? OFFLINE_MEDIA_CACHE
      : OFFLINE_AUDIO_CACHE;
    event.respondWith(
      caches.open(cacheTarget).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request);
        })
      )
    );
    return;
  }

  // Quran Text API: Offline Cache first, then network + cache update
  if (url.hostname.includes('api.alquran.cloud')) {
    event.respondWith(
      caches.open(OFFLINE_TEXT_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Other Islamic APIs (Prayer Times, Radio list)
  if (url.hostname.includes('api.aladhan.com') || url.hostname.includes('mp3quran.net')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin assets & pages
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match('/') || caches.match(request))
      );
      return;
    }

    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
