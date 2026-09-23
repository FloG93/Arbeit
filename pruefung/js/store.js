'use strict';

/* Zustand und Persistenz.
 *
 * localStorage reicht: ein Auftrag mit Messwerten sind wenige Kilobyte. Jeder
 * Tastendruck in einem Messfeld wird gespeichert (gebündelt nach 300 ms) —
 * eine App, die im Keller abstürzt, darf keine Messreihe kosten. Fotos würden
 * das sprengen; die kämen wie im Raumrechner in IndexedDB. */
(function (P) {
  const KEY = 'pruefung.v1';
  const SCHEMA = 1;

  let uid = Date.now();
  const nid = () => ++uid;

  function defaultState() {
    return {
      schemaVersion: SCHEMA,
      world: 'efh',
      tab: 'auftraege',
      hc: false,
      bigText: false,
      sticky: {},
      activeJobId: null,
      jobs: [],
    };
  }

  const S = { state: defaultState() };
  const listeners = [];
  let saveTimer = null;

  S.subscribe = fn => { listeners.push(fn); };
  function notify() { for (const fn of listeners) fn(S.state); }

  S.load = function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { /* privates Fenster */ }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === SCHEMA) S.state = Object.assign(defaultState(), parsed);
      } catch { /* beschädigt — lieber frisch anfangen als abstürzen */ }
    }
    if (!S.state.world || !P.data.worldById.has(S.state.world)) S.state.world = P.data.defaultWorld;
    for (const job of S.state.jobs) migrateJob(normalizeJob(job));
    if (!S.state.jobs.some(j => j.id === S.state.activeJobId)) S.state.activeJobId = null;
    return S.state;
  };

  /* Aus der ersten Fassung: ein Paket je Norm, keine Varianten. Die
   * Erstprüfung ist seitdem eine Variante des Anlagenpakets — gespeicherte
   * Aufträge werden umgehängt statt fallengelassen. */
  const RENAMED = { 'vde-0100-600': 'anlage', 'vde-0105-100': 'anlage', 'en-50678-50699': 'geraet' };

  function migrateJob(job) {
    if (RENAMED[job.normId]) {
      if (job.normId === 'vde-0100-600') {
        job.variantId = job.variantId || 'erstpruefung';
        job.session.facts.pruefanlass = job.session.facts.pruefanlass || 'erstpruefung';
        job.session.facts.freischaltung = job.session.facts.freischaltung || 'ja';
      }
      job.normId = RENAMED[job.normId];
    }
    const pack = P.data.packById.get(job.normId);
    if (pack && (!job.variantId || !pack.variantById.has(job.variantId))) {
      job.variantId = pack.variants[0] ? pack.variants[0].id : null;
    }
    const variant = pack ? P.data.variant(job.normId, job.variantId) : null;
    if (variant) {
      job.session.entry = job.session.entry || variant.entry;
      job.session.presetFacts = job.session.presetFacts || variant.presetFacts;
    }
    return job;
  }

  function normalizeJob(job) {
    job.session = job.session || { cursor: null, facts: {}, history: [], extraSteps: [], tags: [], done: false, resultId: null };
    job.session.facts = job.session.facts || {};
    job.session.history = job.session.history || [];
    job.session.extraSteps = job.session.extraSteps || [];
    job.session.tags = job.session.tags || [];
    job.results = job.results || {};
    job.protocol = job.protocol || {};
    job.interval = job.interval || { presetId: null, months: null, nextDue: null };
    return job;
  }

  S.save = function save(immediate) {
    clearTimeout(saveTimer);
    const write = () => {
      try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch { /* voll oder gesperrt */ }
    };
    if (immediate) write(); else saveTimer = setTimeout(write, 300);
  };

  /* Ein Weg für jede Änderung: patchen, speichern, neu zeichnen. */
  S.set = function set(patch, opts) {
    Object.assign(S.state, patch);
    S.save(opts && opts.immediate);
    if (!(opts && opts.silent)) notify();
  };

  S.activeJob = () => S.state.jobs.find(j => j.id === S.state.activeJobId) || null;
  S.job = id => S.state.jobs.find(j => j.id === id) || null;

  S.patchJob = function patchJob(id, fn, opts) {
    const job = S.job(id);
    if (!job) return null;
    fn(job);
    job.updatedAt = Date.now();
    S.save(opts && opts.immediate);
    if (!(opts && opts.silent)) notify();
    return job;
  };

  S.newJob = function newJob(pack, variant, world) {
    const sticky = S.state.sticky || {};
    const protocol = {};
    for (const field of (pack.protocol && pack.protocol.fields) || []) {
      if (field.sticky && sticky[field.id]) protocol[field.id] = sticky[field.id];
      else if (field.default === 'today') protocol[field.id] = P.util.todayISO();
    }
    const job = normalizeJob({
      id: nid(),
      world: world || S.state.world,
      normId: pack.id,
      variantId: variant ? variant.id : null,
      protocol,
      session: P.wizard.start(pack, world || S.state.world, variant),
      plan: null,
      results: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    S.state.jobs.unshift(job);
    S.state.activeJobId = job.id;
    S.state.tab = 'wizard';
    S.save(true);
    notify();
    return job;
  };

  /* Geräteprüfung heißt: zwanzig gleichartige Geräte hintereinander. Die
   * Kopfdaten und die Antworten bleiben, nur die gerätebezogenen Felder und
   * die Messwerte werden geleert. */
  S.duplicateJob = function duplicateJob(id) {
    const src = S.job(id);
    if (!src) return null;
    const pack = P.data.packById.get(src.normId);
    const protocol = Object.assign({}, src.protocol);
    for (const field of (pack && pack.protocol && pack.protocol.fields) || []) {
      if (field.perDevice) delete protocol[field.id];
    }
    const job = normalizeJob({
      id: nid(),
      world: src.world,
      normId: src.normId,
      variantId: src.variantId,
      protocol,
      session: JSON.parse(JSON.stringify(src.session)),
      plan: src.plan ? src.plan.slice() : null,
      results: {},
      interval: { presetId: src.interval.presetId, months: src.interval.months, nextDue: null },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    S.state.jobs.unshift(job);
    S.state.activeJobId = job.id;
    S.state.tab = job.session.done ? 'plan' : 'wizard';
    S.save(true);
    notify();
    return job;
  };

  S.setInterval = function setInterval(jobId, preset) {
    return S.patchJob(jobId, job => {
      const start = job.protocol.datum || P.util.todayISO();
      job.interval = preset
        ? { presetId: preset.id, months: preset.intervalMonths, nextDue: P.intervals.computeDue(start, preset.intervalMonths) }
        : { presetId: null, months: null, nextDue: null };
    });
  };

  S.removeJob = function removeJob(id) {
    S.state.jobs = S.state.jobs.filter(j => j.id !== id);
    if (S.state.activeJobId === id) S.state.activeJobId = S.state.jobs.length ? S.state.jobs[0].id : null;
    S.save(true);
    notify();
  };

  S.openJob = function openJob(id) {
    const job = S.job(id);
    if (!job) return;
    S.set({ activeJobId: id, tab: job.session.done ? 'plan' : 'wizard' });
  };

  /* Prüfer und Messgerät wechseln nicht je Auftrag — einmal eintippen reicht. */
  S.setProtocolField = function setProtocolField(jobId, pack, fieldId, value) {
    const field = ((pack.protocol && pack.protocol.fields) || []).find(f => f.id === fieldId);
    if (field && field.sticky) S.state.sticky = Object.assign({}, S.state.sticky, { [fieldId]: value });
    S.patchJob(jobId, job => {
      job.protocol = Object.assign({}, job.protocol, { [fieldId]: value });
      // Die Frist zählt ab dem Prüfdatum — wird es nachträglich korrigiert,
      // wandert die Fälligkeit mit, statt am alten Datum hängen zu bleiben.
      if (fieldId === 'datum' && job.interval && job.interval.months) {
        job.interval = Object.assign({}, job.interval, {
          nextDue: P.intervals.computeDue(value || P.util.todayISO(), job.interval.months),
        });
      }
    }, { silent: true });
    S.save();
  };

  S.setResult = function setResult(jobId, stepId, patch, opts) {
    return S.patchJob(jobId, job => {
      const prev = job.results[stepId] || {};
      job.results[stepId] = Object.assign({}, prev, patch, { at: Date.now() });
    }, opts);
  };

  S.resultOf = (job, stepId) => (job && job.results ? job.results[stepId] : null) || null;

  P.store = S;
})(window.Pruefung);
