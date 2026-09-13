'use strict';

/* Lädt die Datenpakete und baut die Indizes.
 *
 * data/index.json ist der einzige Einstiegspunkt, den der Code kennt: eine
 * neue Norm oder ein neuer Wiki-Eintrag ist damit ein Datei-Austausch, kein
 * Code-Eingriff. Beim Laden wird genau eine Sache umgeschrieben — ein
 * "worlds": [...] wird zu when.world. Danach ist der Zwei-Welten-Modus für
 * die Engine ein Fakt wie jeder andere und braucht keinen Sonderfall. */
(function (P) {
  const { byId } = P.util;

  const D = {
    ready: false,
    registry: null,
    worlds: [],
    worldById: new Map(),
    limits: null,
    intervals: null,
    packs: [],
    packById: new Map(),
    wiki: [],
    wikiById: new Map(),
    problems: [],
  };

  const json = path => fetch(path, { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  });

  /* "worlds": ["industrie"] ist nur Zucker für when.world. Ein bereits
   * gesetztes when.world gewinnt, damit sich beides nie widerspricht. */
  function normalizeWhen(obj) {
    if (!obj || !Array.isArray(obj.worlds) || !obj.worlds.length) return obj;
    const when = Object.assign({}, obj.when);
    if (when.world == null) when.world = obj.worlds.slice();
    obj.when = when;
    return obj;
  }

  function normalizePack(pack) {
    pack.nodes = pack.nodes || [];
    pack.steps = pack.steps || [];
    pack.phases = pack.phases || [];
    for (const node of pack.nodes) {
      normalizeWhen(node);
      for (const opt of node.options || []) normalizeWhen(opt);
    }
    for (const step of pack.steps) {
      normalizeWhen(step);
      for (const item of step.checklist || []) normalizeWhen(item);
    }
    pack.nodeById = byId(pack.nodes);
    pack.stepById = byId(pack.steps);
    pack.phaseById = byId(pack.phases);
    return pack;
  }

  D.loadAll = function loadAll() {
    return json('data/index.json').then(registry => {
      D.registry = registry;
      const jobs = [
        json('data/' + registry.worlds),
        json('data/' + registry.limits),
        registry.intervals ? json('data/' + registry.intervals) : Promise.resolve(null),
        Promise.all((registry.norms || []).map(entry =>
          json('data/' + entry.file).then(pack => {
            if (entry.status && !pack.status) pack.status = entry.status;
            return pack;
          })
        )),
        Promise.all((registry.wiki || []).map(file => json('data/' + file))),
      ];
      return Promise.all(jobs);
    }).then(([worlds, limits, intervals, packs, wikiFiles]) => {
      D.worlds = worlds.worlds || [];
      D.defaultWorld = worlds.default || (D.worlds[0] && D.worlds[0].id);
      D.worldById = byId(D.worlds);

      D.limits = limits;
      D.limitTableById = byId(limits.tables || []);
      D.formulaById = byId(limits.formulas || []);
      D.intervals = intervals;

      D.packs = packs.map(normalizePack);
      D.packById = byId(D.packs);

      D.wiki = [];
      for (const file of wikiFiles) {
        for (const entry of file.entries || []) {
          entry.collection = entry.collection || file.collection;
          normalizeWhen(entry);
          D.wiki.push(entry);
        }
      }
      D.wikiById = byId(D.wiki);
      D.ready = true;
      return D;
    });
  };

  D.activePacks = () => D.packs.filter(p => p.status === 'aktiv');
  D.world = id => D.worldById.get(id) || D.worldById.get(D.defaultWorld) || D.worlds[0];

  /* Terminologie je Welt: aus "Verteiler" wird im Industrie-Kontext
   * "Unterverteilung / Schaltschrank". Views rufen das statt fester Strings. */
  D.term = function term(key, worldId, fallback) {
    const world = D.world(worldId);
    const value = world && world.terms ? world.terms[key] : null;
    return value || fallback || key;
  };

  D.wikiFor = function wikiFor(ids) {
    return (ids || []).map(id => D.wikiById.get(id)).filter(Boolean);
  };

  P.data = D;
})(window.Pruefung);
