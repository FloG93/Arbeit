'use strict';

/* Wiederverwendete Bausteine.
 *
 * Zwei Regeln ziehen sich durch alles hier: was beim Messen getroffen werden
 * muss (Antworten, Messfelder, Schnellwerte, Bewertung) ist mindestens
 * --tap-min (56 px) hoch, alles Übrige mindestens 48 px — und ein Zustand
 * wird nie nur durch Farbe ausgedrückt, immer Symbol plus Text plus Farbe.
 * Mit Handschuhen, in der Sonne oder mit Farbsehschwäche bleibt die
 * Oberfläche damit bedienbar. */
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
   * verschluckt auf deutschen Tastaturen das Komma — aus 0,4 wurde 4.
   *
   * Jeder Tastendruck zeichnet neu. Würde das Feld dabei aus dem geparsten
   * Wert gefüllt, wäre „1," sofort wieder „1" und das nächste Zeichen machte
   * aus 1,5 eine 15. Deshalb bleibt der getippte Rohtext stehen, solange er
   * denselben Wert bedeutet; erst ein anderer Wert (Schnellwert, Auftrag
   * gewechselt) überschreibt ihn. */
  const drafts = new Map();

  U.numInput = (fkey, value, unit, onValue, extra) => {
    const draft = drafts.get(fkey);
    const current = value == null || !isFinite(value) ? null : value;
    const shown = draft != null && parseNum(draft, null) === current ? draft : inputNum(value);
    return el('input', Object.assign({
      class: 'input', type: 'text', inputmode: 'decimal', enterkeyhint: 'next',
      'data-fkey': fkey, value: shown,
      onInput: e => { drafts.set(fkey, e.target.value); onValue(parseNum(e.target.value, null)); },
    }, extra || {}));
  };

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

    // Schnellwerte stehen entweder am Feld oder — wenn es Normwerte sind —
    // in der Grenzwerttabelle. Dann werden sie von dort geholt, damit die
    // Zahl nicht ein zweites Mal im Repo steht und der Prüfstand für sie gilt.
    const quellwerte = input.quickFromLimit
      ? ((P.limits.table(input.quickFromLimit) || {}).rows || [])
          .filter(row => row.max != null)
          .map(row => ({ label: num(row.max), value: row.max }))
      : (input.quickValues || []);
    const quick = quellwerte.map(q => el('button', {
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

  /* Frei angelegte Messstellen: eine Zeile je gemessenem Punkt, per „+"
   * hinzugefügt. Ein Stromkreis hat so viele Messpunkte, wie er Steckdosen
   * hat — das weiß keine Datendatei im Voraus.
   *
   * Der maßgebliche Wert (größter bzw. kleinster) landet über P.plan.keyValue
   * im Protokoll; hier stehen die Einzelwerte mit ihrer Bezeichnung. */
  U.messstellenListe = function messstellenListe(opts) {
    const { stepId, messstellen, punkte, limit, onAdd, onPatch, onRemove } = opts;
    const felder = messstellen.felder || [];
    const einheit = messstellen.unit || '';

    const zeile = (punkt, i) => {
      const nr = i + 1;
      const verdict = P.limits.evaluate(punkt.wert, limit, { overrange: !!punkt.overrange });
      const fkey = f => 'pkt-' + stepId + '-' + punkt.id + '-' + f;
      return el('div', { class: 'measure-row punkt-row', 'data-punkt': String(punkt.id) }, [
        el('div', { class: 'punkt-kopf' }, [
          el('span', { class: 'punkt-nr' }, (messstellen.label || 'Messstelle') + ' ' + nr),
          el('button', {
            class: 'mini-btn', type: 'button',
            'aria-label': (messstellen.label || 'Messstelle') + ' ' + nr + ' löschen',
            onClick: () => onRemove(punkt.id),
          }, 'Löschen'),
        ]),
        felder.filter(f => f.kind === 'text').map(f => U.textInput(fkey(f.id), punkt[f.id] || '',
          v => onPatch(punkt.id, { [f.id]: v }),
          { placeholder: f.placeholder || f.label, 'aria-label': f.label })),
        felder.filter(f => f.kind === 'auswahl').map(f => el('div', { class: 'chips' },
          (f.optionen || []).map(option => el('button', {
            class: 'chip' + (punkt[f.id] === option ? ' active' : ''), type: 'button',
            'aria-pressed': punkt[f.id] === option ? 'true' : 'false',
            onClick: () => onPatch(punkt.id, { [f.id]: punkt[f.id] === option ? null : option }),
          }, option)))),
        el('div', { class: 'measure-line' }, [
          el('div', { class: 'lbl' }, 'Wert'),
          U.numInput(fkey('wert'), punkt.wert, einheit, v => onPatch(punkt.id, { wert: v, overrange: false }),
            { 'aria-label': 'Messwert' + (einheit ? ' in ' + einheit : '') }),
          el('div', { class: 'unit' }, einheit),
        ]),
        limit
          ? el('div', { class: 'limit-badge' + (verdict && verdict !== 'unbekannt' ? ' ' + verdict : '') }, U.limitText(limit))
          : null,
      ]);
    };

    return el('div', { class: 'step-list' }, [
      (punkte || []).map(zeile),
      el('button', { class: 'btn btn-outline btn-block punkt-add', type: 'button', onClick: onAdd },
        '+  ' + (messstellen.addLabel || 'Messstelle hinzufügen')),
    ]);
  };

  /* Vierzustands-Zeile: offen → in Ordnung → Mangel → nicht zutreffend →
   * offen. Ein Tippziel statt vier, weil eine Hand oft schon das Messgerät
   * hält.
   *
   * „n. a." ist kein Schönheitszustand: In der Liste des Potentialausgleichs
   * ist „Gasinnenleitung nicht vorhanden" der Normalfall, und ohne eigenen
   * Zustand sähe er im Protokoll aus wie ein übersehener Punkt. */
  const CHECK_STATES = [
    { value: null, cls: '', sym: '', label: 'offen' },
    { value: true, cls: ' ok', sym: '✓', label: 'in Ordnung' },
    { value: false, cls: ' mangel', sym: '!', label: 'Mangel' },
    { value: 'na', cls: ' na', sym: '–', label: 'nicht zutreffend' },
  ];
  const checkState = value => CHECK_STATES.find(s => s.value === value) || CHECK_STATES[0];

  U.checkStateLabel = value => checkState(value).label;
  U.checkStateSym = value => checkState(value).sym;

  U.checkRow = function checkRow(item, state, onToggle) {
    const current = checkState(state);
    const next = CHECK_STATES[(CHECK_STATES.indexOf(current) + 1) % CHECK_STATES.length].value;
    return el('button', {
      class: 'check-row' + current.cls, type: 'button',
      'aria-label': item.label + ' — ' + current.label,
      onClick: () => onToggle(next),
    }, [
      el('span', { class: 'box' }, current.sym),
      el('span', { class: 't' }, item.label),
    ]);
  };

  U.sectionHead = (title, hint) => el('div', { class: 'section-head' }, [
    el('div', { class: 'h' }, title),
    hint ? el('div', { class: 'hint' }, hint) : null,
  ]);

  /* opts.bodyClass hängt eine Klasse an den Karteninhalt — gedacht für
     `grid-fields`, das reine Feldlisten am breiten Bildschirm zweispaltig
     stellt. Ohne opts bleibt alles wie bisher. */
  U.card = (title, children, opts) => el('div', { class: 'card' }, [
    title ? el('div', { class: 'card-title', style: { marginBottom: '.75rem' } }, title) : null,
    el('div', { class: 'card-body' + (opts && opts.bodyClass ? ' ' + opts.bodyClass : '') }, children),
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
      el('td', { class: 'v' }, P.intervals.label(preset.intervalMonths)),
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

  /* Tabellen der Leitungsberechnung, direkt aus data/leitungen.json — dieselbe
   * Quelle, aus der P.cable rechnet, damit Wiki und Rechnung nie auseinanderlaufen. */
  U.CABLE_TABLES = ['verlegearten', 'typen', 'belastbarkeit', 'temperatur', 'haeufung', 'daemmung', 'oberschwingungen', 'ls', 'ls_durchlass', 'gg', 'konstanten'];

  U.cableTable = function cableTable(ref) {
    const cb = P.data.cables;
    if (!cb || !U.CABLE_TABLES.includes(ref)) return el('div', { class: 'empty-note' }, 'Leitungstabelle fehlt: ' + ref);
    const f = cb.faktoren;
    const so = cb.schutzorgane;
    const n = v => (v == null ? '—' : num(v));
    let meta;
    let head;
    let rows;
    switch (ref) {
      case 'verlegearten':
        meta = cb.verlegearten;
        head = ['Art', 'Beschreibung', 'Beispiel'];
        rows = meta.arten.map(a => [a.id, a.kurz, a.beispiele]);
        break;
      case 'typen':
        meta = cb.leitungstypen;
        head = ['Typ', 'Adern', 'Querschnitte (mm²)', 'Verlegearten'];
        rows = meta.typen.map(t => [t.label, t.adern, t.querschnitte.map(num).join(' · '), t.verlegearten.join(', ')]);
        break;
      case 'belastbarkeit': {
        meta = cb.belastbarkeit;
        const arten = Object.keys(meta.werte);
        head = ['mm²'].concat(arten.flatMap(a => [a + ' · 2', a + ' · 3']));
        rows = meta.querschnitte.map((q, i) => [num(q)].concat(arten.flatMap(a => [n(meta.werte[a]['2'][i]), n(meta.werte[a]['3'][i])])));
        break;
      }
      case 'temperatur':
        meta = f.temperatur;
        head = ['bis °C', 'Luft (Bezug ' + meta.luft.bezug + ' °C)', 'Erde (Bezug ' + meta.erde.bezug + ' °C)'];
        rows = Array.from(new Set(meta.luft.stufen.concat(meta.erde.stufen).map(s => s.bis))).sort((a, b) => a - b).map(t => {
          const l = meta.luft.stufen.find(s => s.bis === t);
          const e = meta.erde.stufen.find(s => s.bis === t);
          return [num(t), l ? num(l.f) : '—', e ? num(e.f) : '—'];
        });
        break;
      case 'haeufung':
        meta = f.haeufung;
        head = ['Anzahl'].concat(meta.anordnungen.map(a => a.label));
        rows = Array.from(new Set(meta.anordnungen.flatMap(a => a.stufen.map(s => s.n)))).sort((a, b) => a - b).map(k =>
          [String(k)].concat(meta.anordnungen.map(a => { const s = a.stufen.find(x => x.n === k); return s ? num(s.f) : '—'; })));
        break;
      case 'daemmung':
        meta = f.daemmung;
        head = ['Umschlossen', 'Faktor'];
        rows = meta.stufen.map(s => [s.label, num(s.f)]);
        break;
      case 'oberschwingungen':
        meta = f.oberschwingungen;
        head = ['Anteil 3. OS', 'Faktor', 'bemessen nach'];
        rows = meta.stufen.map(s => [s.label, num(s.f), s.basis === 'N' ? 'N-Strom' : 'Außenleiterstrom']);
        break;
      case 'ls':
        meta = so.ls;
        head = ['Charakteristik', 'Ia (≤ 0,1 s)', 'I2'];
        rows = meta.charakteristiken.map(c => [c.label, num(c.ia_faktor) + ' × In', num(meta.i2_faktor) + ' × In'])
          .concat([['Nennströme', meta.nennstroeme.join(' · ') + ' A', ''], ['Schaltvermögen', meta.schaltvermoegen.map(s => s.label).join(' · '), '']]);
        break;
      case 'ls_durchlass':
        meta = so.ls_durchlass;
        head = ['In bis', 'Char.'].concat(meta.stufen_ik.map(ik => num(ik) + ' A'));
        rows = meta.bereiche.flatMap(b => ['B', 'C'].filter(c => b[c]).map(c => [b.in_max + ' A', c].concat(b[c].map(num))));
        break;
      case 'gg':
        meta = so.gg;
        head = ['In (A)'].concat(meta.zeiten.map(t => 'Ia ' + num(t) + ' s')).concat(['I²t (A²s)', 'I2']);
        rows = meta.reihe.map(r => [String(r.in)].concat(meta.zeiten.map(t => n(r.ia[String(t)])), [num(r.i2t), num((meta.i2.find(x => x.in_max == null || r.in <= x.in_max) || {}).f) + ' × In']));
        break;
      case 'konstanten':
        meta = cb.konstanten;
        head = ['Größe', 'Wert'];
        rows = Object.values(meta.werte).map(w => [w.label, (w.zaehler != null ? w.zaehler + '/' + w.nenner : num(w.wert)) + (w.einheit ? ' ' + w.einheit : '')]);
        break;
    }
    return el('div', { class: 'w-table' }, [
      el('div', { class: 'cap' }, meta.title),
      U.reviewLine(meta.reviewed),
      el('div', { class: 'table-scroll' }, [el('table', { class: 'grid' }, [
        el('thead', {}, el('tr', {}, head.map(h => el('th', {}, h)))),
        el('tbody', {}, rows.map(r => el('tr', {}, r.map((c, i) => el('td', { class: i > 0 && /^[\d,.· ×—AΩ/sV%²-]+$/.test(c) ? 'v' : null }, c))))),
      ])]),
      meta.source ? el('div', { class: 'src' }, 'Quelle: ' + meta.source) : null,
      meta.note ? el('div', { class: 'src' }, meta.note) : null,
    ]);
  };

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
        case 'cable-table': return U.cableTable(block.ref);
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
