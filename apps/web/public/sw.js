/* Smart Murojaat AI — service worker (PWA o'rnatilishi + offline).
 * Strategiya:
 *  - navigatsiya (HTML): network-first, uzilganda /offline.html
 *  - statik assetlar: cache-first (stale-while-revalidate)
 *  - API so'rovlari (/auth, /appeals, ...): hech qachon keshlanmaydi
 */
const CACHE = 'sm-cache-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon.svg', '/icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// API so'rovlarini aniqlash (keshlanmasligi kerak)
function isApiRequest(url) {
  return /\/(auth|appeals|users|dashboard|categories|departments|organizations|notifications|audit-logs|reports|geo|settings|files|telegram)(\/|$|\?)/.test(
    url.pathname,
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Faqat o'z originimiz; API va tashqi so'rovlar to'g'ridan-to'g'ri o'tadi
  if (url.origin !== self.location.origin || isApiRequest(url)) return;

  // HTML navigatsiya: network-first + offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Statik assetlar: cache-first, fonda yangilash
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
