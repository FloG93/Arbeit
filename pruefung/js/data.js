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
    cables: null,
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

  /* Ein Paket kann mehrere Normen bedienen, die sich nur im Prüfanlass
   * unterscheiden — 0100-600 und 0105-100 teilen rund 80 % der Prüfschritte.
   * Jede Variante bringt ihren eigenen Einstiegsknoten und ihre Vorab-Fakten
   * mit; für die Engine sind das ganz gewöhnliche Fakten. Ein Paket ohne
   * variants bekommt eine implizite aus seinen eigenen Feldern. */
  function normalizeVariants(pack) {
    const declared = pack.variants && pack.variants.length ? pack.variants : [{ id: 'standard' }];
    pack.variants = declared.map(v => ({
      id: v.id,
      packId: pack.id,
      norm: v.norm || pack.norm,
      title: v.title || pack.title,
      short: v.short || pack.short || v.norm || pack.norm,
      edition: v.edition || pack.edition,
      status: v.status || pack.status,
      worlds: v.worlds || pack.worlds,
      entry: v.entry || pack.entry,
      presetFacts: v.presetFacts || {},
      plannedNote: v.plannedNote || pack.plannedNote,
    }));
    pack.variantById = byId(pack.variants);
    return pack;
  }

  function normalizePack(pack) {
    pack.nodes = pack.nodes || [];
    pack.steps = pack.steps || [];
    pack.phases = pack.phases || [];
    normalizeVariants(pack);
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
        registry.cables ? json('data/' + registry.cables) : Promise.resolve(null),
        Promise.all((registry.norms || []).map(entry =>
          json('data/' + entry.file).then(pack => {
            if (entry.status && !pack.status) pack.status = entry.status;
            return pack;
          })
        )),
        Promise.all((registry.wiki || []).map(file => json('data/' + file))),
      ];
      return Promise.all(jobs);
    }).then(([worlds, limits, intervals, cables, packs, wikiFiles]) => {
      D.worlds = worlds.worlds || [];
      D.defaultWorld = worlds.default || (D.worlds[0] && D.worlds[0].id);
      D.worldById = byId(D.worlds);

      D.limits = limits;
      D.limitTableById = byId(limits.tables || []);
      D.formulaById = byId(limits.formulas || []);
      D.intervals = intervals;
      D.cables = cables;

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

  /* Die Normauswahl zeigt Varianten, nicht Pakete: eine Karte je Norm. */
  D.variants = () => D.packs.flatMap(pack => pack.variants.map(v => ({ variant: v, pack })));
  D.variant = function variant(packId, variantId) {
    const pack = D.packById.get(packId);
    if (!pack) return null;
    return (variantId && pack.variantById.get(variantId)) || pack.variants[0] || null;
  };
  D.world = id => D.worldById.get(id) || D.worldById.get(D.defaultWorld) || D.worlds[0];

  /* Terminologie je Welt: aus "Verteiler" wird im Industrie-Kontext
   * "Unterverteilung / Schaltschrank". Views rufen das statt fester Strings. */
  D.term = function term(key, worldId, fallback) {
    const world = D.world(worldId);
    const value = world && world.terms ? world.terms[key] : null;
    return value || fallback || key;
  };

  D.jobTitle = function jobTitle(job) {
    const pack = D.packById.get(job.normId);
    const field = (pack && pack.protocol && pack.protocol.titleField) || 'objekt';
    return job.protocol[field] || (field === 'geraet' ? 'Gerät ohne Bezeichnung' : 'Prüfung ohne Objekt');
  };

  /* Pflichtangaben, die im Auftrag noch fehlen — das Protokoll nennt sie vor
   * dem Drucken, statt einen Bogen ohne Prüfer hinauszulassen. */
  D.missingFields = function missingFields(job, pack) {
    return ((pack && pack.protocol && pack.protocol.fields) || [])
      .filter(field => field.required && field.kind !== 'fact' && !String(job.protocol[field.id] || '').trim());
  };

  D.wikiFor = function wikiFor(ids) {
    return (ids || []).map(id => D.wikiById.get(id)).filter(Boolean);
  };

  P.data = D;
})(window.Pruefung);
