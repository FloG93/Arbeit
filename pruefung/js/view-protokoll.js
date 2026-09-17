'use strict';

/* Protokoll: Zusammenfassung auf dem Bildschirm und ein A4-Bogen über den
 * Druckdialog (dort auch „Als PDF speichern“). Kein PDF-Generator im Gepäck —
 * der Druckdialog kann das auf jedem Gerät, offline, ohne Bibliothek. */
(function (P) {
  const { el, num, formatDateDE } = P.util;
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

  function rowsFor(pack, job, entries) {
    const facts = job.session.facts;
    return entries.map(entry => {
      const step = entry.step;
      const result = job.results[step.id] || {};
      return {
        label: step.protocolLabel || step.title,
        soll: entry.limit ? P.limits.format(entry.limit) : (step.limitHint ? 'siehe Hinweis' : '—'),
        ist: step.measure ? valueText(step, result) : '—',
        verdict: P.plan.verdict(pack, step, facts, result),
        note: result.note || '',
      };
    });
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

    const entries = P.plan.ensure(job, pack);
    const sum = P.plan.summary(pack, job.session, entries, job.results);
    const rows = rowsFor(pack, job, entries);
    const fields = (pack.protocol && pack.protocol.fields) || [];
    const maengel = rows.filter(r => r.verdict === 'mangel');

    const children = [
      U.card('Zusammenfassung', [
        el('div', { class: 'q-title' }, sum.done + ' von ' + sum.total + ' Schritten bewertet'),
        el('div', { class: 'chips' }, [
          sum.mangel ? U.badge(sum.mangel + ' Mangel', 'mangel') : sum.done ? U.badge('kein Mangel', 'ok') : null,
          sum.grenzwertig ? U.badge(sum.grenzwertig + ' grenzwertig', 'grenzwertig') : null,
          sum.open ? U.badge(sum.open + ' offen') : null,
        ]),
        sum.open
          ? el('div', { class: 'hint-text' }, 'Offene Schritte erscheinen im Bogen ohne Bewertung — ein Protokoll mit Lücken ist kein abgeschlossener Nachweis.')
          : null,
      ]),
      U.sectionHead('Kopfdaten', (P.data.variant(job.normId, job.variantId) || {}).norm || ''),
      U.card(null, [el('div', { class: 'w-kv' }, fields.map(field => el('div', { class: 'row' }, [
        el('div', { class: 'k' }, P.data.term(field.termKey, job.world, field.label)),
        el('div', { class: 'v' }, protocolValue(pack, job, field) || '—'),
      ])))]),
      U.sectionHead('Messwerte', 'Soll / Ist'),
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Prüfschritt'), el('th', {}, 'Soll'), el('th', {}, 'Ist'), el('th', {}, 'Bewertung')])),
        el('tbody', {}, rows.map(row => el('tr', {}, [
          el('td', {}, row.label),
          el('td', {}, row.soll),
          el('td', { class: 'v' }, row.ist),
          el('td', {}, U.verdictSym(row.verdict) + ' ' + U.verdictLabel(row.verdict)),
        ]))),
      ])]),
    ];

    if (maengel.length) {
      children.push(U.sectionHead('Mängel', maengel.length + ' Punkte'));
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

    children.push(el('div', { class: 'footnote' }, P.data.registry.disclaimer));

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => P.store.set({ tab: 'plan' }) }, 'Prüfplan'),
      el('button', {
        class: 'btn btn-primary', type: 'button',
        onClick: () => { buildSheet(job, pack, rows, sum); window.print(); },
      }, 'Drucken / als PDF'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  };

  /* Der Druckbogen wird erst beim Drucken gebaut — er ist die einzige Stelle,
   * die zwei Layouts derselben Daten braucht, und gehört nicht in jeden
   * Renderdurchlauf. */
  function buildSheet(job, pack, rows, sum) {
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    const fields = (pack.protocol && pack.protocol.fields) || [];
    const world = P.data.world(job.world);
    const variant = P.data.variant(job.normId, job.variantId);
    const due = job.interval && job.interval.nextDue;

    root.appendChild(el('div', { class: 'p-doc' }, [
      el('div', { class: 'p-head' }, [
        el('div', {}, [
          el('div', { class: 'p-eyebrow' }, 'Prüfprotokoll'),
          el('div', { class: 'p-title' }, variant ? variant.norm : pack.norm),
          el('div', { class: 'p-sub' }, (variant ? variant.title : pack.title) + ' · ' + (world ? world.label : '')),
        ]),
        el('div', { class: 'p-date' }, formatDateDE(job.protocol.datum) || ''),
      ]),
      el('div', { class: 'p-fields' }, fields.map(field => el('div', { class: 'p-field' }, [
        el('div', { class: 'k' }, P.data.term(field.termKey, job.world, field.label)),
        el('div', { class: 'v' }, protocolValue(pack, job, field) || ''),
      ]))),
      el('div', { class: 'p-section' }, 'Prüfschritte, Soll- und Istwerte'),
      el('div', {}, [
        el('div', { class: 'p-row p-row-head' }, [el('div', {}, 'Prüfschritt'), el('div', {}, 'Soll'), el('div', {}, 'Ist'), el('div', {}, 'Bewertung')]),
        rows.map(row => el('div', { class: 'p-row' }, [
          el('div', {}, row.label),
          el('div', {}, row.soll),
          el('div', {}, row.ist),
          el('div', {}, U.verdictSym(row.verdict) + ' ' + U.verdictLabel(row.verdict)),
          row.note ? el('div', { class: 'p-note' }, row.note) : null,
        ])),
      ]),
      el('div', { class: 'p-section' }, 'Ergebnis'),
      el('p', { class: 'p-note' }, sum.mangel
        ? sum.mangel + ' Mangel festgestellt. Die Anlage ist in diesem Zustand nicht zur Übergabe geeignet.'
        : sum.open
          ? sum.open + ' Prüfschritte sind offen — das Protokoll ist unvollständig.'
          : 'Kein Mangel festgestellt. Alle vorgesehenen Prüfschritte sind bewertet.'),
      due
        ? el('p', { class: 'p-note' }, 'Nächste Prüfung: ' + formatDateDE(due)
            + ' (Richtwert ' + P.intervals.label(job.interval.months)
            + (P.intervals.byId(job.interval.presetId) ? ', ' + P.intervals.byId(job.interval.presetId).label : '')
            + '). Verbindlich ist die Festlegung des Betreibers.')
        : null,
      (() => {
        const review = reviewNote(P.plan.ensure(job, pack));
        return review ? el('p', { class: 'p-note' }, review.text) : null;
      })(),
      el('div', { class: 'p-sign' }, [
        el('div', {}, 'Prüfer'),
        el('div', {}, 'Auftraggeber / Betreiber'),
      ]),
      el('div', { class: 'p-legal' }, P.data.registry.disclaimer + ' Datenstand ' + P.data.registry.datenstand + '.'),
    ]));
  }
})(window.Pruefung);
