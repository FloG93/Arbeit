'use strict';

/* Aus den Antworten wird der Prüfplan.
 *
 * Die Reihenfolge ist der fachliche Kern dieser App, deshalb hängt sie nicht
 * an einer gepflegten Zahl: order sortiert nur, wo die Reihenfolge beliebig
 * ist. Wo sie zwingend ist, steht requires — und eine topologische Sortierung
 * setzt das durch. Schutzleiter vor Isolation bleibt damit auch dann richtig,
 * wenn jemand order falsch pflegt oder das steps-Array umsortiert. */
(function (P) {
  const { matches } = P.util;

  const PL = {};
  const RANK = { mangel: 4, grenzwertig: 3, ok: 2, unbekannt: 1 };
  const worse = (a, b) => ((RANK[b] || 0) > (RANK[a] || 0) ? b : a);

  const phaseOrder = (pack, id) => {
    const phase = pack.phaseById.get(id);
    return phase && phase.order != null ? phase.order : 500;
  };

  const sortKey = (pack, step) => [phaseOrder(pack, step.phase), step.order == null ? 500 : step.order, step.title || ''];

  function cmp(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return 0;
  }

  PL.visibleChecklist = (step, facts) => (step.checklist || []).filter(item => matches(item.when, facts));

  /* Sammeln, Voraussetzungen nachziehen, topologisch ordnen, Grenzwerte
   * auflösen. Ergebnis ist die Liste, die der Prüfplan anzeigt. */
  PL.build = function build(pack, session, results) {
    const facts = session.facts || {};
    const picked = new Map(); // stepId → { step, reason, requiredBy }

    for (const step of pack.steps) {
      if (step.when && !matches(step.when, facts)) continue;
      picked.set(step.id, { step, reason: 'auto' });
    }
    // Ausdrücklich durch eine Antwort zugeschaltet (addSteps) — schlägt ein
    // nicht passendes when, denn der Prüfer hat es selbst gewählt.
    for (const id of session.extraSteps || []) {
      const step = pack.stepById.get(id);
      if (!step) { console.warn('[Prüfassistent] addSteps verweist auf unbekannten Schritt:', id); continue; }
      if (!picked.has(id)) picked.set(id, { step, reason: 'antwort' });
    }
    // Voraussetzungen transitiv nachziehen: eine Messung ohne ihre Vorbedingung
    // wäre nicht aussagekräftig, also gehört die Vorbedingung in den Plan.
    const queue = Array.from(picked.keys());
    while (queue.length) {
      const current = picked.get(queue.shift());
      for (const reqId of current.step.requires || []) {
        const req = pack.stepById.get(reqId);
        if (!req) { console.warn('[Prüfassistent] requires verweist auf unbekannten Schritt:', reqId); continue; }
        // Eine Voraussetzung, die auf diese Prüfung nicht zutrifft, ist keine:
        // die Isolationsmessung setzt den Schutzleiterwiderstand voraus — aber
        // ein Gerät der Schutzklasse II hat keinen Schutzleiter.
        if (req.when && !matches(req.when, facts)) continue;
        if (picked.has(reqId)) continue;
        picked.set(reqId, { step: req, reason: 'voraussetzung', requiredBy: current.step.id });
        queue.push(reqId);
      }
    }

    const ordered = PL.order(pack, Array.from(picked.values()));

    return ordered.map(item => {
      const step = item.step;
      const values = results && results[step.id] ? results[step.id].values : null;
      const inputLimits = {};
      for (const input of (step.measure && step.measure.inputs) || []) {
        inputLimits[input.id] = P.limits.forInput(step, input, facts, values);
      }
      // Ohne Tabellenwert gilt der aus einem Bezugsfeld (Zs-Sollwert) — so
      // steht im Plan und im Protokoll der eingetragene Sollwert.
      const limit = P.limits.forStep(step, facts)
        || Object.values(inputLimits).find(l => l && l.fromInput) || null;
      const blockedBy = (step.requires || []).filter(reqId => {
        if (!picked.has(reqId)) return false;
        return PL.verdict(pack, picked.get(reqId).step, facts, results && results[reqId]) == null;
      });
      return {
        step,
        limit,
        inputLimits,
        checklist: PL.visibleChecklist(step, facts),
        reason: item.reason,
        requiredBy: item.requiredBy || null,
        blockedBy,
      };
    });
  };

  /* Der Plan eines Auftrags wird beim ersten Öffnen eingefroren: ein späteres
   * Daten-Update darf eine laufende Prüfung nicht umsortieren. Neu
   * hinzugekommene Schritte hängen hinten an und werden markiert, statt
   * lautlos zwischen erledigte Zeilen zu rutschen. */
  PL.ensure = function ensure(job, pack) {
    const entries = PL.build(pack, job.session, job.results);
    if (!job.plan) {
      job.plan = entries.map(e => e.step.id);
      P.store.save();
      return entries;
    }
    const index = new Map(job.plan.map((id, i) => [id, i]));
    const known = [];
    const added = [];
    for (const entry of entries) {
      if (index.has(entry.step.id)) known.push(entry);
      else { entry.isNew = true; added.push(entry); }
    }
    known.sort((a, b) => index.get(a.step.id) - index.get(b.step.id));
    return known.concat(added);
  };

  /* Schritte, die es in der Datenbasis nicht mehr gibt, zu denen aber Werte
   * erfasst wurden: sichtbar machen, nicht verschwinden lassen. */
  PL.orphans = function orphans(job, entries) {
    const have = new Set(entries.map(e => e.step.id));
    return (job.plan || []).filter(id => !have.has(id) && job.results && job.results[id]);
  };

  /* Vorsortieren nach Phase und order, dann topologisch stabilisieren
   * (Kahn, Ready-Menge immer nach Sortierschlüssel bedient). Ein Zyklus in
   * requires wäre ein Datenfehler: laut meckern, aber benutzbar bleiben. */
  PL.order = function order(pack, items) {
    const list = items.slice().sort((a, b) => cmp(sortKey(pack, a.step), sortKey(pack, b.step)));
    const present = new Set(list.map(i => i.step.id));
    const indeg = new Map();
    const dependents = new Map();
    for (const item of list) {
      const deps = (item.step.requires || []).filter(id => present.has(id));
      indeg.set(item.step.id, deps.length);
      for (const dep of deps) {
        if (!dependents.has(dep)) dependents.set(dep, []);
        dependents.get(dep).push(item.step.id);
      }
    }
    const byId = new Map(list.map(i => [i.step.id, i]));
    const ready = list.filter(i => indeg.get(i.step.id) === 0).map(i => i.step.id);
    const out = [];
    while (ready.length) {
      const id = ready.shift();
      out.push(byId.get(id));
      for (const next of dependents.get(id) || []) {
        indeg.set(next, indeg.get(next) - 1);
        if (indeg.get(next) === 0) {
          ready.push(next);
          // Ready-Menge in Sortierreihenfolge halten.
          ready.sort((x, y) => cmp(sortKey(pack, byId.get(x).step), sortKey(pack, byId.get(y).step)));
        }
      }
    }
    if (out.length !== list.length) {
      const stuck = list.filter(i => !out.includes(i)).map(i => i.step.id);
      console.warn('[Prüfassistent] Zyklus in requires — Reihenfolge fällt auf order zurück:', stuck);
      return list;
    }
    return out;
  };

  /* Welcher Wert eines Schrittes im Protokoll steht: bei mehreren Eingaben
   * der maßgebliche — der kleinste beim Isolationswiderstand, der größte bei
   * Zeiten und Widerständen (measure.aggregate). */
  PL.keyValue = function keyValue(step, result) {
    const measure = step.measure;
    if (!measure || !result) return null;
    const agg = measure.aggregate === 'min' ? 'min' : 'max';
    let best = null;
    let overrange = false;
    for (const input of measure.inputs || []) {
      // Ein Bezugsfeld (Sollwert) ist kein Messwert — sonst stünde bei Zs der
      // Sollwert als Istwert im Protokoll, sobald er größer ist.
      if (input.role === 'reference') continue;
      const value = result.values ? result.values[input.id] : null;
      if (result.overrange && result.overrange[input.id]) { overrange = true; continue; }
      if (value == null || !isFinite(value)) continue;
      if (best == null) best = value;
      else best = agg === 'min' ? Math.min(best, value) : Math.max(best, value);
    }
    if (best == null && overrange) return { overrange: true, unit: measure.unit };
    if (best == null) return null;
    return { value: best, unit: measure.unit };
  };

  function measureVerdict(pack, step, facts, result) {
    const measure = step.measure;
    if (!measure || !result) return null;
    let out = null;
    let missing = false;
    for (const input of measure.inputs || []) {
      if (input.role === 'reference') continue;
      const value = result.values ? result.values[input.id] : null;
      const over = !!(result.overrange && result.overrange[input.id]);
      if (!over && (value == null || !isFinite(value))) {
        if (!input.optional) missing = true;
        continue;
      }
      const limit = P.limits.forInput(step, input, facts, result.values) || P.limits.forStep(step, facts);
      out = worse(out, P.limits.evaluate(value, limit, { overrange: over }));
    }
    if (out === 'unbekannt') out = null;
    // Ein Mangel steht auch dann fest, wenn noch Felder leer sind.
    if (missing && out !== 'mangel') return null;
    return out;
  }

  /* „n. a." zählt wie beantwortet, aber nicht als Mangel: ein Schritt, dessen
   * Punkte alle nicht zutreffen (kein Gas, kein Aufzug), ist bewertet und
   * nicht offen. Sonst würde das Protokoll nie vollständig. */
  function checklistVerdict(pack, step, facts, result) {
    const items = PL.visibleChecklist(step, facts);
    if (!items.length) return null;
    let anyFalse = false;
    let allAnswered = true;
    for (const item of items) {
      const value = result && result.checks ? result.checks[item.id] : undefined;
      if (value === false) anyFalse = true;
      else if (!P.util.checkAnswered(value)) allAnswered = false;
    }
    if (anyFalse) return 'mangel';
    return allAnswered ? 'ok' : null;
  }

  /* Eine von Hand gesetzte Bewertung gewinnt immer: die Anlage kennt die Norm
   * nicht, und der Prüfer sieht Dinge, die kein Messwert zeigt. */
  PL.verdict = function verdict(pack, step, facts, result) {
    if (result && result.verdict) return result.verdict;
    const rule = step.verdict && step.verdict.rule;
    if (rule === 'limit') return measureVerdict(pack, step, facts, result);
    const fromChecklist = checklistVerdict(pack, step, facts, result);
    if (fromChecklist) return fromChecklist;
    return measureVerdict(pack, step, facts, result);
  };

  /* Was die Messwerte allein ergeben würden — ohne die Bewertung von Hand. */
  PL.autoVerdict = function autoVerdict(pack, step, facts, result) {
    if (!result || !result.verdict) return PL.verdict(pack, step, facts, result);
    return PL.verdict(pack, step, facts, Object.assign({}, result, { verdict: null }));
  };

  /* Von Hand „OK“ (oder n. a.), obwohl ein Messwert den Grenzwert reißt: das
   * bleibt erlaubt, darf aber nirgends still passieren — Schritt, Plan und
   * Protokoll sagen es dazu. */
  PL.overridden = function overridden(pack, step, facts, result) {
    if (!result || !result.verdict || result.verdict === 'mangel') return false;
    return PL.autoVerdict(pack, step, facts, result) === 'mangel';
  };

  PL.summary = function summary(pack, session, entries, results) {
    const facts = session.facts || {};
    let done = 0, mangel = 0, grenzwertig = 0;
    for (const entry of entries) {
      const v = PL.verdict(pack, entry.step, facts, results && results[entry.step.id]);
      if (v) done++;
      if (v === 'mangel') mangel++;
      if (v === 'grenzwertig') grenzwertig++;
    }
    return { done, total: entries.length, mangel, grenzwertig, open: entries.length - done };
  };

  /* Warum steht dieser Schritt im Plan? Macht Datenfehler im Feld sichtbar und
   * erklärt dem Prüfer die Ableitung, statt sie zu behaupten. */
  PL.explain = function explain(pack, session, entry) {
    if (entry.reason === 'voraussetzung') {
      const target = pack.stepById.get(entry.requiredBy);
      return 'Notwendige Vorbedingung' + (target ? ' für „' + target.title + '“' : '');
    }
    if (entry.reason === 'antwort') {
      const label = labelForAddedStep(pack, session, entry.step.id);
      return label ? 'Weil „' + label + '“ gewählt wurde' : 'Durch eine Antwort zugeschaltet';
    }
    const when = entry.step.when;
    if (!when) return 'Gehört bei dieser Norm immer dazu';
    const parts = [];
    for (const key of Object.keys(when)) {
      const label = labelForFact(pack, session, key);
      if (label) parts.push(label);
    }
    return parts.length ? 'Weil „' + parts.join('“ und „') + '“ gewählt wurde' : 'Passt zu den Antworten';
  };

  function optionsFromHistory(pack, session) {
    const out = [];
    for (const entry of session.history || []) {
      const node = pack.nodeById.get(entry.nodeId);
      if (!node) continue;
      for (const id of entry.optionIds || []) {
        const opt = (node.options || []).find(o => o.id === id);
        if (opt) out.push(opt);
      }
    }
    return out;
  }

  function labelForAddedStep(pack, session, stepId) {
    const hit = optionsFromHistory(pack, session).find(o => (o.addSteps || []).includes(stepId));
    return hit ? hit.label : null;
  }

  /* Klartext zu einem Fakt — für Protokollfelder, die eine Antwort aus dem
   * Assistenten übernehmen, statt sie ein zweites Mal abzufragen. */
  PL.factLabel = (pack, session, factKey) => labelForFact(pack, session, factKey);

  function labelForFact(pack, session, factKey) {
    if (factKey === 'world') {
      const world = P.data.world(session.facts.world);
      return world ? world.label : null;
    }
    const hits = optionsFromHistory(pack, session).filter(o => o.set && o.set[factKey] != null);
    const hit = hits[hits.length - 1];
    if (hit) return hit.label;
    // Ein Fakt kann auch aus presetFacts einer Variante stammen — dann wurde
    // er nie gewählt und hat keine Antwortkarte, aus der ein Klartext käme.
    // factLabels im Paket liefert ihn nach, damit das Protokollfeld nicht
    // leer bleibt.
    const value = session.facts ? session.facts[factKey] : null;
    const table = pack.factLabels && pack.factLabels[factKey];
    return (value != null && table && table[value]) || null;
  }

  P.plan = PL;
})(window.Pruefung);
