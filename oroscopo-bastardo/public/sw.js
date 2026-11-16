// Offline support for the web version. Pages: network first. Everything else: cache first.
const CACHE = 'oroscopo-bastardo-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const salva = (risposta) => {
    if (risposta.ok) caches.open(CACHE).then((c) => c.put(request, risposta.clone()));
    return risposta;
  };
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then(salva).catch(() => caches.match(request).then((r) => r || caches.match('./'))));
  } else {
    e.respondWith(caches.match(request).then((r) => r || fetch(request).then(salva)));
  }
});
