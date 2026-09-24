'use strict';

/* Der Prüfplan und die Schritt-Detailansicht.
 *
 * Ein Schritt, dessen Vorbedingung noch offen ist, wird als gesperrt gezeigt —
 * mit Begründung, aber nicht verriegelt: eine Prüfung im Feld läuft nie ganz
 * linear, und ein bevormundendes Werkzeug wird umgangen statt benutzt. */
(function (P) {
  const { el, num, plural, matches } = P.util;
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

    const kreis = P.nav.kreisId != null ? P.store.kreis(job, P.nav.kreisId) : null;
    if (P.nav.kreisId != null && !kreis) P.nav.kreisId = null;

    const entries = P.plan.ensure(job, pack, kreis);
    if (P.nav.stepId) {
      const entry = entries.find(e => e.step.id === P.nav.stepId);
      if (entry) return stepDetail(job, pack, entries, entry, kreis);
      P.nav.stepId = null;
    }
    return kreis ? kreisAnsicht(job, pack, kreis, entries) : anlagenAnsicht(job, pack, entries);
  };

  /* Die Schrittliste — für die Anlage und für jeden Stromkreis dieselbe. */
  function schrittListe(job, pack, entries, kreis) {
    const facts = P.plan.facts(job, kreis);
    const holder = kreis || job;
    const children = [];
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
      const result = holder.results[step.id];
      const verdict = P.plan.verdict(pack, step, facts, result);
      const blocked = entry.blockedBy.length > 0;
      const overridden = P.plan.overridden(pack, step, facts, result);
      // Ein überstimmter Messmangel wiegt schwerer als eine offene
      // Vorbedingung — er steht deshalb vorn.
      const sub = overridden
        ? 'Von Hand „' + U.verdictLabel(result.verdict) + '“ — Messwert außerhalb des Grenzwerts'
        : blocked
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
          el('span', { class: 's' + (blocked || overridden ? ' blocked-why' : '') }, sub),
        ]),
        entry.isNew ? U.badge('neu') : step.optional ? U.badge('optional') : verdict ? U.verdictPill(verdict) : null,
      ]));
    }

    const orphans = P.plan.orphans(holder, entries);
    if (orphans.length) {
      children.push(el('div', { class: 'w-note' }, [
        el('span', { class: 'sym' }, 'i'),
        el('div', { class: 't' }, orphans.length + ' erfasste Schritte stehen nicht mehr in der Datenbasis. Die Werte bleiben im Protokoll erhalten.'),
      ]));
    }
    return children;
  }

  const kreisName = kreis => 'Stromkreis ' + (kreis.nr || '?') + (kreis.ziel ? ' · ' + kreis.ziel : '');

  function kreisZeile(kreis) {
    const teile = [];
    const l = kreis.leitung || {};
    const sch = kreis.schutz || {};
    if (l.typ) teile.push(l.typ + (l.adern && l.querschnitt ? ' ' + l.adern + '×' + num(l.querschnitt) : ''));
    if (sch.char || sch.in) teile.push((sch.art === 'gg' ? 'gG ' : (sch.char || '')) + (sch.in || ''));
    return teile.join(' · ');
  }

  /* Der Plan der Anlage: erst die Schritte, die einmal je Anlage gelten,
   * darunter die Stromkreise des Verteilers. */
  function anlagenAnsicht(job, pack, entries) {
    const sum = P.plan.summaryAll(job, pack);
    const children = [];
    children.push(U.progress(sum.done, sum.total,
      sum.done + ' von ' + sum.total + ' erledigt' + (sum.mangel ? ' · ' + plural(sum.mangel, 'Mangel', 'Mängel') : '') + (sum.grenzwertig ? ' · ' + sum.grenzwertig + ' grenzwertig' : '')));

    children.push(schrittListe(job, pack, entries, null));

    const kreise = job.kreise || [];
    children.push(U.sectionHead('Stromkreise', kreise.length
      ? kreise.length + (kreise.length === 1 ? ' Stromkreis' : ' Stromkreise')
      : 'noch keiner angelegt'));
    children.push(el('div', { class: 'step-list' }, kreise.map((kreis, i) => {
      const kEntries = P.plan.ensure(job, pack, kreis);
      const kSum = P.plan.summary(pack, job.session, kEntries, kreis.results, P.plan.facts(job, kreis));
      const oeffnen = () => { P.nav.kreisId = kreis.id; P.nav.stepId = null; P.render(); };
      return el('div', { class: 'job-card' }, [
        el('button', { class: 'job-open', type: 'button', onClick: oeffnen }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, kreisName(kreis)),
            el('div', { class: 'meta' }, [kreisZeile(kreis), kSum.done + ' von ' + kSum.total + ' bewertet'].filter(Boolean).join(' · ')),
          ]),
          kSum.mangel ? U.badge(plural(kSum.mangel, 'Mangel', 'Mängel'), 'mangel')
            : kSum.open ? U.badge(kSum.open + ' offen') : U.badge('vollständig', 'ok'),
          el('div', { class: 'chevron' }, '›'),
        ]),
        el('div', { class: 'job-actions' }, [
          el('button', { class: 'mini-btn', type: 'button', onClick: oeffnen }, 'Öffnen'),
          el('button', {
            class: 'mini-btn', type: 'button', disabled: i === 0,
            'aria-label': kreisName(kreis) + ' nach oben',
            onClick: () => P.store.moveKreis(job.id, kreis.id, -1),
          }, '↑'),
          el('button', {
            class: 'mini-btn', type: 'button', disabled: i === kreise.length - 1,
            'aria-label': kreisName(kreis) + ' nach unten',
            onClick: () => P.store.moveKreis(job.id, kreis.id, 1),
          }, '↓'),
          el('button', {
            class: 'mini-btn', type: 'button',
            onClick: () => { const k = P.store.duplicateKreis(job.id, kreis.id); if (k) { P.nav.kreisId = k.id; P.render(); } },
          }, 'Kopieren'),
          el('button', {
            class: 'mini-btn', type: 'button',
            onClick: () => { if (confirm(kreisName(kreis) + ' mit allen Messwerten löschen?')) P.store.removeKreis(job.id, kreis.id); },
          }, 'Löschen'),
        ]),
      ]);
    })));
    children.push(el('button', {
      class: 'btn btn-outline btn-block punkt-add', type: 'button',
      onClick: () => { const k = P.store.newKreis(job.id); if (k) { P.nav.kreisId = k.id; P.render(); } },
    }, '+  Stromkreis hinzufügen'));

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => P.store.set({ tab: 'wizard' }) }, 'Assistent'),
      el('button', { class: 'btn btn-primary', type: 'button', onClick: () => P.store.set({ tab: 'protokoll' }) }, 'Protokoll'),
    ]);
    return { view: el('div', { class: 'view' }, children), bottom };
  }

  /* Ein einzelner Stromkreis: seine Stammdaten, dann seine Prüfschritte. */
  function kreisAnsicht(job, pack, kreis, entries) {
    const facts = P.plan.facts(job, kreis);
    const sum = P.plan.summary(pack, job.session, entries, kreis.results, facts);
    const setzen = fn => P.store.patchKreis(job.id, kreis.id, fn);
    const nachfuehren = () => {
      document.querySelectorAll('[data-kreis-title="' + kreis.id + '"]').forEach(node => { node.textContent = kreisName(kreis); });
    };
    const children = [];

    children.push(el('div', { class: 'q-head' }, [
      el('div', { class: 'q-title', 'data-kreis-title': kreis.id }, kreisName(kreis)),
      el('div', { class: 'q-hint' }, 'Gehört zu ' + (job.protocol.anlagenteil || P.data.term('verteiler', job.world, 'Verteiler'))),
    ]));
    children.push(U.progress(sum.done, sum.total, sum.done + ' von ' + sum.total + ' bewertet'
      + (sum.mangel ? ' · ' + plural(sum.mangel, 'Mangel', 'Mängel') : '')));

    // Stammdaten. Beim Tippen wird nicht neu gezeichnet, nur der Titel
    // nachgeführt — sonst schluckt es den Fokus des nächsten Feldes.
    children.push(U.card('Stammdaten', [
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, 'Nr.'),
        U.textInput('kreis-nr-' + kreis.id, kreis.nr, v => {
          P.store.patchKreis(job.id, kreis.id, k => { k.nr = v; }, { silent: true });
          nachfuehren();
        }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, 'Zielbezeichnung'),
        U.textInput('kreis-ziel-' + kreis.id, kreis.ziel, v => {
          P.store.patchKreis(job.id, kreis.id, k => { k.ziel = v; }, { silent: true });
          nachfuehren();
        }, { placeholder: 'z. B. Steckdosen Küche' }),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, 'Leitung'),
        el('div', { class: 'calc-inline' }, [
          U.textInput('kreis-typ-' + kreis.id, kreis.leitung.typ || '',
            v => P.store.patchKreis(job.id, kreis.id, k => { k.leitung.typ = v; }, { silent: true }),
            { placeholder: 'NYM-J' }),
          el('div', { class: 'measure-line calc-num' }, [
            el('div', { class: 'lbl' }, 'Adern'),
            U.numInput('kreis-adern-' + kreis.id, kreis.leitung.adern, '',
              v => P.store.patchKreis(job.id, kreis.id, k => { k.leitung.adern = v; }, { silent: true }),
              { inputmode: 'numeric', 'aria-label': 'Anzahl Adern' }),
            el('div', { class: 'unit' }, '×'),
          ]),
          el('div', { class: 'measure-line calc-num' }, [
            el('div', { class: 'lbl' }, 'Querschnitt'),
            U.numInput('kreis-quer-' + kreis.id, kreis.leitung.querschnitt, 'mm²',
              v => P.store.patchKreis(job.id, kreis.id, k => { k.leitung.querschnitt = v; }, { silent: true }),
              { 'aria-label': 'Querschnitt in mm²' }),
            el('div', { class: 'unit' }, 'mm²'),
          ]),
        ]),
      ]),
      el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, 'Schutzorgan'),
        el('div', { class: 'chips' }, [
          { id: 'ls', label: 'LS' }, { id: 'gg', label: 'gG' },
        ].map(art => el('button', {
          class: 'chip' + ((kreis.schutz.art || 'ls') === art.id ? ' active' : ''), type: 'button',
          onClick: () => setzen(k => { k.schutz.art = art.id; }),
        }, art.label))),
        (kreis.schutz.art || 'ls') === 'ls'
          ? el('div', { class: 'chips' }, ['B', 'C', 'D'].map(c => el('button', {
              class: 'chip' + (kreis.schutz.char === c ? ' active' : ''), type: 'button',
              onClick: () => setzen(k => { k.schutz.char = kreis.schutz.char === c ? null : c; }),
            }, c)))
          : null,
        el('div', { class: 'measure-line calc-num' }, [
          el('div', { class: 'lbl' }, 'In'),
          U.numInput('kreis-in-' + kreis.id, kreis.schutz.in, 'A',
            v => P.store.patchKreis(job.id, kreis.id, k => { k.schutz.in = v; }, { silent: true }),
            { 'aria-label': 'Nennstrom in A' }),
          el('div', { class: 'unit' }, 'A'),
        ]),
      ]),
    ]));

    // Abweichende Fakten des Kreises — daran hängen seine Grenzwerte.
    children.push(kreisFakten(job, pack, kreis, facts));

    children.push(U.sectionHead('Prüfschritte', sum.total + ' Schritte'));
    children.push(schrittListe(job, pack, entries, kreis));

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => { P.nav.kreisId = null; P.render(); } }, 'Stromkreise'),
      el('button', { class: 'btn btn-primary', type: 'button', onClick: () => P.store.set({ tab: 'protokoll' }) }, 'Protokoll'),
    ]);
    return { view: el('div', { class: 'view' }, children), bottom };
  }

  /* Was an diesem Stromkreis anders ist als am Rest der Anlage. Der Assistent
   * hat nach dem typischen Kreis gefragt; hier steht die Abweichung — und nur
   * sie wird gespeichert, damit eine spätere Antwortänderung durchschlägt. */
  function kreisFakten(job, pack, kreis, facts) {
    const gruppen = (pack.kreisFakten || []).filter(g => !g.when || matches(g.when, facts));
    if (!gruppen.length) return null;
    return U.card('Abweichend von der Anlage', gruppen.map(gruppe => {
      const optionen = (gruppe.optionen || []).filter(o => !o.when || matches(o.when, facts));
      if (!optionen.length) return null;
      const keys = Array.from(new Set(optionen.flatMap(o => Object.keys(o.set || {}))));
      const eigen = keys.some(k => kreis.facts[k] != null);
      return el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, gruppe.label),
        el('div', { class: 'chips' }, optionen.map(option => {
          const aktiv = Object.entries(option.set || {}).every(([k, v]) => facts[k] === v);
          return el('button', {
            class: 'chip' + (aktiv ? ' active' : ''), type: 'button',
            'aria-pressed': aktiv ? 'true' : 'false',
            'data-kreisfakt': gruppe.id + '-' + option.id,
            onClick: () => P.store.patchKreis(job.id, kreis.id, k => {
              // Noch einmal auf die eigene Auswahl tippen setzt sie zurück —
              // dann gilt wieder, was der Assistent für die Anlage gesagt hat.
              if (aktiv && eigen) keys.forEach(key => { delete k.facts[key]; });
              else Object.assign(k.facts, option.set);
              k.plan = null; // Der Plan des Kreises hängt an seinen Fakten.
            }),
          }, option.label);
        })),
        eigen ? el('div', { class: 'hint-text' }, 'Weicht von der Anlage ab — noch einmal tippen setzt zurück.') : null,
      ]);
    }).filter(Boolean));
  }

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

  function stepDetail(job, pack, entries, entry, kreis) {
    const step = entry.step;
    const facts = P.plan.facts(job, kreis);
    const holder = kreis || job;
    const result = holder.results[step.id] || {};
    // Jede Schreiboperation muss wissen, in welchen Beutel sie gehört.
    const wo = { kreisId: kreis ? kreis.id : null };
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
      el('div', { class: 'q-hint' }, (kreis ? kreisName(kreis) + ' · ' : '') + P.plan.explain(pack, job.session, entry)),
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
      const zeile = input => U.measureRow({
        input,
        // Bezugs- und Dokufelder werden nicht bewertet — kein Grenzwertband.
        limit: input.role ? null : (entry.inputLimits[input.id] || entry.limit),
        hint: input.hint || step.limitHint,
        value: result.values ? result.values[input.id] : null,
        overrange: !!(result.overrange && result.overrange[input.id]),
        fkey: 'm-' + step.id + '-' + input.id,
        onValue: v => P.store.setResult(job.id, step.id, {
          values: Object.assign({}, result.values, { [input.id]: v }),
          overrange: Object.assign({}, result.overrange, { [input.id]: false }),
        }, wo),
        onOverrange: v => P.store.setResult(job.id, step.id, {
          values: Object.assign({}, result.values, { [input.id]: v }),
          overrange: Object.assign({}, result.overrange, { [input.id]: v != null }),
        }, wo),
      });
      const inputs = step.measure.inputs || [];
      const gruppen = step.measure.gruppen || [];
      if (!gruppen.length) {
        children.push(el('div', { class: 'step-list' }, inputs.map(zeile)));
      } else {
        // Sechs Isolationswerte am Stück sind im Keller nicht zu überblicken.
        // Die Gruppen des Datenpakets teilen sie in „ohne" und „mit
        // Verbraucher" — gezeichnet wird nur, was auch Felder hat.
        const frei = inputs.filter(i => !i.gruppe);
        if (frei.length) children.push(el('div', { class: 'step-list' }, frei.map(zeile)));
        for (const gruppe of gruppen) {
          const mine = inputs.filter(i => i.gruppe === gruppe.id);
          if (!mine.length) continue;
          children.push(el('div', { class: 'field-group' }, gruppe.label));
          if (gruppe.hint) children.push(el('div', { class: 'hint-text' }, gruppe.hint));
          children.push(el('div', { class: 'step-list' }, mine.map(zeile)));
        }
      }
      if (step.measure.messstellen) {
        const messstellen = step.measure.messstellen;
        children.push(U.sectionHead('Messstellen', 'einzeln erfasst — der ' + (messstellen.aggregate === 'min' ? 'kleinste' : 'größte') + ' Wert zählt'));
        children.push(U.messstellenListe({
          stepId: step.id,
          messstellen,
          punkte: result.punkte || [],
          limit: P.limits.forPunkt(step, messstellen, facts),
          onAdd: () => P.store.addPunkt(job.id, step.id, null, wo),
          onPatch: (punktId, patch) => P.store.patchPunkt(job.id, step.id, punktId, patch, wo),
          onRemove: punktId => P.store.removePunkt(job.id, step.id, punktId, wo),
        }));
      }
      if (entry.limit && entry.limit.tableId) {
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
          }, wo)))));
    }

    children.push(U.sectionHead('Bewertung', verdict && !result.verdict ? 'automatisch: ' + U.verdictLabel(verdict) : ''));
    children.push(U.verdictSwitch(result.verdict || null, v => P.store.setResult(job.id, step.id, { verdict: v }, wo)));
    if (P.plan.overridden(pack, step, facts, result)) {
      children.push(el('div', { class: 'w-warn' }, [
        el('span', { class: 'sym' }, '!'),
        el('div', { class: 't' }, 'Von Hand als „' + U.verdictLabel(result.verdict) + '“ bewertet, obwohl ein Messwert den Grenzwert nicht einhält. Das Protokoll vermerkt die Abweichung — die Begründung gehört in die Bemerkung.'),
      ]));
    }
    children.push(el('div', { class: 'field' }, [
      el('label', { class: 'field-label' }, 'Bemerkung / Mangel'),
      el('textarea', {
        class: 'input', 'data-fkey': 'note-' + step.id, value: result.note || '',
        placeholder: 'Was ist aufgefallen?',
        onInput: e => P.store.setResult(job.id, step.id, { note: e.target.value }, wo),
      }),
    ]));

    const links = P.data.wikiFor((step.wiki || []).concat(step.pitfalls || []));
    if (links.length) {
      children.push(U.sectionHead('Nachschlagen', 'Verfahren und Fehlerquellen'));
      children.push(el('div', { class: 'chips' }, links.map(entryItem =>
        el('button', { class: 'chip', type: 'button', onClick: () => P.openWiki(entryItem.id) }, 'ⓘ ' + entryItem.title))));
    }

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => { P.nav.stepId = null; P.render(); } }, kreis ? 'Kreis' : 'Plan'),
      next
        ? el('button', { class: 'btn btn-primary', type: 'button', onClick: () => { P.nav.stepId = next.step.id; P.render(); } }, 'Weiter: ' + (next.step.short || next.step.title))
        : el('button', { class: 'btn btn-primary', type: 'button', onClick: () => P.store.set({ tab: 'protokoll' }) }, 'Zum Protokoll'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  }
})(window.Pruefung);
