const CACHE_NAME = 'noor-islam-v6';
const API_CACHE_NAME = 'noor-islam-api-v6';
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
  '/workers/background-timer-worker.js',
  '/audio/dhikr/salli-ala-nabi.mp3',
  '/audio/dhikr/subhan-allah-wabihamdih.mp3',
  '/audio/dhikr/la-hawla-wala-quwwata.mp3',
  '/audio/dhikr/subhan-allah-alazim.mp3',
];

const PRAYER_NAMES_AR = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const ADHAN_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const swFiredAdhanSigs = new Set();
const swFiredPreAdhanSigs = new Set();

let swPrayerState = {
  timings: null,
  timezone: 'Africa/Cairo',
  muadhinName: 'الشيخ نصر الدين طوبار',
  adhanEnabled: true,
  adhanNotifEnabled: true,
  preAdhanEnabled: true,
};
let swCheckTimer = null;

function cleanTime(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().slice(0, 5);
}

function addMinutesToTime24(hhmm, deltaMinutes) {
  const parts = cleanTime(hhmm).split(':');
  if (parts.length < 2) return hhmm;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
}

function getZonedHHMMAndDate(now, timeZone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const hourNum = parseInt(map.hour || '0', 10) % 24;
    const hhmm = String(hourNum).padStart(2, '0') + ':' + (map.minute || '00');
    const dateKey = (map.year || '') + '-' + (map.month || '') + '-' + (map.day || '');
    return { hhmm, dateKey };
  } catch {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return { hhmm: h + ':' + m, dateKey: now.toDateString() };
  }
}

async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage(message);
    }
  } catch {
    // ignore
  }
}

function checkServiceWorkerPrayerSchedule() {
  if (!swPrayerState.timings) return;
  const now = new Date();
  const { hhmm, dateKey } = getZonedHHMMAndDate(now, swPrayerState.timezone);

  for (const key of ADHAN_KEYS) {
    const target = cleanTime(swPrayerState.timings[key]);
    if (!target) continue;

    if ((swPrayerState.adhanEnabled || swPrayerState.adhanNotifEnabled) && target === hhmm) {
      const sig = dateKey + '-' + key + '-' + hhmm;
      if (!swFiredAdhanSigs.has(sig)) {
        swFiredAdhanSigs.add(sig);
        if (swPrayerState.adhanNotifEnabled && self.registration && self.registration.showNotification) {
          self.registration
            .showNotification('حان الآن موعد أذان ' + (PRAYER_NAMES_AR[key] || key), {
              body: 'يرفع الأذان بصوت ' + (swPrayerState.muadhinName || 'المؤذن المختار'),
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: 'adhan-' + key,
              renotify: true,
              requireInteraction: true,
              vibrate: [300, 120, 300, 120, 400],
            })
            .catch(() => {});
        }
        notifyClients({
          type: 'SW_ADHAN_DUE',
          prayerKey: key,
          hhmm,
          signature: sig,
        });
      }
    }

    if (swPrayerState.preAdhanEnabled) {
      const preTarget = addMinutesToTime24(target, -10);
      if (preTarget === hhmm) {
        const preSig = dateKey + '-pre-' + key + '-' + hhmm;
        if (!swFiredPreAdhanSigs.has(preSig)) {
          swFiredPreAdhanSigs.add(preSig);
          if (self.registration && self.registration.showNotification) {
            self.registration
              .showNotification('اقترب موعد صلاة ' + (PRAYER_NAMES_AR[key] || key), {
                body: 'تبقى ١٠ دقائق على دخول وقت الصلاة — تهيأ للوضوء والذكر',
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'pre-adhan-' + key,
                renotify: true,
                requireInteraction: true,
                vibrate: [250, 100, 250],
              })
              .catch(() => {});
          }
          notifyClients({
            type: 'SW_PRE_ADHAN_DUE',
            prayerKey: key,
            hhmm,
            signature: preSig,
          });
        }
      }
    }
  }
}

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

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SHOW_NOTIFICATION' && data.payload) {
    const { title, body, tag } = data.payload;
    if (data.payload.signature) {
      if (String(tag || '').startsWith('pre-adhan-')) {
        swFiredPreAdhanSigs.add(data.payload.signature);
      } else if (String(tag || '').startsWith('adhan-')) {
        swFiredAdhanSigs.add(data.payload.signature);
      }
    }
    if (self.registration && self.registration.showNotification) {
      event.waitUntil(
        self.registration
          .showNotification(title, {
            body: body || '',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: tag || 'noor-islam-alert',
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 120, 300, 120, 400],
          })
          .catch(() => {})
      );
    }
  } else if (data.type === 'SYNC_PRAYER_STATE' && data.payload) {
    swPrayerState = {
      ...swPrayerState,
      ...data.payload,
    };
    if (swCheckTimer === null) {
      swCheckTimer = setInterval(checkServiceWorkerPrayerSchedule, 10000);
    }
    checkServiceWorkerPrayerSchedule();
  }
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

  // Same-origin assets & pages (skip /api/ and HMR sockets)
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.includes('webpack-hmr')) {
      return;
    }

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

    // Network-first for Next.js JS/CSS chunks so fresh SSR HTML never hydrates against stale cached JS
    if (url.pathname.startsWith('/_next/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match(request))
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
