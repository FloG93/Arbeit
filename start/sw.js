'use strict';
// Service Worker der Übersichtsseite.
//
// Dieser Worker liegt an derselben Stelle wie früher der des Raumrechners
// (/sw.js mit Scope /). Der Browser erkennt die neuen Bytes und ersetzt die
// alte Registrierung — genau darum ist die Datei hier und nicht unter
// start/sw.js im Deploy: ohne Ablösung bliebe der alte Worker aktiv und
// lieferte an der Wurzel weiter die zwischengespeicherte Fassung des
// Raumrechners aus, obwohl dort jetzt die Übersicht liegt.
//
// Bei jeder Dateiänderung die Version hochzählen und neue Dateien eintragen.
const CACHE = 'start-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './fonts/hanken-grotesk-latin.woff2',
  './fonts/space-grotesk-latin.woff2',
];

// Nur die eigenen Pfade beantworten: auf derselben Herkunft liegen vier Apps,
// und dieser Worker hat sie alle im Scope. Ein Worker, der hier alles
// schluckt, liefert ihnen eingefrorene Dateien aus (siehe app/sw.js).
const SHELL = new Set(ASSETS.map(p => new URL(p, self.location).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // Nur eigene Altstände löschen. Ein pauschales „alles außer meinem
      // Cache" würde den Apps unter /pruefung/ und /raum/ den Offline-Betrieb
      // unter den Füßen wegziehen.
      .then(keys => Promise.all(keys.filter(k => k.indexOf('start-') === 0 && k !== CACHE).map(k => caches.delete(k))))
      // Die Wurzel-Einträge des alten Raumrechner-Caches gehören jetzt dieser
      // Seite. Gezielt diese Einträge entfernen, nicht den ganzen Cache: unter
      // /raum/ arbeitet derselbe Cache-Name weiter.
      .then(() => caches.keys())
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(name =>
        caches.open(name).then(cache => cache.keys().then(reqs => Promise.all(
          reqs.filter(r => SHELL.has(new URL(r.url).pathname)).map(r => cache.delete(r))
        )))
      )))
      .then(() => self.clients.claim())
      // Wer die Wurzel gerade offen hat, sieht noch die alte Seite aus dem
      // Cache. Einmal neu laden, statt ihn raten zu lassen, warum da der
      // Raumrechner steht.
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => {
        if (SHELL.has(new URL(client.url).pathname)) client.navigate(client.url).catch(() => {});
      }))
      .catch(() => {})
  );
});

// Cache-first mit Nachladen im Hintergrund: sofort da, beim nächsten Start
// mit Netz aktuell.
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
