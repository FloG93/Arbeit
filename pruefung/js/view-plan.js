'use strict';

/* Der Prüfplan und die Schritt-Detailansicht.
 *
 * Ein Schritt, dessen Vorbedingung noch offen ist, wird als gesperrt gezeigt —
 * mit Begründung, aber nicht verriegelt: eine Prüfung im Feld läuft nie ganz
 * linear, und ein bevormundendes Werkzeug wird umgangen statt benutzt. */
(function (P) {
  const { el, num } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  function needWizard() {
    return {
      view: el('div', { class: 'view' }, [
        U.card('Noch kein Prüfplan', [
          el('p', { class: 'w-p' }, 'Der Prüfplan entsteht aus den Antworten im Assistenten — Netzform, Stromkreisart, RCD und Besonderheiten bestimmen, welche Messungen nötig sind.'),
          el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => P.store.set({ tab: 'wizard' }) }, 'Zum Assistenten'),
        ]),
      ]),
    };
  }

  P.views.plan = function planView() {
    const job = P.store.activeJob();
    if (!job) return needWizard();
    const pack = P.data.packById.get(job.normId);
    if (!pack || !job.session.done) return needWizard();

    const entries = P.plan.ensure(job, pack);
    if (P.nav.stepId) {
      const entry = entries.find(e => e.step.id === P.nav.stepId);
      if (entry) return stepDetail(job, pack, entries, entry);
      P.nav.stepId = null;
    }

    const facts = job.session.facts;
    const sum = P.plan.summary(pack, job.session, entries, job.results);
    const children = [];

    children.push(U.progress(sum.done, sum.total,
      sum.done + ' von ' + sum.total + ' erledigt' + (sum.mangel ? ' · ' + sum.mangel + ' Mangel' : '') + (sum.grenzwertig ? ' · ' + sum.grenzwertig + ' grenzwertig' : '')));

    let lastPhase = null;
    let nr = 0;
    for (const entry of entries) {
      const step = entry.step;
      if (step.phase !== lastPhase) {
        lastPhase = step.phase;
        const phase = pack.phaseById.get(step.phase);
        children.push(el('div', { class: 'phase-head' }, [
          el('div', { class: 'n' }, phase ? phase.label : step.phase),
          phase && phase.hint ? el('div', { class: 'h' }, phase.hint) : null,
        ]));
      }
      nr++;
      const result = job.results[step.id];
      const verdict = P.plan.verdict(pack, step, facts, result);
      const blocked = entry.blockedBy.length > 0;
      const sub = blocked
        ? 'Erst „' + (pack.stepById.get(entry.blockedBy[0]) || {}).title + '“ — ' + (step.requiresReason || 'Vorbedingung offen')
        : subtitleFor(entry, result, verdict);
      children.push(el('button', {
        class: 'step-card' + (verdict === 'ok' ? ' done' : '') + (verdict === 'mangel' ? ' bad' : '') + (blocked ? ' blocked' : ''),
        type: 'button',
        onClick: () => { P.nav.stepId = step.id; P.render(); },
      }, [
        el('span', { class: 'mark' }, verdict ? U.verdictSym(verdict) : String(nr)),
        el('span', { class: 'info' }, [
          el('span', { class: 't' }, step.title),
          el('span', { class: 's' + (blocked ? ' blocked-why' : '') }, sub),
        ]),
        entry.isNew ? U.badge('neu') : step.optional ? U.badge('optional') : verdict ? U.verdictPill(verdict) : null,
      ]));
    }

    const orphans = P.plan.orphans(job, entries);
    if (orphans.length) {
      children.push(el('div', { class: 'w-note' }, [
        el('span', { class: 'sym' }, 'i'),
        el('div', { class: 't' }, orphans.length + ' erfasste Schritte stehen nicht mehr in der Datenbasis. Die Werte bleiben im Protokoll erhalten.'),
      ]));
    }

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => P.store.set({ tab: 'wizard' }) }, 'Assistent'),
      el('button', { class: 'btn btn-primary', type: 'button', onClick: () => P.store.set({ tab: 'protokoll' }) }, 'Protokoll'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  };

  function subtitleFor(entry, result, verdict) {
    const step = entry.step;
    if (result && result.note) return result.note;
    const key = P.plan.keyValue(step, result);
    if (key) {
      const shown = key.overrange ? 'über Messbereich' : num(key.value) + (key.unit ? ' ' + key.unit : '');
      return 'gemessen ' + shown + (entry.limit ? ' · ' + U.limitText(entry.limit) : '');
    }
    if (entry.limit) return U.limitText(entry.limit);
    if (step.limitHint) return step.limitHint;
    if (entry.checklist.length) return entry.checklist.length + ' Punkte zu prüfen';
    return verdict ? U.verdictLabel(verdict) : 'offen';
  }

  /* Die Frist legt der Betreiber fest — die App bietet die Richtwerte an und
   * rechnet das Datum aus, damit es im Protokoll steht und nicht auf einem
   * Zettel im Schaltschrank. */
  function intervalPicker(job, step) {
    const presets = P.intervals.presetsFor(job.world, step.interval.scope);
    const chosen = job.interval && job.interval.presetId;
    const due = job.interval && job.interval.nextDue;
    return el('div', { class: 'card-body' }, [
      el('div', { class: 'chips' }, presets.map(preset => el('button', {
        class: 'chip' + (chosen === preset.id ? ' active' : ''), type: 'button',
        onClick: () => P.store.setInterval(job.id, chosen === preset.id ? null : preset),
      }, preset.label + ' · ' + P.intervals.label(preset.intervalMonths)))),
      due
        ? el('div', { class: 'w-note' }, [
            el('span', { class: 'sym' }, 'i'),
            el('div', { class: 't' }, 'Nächste Prüfung: ' + P.util.formatDateDE(due)
              + ' — Richtwert ' + P.intervals.label(job.interval.months)
              + ' ab ' + (P.util.formatDateDE(job.protocol.datum) || 'heute') + '.'),
          ])
        : el('div', { class: 'hint-text' }, 'Ohne Auswahl bleibt das Protokoll ohne Fälligkeitsdatum.'),
      el('div', { class: 'hint-text' }, 'Richtwerte aus der DGUV Vorschrift 3. Verbindlich ist die Festlegung des Betreibers aus der Gefährdungsbeurteilung.'),
    ]);
  }

  function stepDetail(job, pack, entries, entry) {
    const step = entry.step;
    const facts = job.session.facts;
    const result = job.results[step.id] || {};
    const verdict = P.plan.verdict(pack, step, facts, result);
    const index = entries.indexOf(entry);
    const next = entries[index + 1];
    const children = [];

    children.push(el('div', { class: 'q-head' }, [
      el('div', { class: 'chips' }, [
        U.badge(pack.phaseById.get(step.phase) ? pack.phaseById.get(step.phase).label : step.phase, 'accent'),
        step.optional ? U.badge('optional') : null,
        verdict ? U.verdictPill(verdict) : null,
      ]),
      el('div', { class: 'q-title' }, step.title),
      el('div', { class: 'q-hint' }, P.plan.explain(pack, job.session, entry)),
    ]));

    if (entry.blockedBy.length) {
      const first = pack.stepById.get(entry.blockedBy[0]);
      children.push(el('div', { class: 'step-safety' }, [
        el('span', { class: 'sym' }, '!'),
        el('div', { class: 't' }, [
          (step.requiresReason || 'Dieser Schritt setzt einen anderen voraus.') + ' Offen: „' + (first ? first.title : entry.blockedBy[0]) + '“.',
          el('div', { style: { marginTop: '.5rem' } }, [
            el('button', { class: 'mini-btn', type: 'button', onClick: () => { P.nav.stepId = entry.blockedBy[0]; P.render(); } }, 'Dorthin springen'),
          ]),
        ]),
      ]));
    }

    if (step.safety) {
      children.push(el('div', { class: 'step-safety' }, [
        el('span', { class: 'sym' }, '⚡'),
        el('div', { class: 't' }, step.safety),
      ]));
    }

    if (step.optionalReason) children.push(el('div', { class: 'hint-text' }, step.optionalReason));

    if (step.instrument) {
      children.push(el('div', { class: 'w-kv' }, [
        el('div', { class: 'row' }, [el('div', { class: 'k' }, 'Messmittel'), el('div', { class: 'v' }, step.instrument)]),
      ]));
    }

    if (step.procedure) {
      children.push(U.sectionHead('Ablauf'));
      children.push(el('ol', { class: 'proc-list' }, step.procedure.map(p => el('li', {}, p))));
    }

    if (step.measure) {
      children.push(U.sectionHead('Messwerte', step.measure.symbol ? step.measure.symbol + ' in ' + step.measure.unit : ''));
      children.push(el('div', { class: 'step-list' }, (step.measure.inputs || []).map(input => U.measureRow({
        input,
        limit: entry.inputLimits[input.id] || entry.limit,
        hint: step.limitHint,
        value: result.values ? result.values[input.id] : null,
        overrange: !!(result.overrange && result.overrange[input.id]),
        fkey: 'm-' + step.id + '-' + input.id,
        onValue: v => P.store.setResult(job.id, step.id, {
          values: Object.assign({}, result.values, { [input.id]: v }),
          overrange: Object.assign({}, result.overrange, { [input.id]: false }),
        }),
        onOverrange: v => P.store.setResult(job.id, step.id, {
          values: Object.assign({}, result.values, { [input.id]: v }),
          overrange: Object.assign({}, result.overrange, { [input.id]: v != null }),
        }),
      }))));
      if (entry.limit) {
        children.push(el('div', { class: 'wiki-body' }, [U.limitTable(entry.limit.tableId, entry.limit.rowKey)]));
      }
      if (step.formulaRef) {
        children.push(el('div', { class: 'wiki-body' }, U.blocks([{ type: 'formula', formulaRef: step.formulaRef }], {})));
      }
    }

    if (step.interval) {
      children.push(U.sectionHead('Nächste Prüffrist', 'Richtwert wählen'));
      children.push(intervalPicker(job, step));
    }

    if (entry.checklist.length) {
      children.push(U.sectionHead('Checkliste', 'Tippen: offen → OK → Mangel'));
      children.push(el('div', { class: 'step-list' }, entry.checklist.map(item =>
        U.checkRow(item, result.checks ? result.checks[item.id] : undefined, value =>
          P.store.setResult(job.id, step.id, {
            checks: Object.assign({}, result.checks, { [item.id]: value }),
          })))));
    }

    children.push(U.sectionHead('Bewertung', verdict && !result.verdict ? 'automatisch: ' + U.verdictLabel(verdict) : ''));
    children.push(U.verdictSwitch(result.verdict || null, v => P.store.setResult(job.id, step.id, { verdict: v })));
    children.push(el('div', { class: 'field' }, [
      el('label', { class: 'field-label' }, 'Bemerkung / Mangel'),
      el('textarea', {
        class: 'input', 'data-fkey': 'note-' + step.id, value: result.note || '',
        placeholder: 'Was ist aufgefallen?',
        onInput: e => P.store.setResult(job.id, step.id, { note: e.target.value }),
      }),
    ]));

    const links = P.data.wikiFor((step.wiki || []).concat(step.pitfalls || []));
    if (links.length) {
      children.push(U.sectionHead('Nachschlagen', 'Verfahren und Fehlerquellen'));
      children.push(el('div', { class: 'chips' }, links.map(entryItem =>
        el('button', { class: 'chip', type: 'button', onClick: () => P.openWiki(entryItem.id) }, 'ⓘ ' + entryItem.title))));
    }

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => { P.nav.stepId = null; P.render(); } }, 'Plan'),
      next
        ? el('button', { class: 'btn btn-primary', type: 'button', onClick: () => { P.nav.stepId = next.step.id; P.render(); } }, 'Weiter: ' + (next.step.short || next.step.title))
        : el('button', { class: 'btn btn-primary', type: 'button', onClick: () => P.store.set({ tab: 'protokoll' }) }, 'Zum Protokoll'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  }
})(window.Pruefung);
