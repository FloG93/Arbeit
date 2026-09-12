'use strict';
// v6 löscht v5 mit: darin lagen fälschlich auch Dateien der Poster-App.
const CACHE = 'raumrechner-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './fonts/hanken-grotesk-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

// Der Scope dieses Workers ist die ganze Site, seit unter /poster/ eine zweite
// App auf derselben Herkunft liegt. Gecacht wird deshalb ausschließlich der
// eigene App-Shell — vorher schluckte der Worker jede Anfrage im Scope und
// lieferte der Poster-App eingefrorene Dateien aus, bis hin zu neuem HTML mit
// altem JavaScript.
const SHELL = new Set(ASSETS.map((p) => new URL(p, self.location).pathname));

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for the app shell, falling back to network and refreshing the
// cache in the background — keeps the calculator usable offline on site.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (!SHELL.has(url.pathname)) return; // fremde Apps im Scope unangetastet lassen

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
