'use strict';
// Offline ist hier kein Komfort, sondern die Voraussetzung: Hausanschlussraum,
// Keller, Industriehalle — meist kein Netz. Gecacht wird deshalb die ganze
// App-Shell samt aller Datenpakete unter data/.
//
// Bei jeder Änderung an Dateien oder Daten die CACHE-Version hochzählen:
// install() lädt dann alles neu, activate() räumt die alte Fassung weg.
const CACHE = 'pruefung-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './version.json',
  './js/sw-guard.js',
  './js/util.js',
  './js/data.js',
  './js/limits.js',
  './js/intervals.js',
  './js/cable.js',
  './js/wizard.js',
  './js/plan.js',
  './js/store.js',
  './js/ui.js',
  './js/view-auftraege.js',
  './js/view-wizard.js',
  './js/view-plan.js',
  './js/view-wiki.js',
  './js/view-protokoll.js',
  './js/view-leitungen.js',
  './js/app.js',
  './data/index.json',
  './data/welten.json',
  './data/grenzwerte.json',
  './data/prueffristen.json',
  './data/leitungen.json',
  './data/normen/anlagenpruefung.json',
  './data/normen/geraetepruefung.json',
  './data/wiki/messverfahren.json',
  './data/wiki/netzformen.json',
  './data/wiki/fehlerquellen.json',
  './data/wiki/geraete.json',
  './data/wiki/grundlagen.json',
  './data/wiki/leitungen.json',
  './fonts/hanken-grotesk-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

// Nur eigene Pfade beantworten: auf derselben Herkunft liegen zwei weitere
// Apps, und ein Worker, der alles im Scope schluckt, liefert ihnen
// eingefrorene Dateien aus (siehe app/sw.js).
const SHELL = new Set(ASSETS.map(p => new URL(p, self.location).pathname));

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

// Cache-first mit Nachladen im Hintergrund: im Keller sofort da, beim nächsten
// Start mit Netz aktuell.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (!SHELL.has(url.pathname)) return;

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
