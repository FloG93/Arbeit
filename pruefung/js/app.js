'use strict';

/* Bootstrap, Kopfzeile, Router — und der Selbsttest.
 *
 * Render-Strategie wie im Raumrechner: bei jeder Änderung wird #app komplett
 * neu gezeichnet und der Fokus über data-fkey zurückgesetzt. Für eine App
 * dieser Größe ist das die einfachste Variante, die nicht auseinanderläuft. */
(function (P) {
  const { el, captureFocus, restoreFocus } = P.util;
  const U = P.ui;

  const TABS = [
    { id: 'auftraege', label: 'Aufträge' },
    { id: 'wizard', label: 'Assistent' },
    { id: 'plan', label: 'Plan' },
    { id: 'leitungen', label: 'Leitungen' },
    { id: 'wiki', label: 'Wiki' },
  ];

  P.nav = { stepId: null, wikiId: null, calcId: null, query: '', kind: null, allWorlds: false, multi: [], multiNode: null };

  let toast = null;
  let toastTimer = null;
  let toastHost = null;

  P.flash = function flash(msg) {
    toast = msg;
    renderToast();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast = null; renderToast(); }, 4000);
  };

  function renderToast() {
    if (!toastHost) {
      toastHost = el('div', { class: 'toast-host' });
      document.body.appendChild(toastHost);
    }
    toastHost.innerHTML = '';
    toastHost.hidden = !toast;
    if (toast) toastHost.appendChild(el('div', { class: 'toast' }, toast));
  }

  /* Ein Ziel für alle Querverweise: Wiki-Einträge landen im Wiki, Schritt-IDs
   * im Prüfplan. So können Datenpakete beides in related/link mischen. */
  P.openWiki = function openWiki(id) {
    if (P.data.wikiById.has(id)) {
      P.nav.wikiId = id;
      P.store.set({ tab: 'wiki' });
      return;
    }
    const job = P.store.activeJob();
    const pack = job ? P.data.packById.get(job.normId) : null;
    if (pack && pack.stepById.has(id) && job.session.done) {
      P.nav.stepId = id;
      P.store.set({ tab: 'plan' });
      return;
    }
    const norm = P.data.packById.get(id);
    if (norm) {
      P.flash(norm.status === 'aktiv' ? norm.norm + ' über „Neue Prüfung“ starten.' : norm.norm + ' ist noch nicht enthalten.');
      P.store.set({ tab: 'auftraege' });
      return;
    }
    P.flash('Verweis nicht gefunden: ' + id);
  };

  function switchWorld(worldId) {
    P.store.set({ world: worldId });
  }

  function adoptWorld(job, pack, worldId) {
    if (!confirm('Auftrag auf „' + P.data.world(worldId).label + '“ umstellen? Der Prüfplan wird neu berechnet, erfasste Messwerte bleiben erhalten.')) return;
    P.store.patchJob(job.id, j => {
      j.world = worldId;
      j.session.facts.world = worldId;
      P.wizard.replay(pack, j.session);
      j.plan = null;
    });
  }

  function header() {
    const state = P.store.state;
    const job = P.store.activeJob();
    const pack = job ? P.data.packById.get(job.normId) : null;
    const variant = job ? P.data.variant(job.normId, job.variantId) : null;
    const activeTab = state.tab === 'protokoll' ? 'plan' : state.tab;

    // Der Kopfbereich kostet Platz, den der Prüfplan besser gebrauchen kann:
    // Norm als Zeile darüber, Objekt als Titel — und die Kontextzeile nur,
    // wenn Auftrag und eingestellte Welt auseinanderlaufen.
    const worldMismatch = job && job.world !== state.world && state.tab !== 'leitungen';
    // Im Leitungen-Tab gehört der Kopf der Rechnung, nicht dem Prüfauftrag.
    const calc = state.tab === 'leitungen' && P.nav.calcId ? P.store.calc(P.nav.calcId) : null;
    const eyebrow = state.tab === 'leitungen' ? 'Leitungsberechnung' : variant ? variant.norm : 'Prüfassistent';
    const title = state.tab === 'leitungen'
      ? (calc ? P.views.calcTitle(calc) : 'Leitungen')
      : job ? P.data.jobTitle(job) : 'VDE-Prüfungen';

    return el('div', { class: 'header' }, [
      el('div', { class: 'header-row' }, [
        el('div', { class: 'brand' }, [
          el('div', { class: 'eyebrow' }, eyebrow),
          el('div', {
            class: 'brand-name',
            'data-job-title': state.tab !== 'leitungen' && job ? job.id : null,
            'data-calc-title': calc ? calc.id : null,
          }, title),
        ]),
        el('div', { class: 'head-tools' }, [
          el('button', {
            class: 'icon-btn' + (state.hc ? ' on' : ''), type: 'button',
            title: 'Tageslicht-Modus', 'aria-label': 'Tageslicht-Modus umschalten',
            onClick: () => P.store.set({ hc: !state.hc }),
          }, state.hc ? '☀' : '☾'),
          el('button', {
            class: 'icon-btn' + (state.bigText ? ' on' : ''), type: 'button',
            title: 'Größere Schrift', 'aria-label': 'Schriftgröße umschalten',
            onClick: () => P.store.set({ bigText: !state.bigText }),
          }, 'A+'),
        ]),
      ]),
      el('div', { class: 'seg' }, P.data.worlds.map(world => el('button', {
        class: 'seg-btn' + (state.world === world.id ? ' active' : ''), type: 'button',
        'aria-pressed': state.world === world.id ? 'true' : 'false',
        onClick: () => switchWorld(world.id),
      }, [
        el('span', { class: 't' }, world.label),
        el('span', { class: 's' }, world.sub),
      ]))),
      worldMismatch
        ? el('div', { class: 'context-strip' }, [
            el('span', { class: 'world-dot' }),
            el('span', { class: 'txt' }, 'Auftrag läuft als ' + P.data.world(job.world).short),
            el('button', {
              class: 'mini-btn', type: 'button',
              onClick: () => adoptWorld(job, pack, state.world),
            }, 'umstellen'),
          ])
        : null,
      el('div', { class: 'tabbar' }, TABS.map(tab => el('button', {
        class: 'tab-btn' + (activeTab === tab.id ? ' active' : ''), type: 'button',
        onClick: () => {
          if (tab.id === 'plan') P.nav.stepId = null;
          if (tab.id === 'wiki') P.nav.wikiId = null;
          if (tab.id === 'leitungen') P.nav.calcId = null;
          P.store.set({ tab: tab.id });
        },
      }, tab.label))),
    ]);
  }

  function currentView() {
    const tab = P.store.state.tab;
    const views = P.views;
    if (tab === 'wizard') return views.wizard();
    if (tab === 'plan') return views.plan();
    if (tab === 'protokoll') return views.protokoll();
    if (tab === 'wiki') return views.wiki();
    if (tab === 'leitungen') return views.leitungen();
    return views.auftraege();
  }

  P.render = function render() {
    const mark = captureFocus();
    const state = P.store.state;
    const root = document.documentElement;
    root.dataset.world = state.world;
    root.classList.toggle('hc', !!state.hc);
    root.classList.toggle('big', !!state.bigText);

    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(header());

    let result;
    try {
      result = currentView();
    } catch (err) {
      console.error('[Prüfassistent] Ansicht fehlgeschlagen', err);
      result = { view: el('div', { class: 'view' }, [U.card('Fehler', el('p', { class: 'w-p' }, 'Diese Ansicht konnte nicht gezeichnet werden: ' + err.message))]) };
    }
    app.appendChild(el('div', { class: 'content' }, [result.view]));
    if (result.bottom) app.appendChild(result.bottom);
    restoreFocus(mark);
    renderToast();
    syncHistory();
  };

  /* ─── Zurück-Taste ───
   * Ohne Eintrag in der Browser-History führt die Zurück-Taste des Handys aus
   * der App heraus — mitten aus dem Prüfschritt. Jede Ansicht, die man
   * „betritt“ (Tab, Schritt, Wiki-Eintrag), bekommt deshalb einen Eintrag;
   * Tippen in Felder oder Antworten im Assistenten ändern ihn nicht. */
  let restoring = false;

  function navState() {
    const state = P.store.state;
    return {
      pruefung: true,
      tab: state.tab,
      jobId: state.activeJobId,
      stepId: state.tab === 'plan' ? P.nav.stepId : null,
      wikiId: state.tab === 'wiki' ? P.nav.wikiId : null,
      calcId: state.tab === 'leitungen' ? P.nav.calcId : null,
    };
  }
  const navKey = st => [st.tab, st.jobId, st.stepId, st.wikiId, st.calcId].join('|');

  function syncHistory() {
    if (restoring || !window.history || !history.replaceState) return;
    const next = navState();
    const current = history.state;
    if (!current || !current.pruefung) history.replaceState(next, '');
    else if (navKey(current) !== navKey(next)) history.pushState(next, '');
  }

  window.addEventListener('popstate', e => {
    const st = e.state;
    if (!st || !st.pruefung || !P.data.ready) return;
    restoring = true;
    try {
      P.nav.stepId = st.stepId || null;
      P.nav.wikiId = st.wikiId || null;
      P.nav.calcId = st.calcId && P.store.calc(st.calcId) ? st.calcId : null;
      const patch = { tab: st.tab || 'auftraege' };
      if (st.jobId && P.store.job(st.jobId)) patch.activeJobId = st.jobId;
      P.store.set(patch);
    } finally {
      restoring = false;
    }
  });

  /* ─── Selbsttest ───
   * Eine datengetriebene App steht und fällt mit der Integrität ihrer
   * Verweise. Der Selbsttest prüft sie, statt darauf zu hoffen: er läuft auf
   * localhost automatisch und ist sonst über Pruefung.selftest() erreichbar. */
  P.selftest = function selftest() {
    const problems = [];
    const note = (kind, msg) => problems.push(kind + ': ' + msg);

    const wikiIds = new Set(P.data.wiki.map(e => e.id));
    const normIds = new Set(P.data.packs.map(p => p.id));
    const checkWiki = (ids, where) => {
      for (const id of ids || []) {
        if (!wikiIds.has(id) && !normIds.has(id)) note('Verweis', where + ' → „' + id + '“ existiert nicht');
      }
    };

    for (const pack of P.data.packs) {
      if (pack.status !== 'aktiv') continue;

      for (const node of pack.nodes) {
        checkWiki(node.wiki, pack.id + '/' + node.id);
        const targets = [node.defaultNext].concat((node.options || []).map(o => o.next)).filter(Boolean);
        for (const target of targets) {
          if (!pack.nodeById.has(target)) note('Baum', pack.id + '/' + node.id + ' → „' + target + '“ existiert nicht');
        }
        for (const opt of node.options || []) {
          for (const stepId of opt.addSteps || []) {
            if (!pack.stepById.has(stepId)) note('Baum', pack.id + '/' + opt.id + ': addSteps → „' + stepId + '“ existiert nicht');
          }
        }
        // Nur die Welt prüfen: andere Fakten (Netzform, RCD) stehen an dieser
        // Stelle noch nicht fest, sonst wäre jede fachlich bedingte Option ein
        // Fehlalarm. Die Frage ist: kann diese Frage in dieser Welt überhaupt
        // etwas anzeigen?
        if (node.type === 'question') {
          for (const world of P.data.worlds) {
            const possible = (node.options || []).filter(o => !o.when || o.when.world == null
              || (Array.isArray(o.when.world) ? o.when.world.includes(world.id) : o.when.world === world.id));
            if (!possible.length) note('Welt', pack.id + '/' + node.id + ' hat in „' + world.short + '“ keine mögliche Option');
          }
        }
        if (node.type === 'result' && node.normRef && !normIds.has(node.normRef)) {
          note('Verweis', pack.id + '/' + node.id + ': normRef → „' + node.normRef + '“ existiert nicht');
        }
      }

      // Erreichbarkeit: jeder Knoten muss von mindestens einem
      // Varianten-Einstieg aus erreichbar sein.
      const seen = new Set();
      const queue = pack.variants.map(v => v.entry).filter(Boolean);
      for (const v of pack.variants) {
        if (!pack.nodeById.has(v.entry)) note('Baum', pack.id + '/' + v.id + ': entry „' + v.entry + '“ fehlt');
      }
      while (queue.length) {
        const id = queue.shift();
        if (!id || seen.has(id) || !pack.nodeById.has(id)) continue;
        seen.add(id);
        const node = pack.nodeById.get(id);
        if (node.defaultNext) queue.push(node.defaultNext);
        for (const opt of node.options || []) if (opt.next) queue.push(opt.next);
      }
      for (const node of pack.nodes) {
        if (!seen.has(node.id)) note('Baum', pack.id + '/' + node.id + ' ist vom Einstieg aus nicht erreichbar');
      }

      for (const step of pack.steps) {
        checkWiki(step.wiki, pack.id + '/' + step.id);
        checkWiki(step.pitfalls, pack.id + '/' + step.id + ' (pitfalls)');
        for (const reqId of step.requires || []) {
          if (!pack.stepById.has(reqId)) note('Schritt', pack.id + '/' + step.id + ': requires → „' + reqId + '“ existiert nicht');
        }
        if (step.phase && !pack.phaseById.has(step.phase)) note('Schritt', pack.id + '/' + step.id + ': Phase „' + step.phase + '“ ist nicht definiert');
        if (step.limitRef && !P.limits.table(step.limitRef)) note('Grenzwert', pack.id + '/' + step.id + ': limitRef → „' + step.limitRef + '“ existiert nicht');
        if (step.formulaRef && !P.limits.formula(step.formulaRef)) note('Grenzwert', pack.id + '/' + step.id + ': formulaRef → „' + step.formulaRef + '“ existiert nicht');
        const inputs = (step.measure && step.measure.inputs) || [];
        const gruppenIds = new Set(((step.measure && step.measure.gruppen) || []).map(g => g.id));
        for (const input of inputs) {
          if (input.limitFromInput && !inputs.some(i => i.id === input.limitFromInput && i.id !== input.id)) {
            note('Grenzwert', pack.id + '/' + step.id + '/' + input.id + ': limitFromInput → „' + input.limitFromInput + '“ ist kein anderes Feld dieses Schrittes');
          }
          if (input.role && !['reference', 'doku'].includes(input.role)) {
            note('Schritt', pack.id + '/' + step.id + '/' + input.id + ': unbekannte Rolle „' + input.role + '“');
          }
          if (input.gruppe && !gruppenIds.has(input.gruppe)) {
            note('Schritt', pack.id + '/' + step.id + '/' + input.id + ': Gruppe „' + input.gruppe + '“ ist nicht definiert');
          }
          if (input.quickFromLimit && !P.limits.table(input.quickFromLimit)) {
            note('Grenzwert', pack.id + '/' + step.id + '/' + input.id + ': quickFromLimit → „' + input.quickFromLimit + '“ existiert nicht');
          }
        }
        // Messstellen: Was hier fehlt, fällt erst im Feld auf — und dann steht
        // der Prüfer vor einer Liste, die keinen Wert annimmt.
        const messstellen = step.measure && step.measure.messstellen;
        if (messstellen) {
          if (!messstellen.unit) note('Schritt', pack.id + '/' + step.id + ': Messstellen ohne Einheit');
          if (!['min', 'max'].includes(messstellen.aggregate || (step.measure.aggregate || 'max'))) {
            note('Schritt', pack.id + '/' + step.id + ': Messstellen mit unbekanntem aggregate');
          }
          if (messstellen.limitKey && step.limitRef) {
            const table = P.limits.table(step.limitRef);
            if (table && !(table.rows || []).some(r => r.key === messstellen.limitKey)) {
              note('Grenzwert', pack.id + '/' + step.id + ': Messstellen-limitKey „' + messstellen.limitKey + '“ gibt es in „' + step.limitRef + '“ nicht');
            }
          }
          const seenFeld = new Set();
          for (const feld of messstellen.felder || []) {
            if (!feld.id || !feld.label) { note('Schritt', pack.id + '/' + step.id + ': Messstellen-Feld ohne id oder label'); continue; }
            if (seenFeld.has(feld.id)) note('Schritt', pack.id + '/' + step.id + ': Messstellen-Feld „' + feld.id + '“ kommt doppelt vor');
            seenFeld.add(feld.id);
            if (feld.id === 'wert' || feld.id === 'id') note('Schritt', pack.id + '/' + step.id + ': Messstellen-Feld „' + feld.id + '“ überschreibt ein Pflichtfeld');
            if (!['text', 'auswahl'].includes(feld.kind)) note('Schritt', pack.id + '/' + step.id + '/' + feld.id + ': unbekannte Feldart „' + feld.kind + '“');
            if (feld.kind === 'auswahl' && !(feld.optionen || []).length) note('Schritt', pack.id + '/' + step.id + '/' + feld.id + ': Auswahl ohne Optionen');
          }
        }
        // Zyklen in requires.
        const stack = [step.id];
        const visited = new Set();
        while (stack.length) {
          const current = stack.pop();
          for (const dep of (pack.stepById.get(current) || {}).requires || []) {
            if (dep === step.id) { note('Schritt', pack.id + ': Zyklus in requires um „' + step.id + '“'); break; }
            if (!visited.has(dep)) { visited.add(dep); stack.push(dep); }
          }
        }
      }
    }

    // Protokollfelder: Ein Feld, das eine Antwort übernimmt, ist nur so gut
    // wie der Fakt dahinter. Steht der nirgends, bleibt das Feld im Bogen
    // für immer leer — und niemand merkt es, bis er unterschreiben soll.
    for (const pack of P.data.activePacks()) {
      const groupIds = new Set(((pack.protocol && pack.protocol.groups) || []).map(g => g.id));
      const settable = new Set();
      for (const node of pack.nodes) {
        for (const opt of node.options || []) {
          for (const key of Object.keys(opt.set || {})) settable.add(key);
        }
      }
      for (const variant of pack.variants) {
        for (const key of Object.keys(variant.presetFacts || {})) settable.add(key);
      }
      for (const field of (pack.protocol && pack.protocol.fields) || []) {
        if (field.gruppe && !groupIds.has(field.gruppe)) {
          note('Protokoll', pack.id + '/' + field.id + ': Gruppe „' + field.gruppe + '“ ist nicht definiert');
        }
        if (field.kind !== 'fact') continue;
        if (!field.factKey) { note('Protokoll', pack.id + '/' + field.id + ': kind „fact“ ohne factKey'); continue; }
        if (!settable.has(field.factKey)) {
          note('Protokoll', pack.id + '/' + field.id + ': Fakt „' + field.factKey + '“ wird nirgends gesetzt');
        }
      }
      // Ein vorbelegter Fakt hat keine Antwortkarte, aus der ein Klartext
      // käme — dafür ist factLabels da. Fehlt er dort, bleibt das Feld leer.
      for (const variant of pack.variants) {
        for (const [key, value] of Object.entries(variant.presetFacts || {})) {
          const used = ((pack.protocol && pack.protocol.fields) || []).some(f => f.kind === 'fact' && f.factKey === key);
          if (!used) continue;
          const table = pack.factLabels && pack.factLabels[key];
          if (!table || !table[value]) {
            note('Protokoll', pack.id + '/' + variant.id + ': factLabels fehlt für ' + key + ' = „' + value + '“');
          }
        }
      }
      // Doppelte Checklisten-IDs teilen sich einen Zustand: zwei Zeilen, ein
      // Häkchen. Im Feld sieht das aus wie ein Fehler der App.
      for (const step of pack.steps) {
        const seen = new Set();
        for (const item of step.checklist || []) {
          if (seen.has(item.id)) note('Schritt', pack.id + '/' + step.id + ': Checklisten-ID „' + item.id + '“ kommt doppelt vor');
          seen.add(item.id);
        }
      }
    }

    // Ungeprüfte Grenzwerte sind kein Defekt, sondern ein Zustand — aber einer,
    // den man sehen muss. Deshalb Statuszeile statt Befund.
    const alleTabellen = (P.data.limits.tables || []).concat(P.data.cables ? P.cable.reviewTables(P.data.cables) : []);
    const ungeprueft = alleTabellen.filter(t => !(t.reviewed && t.reviewed.date));
    const reviewStatus = ungeprueft.length
      ? ungeprueft.length + ' von ' + alleTabellen.length + ' Grenzwerttabellen sind nicht gegen die Normfassung geprüft: ' + ungeprueft.map(t => t.id).join(', ')
      : 'Alle Grenzwerttabellen sind gegengeprüft.';

    for (const table of (P.data.limits.tables || [])) {
      const defaults = (table.rows || []).filter(r => r.default);
      if (defaults.length !== 1) note('Grenzwert', 'Tabelle „' + table.id + '“ hat ' + defaults.length + ' default-Zeilen (genau eine erwartet)');
      for (const row of table.rows || []) {
        if (row.min == null && row.max == null) note('Grenzwert', table.id + '/' + row.key + ' hat weder min noch max');
        if (!row.unit) note('Grenzwert', table.id + '/' + row.key + ' hat keine Einheit');
      }
    }

    if (P.data.cables) checkCables(P.data.cables, note);

    for (const entry of P.data.wiki) {
      checkWiki(entry.related && entry.related.filter(id => !isStepId(id)), 'wiki/' + entry.id + ' (related)');
      for (const block of entry.body || []) {
        if (block.type === 'limits' && !P.limits.table(block.limitRef)) note('Wiki', entry.id + ': limits → „' + block.limitRef + '“ existiert nicht');
        if (block.type === 'cable-table' && !U.CABLE_TABLES.includes(block.ref)) note('Wiki', entry.id + ': cable-table → „' + block.ref + '“ existiert nicht');
        if (block.type === 'formula' && !P.limits.formula(block.formulaRef)) note('Wiki', entry.id + ': formula → „' + block.formulaRef + '“ existiert nicht');
        if (block.type === 'link') checkWiki([block.to].filter(id => !isStepId(id)), 'wiki/' + entry.id + ' (link)');
      }
    }

    // Plan-Überdeckung: statt geratener Fakten den Baum wirklich ablaufen —
    // jede sichtbare Antwort, bei Mehrfachauswahl zusätzlich „nichts davon“.
    // Für jedes erreichte Ende muss ein Plan entstehen, der alle
    // requires-Kanten einhält.
    for (const pack of P.data.activePacks()) {
      for (const variant of pack.variants) {
        if (variant.status !== 'aktiv') continue;
        for (const world of P.data.worlds) {
          if (variant.worlds && !variant.worlds.includes(world.id)) continue;
          const ends = walkTree(pack, variant, world.id);
          const where = pack.id + '/' + variant.id + '/' + world.short;
          if (!ends.length) { note('Plan', where + ': der Baum führt zu keinem Prüfplan'); continue; }
          for (const session of ends) {
            const entries = P.plan.build(pack, session, {});
            if (!entries.length) { note('Plan', where + ': leerer Prüfplan bei ' + JSON.stringify(session.facts)); continue; }
            const pos = new Map(entries.map((e, i) => [e.step.id, i]));
            for (const entry of entries) {
              for (const reqId of entry.step.requires || []) {
                if (pos.has(reqId) && pos.get(reqId) > pos.get(entry.step.id)) {
                  note('Plan', where + ': „' + reqId + '“ steht nach „' + entry.step.id + '“, obwohl es Voraussetzung ist');
                }
              }
            }
          }
        }
      }
    }

    const report = ok => {
      console.group('[Prüfassistent] Selbsttest');
      if (problems.length) problems.forEach(p => console.warn(p));
      else console.log('Datenbasis in Ordnung: Verweise, Erreichbarkeit, Grenzwerte und Reihenfolge geprüft.');
      console.log('Prüfstand: ' + reviewStatus);
      if (ok != null) console.log(ok);
      console.groupEnd();
      return problems;
    };

    // Cache-Vollständigkeit: bricht „100 % offline“ still, wenn eine Datendatei
    // fehlt — deshalb namentlich prüfen, nicht nur die Anzahl.
    if (window.caches) {
      const expected = ['data/index.json', 'data/' + P.data.registry.worlds, 'data/' + P.data.registry.limits]
        .concat(P.data.registry.intervals ? ['data/' + P.data.registry.intervals] : [])
        .concat(P.data.registry.cables ? ['data/' + P.data.registry.cables] : [])
        .concat((P.data.registry.norms || []).map(n => 'data/' + n.file))
        .concat((P.data.registry.wiki || []).map(f => 'data/' + f));
      // Den eigenen Cache suchen statt seinen Namen zu kennen: eine zweite
      // Stelle mit der Versionsnummer wäre eine zweite Stelle zum Vergessen —
      // und caches.open() würde den Cache anlegen, den es prüfen soll.
      return caches.keys().then(names => {
        const mine = names.filter(n => n.indexOf('pruefung-') === 0).sort();
        if (!mine.length) return report('Noch kein Cache — der Service Worker installiert sich beim ersten Besuch erst nach dem Laden. Nach einem Neuladen erneut prüfen.');
        const name = mine[mine.length - 1];
        return caches.open(name).then(cache => cache.keys()).then(keys => {
          if (!keys.length) return report('Cache „' + name + '“ ist noch leer — nach einem Neuladen erneut prüfen.');
          const have = new Set(keys.map(r => new URL(r.url).pathname));
          const base = new URL('./', location.href).pathname;
          const missing = expected.filter(path => !have.has(base + path));
          if (missing.length) { missing.forEach(m => problems.push('Cache: ' + m + ' fehlt im Offline-Cache')); return report(); }
          return report('Offline-Cache „' + name + '“ enthält alle ' + expected.length + ' Datendateien.');
        });
      }).catch(() => report());
    }
    return report();
  };

  /* Läuft den Entscheidungsbaum ab und sammelt die Sitzungen, die zu einem
   * Prüfplan führen. Hinweisknoten ohne „continue“ sind bewusste Sackgassen
   * (andere Norm zuständig) und zählen nicht als Ende. Gedeckelt, damit ein
   * breiter Baum den Selbsttest nicht sprengt. */
  function walkTree(pack, variant, worldId, limit) {
    const cap = limit || 150;
    const ends = [];
    const clone = session => JSON.parse(JSON.stringify(session));

    const walk = (session, depth) => {
      if (ends.length >= cap || depth > 30) return;
      if (session.done) { ends.push(session); return; }
      const node = P.wizard.node(pack, session);
      if (!node) { ends.push(session); return; }
      if (node.type === 'result') {
        if (!node.continue) return; // bewusste Sackgasse: andere Norm zuständig
        const after = P.wizard.finish(pack, clone(session));
        if (after.done) ends.push(after); else walk(after, depth + 1);
        return;
      }
      const options = P.wizard.visibleOptions(node, session.facts);
      const choices = node.multi ? [[]].concat(options.map(o => [o.id])) : options.map(o => [o.id]);
      for (const choice of choices) {
        const next = clone(session);
        P.wizard.answer(pack, next, choice);
        walk(next, depth + 1);
        if (ends.length >= cap) return;
      }
    };

    walk(P.wizard.start(pack, worldId, variant), 0);
    return ends;
  }

  /* Leitungsdaten: eine Lücke in einer Tabelle wäre im Feld ein stilles
   * „kein Wert“ — deshalb vollständig prüfen und die handgerechneten
   * Beispiele nachrechnen. */
  function checkCables(cb, note) {
    const bel = cb.belastbarkeit;
    const arten = new Set(cb.verlegearten.arten.map(a => a.id));
    for (const t of cb.leitungstypen.typen) {
      for (const va of t.verlegearten) {
        if (!arten.has(va)) { note('Leitung', t.id + ': Verlegeart „' + va + '“ existiert nicht'); continue; }
        for (const adern of ['2', '3']) {
          const reihe = bel.werte[va] && bel.werte[va][adern];
          if (!reihe || reihe.length !== bel.querschnitte.length) { note('Leitung', 'Belastbarkeit ' + va + '/' + adern + ' Adern unvollständig'); continue; }
          for (const S of t.querschnitte) {
            const i = bel.querschnitte.indexOf(S);
            if (i < 0 || !(reihe[i] > 0)) note('Leitung', t.id + ' ' + S + ' mm² hat in ' + va + '/' + adern + ' keinen Belastbarkeitswert');
          }
          for (let i = 1; i < reihe.length; i++) if (!(reihe[i] > reihe[i - 1])) note('Leitung', 'Belastbarkeit ' + va + '/' + adern + ' steigt nicht mit dem Querschnitt bei ' + bel.querschnitte[i] + ' mm²');
        }
      }
    }
    const fallend = (list, key, where) => {
      for (let i = 1; i < list.length; i++) {
        if (!(list[i][key] > list[i - 1][key])) note('Leitung', where + ': Stufen nicht aufsteigend');
        if (list[i].f > list[i - 1].f) note('Leitung', where + ': Faktor steigt bei ' + list[i][key]);
      }
    };
    const temp = cb.faktoren.temperatur;
    fallend(temp.luft.stufen, 'bis', 'Temperatur Luft');
    fallend(temp.erde.stufen, 'bis', 'Temperatur Erde');
    for (const a of cb.faktoren.haeufung.anordnungen) fallend(a.stufen, 'n', 'Häufung ' + a.id);
    const ls = cb.schutzorgane.ls;
    for (const ch of ls.charakteristiken) if (!(ch.ia_faktor > 0)) note('Leitung', 'LS ' + ch.id + ' ohne Ia-Faktor');
    for (const b of cb.schutzorgane.ls_durchlass.bereiche) {
      for (const ch of ['B', 'C']) if (!b[ch] || b[ch].length !== cb.schutzorgane.ls_durchlass.stufen_ik.length) note('Leitung', 'LS-Durchlass ' + ch + ' bis ' + b.in_max + ' A unvollständig');
    }
    const gg = cb.schutzorgane.gg;
    for (const r of gg.reihe) {
      for (const t of gg.zeiten) if (!(r.ia[String(t)] > 0)) note('Leitung', 'gG ' + r.in + ' A: Ia bei ' + t + ' s fehlt');
      if (!(r.ia['5'] < r.ia['0.4'] && r.ia['0.4'] < r.ia['0.1'])) note('Leitung', 'gG ' + r.in + ' A: Ia steigt nicht mit kürzerer Zeit');
      if (!(r.i2t > 0)) note('Leitung', 'gG ' + r.in + ' A: I²t fehlt');
    }
    const lim = P.limits.table('spannungsfall');
    for (const [welt, v] of Object.entries(cb.vorbelegung)) {
      if (!P.data.worldById.has(welt)) note('Leitung', 'Vorbelegung für unbekannte Welt „' + welt + '“');
      if (!lim || !lim.rows.some(r => r.key === v.netz.duGrenze)) note('Leitung', 'Vorbelegung ' + welt + ': Spannungsfall-Grenze „' + v.netz.duGrenze + '“ fehlt');
    }
    for (const vl of cb.vorlagen) {
      if (!P.data.worldById.has(vl.welt)) note('Leitung', 'Vorlage ' + vl.id + ': Welt „' + vl.welt + '“ existiert nicht');
      const r = P.cable.compute(Object.assign({ vorlage: vl.id }, vl.calc, { leitung: Object.assign({ laenge: 20 }, vl.calc.leitung) }), { cables: cb, limits: P.data.limits }, vl.welt);
      if (r.fehler.length) note('Leitung', 'Vorlage ' + vl.id + ': ' + r.fehler.join(' '));
      else if (r.vorschlag == null) note('Leitung', 'Vorlage ' + vl.id + ': bei 20 m kein Querschnitt möglich');
    }
    for (const b of P.cable.checkExamples({ cables: cb, limits: P.data.limits })) note('Leitung', b);
  }

  function isStepId(id) {
    for (const pack of P.data.packs) if (pack.stepById && pack.stepById.has(id)) return true;
    return false;
  }

  /* Service Worker früh registrieren, nicht erst nach dem Laden der
   * Datenpakete: das load-Event ist dann längst durch, ein Listener darauf
   * feuert nie mehr — und die App wäre still ohne Offline-Betrieb. */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('[Prüfassistent] Service Worker nicht registriert — kein Offline-Betrieb.', err);
    });
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }
  registerServiceWorker();

  /* ─── Start ─── */
  P.data.loadAll().then(() => {
    P.store.load();
    P.store.subscribe(() => P.render());
    P.render();

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      setTimeout(() => P.selftest(), 400);
    }
  }).catch(err => {
    console.error('[Prüfassistent] Datenpakete konnten nicht geladen werden', err);
    document.getElementById('app').appendChild(el('div', { class: 'content' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'q-title' }, 'Daten fehlen'),
        el('p', { class: 'w-p' }, 'Die Norm- und Wiki-Pakete unter data/ konnten nicht geladen werden: ' + err.message),
        el('p', { class: 'w-p' }, 'Die App braucht einen HTTP-Server (python3 -m http.server) — direkt über file:// geöffnet blockiert der Browser das Laden der Datenpakete.'),
      ]),
    ]));
  });
})(window.Pruefung);
