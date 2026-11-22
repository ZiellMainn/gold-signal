/* Service worker: simpan tampilan aplikasi supaya cepat dibuka. Data harga selalu diambil langsung dari internet. */
const CACHE = 'gold-signal-v4';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/core.js', 'js/market.js', 'js/reader.js', 'js/chart-view.js', 'js/guide.js', 'js/learn.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-64.png', 'icons/apple-180.png', 'icons/paw-logo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // API harga: jangan di-cache
  // network-first: versi terbaru dari GitHub dipakai kalau online, cache kalau offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./'))); });
