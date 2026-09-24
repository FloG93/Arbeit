'use strict';

/* Tab „Leitungen“: gespeicherte Rechnungen, neue Rechnung aus einer Vorlage,
 * die Rechnung selbst und das Nachweisblatt.
 *
 * Gerechnet wird nur in P.cable — diese Datei zeichnet. Ergebniszeile oben,
 * Eingaben in Karten, darunter die Querschnittsleiter und je Nachweis Soll,
 * Ist und die Formel mit den eingesetzten Zahlen: wer unterschreibt, soll
 * nachrechnen können, statt der App glauben zu müssen. */
(function (P) {
  const { el, formatDateDE, todayISO } = P.util;
  const U = P.ui;
  const C = P.cable;
  const z = (v, d) => C.fmt(v, d);

  P.views = P.views || {};

  /* Zustand nie nur über Farbe: Symbol, Wort und Farbe zusammen. */
  const STATUS = {
    ok: { sym: '✓', label: 'erfüllt', cls: 'ok' },
    cond: { sym: '◐', label: 'bedingt', cls: 'grenzwertig' },
    fail: { sym: '✗', label: 'nicht erfüllt', cls: 'mangel' },
    offen: { sym: '·', label: 'offen', cls: '' },
  };
  const statusBadge = (status, text) => {
    const s = STATUS[status] || STATUS.offen;
    return el('span', { class: 'badge ' + s.cls }, [el('span', {}, s.sym), el('span', {}, text || s.label)]);
  };

  const NACHWEIS_KURZ = { belastbarkeit: 'Belastbarkeit', spannungsfall: 'Spannungsfall', abschaltung: 'Abschaltung', kurzschluss: 'Kurzschlussfestigkeit' };

  const data = () => ({ cables: P.data.cables, limits: P.data.limits });
  const compute = calc => C.compute(calc, data(), calc.world);

  function adernText(calc, S) {
    const v = calc.verbraucher;
    const n = v.phasen === 3 ? (v.mitN ? 5 : 4) : 3;
    const t = C.typ(P.data.cables, calc.leitung.typ);
    // Aderleitungen haben keine Aderzahl, nur einen Querschnitt.
    if (t && t.familie === 'H07V') return t.label + ' ' + (S != null ? z(S) + ' mm²' : '…');
    return (t ? t.label : calc.leitung.typ) + ' ' + n + '×' + (S != null ? z(S) : '…');
  }

  function schutzText(calc, In) {
    const s = calc.schutz;
    if (In == null) return s.art === 'gg' ? 'gG' : 'LS ' + s.char;
    return s.art === 'gg' ? 'gG ' + In + ' A' : s.char + In;
  }

  P.views.calcTitle = calc => (calc.name && calc.name.trim()) || 'Berechnung ohne Namen';

  /* Kurzfassung einer Rechnung für andere Ansichten — der Stromkreis zeigt
   * seine verknüpfte Berechnung damit an, ohne den Rechenkern ein zweites Mal
   * zu bedienen. */
  P.views.calcSummary = function calcSummary(calc) {
    const res = compute(calc);
    return {
      titel: P.views.calcTitle(calc),
      meta: calcMeta(calc, res),
      status: res.status,
      badge: statusBadge(res.status),
      querschnitt: res.gewaehlt,
      In: res.In,
    };
  };

  function calcMeta(calc, res) {
    const parts = [adernText(calc, res.gewaehlt)];
    if (calc.leitung.laenge > 0) parts.push(z(calc.leitung.laenge, 1) + ' m');
    parts.push(schutzText(calc, res.In));
    return parts.join(' · ');
  }

  /* ─── Liste ─── */

  function liste() {
    const state = P.store.state;
    const world = P.data.world(state.world);
    const children = [];
    const calcs = state.calcs || [];

    if (calcs.length) {
      children.push(U.sectionHead('Berechnungen', calcs.length + (calcs.length === 1 ? ' Rechnung' : ' Rechnungen')));
      children.push(el('div', { class: 'step-list' }, calcs.map(calc => {
        const res = compute(calc);
        const open = () => { P.nav.calcId = calc.id; P.render(); };
        return el('div', { class: 'job-card' }, [
          el('button', { class: 'job-open', type: 'button', onClick: open }, [
            el('div', { class: 'info' }, [
              el('div', { class: 'name' }, P.views.calcTitle(calc)),
              el('div', { class: 'meta' }, calcMeta(calc, res)),
            ]),
            statusBadge(res.status),
            el('div', { class: 'chevron' }, '›'),
          ]),
          el('div', { class: 'job-actions' }, [
            el('button', { class: 'mini-btn', type: 'button', onClick: open }, 'Öffnen'),
            el('button', {
              class: 'mini-btn', type: 'button',
              onClick: () => { const copy = P.store.duplicateCalc(calc.id); P.nav.calcId = copy.id; P.render(); },
            }, 'Kopieren'),
            el('button', {
              class: 'mini-btn', type: 'button',
              onClick: () => { if (confirm('Berechnung „' + P.views.calcTitle(calc) + '“ löschen?')) P.store.removeCalc(calc.id); },
            }, 'Löschen'),
          ]),
        ]);
      })));
    }

    const neu = (vorlage) => {
      const calc = P.store.newCalc(vorlage, state.world);
      P.nav.calcId = calc.id;
      P.render();
    };
    children.push(U.sectionHead('Neue Berechnung', world ? world.label : ''));
    const vorlagen = P.data.cables.vorlagen.filter(v => v.welt === state.world);
    children.push(el('div', { class: 'step-list' }, vorlagen.map(v => el('button', {
      class: 'norm-card', type: 'button', onClick: () => neu(v),
    }, [
      el('div', { class: 'info' }, [el('div', { class: 'norm' }, v.label), el('div', { class: 'sub' }, v.sub)]),
      U.badge('rechnen', 'accent'),
    ])).concat([el('button', { class: 'norm-card', type: 'button', onClick: () => neu(null) }, [
      el('div', { class: 'info' }, [el('div', { class: 'norm' }, 'Ohne Vorlage'), el('div', { class: 'sub' }, 'Vorbelegung ' + (world ? world.short : ''))]),
      U.badge('rechnen', 'accent'),
    ])])));

    children.push(el('div', { class: 'footnote' }, 'Arbeitshilfe zur Bemessung von Kabeln und Leitungen. Ersetzt nicht Normtext, Herstellerangaben und eigene Fachkunde.'));
    return { view: el('div', { class: 'view' }, children) };
  }

  /* ─── Eingabebausteine ─── */

  const chipRow = (options, current, onPick, fkeyBase) => el('div', { class: 'chips' }, options.map(o => el('button', {
    class: 'chip' + (o.id === current ? ' active' : ''), type: 'button',
    'aria-pressed': o.id === current ? 'true' : 'false',
    'data-fkey': fkeyBase ? fkeyBase + '-' + o.id : null,
    onClick: () => onPick(o.id),
  }, o.label)));

  const field = (label, control, hint) => el('div', { class: 'field' }, [
    el('label', { class: 'field-label' }, label),
    control,
    hint ? el('div', { class: 'hint-text' }, hint) : null,
  ]);

  /* Zahlenfeld mit Einheit in einer Zeile — dieselbe Form wie die Messfelder. */
  const numField = (label, fkey, value, unit, onValue, extra) => el('div', { class: 'measure-line calc-num' }, [
    el('div', { class: 'lbl' }, label),
    U.numInput(fkey, value, unit, onValue, Object.assign({ 'aria-label': label + (unit ? ' in ' + unit : '') }, extra || {})),
    el('div', { class: 'unit' }, unit || ''),
  ]);

  /* ─── Rechnung ─── */

  function rechnung(calc) {
    const cb = P.data.cables;
    const res = compute(calc);
    const set = fn => P.store.patchCalc(calc.id, fn);
    const v = calc.verbraucher;
    const s = calc.schutz;
    const l = calc.leitung;
    const u = calc.umgebung;
    const n = calc.netz;
    const typ = C.typ(cb, l.typ);
    const va = C.verlegeart(cb, l.verlegeart);
    const erde = va && va.umgebung === 'erde';
    const children = [];

    children.push(ergebnisKopf(calc, res));

    // Verbraucher
    const cosOptions = [1, 0.95, 0.9, 0.85, 0.8].map(c => ({ id: c, label: z(c) }));
    children.push(U.card('Verbraucher', [
      field('Bezeichnung', U.textInput('calc-name', calc.name, value => {
        P.store.patchCalc(calc.id, c => { c.name = value; }, { silent: true });
        // Nur die Titel nachführen: Neuzeichnen beim Tippen stört die
        // Wortvorschläge der Handy-Tastatur.
        document.querySelectorAll('[data-calc-title="' + calc.id + '"]').forEach(node => { node.textContent = P.views.calcTitle(calc); });
      }, { placeholder: 'z. B. Wallbox Garage' })),
      chipRow([{ id: 1, label: '1~ 230 V' }, { id: 3, label: '3~ 400 V' }], v.phasen, id => set(c => { c.verbraucher.phasen = id; })),
      v.phasen === 3
        ? chipRow([{ id: true, label: 'mit N' }, { id: false, label: 'ohne N' }], !!v.mitN, id => set(c => { c.verbraucher.mitN = id; }))
        : null,
      chipRow([{ id: 'kw', label: 'Leistung kW' }, { id: 'a', label: 'Strom A' }], v.modus, id => set(c => { c.verbraucher.modus = id; })),
      v.modus === 'kw'
        ? numField('Leistung', 'calc-kw', v.leistung, 'kW', val => set(c => { c.verbraucher.leistung = val; }))
        : numField('Strom Ib', 'calc-a', v.strom, 'A', val => set(c => { c.verbraucher.strom = val; })),
      field('cos φ', el('div', { class: 'calc-inline' }, [
        chipRow(cosOptions, v.cosphi, id => set(c => { c.verbraucher.cosphi = id; })),
        U.numInput('calc-cos', v.cosphi, '', val => set(c => { c.verbraucher.cosphi = val; }), { 'aria-label': 'cos φ', class: 'input calc-small' }),
      ])),
      res.ib != null
        ? el('div', { class: 'hint-text' }, 'Ib = ' + z(res.ib, 1) + ' A' + (res.ibText ? ' — ' + res.ibText : ''))
        : null,
    ]));

    // Schutzorgan
    const artId = s.art === 'gg' ? 'gg' : 'ls-' + s.char;
    const reihe = s.art === 'gg' ? cb.schutzorgane.gg.reihe.map(r => r.in) : cb.schutzorgane.ls.nennstroeme;
    children.push(U.card('Schutzorgan', [
      chipRow(cb.schutzorgane.ls.charakteristiken.map(ch => ({ id: 'ls-' + ch.id, label: 'LS ' + ch.label })).concat([{ id: 'gg', label: 'gG' }]), artId, id => set(c => {
        if (id === 'gg') c.schutz.art = 'gg';
        else { c.schutz.art = 'ls'; c.schutz.char = id.slice(3); }
        // Die Nennstromreihen unterscheiden sich — ein gewählter Wert, den es
        // in der neuen Reihe nicht gibt, fällt auf den Vorschlag zurück.
        const r = c.schutz.art === 'gg' ? cb.schutzorgane.gg.reihe.map(x => x.in) : cb.schutzorgane.ls.nennstroeme;
        if (c.schutz.In != null && !r.includes(c.schutz.In)) c.schutz.In = null;
      })),
      field('Nennstrom In', chipRow([{ id: null, label: 'passend' + (s.In == null && res.In != null ? ' (' + res.In + ' A)' : '') }].concat(reihe.map(r => ({ id: r, label: r + ' A' }))), s.In, id => set(c => { c.schutz.In = id; }))),
      s.art === 'ls'
        ? field('Schaltvermögen', chipRow(cb.schutzorgane.ls.schaltvermoegen.map(x => ({ id: x.wert, label: x.label })), s.icu, id => set(c => { c.schutz.icu = id; })))
        : null,
    ]));

    // Leitung
    const arten = typ ? cb.verlegearten.arten.filter(a => typ.verlegearten.includes(a.id)) : cb.verlegearten.arten;
    children.push(U.card('Leitung', [
      chipRow(cb.leitungstypen.typen.map(t => ({ id: t.id, label: t.label })), l.typ, id => set(c => {
        c.leitung.typ = id;
        const t = C.typ(cb, id);
        if (t && !t.verlegearten.includes(c.leitung.verlegeart)) c.leitung.verlegeart = t.verlegearten.includes('C') ? 'C' : t.verlegearten[0];
        if (c.querschnitt != null && t && !t.querschnitte.includes(c.querschnitt)) c.querschnitt = null;
      })),
      typ ? el('div', { class: 'hint-text' }, typ.beschreibung) : null,
      field('Verlegeart', el('div', { class: 'answers' }, arten.map(a => el('button', {
        class: 'answer calc-va' + (a.id === l.verlegeart ? ' checked' : ''), type: 'button',
        'aria-pressed': a.id === l.verlegeart ? 'true' : 'false',
        onClick: () => set(c => {
          c.leitung.verlegeart = a.id;
          if (a.umgebung === 'erde') { c.umgebung.anordnung = 'erde'; if (c.umgebung.temp == null || c.umgebung.temp > 30) c.umgebung.temp = 20; }
          else if (c.umgebung.anordnung === 'erde') c.umgebung.anordnung = 'gebuendelt';
        }),
      }, [
        el('span', { class: 'va-code' }, a.id),
        el('span', { class: 'txt' }, [el('span', { class: 't' }, a.kurz), el('span', { class: 's' }, a.beispiele)]),
      ])))),
      numField('Länge', 'calc-len', l.laenge, 'm', val => set(c => { c.leitung.laenge = val; })),
    ]));

    // Umgebung
    const tempChips = (erde ? [10, 15, 20, 25] : [25, 30, 35, 40, 50]).map(t => ({ id: t, label: t + ' °C' }));
    const anordnungen = cb.faktoren.haeufung.anordnungen.filter(a => !a.nurErde);
    const drei = v.phasen === 3;
    children.push(U.card('Umgebung', [
      field(erde ? 'Temperatur Erdreich' : 'Umgebungstemperatur', el('div', { class: 'calc-inline' }, [
        chipRow(tempChips, u.temp, id => set(c => { c.umgebung.temp = id; })),
        U.numInput('calc-temp', u.temp, '°C', val => set(c => { c.umgebung.temp = val; }), { 'aria-label': 'Temperatur in °C', class: 'input calc-small' }),
      ]), 'Zwischenwerte: die App nimmt die nächsthöhere Tabellenstufe.'),
      numField('Gehäufte Stromkreise', 'calc-n', u.anzahl, 'Anz.', val => set(c => { c.umgebung.anzahl = val; }), { inputmode: 'numeric' }),
      !erde ? field('Anordnung', chipRow(anordnungen.map(a => ({ id: a.id, label: a.label })), u.anordnung, id => set(c => { c.umgebung.anordnung = id; }))) : null,
      field('Wärmedämmung', chipRow(cb.faktoren.daemmung.stufen.map(d => ({ id: d.id, label: d.label })), u.daemmung, id => set(c => { c.umgebung.daemmung = id; }))),
      drei && v.mitN
        ? numField('3. Oberschwingung', 'calc-os', u.os, '%', val => set(c => { c.umgebung.os = val; }))
        : null,
      field('Ort', chipRow([{ id: 'innen', label: 'Innen' }, { id: 'freien', label: 'Im Freien' }, { id: 'beton', label: 'In Beton' }], u.ort || 'innen', id => set(c => { c.umgebung.ort = id; }))),
    ]));

    // Netz
    const duRows = (P.limits.table('spannungsfall') || { rows: [] }).rows;
    children.push(U.card('Netz', [
      chipRow([{ id: 'TN', label: 'TN' }, { id: 'TT', label: 'TT' }], n.form, id => set(c => { c.netz.form = id; })),
      chipRow([{ id: 'end', label: 'Endstromkreis' }, { id: 'verteilung', label: 'Verteilungsstromkreis' }], n.kreis, id => set(c => { c.netz.kreis = id; })),
      field('Fehlerschutz über RCD', chipRow([{ id: true, label: 'mit RCD' }, { id: false, label: 'ohne RCD' }], !!n.rcd, id => set(c => { c.netz.rcd = id; }))),
      numField('Zs am Verteiler', 'calc-zv', n.zv, 'Ω', val => set(c => { c.netz.zv = val; }), { placeholder: 'leer' }),
      el('div', { class: 'hint-text' }, 'Leer lassen, wenn unbekannt: die App rechnet dann zurück, welches Zs am Verteiler höchstens vorliegen darf.'),
      numField('ΔU bis Verteiler', 'calc-duvor', n.duVor, '%', val => set(c => { c.netz.duVor = val; })),
      field('Grenze Spannungsfall', chipRow(duRows.map(r => ({ id: r.key, label: z(r.max) + ' % · ' + r.label })), n.duGrenze, id => set(c => { c.netz.duGrenze = id; }))),
    ]));

    if (res.fehler.length) {
      children.push(el('div', { class: 'step-list' }, res.fehler.map(f => el('div', { class: 'w-warn' }, [el('span', { class: 'sym' }, '!'), el('div', { class: 't' }, f)]))));
    } else {
      children.push(leiter(calc, res));
      if (res.ergebnis) children.push(nachweise(calc, res));
    }

    if (res.hinweise.length) {
      children.push(U.sectionHead('Hinweise'));
      children.push(el('div', { class: 'step-list' }, res.hinweise.map(h => el('div', { class: h.stufe === 'warnung' ? 'w-warn' : 'w-note' }, [
        el('span', { class: 'sym' }, h.stufe === 'warnung' ? '!' : 'i'),
        el('div', { class: 't' }, h.text),
      ]))));
    }

    const review = reviewNote(res);
    if (review) children.push(el('div', { class: review.offen ? 'w-warn' : 'w-note' }, [el('span', { class: 'sym' }, review.offen ? '!' : 'i'), el('div', { class: 't' }, review.text)]));

    children.push(U.card('Nachweisblatt', [
      field('Bearbeiter', U.textInput('calc-bearbeiter', calc.bearbeiter || '', value => P.store.setBearbeiter(calc.id, value), { placeholder: 'wird wie der Prüfer gemerkt' })),
    ]));

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost back', type: 'button', onClick: () => { P.nav.calcId = null; P.render(); } }, 'Liste'),
      el('button', {
        class: 'btn btn-primary', type: 'button', disabled: !res.ergebnis,
        onClick: () => { buildSheet(calc, compute(calc)); window.print(); },
      }, 'Nachweis drucken'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  }

  /* Die mitlaufende Ergebniszeile. */
  function ergebnisKopf(calc, res) {
    const cb = P.data.cables;
    if (res.fehler.length || res.vorschlag == null) {
      return el('div', { class: 'card hero calc-head' }, [
        el('div', { class: 'card-title' }, 'Ergebnis'),
        el('div', { class: 'q-title' }, res.fehler.length ? 'Eingaben unvollständig' : 'Kein Querschnitt der Reihe erfüllt alle Nachweise'),
        statusBadge('fail', res.fehler.length ? 'nicht rechenbar' : 'nicht erfüllt'),
      ]);
    }
    const bestimmt = res.bestimmend.length
      ? 'bestimmt durch ' + res.bestimmend.map(id => NACHWEIS_KURZ[id]).join(' und ')
      : 'kleinster Querschnitt der Reihe';
    const eigener = calc.querschnitt != null && calc.querschnitt !== res.vorschlag;
    const va = C.verlegeart(cb, calc.leitung.verlegeart);
    return el('div', { class: 'card hero calc-head' }, [
      el('div', { class: 'card-title' }, eigener ? 'Geprüfter Querschnitt' : 'Vorschlag'),
      el('div', { class: 'q-title', 'data-calc-result': '1' }, adernText(calc, res.gewaehlt) + ' mm²'),
      el('div', { class: 'chips' }, [statusBadge(res.status), eigener ? U.badge('Vorschlag ' + z(res.vorschlag) + ' mm²', 'accent') : U.badge(bestimmt)]),
      el('div', { class: 'hint-text' }, [
        z(res.ib, 1) + ' A · ' + schutzText(calc, res.In) + ' · ' + (va ? va.id : '') + (calc.leitung.laenge > 0 ? ' · ' + z(calc.leitung.laenge, 1) + ' m' : ' · Länge fehlt'),
      ]),
      eigener
        ? el('button', { class: 'mini-btn', type: 'button', onClick: () => P.store.patchCalc(calc.id, c => { c.querschnitt = null; }) }, 'Zurück zum Vorschlag')
        : null,
    ]);
  }

  /* Querschnittsleiter: jeder Querschnitt mit Status und Grund, antippen prüft ihn. */
  function leiter(calc, res) {
    const rows = res.zeilen.map(r => {
      const grund = r.status === 'fail'
        ? r.nachweise.filter(nw => nw.status === 'fail').map(nw => NACHWEIS_KURZ[nw.id] + ': ' + nw.grund).join(' · ')
        : r.status === 'ok' ? 'alle Nachweise'
          : r.nachweise.filter(nw => nw.status !== 'ok').map(nw => NACHWEIS_KURZ[nw.id] + ': ' + (nw.bedingung || nw.grund)).join(' · ');
      const sel = r.S === res.gewaehlt;
      return el('button', {
        class: 'step-card calc-rung' + (sel ? ' selected' : '') + (r.status === 'fail' ? ' bad' : r.status === 'ok' ? ' done' : ''),
        type: 'button', 'aria-pressed': sel ? 'true' : 'false',
        'data-querschnitt': String(r.S),
        onClick: () => P.store.patchCalc(calc.id, c => { c.querschnitt = r.S === res.vorschlag ? null : r.S; }),
      }, [
        el('div', { class: 'mark' }, (STATUS[r.status] || STATUS.offen).sym),
        el('div', { class: 'info' }, [
          el('div', { class: 't' }, [z(r.S) + ' mm²', r.S === res.vorschlag ? el('span', { class: 'calc-tag' }, 'Vorschlag') : null]),
          el('div', { class: 's' }, (STATUS[r.status] || STATUS.offen).label + ' — ' + grund),
        ]),
      ]);
    });
    return el('div', { class: 'view calc-ladder' }, [
      U.sectionHead('Querschnitte', 'antippen = diesen prüfen'),
      el('div', { class: 'step-list' }, rows),
    ]);
  }

  function reviewFor(tableIds) {
    const st = P.limits.reviewStatus(tableIds);
    if (!st.gesamt) return null;
    return st.offen ? '⚠ Datenbasis ungeprüft (' + st.offen + ' von ' + st.gesamt + ' Tabellen)' : 'Datenbasis geprüft';
  }

  function quellenText(tableIds) {
    const sources = Array.from(new Set(tableIds.map(id => (P.limits.table(id) || {}).source).filter(Boolean)));
    return sources.join(' · ');
  }

  /* Je Nachweis eine Karte: Soll/Ist, Formel mit Zahlen, Quelle, Prüfstand. */
  function nachweise(calc, res) {
    const cards = res.ergebnis.nachweise.map(nw => el('div', { class: 'card calc-proof' }, [
      el('div', { class: 'calc-proof-head' }, [el('div', { class: 'section-head' }, [el('div', { class: 'h' }, nw.titel)]), statusBadge(nw.status)]),
      nw.soll || nw.ist
        ? el('div', { class: 'w-kv calc-kv' }, [
            el('div', { class: 'row' }, [el('div', { class: 'k' }, 'Soll'), el('div', { class: 'v' }, nw.soll || '—')]),
            el('div', { class: 'row' }, [el('div', { class: 'k' }, 'Ist'), el('div', { class: 'v' }, nw.ist || '—')]),
          ])
        : null,
      nw.status !== 'ok' && nw.grund ? el('div', { class: 'limit-badge ' + (STATUS[nw.status] || {}).cls }, (STATUS[nw.status] || STATUS.offen).sym + ' ' + (nw.bedingung || nw.grund)) : null,
      nw.zeilen.length ? el('div', { class: 'calc-formula' }, nw.zeilen.map(zl => el('div', {}, zl))) : null,
      nw.messung ? el('div', { class: 'w-note' }, [el('span', { class: 'sym' }, 'i'), el('div', { class: 't' }, nw.messung)]) : null,
      nw.hinweis ? el('div', { class: 'w-note' }, [el('span', { class: 'sym' }, 'i'), el('div', { class: 't' }, nw.hinweis)]) : null,
      el('div', { class: 'src' }, 'Quelle: ' + quellenText(nw.quellen)),
      reviewFor(nw.quellen) ? el('div', { class: 'chips' }, [U.badge(reviewFor(nw.quellen), /ungeprüft/.test(reviewFor(nw.quellen)) ? 'grenzwertig' : 'ok')]) : null,
    ]));
    return el('div', { class: 'view' }, [U.sectionHead('Nachweise', z(res.gewaehlt) + ' mm²')].concat(cards));
  }

  function reviewNote(res) {
    const st = P.limits.reviewStatus(res.tabellen);
    if (!st.gesamt) return null;
    if (!st.offen) return { offen: false, text: 'Datenbasis gegengeprüft' + (st.pruefer.length ? ' von ' + st.pruefer.join(', ') : '') + (st.datum ? ' am ' + formatDateDE(st.datum) : '') + '.' };
    return {
      offen: true,
      text: 'Datenbasis nicht vollständig gegengeprüft: ' + st.offen + ' von ' + st.gesamt + ' verwendeten Tabellen ohne Nachweis gegen die Normfassung. Die Rechnung ist insoweit eine Arbeitshilfe und ersetzt die eigene Bemessung nicht.',
    };
  }

  P.views.leitungen = function leitungenView() {
    if (!P.data.cables) return { view: el('div', { class: 'view' }, [U.card('Keine Leitungsdaten', el('p', { class: 'w-p' }, 'data/leitungen.json ist nicht geladen.'))]) };
    if (P.nav.calcId) {
      const calc = P.store.calc(P.nav.calcId);
      if (calc) return rechnung(calc);
      P.nav.calcId = null;
    }
    return liste();
  };

  /* ─── Nachweisblatt ───
   * Erst beim Drucken gebaut, wie das Protokoll, mit denselben Druckklassen. */
  function buildSheet(calc, res) {
    const cb = P.data.cables;
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    const v = calc.verbraucher;
    const va = C.verlegeart(cb, calc.leitung.verlegeart);
    const e = res.e;
    const umgebung = [
      e ? (e.fT.t != null ? e.fT.t + ' °C' : '') : '',
      e && e.fH.n > 1 ? e.fH.label : 'keine Häufung',
      e && e.fD.f !== 1 ? 'Dämmung ' + e.fD.label : null,
      e && e.fOS && e.fOS.h > 0 ? '3. OS ' + z(e.fOS.h, 0) + ' %' : null,
    ].filter(Boolean).join(', ');
    const felder = [
      ['Verbraucher', (v.phasen === 3 ? '3~ 400 V' + (v.mitN ? ' mit N' : ' ohne N') : '1~ 230 V') + ', ' + (v.modus === 'kw' ? z(v.leistung) + ' kW, cos φ ' + z(v.cosphi) : z(v.strom) + ' A')],
      ['Betriebsstrom Ib', z(res.ib, 1) + ' A'],
      ['Schutzorgan', schutzText(calc, res.In) + (calc.schutz.art === 'ls' ? ', ' + z(calc.schutz.icu / 1000, 0) + ' kA' : '')],
      ['Leitung', adernText(calc, res.gewaehlt) + ' mm², ' + (calc.leitung.laenge > 0 ? z(calc.leitung.laenge, 1) + ' m' : 'Länge offen')],
      ['Verlegeart', va ? va.id + ' — ' + va.kurz : calc.leitung.verlegeart],
      ['Umgebung', umgebung],
      ['Netz', calc.netz.form + ', ' + (calc.netz.kreis === 'end' ? 'Endstromkreis' : 'Verteilungsstromkreis') + (calc.netz.rcd ? ', RCD' : '')],
      ['Zs am Verteiler', calc.netz.zv > 0 ? z(calc.netz.zv, 3) + ' Ω' : 'nicht bekannt — Bedingung siehe unten'],
    ];
    const ergebnis = res.ergebnis;
    const vorschlagSatz = res.vorschlag != null
      ? 'Kleinster Querschnitt, der alle Nachweise erfüllt: ' + z(res.vorschlag) + ' mm²' + (res.bestimmend.length ? ' (bestimmt durch ' + res.bestimmend.map(id => NACHWEIS_KURZ[id]).join(' und ') + ').' : '.')
      : 'Kein Querschnitt der Reihe erfüllt alle Nachweise.';
    const review = reviewNote(res);

    root.appendChild(el('div', { class: 'p-doc' }, [
      el('div', { class: 'p-head' }, [
        el('div', {}, [
          el('div', { class: 'p-eyebrow' }, 'Leitungsnachweis'),
          el('div', { class: 'p-title' }, P.views.calcTitle(calc)),
          el('div', { class: 'p-sub' }, adernText(calc, res.gewaehlt) + ' mm² · ' + schutzText(calc, res.In) + ' · ' + (P.data.world(calc.world) || {}).label),
        ]),
        el('div', { class: 'p-date' }, formatDateDE(todayISO())),
      ]),
      el('div', { class: 'p-fields' }, felder.map(([k, val]) => el('div', { class: 'p-field' }, [el('div', { class: 'k' }, k), el('div', { class: 'v' }, val)]))),
      el('div', { class: 'p-section' }, 'Nachweise für ' + z(res.gewaehlt) + ' mm²'),
      el('div', {}, [
        el('div', { class: 'p-row p-row-head' }, [el('div', {}, 'Nachweis'), el('div', {}, 'Soll'), el('div', {}, 'Ist'), el('div', {}, 'Ergebnis')]),
        (ergebnis ? ergebnis.nachweise : []).map(nw => el('div', { class: 'p-row' }, [
          el('div', {}, nw.titel),
          el('div', {}, nw.soll || '—'),
          el('div', {}, nw.ist || '—'),
          el('div', {}, (STATUS[nw.status] || STATUS.offen).sym + ' ' + (STATUS[nw.status] || STATUS.offen).label),
          el('div', { class: 'p-note' }, nw.zeilen.concat(nw.bedingung ? ['Bedingung: ' + nw.bedingung] : [], nw.messung ? [nw.messung] : [], nw.hinweis ? ['Hinweis: ' + nw.hinweis] : []).map(t => el('div', {}, t))),
        ])),
      ]),
      el('div', { class: 'p-section' }, 'Ergebnis'),
      el('p', { class: 'p-note' }, vorschlagSatz),
      calc.querschnitt != null && calc.querschnitt !== res.vorschlag
        ? el('p', { class: 'p-note' }, 'Geprüft wurde ausdrücklich ' + z(res.gewaehlt) + ' mm²: ' + (STATUS[res.status] || STATUS.offen).label + '.')
        : null,
      res.hinweise.length ? el('div', { class: 'p-section' }, 'Hinweise') : null,
      res.hinweise.map(h => el('p', { class: 'p-note' }, '• ' + h.text)),
      review ? el('p', { class: 'p-note' }, review.text) : null,
      el('div', { class: 'p-sign' }, [
        el('div', {}, 'Bearbeiter' + (calc.bearbeiter ? ': ' + calc.bearbeiter : '')),
        el('div', {}, 'Datum, Unterschrift'),
      ]),
      el('div', { class: 'p-legal' }, 'Arbeitshilfe zur Bemessung von Kabeln und Leitungen. ' + P.data.registry.disclaimer + ' Datenstand ' + cb.datenstand + '.'),
    ]));
  }
})(window.Pruefung);
