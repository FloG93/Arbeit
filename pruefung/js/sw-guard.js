// Rettungsleine, muss vor allen anderen Skripten laufen.
//
// Auf derselben Herkunft liegt der Raumrechner, dessen Service Worker die
// ganze Site im Scope hat. Ältere Fassungen davon cachten fremde Apps mit und
// lieferten sie danach eingefroren aus — neues HTML mit altem JavaScript, und
// die App startete nicht mehr (siehe poster/js/sw-recovery.js, Commit 60c77e9).
//
// Diese App bringt einen eigenen Worker mit. Alles, was unterhalb von ./ in
// einem Cache liegt, der nicht dieser App gehört, wird deshalb entfernt. Hat
// die Seite tatsächlich Fremdeinträge gefunden, lädt sie einmal neu, damit die
// Skripte frisch kommen. Überall sonst ein No-Op.
(function () {
  if (!('serviceWorker' in navigator) || !window.caches) return;

  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(reg => reg.update().catch(() => {})))
    .catch(() => {});

  const here = new URL('./', location.href).pathname;

  caches.keys()
    .then(names => Promise.all(names
      .filter(name => name.indexOf('pruefung-') !== 0)
      .map(name => caches.open(name).then(cache =>
        cache.keys().then(reqs => {
          const mine = reqs.filter(r => new URL(r.url).pathname.startsWith(here));
          return Promise.all(mine.map(r => cache.delete(r))).then(() => mine.length);
        })
      ))))
    .then(counts => {
      const purged = counts.reduce((a, b) => a + b, 0);
      if (!purged || !navigator.serviceWorker.controller) return;
      try {
        if (sessionStorage.getItem('pruefung.cachefix')) return;
        sessionStorage.setItem('pruefung.cachefix', '1');
      } catch (e) {
        return; // ohne sessionStorage lieber gar nicht neu laden
      }
      location.reload();
    })
    .catch(() => {});
})();
