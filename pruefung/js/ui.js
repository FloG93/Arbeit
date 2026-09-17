'use strict';

/* Wiederverwendete Bausteine.
 *
 * Zwei Regeln ziehen sich durch alles hier: jedes Bedienelement ist mindestens
 * --tap-min hoch, und ein Zustand wird nie nur durch Farbe ausgedrückt —
 * immer Symbol plus Text plus Farbe. Mit Handschuhen, in der Sonne oder mit
 * Farbsehschwäche bleibt die Oberfläche damit bedienbar. */
(function (P) {
  const { el, num, inputNum, parseNum } = P.util;

  const U = {};

  const VERDICTS = [
    { id: 'ok', label: 'OK', sym: '✓' },
    { id: 'mangel', label: 'Mangel', sym: '!' },
    { id: 'na', label: 'n. a.', sym: '–' },
  ];
  const VERDICT_LABEL = { ok: 'OK', mangel: 'Mangel', grenzwertig: 'grenzwertig', na: 'n. a.' };
  const VERDICT_SYM = { ok: '✓', mangel: '!', grenzwertig: '≈', na: '–' };

  U.verdictLabel = v => VERDICT_LABEL[v] || 'offen';
  U.verdictSym = v => VERDICT_SYM[v] || '·';

  U.badge = (text, kind) => el('span', { class: 'badge' + (kind ? ' ' + kind : '') }, text);

  U.verdictPill = verdict => el('span', { class: 'badge' + (verdict ? ' ' + verdict : '') }, [
    el('span', {}, U.verdictSym(verdict)),
    el('span', {}, U.verdictLabel(verdict)),
  ]);

  /* Drei gleich große Felder statt Häkchen: eine Bewertung ist eine Entscheidung
   * mit drei Ausgängen, und alle drei brauchen dasselbe große Ziel. */
  U.verdictSwitch = (value, onPick) => el('div', { class: 'verdict' }, VERDICTS.map(v =>
    el('button', {
      class: 'verdict-btn' + (value === v.id ? ' on ' + v.id : ''),
      type: 'button',
      'aria-pressed': value === v.id ? 'true' : 'false',
      onClick: () => onPick(value === v.id ? null : v.id),
    }, [
      el('span', { class: 'sym' }, v.sym),
      el('span', {}, v.label),
    ])
  ));

  U.progress = (done, total, text) => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return el('div', { class: 'progress' }, [
      el('div', { class: 'bar' }, [el('div', { class: 'fill', style: { width: pct + '%' } })]),
      el('div', { class: 'txt' }, text),
    ]);
  };

  U.limitText = (limit, hint) => {
    if (limit) {
      const range = P.limits.format(limit);
      return 'zulässig ' + range + (limit.label ? ' · ' + limit.label : '');
    }
    return hint || '';
  };

  /* Zahlenfeld: bewusst type="text" mit inputmode="decimal". Ein type="number"
   * verschluckt auf deutschen Tastaturen das Komma — aus 0,4 wurde 4. */
  U.numInput = (fkey, value, unit, onValue, extra) => el('input', Object.assign({
    class: 'input', type: 'text', inputmode: 'decimal', enterkeyhint: 'next',
    'data-fkey': fkey, value: inputNum(value),
    onInput: e => onValue(parseNum(e.target.value, null)),
  }, extra || {}));

  U.textInput = (fkey, value, onValue, extra) => el('input', Object.assign({
    class: 'input', type: 'text', 'data-fkey': fkey, value: value == null ? '' : value,
    onInput: e => onValue(e.target.value),
  }, extra || {}));

  /* Eine Messzeile: Label, Feld, Einheit, darunter Grenzwert und Schnellwerte.
   * Die Bewertung steht direkt am Feld — im Keller will niemand scrollen, um
   * zu sehen, ob der Wert reicht. */
  U.measureRow = function measureRow(opts) {
    const { input, limit, value, overrange, fkey, onValue, onOverrange } = opts;
    const verdict = P.limits.evaluate(value, limit, { overrange });
    const limitLine = U.limitText(limit, opts.hint);
    const shown = overrange ? '> ' + num(value) : null;

    const quick = (input.quickValues || []).map(q => el('button', {
      class: 'quick-chip', type: 'button',
      onClick: () => (q.overrange ? onOverrange(q.value) : onValue(q.value)),
    }, q.label));

    return el('div', { class: 'measure-row' }, [
      el('div', { class: 'measure-line' }, [
        el('div', { class: 'lbl' }, input.label),
        overrange
          ? el('button', { class: 'input', style: { textAlign: 'right', font: '600 1.375rem/1 var(--font-display)' }, type: 'button', onClick: () => onOverrange(null) }, shown)
          : U.numInput(fkey, value, input.unit, onValue, { 'aria-label': input.label + (input.unit ? ' in ' + input.unit : '') }),
        el('div', { class: 'unit' }, input.unit || ''),
      ]),
      el('div', { class: 'measure-meta' }, [
        limitLine ? el('div', { class: 'limit-badge' + (verdict && verdict !== 'unbekannt' ? ' ' + verdict : '') }, limitLine) : null,
        input.optional ? el('div', { class: 'limit-badge' }, 'optional') : null,
        quick.length ? el('div', { class: 'chips' }, quick) : null,
      ]),
    ]);
  };

  /* Dreizustands-Zeile: unbeantwortet → in Ordnung → Mangel → unbeantwortet.
   * Ein Tippziel statt zwei, weil eine Hand oft schon das Messgerät hält. */
  U.checkRow = function checkRow(item, state, onToggle) {
    const cls = state === true ? ' ok' : state === false ? ' mangel' : '';
    const next = state === true ? false : state === false ? null : true;
    const sym = state === true ? '✓' : state === false ? '!' : '';
    return el('button', {
      class: 'check-row' + cls, type: 'button',
      'aria-label': item.label + ' — ' + (state === true ? 'in Ordnung' : state === false ? 'Mangel' : 'offen'),
      onClick: () => onToggle(next),
    }, [
      el('span', { class: 'box' }, sym),
      el('span', { class: 't' }, item.label),
    ]);
  };

  U.sectionHead = (title, hint) => el('div', { class: 'section-head' }, [
    el('div', { class: 'h' }, title),
    hint ? el('div', { class: 'hint' }, hint) : null,
  ]);

  U.card = (title, children) => el('div', { class: 'card' }, [
    title ? el('div', { class: 'card-title', style: { marginBottom: '.75rem' } }, title) : null,
    el('div', { class: 'card-body' }, children),
  ]);

  U.bottomBar = children => el('div', { class: 'bottom-bar' }, children);

  /* Sagt, woran man ist: solange niemand die Zahlen gegen die Normfassung
   * gehalten hat, steht das an jeder Tabelle. Die App soll über ihren eigenen
   * Stand nicht schweigen — daraufhin wird ein Protokoll unterschrieben. */
  U.isReviewed = rev => !!(rev && rev.date);

  U.reviewLine = function reviewLine(rev) {
    if (!U.isReviewed(rev)) {
      return el('div', { class: 'chips', style: { margin: '.125rem 0' } }, [
        el('span', { class: 'badge grenzwertig' }, '⚠ Datenbasis ungeprüft'),
      ]);
    }
    const parts = ['geprüft'];
    if (rev.by) parts.push('von ' + rev.by);
    parts.push('am ' + P.util.formatDateDE(rev.date));
    if (rev.edition) parts.push('gegen ' + rev.edition);
    return el('div', { class: 'src' }, parts.join(' ') + (rev.fundstelle ? ' · ' + rev.fundstelle : ''));
  };

  /* ─── Grenzwerttabellen und Wiki-Blöcke ───
   * Eine Grenzwerttabelle wird nur hier gerendert — aus grenzwerte.json. So
   * steht ein Grenzwert an genau einer Stelle im Repo, egal ob ihn ein
   * Prüfschritt, das Wiki oder das Protokoll zeigt. */
  U.limitTable = function limitTable(tableId, markRowKey) {
    const table = P.limits.table(tableId);
    if (!table) return el('div', { class: 'empty-note' }, 'Grenzwerttabelle fehlt: ' + tableId);
    const columns = table.columns || [
      { id: 'label', label: table.keyLabel || 'Fall' },
      { id: '__limit', label: 'Grenzwert' },
    ];
    const head = el('tr', {}, columns.map(c => el('th', {}, c.label + (c.unit ? ' (' + c.unit + ')' : ''))));
    const rows = (table.rows || []).map(row => el('tr', { class: markRowKey && row.key === markRowKey ? 'marked' : null },
      columns.map(c => {
        if (c.id === '__limit') return el('td', { class: 'v' }, P.limits.formatRow(row));
        const raw = row[c.id];
        const isNum = typeof raw === 'number';
        return el('td', { class: isNum ? 'v' : null }, raw == null ? '—' : isNum ? num(raw) : String(raw));
      })
    ));
    const notes = (table.rows || []).filter(r => r.note).map(r => el('div', { class: 'src' }, r.label + ': ' + r.note));
    return el('div', { class: 'w-table' }, [
      table.title ? el('div', { class: 'cap' }, table.title) : null,
      U.reviewLine(table.reviewed),
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [el('thead', {}, head), el('tbody', {}, rows)])]),
      table.source ? el('div', { class: 'src' }, 'Quelle: ' + table.source) : null,
      notes,
    ]);
  };

  function plainTable(block) {
    const columns = block.columns || [];
    return el('div', { class: 'w-table' }, [
      block.title ? el('div', { class: 'cap' }, block.title) : null,
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [
        el('thead', {}, el('tr', {}, columns.map(c => el('th', {}, c.label)))),
        el('tbody', {}, (block.rows || []).map(row => el('tr', {}, columns.map(c => el('td', {}, row[c.id] == null ? '—' : String(row[c.id])))))),
      ])]),
      block.note ? el('div', { class: 'src' }, block.note) : null,
    ]);
  }

  function intervalTable() {
    const data = P.data.intervals;
    if (!data) return el('div', { class: 'empty-note' }, 'Keine Fristen-Daten geladen.');
    const rows = (data.presets || []).map(preset => el('tr', {}, [
      el('td', {}, preset.label),
      el('td', { class: 'v' }, preset.intervalMonths >= 12 && preset.intervalMonths % 12 === 0
        ? (preset.intervalMonths / 12) + ' Jahre'
        : preset.intervalMonths + ' Monate'),
      el('td', {}, preset.basis),
    ]));
    return el('div', { class: 'w-table' }, [
      U.reviewLine(data.reviewed),
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Bereich'), el('th', {}, 'Richtwert'), el('th', {}, 'Grundlage')])),
        el('tbody', {}, rows),
      ])]),
      data.source ? el('div', { class: 'src' }, 'Quelle: ' + data.source) : null,
    ]);
  }

  /* Wiki-Körper sind Blocklisten, kein HTML: alles läuft über textContent,
   * damit Datenpakete keine Skripte einschleppen können. */
  U.blocks = function blocks(body, ctx) {
    const onLink = (ctx && ctx.onLink) || (() => {});
    return (body || []).map(block => {
      switch (block.type) {
        case 'p': return el('p', { class: 'w-p' }, block.text);
        case 'steps': return el('ol', { class: 'w-steps' }, (block.items || []).map(i => el('li', {}, i)));
        case 'bullets': return el('ul', { class: 'w-bullets' }, (block.items || []).map(i => el('li', {}, i)));
        case 'warn': return el('div', { class: 'w-warn' }, [el('span', { class: 'sym' }, '!'), el('div', { class: 't' }, block.text)]);
        case 'note': return el('div', { class: 'w-note' }, [el('span', { class: 'sym' }, 'i'), el('div', { class: 't' }, block.text)]);
        case 'kv': return el('div', { class: 'w-kv' }, (block.items || []).map(item =>
          el('div', { class: 'row' }, [el('div', { class: 'k' }, item.k), el('div', { class: 'v' }, item.v)])));
        case 'limits': return U.limitTable(block.limitRef, block.markRowKey);
        case 'table': return plainTable(block);
        case 'intervals': return intervalTable();
        case 'formula': {
          const f = P.limits.formula(block.formulaRef);
          if (!f) return el('div', { class: 'empty-note' }, 'Formel fehlt: ' + block.formulaRef);
          return el('div', { class: 'w-formula' }, [
            el('div', { class: 'lbl' }, f.label),
            el('div', { class: 'expr' }, f.expr),
            f.note ? el('div', { class: 'note' }, f.note) : null,
          ]);
        }
        case 'link': return el('button', { class: 'mini-btn', type: 'button', style: { alignSelf: 'flex-start' }, onClick: () => onLink(block.to) },
          (block.label || block.to) + ' →');
        default: return null;
      }
    }).filter(Boolean);
  };

  P.ui = U;
})(window.Pruefung);
