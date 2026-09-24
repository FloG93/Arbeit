'use strict';

/* Protokoll: Zusammenfassung auf dem Bildschirm und ein A4-Bogen über den
 * Druckdialog (dort auch „Als PDF speichern“). Kein PDF-Generator im Gepäck —
 * der Druckdialog kann das auf jedem Gerät, offline, ohne Bibliothek. */
(function (P) {
  const { el, num, formatDateDE, plural } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  /* Ein Satz über die Herkunft der Grenzwerte, mit denen hier bewertet wurde.
   * Steht auf dem Bogen über der Unterschrift und auf dem Bildschirm, damit
   * niemand ungeprüfte Zahlen für gesicherte hält. */
  function reviewNote(entries) {
    const status = P.limits.reviewStatus(entries.map(e => e.limit && e.limit.tableId));
    if (!status.gesamt) return null;
    if (!status.offen) {
      const teile = ['Grenzwerte gegengeprüft'];
      if (status.pruefer.length) teile.push('von ' + status.pruefer.join(', '));
      if (status.datum) teile.push('am ' + formatDateDE(status.datum));
      if (status.editions.length) teile.push('gegen ' + status.editions.join(', '));
      return { text: teile.join(' ') + '.', offen: false };
    }
    return {
      text: 'Grenzwerte der Datenbasis nicht vollständig gegengeprüft: '
        + status.offen + ' von ' + status.gesamt + ' verwendeten Tabellen ohne Nachweis gegen die Normfassung. '
        + 'Die Bewertungen sind insoweit eine Arbeitshilfe und ersetzen die eigene Prüfung nicht.',
      offen: true,
    };
  }

  function protocolValue(pack, job, field) {
    if (field.kind === 'fact') return P.plan.factLabel(pack, job.session, field.factKey);
    if (field.kind === 'date') return formatDateDE(job.protocol[field.id]);
    return job.protocol[field.id];
  }

  function valueText(step, result) {
    const key = P.plan.keyValue(step, result);
    if (!key) return '—';
    if (key.overrange) return 'über Messbereich';
    return num(key.value) + (key.unit ? ' ' + key.unit : '');
  }

  /* Eine von Hand gesetzte Bewertung, die einem Messmangel widerspricht, steht
   * als solche im Protokoll — mit Vermerk statt still. */
  const kreisName = kreis => 'Stromkreis ' + (kreis.nr || '?') + (kreis.ziel ? ' · ' + kreis.ziel : '');

  function rowsFor(pack, job, entries, kreis) {
    const facts = P.plan.facts(job, kreis);
    const holder = kreis || job;
    return entries.map(entry => {
      const step = entry.step;
      const result = holder.results[step.id] || {};
      const overridden = P.plan.overridden(pack, step, facts, result);
      const notes = [];
      if (overridden) notes.push('Bewertung von Hand, Messwert außerhalb des Grenzwerts');
      if (result.note) notes.push(result.note);
      return {
        step,
        kreis: kreis || null,
        label: (kreis ? kreisName(kreis) + ' · ' : '') + (step.protocolLabel || step.title),
        soll: entry.limit ? P.limits.format(entry.limit) : (step.protocolSoll || '—'),
        ist: step.measure ? valueText(step, result) : '—',
        verdict: P.plan.verdict(pack, step, facts, result),
        overridden,
        note: notes.join(' — '),
      };
    });
  }

  /* Alles, was zu diesem Auftrag gehört: die Anlage und jeder Stromkreis.
   * Ohne das führte das Protokoll eines Verteilers mit zwölf Kreisen nur die
   * Sichtprüfung auf. */
  function alleTeile(job, pack) {
    const teile = [{ kreis: null, entries: P.plan.ensure(job, pack) }];
    for (const kreis of job.kreise || []) teile.push({ kreis, entries: P.plan.ensure(job, pack, kreis) });
    for (const teil of teile) {
      teil.holder = teil.kreis || job;
      teil.rows = rowsFor(pack, job, teil.entries, teil.kreis);
    }
    return teile;
  }

  const verdictCell = row => U.verdictSym(row.verdict) + ' ' + U.verdictLabel(row.verdict) + (row.overridden ? ' (von Hand)' : '');

  /* Ergebnissatz aus dem Normpaket: eine Anlage wird nicht „übergeben“ wie
   * ein Gerät, und ein Gerät hat keine „Anlage“. */
  function resultSentence(pack, sum) {
    const t = (pack.protocol && pack.protocol.resultText) || {};
    if (sum.mangel) return (t.mangel || '{n} festgestellt.').replace('{n}', plural(sum.mangel, 'Mangel', 'Mängel'));
    if (sum.open) return (t.offen || '{n} offen.').replace('{n}', plural(sum.open, 'Prüfschritt', 'Prüfschritte'));
    return t.ok || 'Kein Mangel festgestellt.';
  }

  P.views.protokoll = function protokollView() {
    const job = P.store.activeJob();
    const pack = job ? P.data.packById.get(job.normId) : null;
    if (!job || !pack || !job.session.done) {
      return {
        view: el('div', { class: 'view' }, [U.card('Kein Protokoll', [
          el('p', { class: 'w-p' }, 'Ein Protokoll entsteht, sobald der Assistent durchlaufen ist und Messwerte erfasst sind.'),
          el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => P.store.set({ tab: 'wizard' }) }, 'Zum Assistenten'),
        ])]),
      };
    }

    const teile = alleTeile(job, pack);
    const entries = teile.flatMap(t => t.entries);
    const sum = P.plan.summaryAll(job, pack);
    const rows = teile.flatMap(t => t.rows);
    const maengel = rows.filter(r => r.verdict === 'mangel');

    const children = [
      U.card('Zusammenfassung', [
        el('div', { class: 'q-title' }, sum.done + ' von ' + sum.total + ' Schritten bewertet'),
        el('div', { class: 'chips' }, [
          sum.mangel ? U.badge(plural(sum.mangel, 'Mangel', 'Mängel'), 'mangel') : sum.done ? U.badge('kein Mangel', 'ok') : null,
          sum.grenzwertig ? U.badge(sum.grenzwertig + ' grenzwertig', 'grenzwertig') : null,
          sum.open ? U.badge(sum.open + ' offen') : null,
        ]),
        sum.open
          ? el('div', { class: 'hint-text' }, 'Offene Schritte erscheinen im Bogen ohne Bewertung — ein Protokoll mit Lücken ist kein abgeschlossener Nachweis.')
          : null,
      ]),
      U.sectionHead('Kopfdaten', (P.data.variant(job.normId, job.variantId) || {}).norm || ''),
      P.views.protocolFields(job, pack),
      U.sectionHead('Messwerte', 'Soll / Ist'),
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Prüfschritt'), el('th', {}, 'Soll'), el('th', {}, 'Ist'), el('th', {}, 'Bewertung')])),
        el('tbody', {}, rows.map(row => el('tr', {}, [
          el('td', {}, row.label),
          el('td', {}, row.soll),
          el('td', { class: 'v' }, row.ist),
          el('td', {}, verdictCell(row)),
        ]))),
      ])]),
    ];

    if (maengel.length) {
      children.push(U.sectionHead('Mängel', plural(maengel.length, 'Punkt', 'Punkte')));
      children.push(el('div', { class: 'step-list' }, maengel.map(row => el('div', { class: 'w-warn' }, [
        el('span', { class: 'sym' }, '!'),
        el('div', { class: 't' }, row.label + (row.note ? ': ' + row.note : '')),
      ]))));
    }

    const review = reviewNote(entries);
    if (review) {
      children.push(el('div', { class: review.offen ? 'w-warn' : 'w-note' }, [
        el('span', { class: 'sym' }, review.offen ? '!' : 'i'),
        el('div', { class: 't' }, review.text),
      ]));
    }

    children.push(leitsatzKarte(job, pack, sum));
    children.push(P.views.missingNote(job, pack));

    children.push(el('div', { class: 'footnote' }, P.data.registry.disclaimer));

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => P.store.set({ tab: 'plan' }) }, 'Prüfplan'),
      el('button', {
        class: 'btn btn-primary', type: 'button',
        onClick: () => { buildSheet(job, pack, teile, sum); window.print(); },
      }, 'Drucken / als PDF'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  };

  /* Einzeln erfasste Messstellen stehen nicht in der Hauptzeile — dort steht
   * der maßgebliche Wert. Sie gehen trotzdem nicht verloren: Wer nachvollziehen
   * will, wo gemessen wurde, findet es im Anhang. */
  function messstellenAnhang(teile, abgedeckt) {
    const bloecke = [];
    for (const teil of teile) {
      for (const entry of teil.entries) {
        const step = entry.step;
        const result = teil.holder.results[step.id];
        if (!result) continue;
        const punkte = result.punkte || [];
        const messstellen = step.measure && step.measure.messstellen;
        // Dokumentierende Felder stehen nicht in der Hauptzeile, weil sie
        // nicht bewertet werden — aufgeschrieben wurden sie trotzdem.
        const doku = ((step.measure && step.measure.inputs) || []).filter(i => i.role === 'doku').filter(input => {
          const felder = abgedeckt && abgedeckt.get(step.id);
          return !felder || !(felder.has(input.id) || (input.gruppe && felder.has('gruppe:' + input.gruppe)));
        }).map(input => {
          const value = result.values ? result.values[input.id] : null;
          if (value == null || !isFinite(value)) return null;
          const gruppe = ((step.measure.gruppen || []).find(g => g.id === input.gruppe) || {}).label;
          return { label: (gruppe ? gruppe + ' · ' : '') + input.label, wert: num(value) + (input.unit ? ' ' + input.unit : '') };
        }).filter(Boolean);
        if (!doku.length && (!punkte.length || !messstellen)) continue;
        const felder = messstellen ? (messstellen.felder || []).map(f => f.id) : [];
        bloecke.push(el('div', {}, [
          el('div', { class: 'p-row p-row-head p-row-punkt' }, [
            el('div', {}, (teil.kreis ? kreisName(teil.kreis) + ' · ' : '') + (step.protocolLabel || step.title)),
            el('div', {}, 'Wert'),
          ]),
          doku.map(d => el('div', { class: 'p-row p-row-punkt' }, [el('div', {}, d.label), el('div', {}, d.wert)])),
          (messstellen ? punkte : []).map((punkt, i) => {
            const bezeichnung = felder.map(id => punkt[id]).filter(Boolean).join(' · ')
              || (messstellen.label || 'Messstelle') + ' ' + (i + 1);
            const wert = punkt.overrange
              ? 'über Messbereich'
              : punkt.wert == null || !isFinite(punkt.wert) ? '—' : num(punkt.wert) + ' ' + (messstellen.unit || '');
            return el('div', { class: 'p-row p-row-punkt' }, [el('div', {}, bezeichnung), el('div', {}, wert)]);
          }),
        ]));
      }
    }
    if (!bloecke.length) return null;
    return el('div', {}, [el('div', { class: 'p-section' }, 'Weitere erfasste Werte und Messstellen'), bloecke]);
  }

  /* Die Erklärung am Ende: „Die Anlage entspricht den anerkannten Regeln …"
   * Sie ist eine Aussage des Prüfers, keine Rechenfolge der App — deshalb
   * wird sie abgehakt und nie vorbelegt. Steht sie auf „ja", obwohl Mängel
   * erfasst sind, sagt die App das deutlich, verbietet es aber nicht: Es
   * kann fachlich richtig sein, etwa bei einem Mangel ohne
   * Sicherheitsrelevanz. Still passieren darf es nicht. */
  function leitsatzKarte(job, pack, sum) {
    const feld = ((pack.protocol && pack.protocol.fields) || []).find(f => f.place === 'abschluss');
    if (!feld) return null;
    const text = (pack.protocol && pack.protocol.leitsatz) || '';
    const wert = job.protocol[feld.id] || null;
    const widerspruch = wert === 'ja' && sum.mangel > 0;
    return U.card('Erklärung', [
      el('p', { class: 'w-p' }, text),
      el('div', { class: 'verdict' }, [
        { id: 'ja', label: 'Ja', sym: '✓' },
        { id: 'nein', label: 'Nein', sym: '!' },
      ].map(option => el('button', {
        class: 'verdict-btn' + (wert === option.id ? ' on ' + (option.id === 'ja' ? 'ok' : 'mangel') : ''),
        type: 'button',
        'aria-pressed': wert === option.id ? 'true' : 'false',
        'data-fkey': 'konform-' + option.id,
        onClick: () => {
          P.store.setProtocolField(job.id, pack, feld.id, wert === option.id ? '' : option.id);
          P.render();
        },
      }, [el('span', { class: 'sym' }, option.sym), el('span', {}, option.label)]))),
      widerspruch
        ? el('div', { class: 'w-warn' }, [
            el('span', { class: 'sym' }, '!'),
            el('div', { class: 't' }, 'Die Erklärung steht auf „ja", obwohl ' + plural(sum.mangel, 'ein Mangel', 'Mängel') + ' erfasst ' + (sum.mangel === 1 ? 'ist' : 'sind') + '. Das Protokoll vermerkt das — die Begründung gehört in die Bemerkung.'),
          ])
        : null,
    ]);
  }

  /* ─── Druckbogen ───
   * Aufbau und Spalten folgen dem Prüf- und Messprotokoll der IHK: Wer den
   * Bogen kennt, findet sich ohne Suchen zurecht. Gebaut wird er erst beim
   * Drucken — er ist die einzige Stelle, die ein zweites Layout derselben
   * Daten braucht, und gehört nicht in jeden Renderdurchlauf.
   *
   * Die Spalten der Messtabelle stehen im Datenpaket (protocol.messtabelle),
   * nicht hier: Eine Spalte mehr ist damit ein Eintrag in der JSON-Datei. */

  const MARK = { ok: '✓', mangel: '✗', na: '–' };
  const markFor = value => MARK[value === true ? 'ok' : value === false ? 'mangel' : value === 'na' ? 'na' : ''] || '';

  /* Einen Wert aus dem Auftrag holen — je nachdem, worauf die Spalte zeigt. */
  function zelle(job, pack, kreis, spalte) {
    const from = spalte.from || {};
    if (from.kreis) {
      const wert = from.kreis.split('.').reduce((o, k) => (o == null ? null : o[k]), kreis);
      if (wert == null || wert === '') return '';
      return typeof wert === 'number' ? num(wert) : String(wert);
    }
    // Ein Fakt kann am Stromkreis abweichen — dann gilt seiner.
    if (from.fact) {
      const eigen = kreis && kreis.facts ? kreis.facts[from.fact] : null;
      if (eigen != null) {
        const table = pack.factLabels && pack.factLabels[from.fact];
        return (table && table[eigen]) || String(eigen);
      }
      return P.plan.factLabel(pack, job.session, from.fact) || '';
    }
    if (!from.step) return '';
    const step = pack.stepById.get(from.step);
    if (!step) return '';
    const bag = P.plan.scopeOf(step) === 'stromkreis' ? (kreis && kreis.results) || {} : job.results;
    const result = bag[from.step];
    if (!result) return '';
    const measure = step.measure || {};
    const einheit = '';
    if (from.input) {
      if (result.overrange && result.overrange[from.input]) return '> ' + num(result.values[from.input]);
      const wert = result.values ? result.values[from.input] : null;
      return wert == null || !isFinite(wert) ? '' : num(wert) + einheit;
    }
    if (from.gruppe) {
      // Kleinster bzw. größter Wert einer Feldgruppe — im Formular sind das
      // die Zeilen „ohne" und „mit Verbraucher".
      const agg = measure.aggregate === 'min' ? 'min' : 'max';
      let best = null;
      for (const input of measure.inputs || []) {
        if (input.gruppe !== from.gruppe) continue;
        const wert = result.values ? result.values[input.id] : null;
        if (wert == null || !isFinite(wert)) continue;
        best = best == null ? wert : (agg === 'min' ? Math.min(best, wert) : Math.max(best, wert));
      }
      return best == null ? '' : num(best);
    }
    const key = P.plan.keyValue(step, result);
    if (!key) return '';
    return key.overrange ? 'über Messbereich' : num(key.value);
  }

  /* Besichtigen und Erproben: die Checklistenpunkte mit i.O. / n.i.O. / n. a.,
   * dreispaltig wie im Formular. Schritte ohne Checkliste stehen mit ihrer
   * eigenen Bewertung da — ein Drehfeld hakt man nicht ab, man misst es. */
  function markierteListe(job, pack, entries, phase, tabellenSchritte) {
    const punkte = [];
    for (const entry of entries) {
      const step = entry.step;
      if (step.phase !== phase || step.protocolBlock || tabellenSchritte.has(step.id)) continue;
      const result = job.results[step.id] || {};
      const items = P.plan.visibleChecklist(step, job.session.facts);
      if (items.length) {
        for (const item of items) {
          punkte.push({ label: item.label, mark: markFor(result.checks ? result.checks[item.id] : undefined) });
        }
      } else {
        const verdict = P.plan.verdict(pack, step, job.session.facts, result);
        punkte.push({
          label: step.protocolLabel || step.title,
          mark: verdict === 'ok' ? MARK.ok : verdict === 'mangel' ? MARK.mangel : verdict === 'na' ? MARK.na : '',
        });
      }
    }
    if (!punkte.length) return null;
    return el('div', { class: 'p-checks' }, punkte.map(p => el('div', { class: 'p-check' }, [
      el('div', { class: 'b' }, p.mark),
      el('div', { class: 't' }, p.label),
    ])));
  }

  /* Der Potentialausgleich hat im Formular einen eigenen Kasten: die
   * Anbindungen als Raster, daneben der Erdungswiderstand. */
  function potentialausgleich(job, pack, entries) {
    const entry = entries.find(e => e.step.protocolBlock === 'potentialausgleich');
    if (!entry) return null;
    const step = entry.step;
    const result = job.results[step.id] || {};
    const items = P.plan.visibleChecklist(step, job.session.facts);
    const key = P.plan.keyValue(step, result);
    // Welcher Erder-Schritt im Plan steht, hängt an der Netzform — der Bogen
    // nimmt den, der einen Wert hat.
    const erder = entries.filter(e => e.step.protocolBlock === 'erder')
      .map(e => ({ step: e.step, result: job.results[e.step.id] }))
      .find(x => x.result && P.plan.keyValue(x.step, x.result));
    const erderWert = erder ? P.plan.keyValue(erder.step, erder.result) : null;
    return el('div', {}, [
      el('div', { class: 'p-section' }, 'Durchgängigkeit des Potentialausgleichs'),
      el('div', { class: 'p-checks' }, items.map(item => el('div', { class: 'p-check' }, [
        el('div', { class: 'b' }, markFor(result.checks ? result.checks[item.id] : undefined)),
        el('div', { class: 't' }, item.label),
      ]))),
      el('div', { class: 'p-inline' }, [
        el('div', {}, 'Größter Verbindungswiderstand: ' + (key ? num(key.value) + ' Ω' : '—')),
        el('div', {}, (erder ? erder.step.protocolLabel || 'Erdungswiderstand' : 'Erdungswiderstand')
          + ': ' + (erderWert ? num(erderWert.value) + ' Ω' : '—')),
      ]),
    ]);
  }

  /* Alles, was weder in die Messtabelle noch in einen der Blöcke gehört —
   * Spannungsfall, SELV-Trennung, Differenzstrom, die Dokumentationsschritte.
   * Ohne diesen Block fiele es lautlos aus dem Bogen, obwohl es gemessen
   * wurde. */
  function weitereSchritte(teile, tabellenSchritte) {
    const offen = [];
    for (const teil of teile) {
      teil.entries.forEach((entry, i) => {
        const step = entry.step;
        if (tabellenSchritte.has(step.id) || step.protocolBlock) return;
        if (step.phase !== 'messen' && step.phase !== 'dokumentieren') return;
        offen.push(teil.rows[i]);
      });
    }
    if (!offen.length) return null;
    return el('div', {}, [
      el('div', { class: 'p-section' }, 'Weitere Prüfschritte'),
      el('div', { class: 'p-row p-row-head' }, [el('div', {}, 'Prüfschritt'), el('div', {}, 'Soll'), el('div', {}, 'Ist'), el('div', {}, 'Bewertung')]),
      offen.map(row => {
        if (!row) return null;
        return el('div', { class: 'p-row' }, [
          el('div', {}, row.label),
          el('div', {}, row.soll),
          el('div', {}, row.ist),
          el('div', {}, verdictCell(row)),
          row.note ? el('div', { class: 'p-note' }, row.note) : null,
        ]);
      }),
    ]);
  }

  function buildSheet(job, pack, teile, sum) {
    const rows = teile.flatMap(t => t.rows);
    const anlagenTeil = teile.find(t => !t.kreis) || { entries: [], rows: [] };
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    const alleFelder = (pack.protocol && pack.protocol.fields) || [];
    const kopfFelder = alleFelder.filter(f => !f.place);
    const messgeraete = alleFelder.filter(f => f.place === 'messgeraete');
    const world = P.data.world(job.world);
    const variant = P.data.variant(job.normId, job.variantId);
    const due = job.interval && job.interval.nextDue;
    const entries = teile.flatMap(t => t.entries);
    const spalten = (pack.protocol && pack.protocol.messtabelle) || [];
    const tabellenSchritte = new Set(spalten.map(c => c.from && c.from.step).filter(Boolean));
    // Welche Felder eines Schrittes die Tabelle bereits zeigt — der Anhang
    // lässt sie dann weg.
    const abgedeckt = new Map();
    for (const spalte of spalten) {
      const from = spalte.from || {};
      if (!from.step) continue;
      if (!abgedeckt.has(from.step)) abgedeckt.set(from.step, new Set());
      if (from.input) abgedeckt.get(from.step).add(from.input);
      if (from.gruppe) abgedeckt.get(from.step).add('gruppe:' + from.gruppe);
    }

    // Bis es Stromkreise gibt (Paket 3), ist der Auftrag ein Stromkreis. Die
    // Tabelle ist schon darauf gebaut: Paket 3 füllt job.kreise, hier ändert
    // sich dann nichts mehr.
    const kreise = (job.kreise && job.kreise.length)
      ? job.kreise
      : [{ nr: '1', ziel: job.protocol.anlagenteil || '', leitung: {}, schutz: {}, facts: {}, results: {} }];

    const plakette = (() => {
      const step = pack.stepById.get('s-pruefplakette');
      if (!step) return null;
      return P.plan.verdict(pack, step, job.session.facts, job.results['s-pruefplakette']);
    })();

    // Auch eine von Hand über einen Messmangel gesetzte Bewertung steht hier:
    // Sie ist erlaubt, darf aber nirgends still passieren.
    const auffaellig = rows.filter(r => r.verdict === 'mangel' || r.verdict === 'grenzwertig' || r.overridden);
    const leitsatz = (pack.protocol && pack.protocol.leitsatz) || '';
    const konform = job.protocol.konformitaet || '';
    const konformWiderspruch = konform === 'ja' && sum.mangel > 0;
    const review = reviewNote(entries);

    root.appendChild(el('div', { class: 'p-doc' }, [
      el('div', { class: 'p-head' }, [
        el('div', {}, [
          el('div', { class: 'p-eyebrow' }, 'Prüf- und Messprotokoll'),
          el('div', { class: 'p-title' }, variant ? variant.norm : pack.norm),
          el('div', { class: 'p-sub' }, (variant ? variant.title : pack.title) + ' · ' + (world ? world.label : '')),
        ]),
        el('div', { class: 'p-date' }, formatDateDE(job.protocol.datum) || ''),
      ]),
      el('div', { class: 'p-fields' }, kopfFelder.map(field => el('div', { class: 'p-field' }, [
        el('div', { class: 'k' }, P.data.term(field.termKey, job.world, field.label)),
        el('div', { class: 'v' }, protocolValue(pack, job, field) || ''),
      ]))),

      el('div', { class: 'p-section' }, 'Besichtigen'),
      markierteListe(job, pack, anlagenTeil.entries, 'besichtigen', tabellenSchritte),
      el('div', { class: 'p-section' }, 'Erproben'),
      markierteListe(job, pack, anlagenTeil.entries, 'erproben', tabellenSchritte),

      el('div', { class: 'p-section' }, 'Messen'),
      el('div', { class: 'p-inline' }, [el('div', {}, 'Stromkreisverteiler: ' + (job.protocol.anlagenteil || '—'))]),
      el('div', { class: 'p-table-wrap' }, [el('table', { class: 'p-mess' }, [
        el('thead', {}, el('tr', {}, spalten.map(c => el('th', { class: c.breit ? 'w' : null }, c.label)))),
        el('tbody', {}, kreise.map(kreis => el('tr', {}, spalten.map(c =>
          el('td', { class: c.breit ? 'w' : null }, zelle(job, pack, kreis, c)))))),
      ])]),

      potentialausgleich(job, pack, anlagenTeil.entries),
      weitereSchritte(teile, tabellenSchritte),

      messgeraete.length
        ? el('div', {}, [
            el('div', { class: 'p-section' }, 'Verwendete Messgeräte'),
            el('div', { class: 'p-inline' }, messgeraete.map(f => el('div', {}, job.protocol[f.id] || '—'))),
          ])
        : null,

      el('div', { class: 'p-section' }, 'Prüfergebnis'),
      el('div', { class: 'p-inline' }, [
        el('div', {}, sum.mangel ? '✗ Mängel festgestellt' : sum.open ? '· Prüfung nicht abgeschlossen' : '✓ Keine Mängel festgestellt'),
        el('div', {}, 'Prüfplakette: ' + (plakette === 'ok' ? 'ja' : plakette === 'mangel' ? 'nein' : '—')),
        el('div', {}, 'Nächster Prüftermin: ' + (due ? formatDateDE(due) : '—')),
      ]),
      el('p', { class: 'p-note' }, resultSentence(pack, sum)),
      due
        ? el('p', { class: 'p-note' }, 'Richtwert ' + P.intervals.label(job.interval.months)
            + (P.intervals.byId(job.interval.presetId) ? ', ' + P.intervals.byId(job.interval.presetId).label : '')
            + '. Verbindlich ist die Festlegung des Betreibers.')
        : null,

      el('div', { class: 'p-section' }, 'Mängel und Bemerkungen'),
      auffaellig.length
        ? el('div', {}, auffaellig.map(row => el('p', { class: 'p-note' },
            U.verdictSym(row.verdict) + ' ' + row.label
            + (row.overridden ? ' — ' + U.verdictLabel(row.verdict) + ' von Hand, Messwert außerhalb des Grenzwerts' : '')
            + (row.ist && row.ist !== '—' ? ': ' + row.ist + (row.soll && row.soll !== '—' ? ' (zulässig ' + row.soll + ')' : '') : '')
            + (row.note ? ' — ' + row.note : ''))))
        : el('p', { class: 'p-note' }, 'Keine.'),

      // Der Leitsatz ist eine Erklärung des Prüfers, keine Rechnung der App.
      el('div', { class: 'p-leitsatz' }, [
        el('div', { class: 't' }, leitsatz),
        el('div', { class: 'jn' }, [
          el('span', { class: konform === 'ja' ? 'on' : null }, (konform === 'ja' ? '☒' : '☐') + ' ja'),
          el('span', { class: konform === 'nein' ? 'on' : null }, (konform === 'nein' ? '☒' : '☐') + ' nein'),
        ]),
      ]),
      konformWiderspruch
        ? el('p', { class: 'p-note' }, 'Hinweis: Die Erklärung steht auf „ja", obwohl in diesem Protokoll Mängel erfasst sind.')
        : null,

      messstellenAnhang(teile, abgedeckt),
      review ? el('p', { class: 'p-note' }, review.text) : null,

      el('div', { class: 'p-sign' }, [
        el('div', {}, 'Auftraggeber — Ort, Datum, Unterschrift'),
        el('div', {}, 'Prüfer/-in — Ort, Datum, Unterschrift'),
      ]),
      el('div', { class: 'p-legal' }, P.data.registry.disclaimer + ' Datenstand ' + P.data.registry.datenstand + '.'),
    ]));
  }
})(window.Pruefung);
