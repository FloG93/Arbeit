'use strict';

/* ─────────────────────────────────────────────────────────────
 * Raumrechner — Raum-, Decken- und Bodenflächen berechnen,
 * Grundriss zeichnen, Angebot exportieren.
 *
 * Vanilla JS, no build step, offline-capable (see sw.js).
 * Geometry/area engine below mirrors the working calculation
 * logic from the approved design draft (Raumrechner.dc.html).
 * ───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'raumrechner.v1';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIRNAME = ['Nord', 'Ost', 'Süd', 'West'];
const PRESETS = [
  { key: 'fenster', label: 'Fenster', w: 1.20, h: 1.30, color: '#5BA8F0' },
  { key: 'tuer', label: 'Zimmertür', w: 0.885, h: 2.01, color: '#5BD6A0' },
  { key: 'terrasse', label: 'Terrassentür', w: 1.00, h: 2.10, color: '#5BD6A0' },
  { key: 'frei', label: 'Freie Fläche', w: 1.00, h: 1.00, color: '#6f7682' },
];

let uid = Date.now();
const nid = () => ++uid;
const nf = (v, d = 2) => (isFinite(v) ? v : 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

function formatDateDE(d) {
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function mkRoom(name, lens, height) {
  return {
    id: nid(), name, height,
    walls: lens.map(l => ({ id: nid(), len: l, turn: 'r' })),
    openings: [], note: '', price: 12.5,
  };
}

function defaultState() {
  const r1 = mkRoom('Wohnzimmer', [5.20, 4.10, 5.20, 4.10], 2.55);
  r1.openings = [
    { id: nid(), key: 'fenster', label: 'Fenster', w: 1.40, h: 1.35, count: 2, wall: 0, offset: 0.80, color: '#5BA8F0' },
    { id: nid(), key: 'terrasse', label: 'Terrassentür', w: 1.80, h: 2.10, count: 1, wall: 1, offset: 1.20, color: '#5BD6A0' },
    { id: nid(), key: 'tuer', label: 'Zimmertür', w: 0.885, h: 2.01, count: 1, wall: 2, offset: 0.60, color: '#5BD6A0' },
  ];
  return {
    tab: 'projekt',
    projectName: 'Mein Projekt',
    projectDate: formatDateDE(new Date()),
    activeId: r1.id,
    toast: '',
    rooms: [
      r1,
      mkRoom('Schlafzimmer', [4.00, 3.40, 4.00, 3.40], 2.55),
      mkRoom('Flur', [3.60, 1.30, 3.60, 1.30], 2.55),
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rooms) || !parsed.rooms.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

let state = loadState() || defaultState();
let flashTimer = null;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable — keep running in-memory */ }
}

function setState(updater) {
  const patch = typeof updater === 'function' ? updater(state) : updater;
  state = Object.assign({}, state, patch);
  save();
  render();
}

function getActiveRoom() {
  return state.rooms.find(r => r.id === state.activeId) || state.rooms[0];
}

function patchRoom(fn) {
  const room = getActiveRoom();
  if (!room) return;
  const id = room.id;
  setState(s => ({ rooms: s.rooms.map(r => (r.id === id ? fn({ ...r }) : r)) }));
}

function numFromEvent(e, fallback) {
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  return isFinite(v) ? v : fallback;
}

function flash(msg) {
  setState({ toast: msg });
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => setState({ toast: '' }), 4000);
}

function addRoom() {
  const active = getActiveRoom();
  const r = mkRoom('Raum ' + (state.rooms.length + 1), [4.00, 3.00, 4.00, 3.00], active ? active.height : 2.50);
  setState(s => ({ rooms: [...s.rooms, r], activeId: r.id, tab: 'raum' }));
}

/* ─── geometry / area engine ─── */

function geo(room) {
  let x = 0, y = 0, d = 0;
  const segs = [];
  room.walls.forEach((w, i) => {
    const [dx, dy] = DIRS[d];
    const len = Math.max(0, w.len || 0);
    const seg = { x1: x, y1: y, x2: x + dx * len, y2: y + dy * len, len, dir: d, nr: i + 1, label: DIRNAME[d], wall: w };
    segs.push(seg);
    x = seg.x2; y = seg.y2;
    d = (d + (w.turn === 'l' ? 3 : 1)) % 4;
  });
  const pts = segs.map(s => [s.x1, s.y1]);
  let sh = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; sh += p[0] * q[1] - q[0] * p[1]; }
  const floor = Math.abs(sh) / 2;
  const closed = segs.length > 0 && Math.abs(x) < 0.02 && Math.abs(y) < 0.02;
  return { segs, floor, closed };
}

function calc(room) {
  const g = geo(room);
  const umfang = g.segs.reduce((s, w) => s + w.len, 0);
  const brutto = umfang * (room.height || 0);
  const abzug = room.openings.reduce((s, o) => s + (o.w || 0) * (o.h || 0) * (o.count || 0), 0);
  const netto = Math.max(0, brutto - abzug);
  const decke = g.floor;
  const abrechnung = netto + decke;
  return { g, umfang, brutto, abzug, netto, decke, boden: g.floor, abrechnung, preis: abrechnung * (room.price || 0) };
}

function totals() {
  return state.rooms.reduce((a, r) => {
    const c = calc(r);
    return { brutto: a.brutto + c.brutto, netto: a.netto + c.netto, abzug: a.abzug + c.abzug, decke: a.decke + c.decke, preis: a.preis + c.preis };
  }, { brutto: 0, netto: 0, abzug: 0, decke: 0, preis: 0 });
}

function plan(room, c) {
  const segs = c.g.segs;
  const xs = segs.flatMap(s => [s.x1, s.x2]), ys = segs.flatMap(s => [s.y1, s.y2]);
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 0);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
  const w = Math.max(0.5, maxX - minX), h = Math.max(0.5, maxY - minY);
  const pad = 40, W = 320, H = 300;
  const k = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const ox = (W - w * k) / 2 - minX * k, oy = (H - h * k) / 2 - minY * k;
  const px = v => ox + v * k, py = v => oy + v * k;

  const planWalls = segs.map(s => ({ x1: px(s.x1), y1: py(s.y1), x2: px(s.x2), y2: py(s.y2) }));
  const planOpenings = [];
  room.openings.forEach(o => {
    const s = segs[o.wall];
    if (!s || !s.len) return;
    const [dx, dy] = DIRS[s.dir];
    const n = Math.max(1, o.count || 1);
    for (let i = 0; i < n; i++) {
      const a = Math.min(s.len, (o.offset || 0) + i * ((o.w || 0) + 0.4));
      const b = Math.min(s.len, a + (o.w || 0));
      if (b <= a) continue;
      planOpenings.push({
        x1: px(s.x1 + dx * a), y1: py(s.y1 + dy * a),
        x2: px(s.x1 + dx * b), y2: py(s.y1 + dy * b),
        color: o.color || '#6f7682',
      });
    }
  });
  const planLabels = segs.map(s => {
    const off = 18;
    const nx = s.dir === 1 ? off : s.dir === 3 ? -off : 0;
    const ny = s.dir === 0 ? -off : s.dir === 2 ? off : 0;
    return { x: px((s.x1 + s.x2) / 2) + nx, y: py((s.y1 + s.y2) / 2) + ny, text: nf(s.len) + ' m' };
  });
  const cx = segs.length ? px(segs.reduce((a, s) => a + (s.x1 + s.x2) / 2, 0) / segs.length) : 160;
  const cy = segs.length ? py(segs.reduce((a, s) => a + (s.y1 + s.y2) / 2, 0) / segs.length) : 150;
  return { planWalls, planOpenings, planLabels, cx, cy, scale: Math.round(100 / (k / 100) / 10) * 10 || 50 };
}

/* ─── export ─── */

function exportCsv() {
  const sep = ';';
  const lines = [['Raum', 'Hoehe m', 'Umfang m', 'Brutto m2', 'Abzuege m2', 'Netto m2', 'Decke m2', 'Boden m2', 'Preis/m2', 'Summe EUR'].join(sep)];
  state.rooms.forEach(r => {
    const c = calc(r);
    lines.push([r.name, nf(r.height), nf(c.umfang), nf(c.brutto), nf(c.abzug), nf(c.netto), nf(c.decke), nf(c.boden), nf(r.price), nf(c.preis)].join(sep));
    r.openings.forEach(o => lines.push(['  Abzug: ' + o.label, '', '', nf(o.w) + ' x ' + nf(o.h), 'Anzahl ' + o.count, nf(o.w * o.h * o.count), '', '', '', ''].join(sep)));
  });
  const t = totals();
  lines.push(['Summe', '', '', nf(t.brutto), nf(t.abzug), nf(t.netto), nf(t.decke), '', '', nf(t.preis)].join(sep));
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = 'Flaechen_' + state.projectName.replace(/[^\w]+/g, '_') + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  flash('CSV heruntergeladen — in Excel mit Semikolon-Trennung öffnen.');
}

function exportPdf() {
  flash('PDF-Druck kommt in einem späteren Schritt.');
}

/* ─── DOM helpers ─── */

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in node) { try { node[k] = v; } catch { node.setAttribute(k, v); } }
      else node.setAttribute(k, v);
    }
  }
  if (children != null) {
    const arr = Array.isArray(children) ? children.flat(Infinity) : [children];
    for (const c of arr) {
      if (c == null || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }
  return node;
}

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, children) {
  const node = document.createElementNS(SVGNS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (children != null) {
    const arr = Array.isArray(children) ? children : [children];
    for (const c of arr) if (c) node.appendChild(c);
  }
  return node;
}

/* ─── views ─── */

function renderHeader() {
  const tabs = [['projekt', 'Projekt'], ['raum', 'Raum'], ['plan', 'Grundriss'], ['export', 'Export']];
  return el('div', { class: 'header' }, [
    el('div', { class: 'header-row' }, [
      el('div', {}, [
        el('div', { class: 'eyebrow' }, 'Projekt'),
        el('div', { class: 'project-name' }, state.projectName),
      ]),
      el('div', { class: 'project-date' }, state.projectDate),
    ]),
    el('div', { class: 'tabbar' }, tabs.map(([k, label]) =>
      el('button', {
        class: 'tab-btn' + (state.tab === k ? ' active' : ''),
        onClick: () => setState({ tab: k }),
      }, label)
    )),
  ]);
}

function renderProjektView() {
  const t = totals();
  const active = getActiveRoom();

  const hero = el('div', { class: 'card hero' }, [
    el('div', { class: 'card-title' }, 'Summe Projekt'),
    el('div', { class: 'big-stat', style: { marginTop: '14px' } }, [
      el('div', { class: 'num' }, nf(t.netto, 1)),
      el('div', { class: 'unit' }, 'm² netto Wand'),
    ]),
    el('div', { class: 'sub-line' }, `brutto ${nf(t.brutto, 1)} m² · Abzüge ${nf(t.abzug, 1)} m²`),
    el('div', { class: 'tile-grid' }, [
      el('div', { class: 'tile' }, [el('div', { class: 'tile-label' }, 'Decke'), el('div', { class: 'tile-value' }, nf(t.decke, 1) + ' m²')]),
      el('div', { class: 'tile' }, [el('div', { class: 'tile-label' }, 'Räume'), el('div', { class: 'tile-value' }, String(state.rooms.length))]),
    ]),
    el('div', { class: 'tile-row' }, [
      el('div', { class: 'k' }, 'Summe'),
      el('div', { class: 'v' }, nf(t.preis) + ' €'),
    ]),
  ]);

  const list = el('div', { class: 'room-list' },
    state.rooms.map(r => {
      const rc = calc(r);
      return el('button', {
        class: 'room-card' + (active && r.id === active.id ? ' active' : ''),
        onClick: () => setState({ activeId: r.id, tab: 'raum' }),
      }, [
        el('div', { class: 'info' }, [
          el('div', { class: 'name' }, r.name),
          el('div', { class: 'meta' }, `${r.walls.length} Wände · ${nf(r.height)} m hoch · ${r.openings.length} Abzüge`),
        ]),
        el('div', { class: 'amounts' }, [
          el('div', { class: 'netto' }, nf(rc.netto, 1)),
          el('div', { class: 'brutto' }, nf(rc.brutto, 1) + ' m² brutto'),
        ]),
        el('div', { class: 'chevron' }, '›'),
      ]);
    })
  );

  return el('div', { class: 'view' }, [
    hero,
    el('div', { class: 'section-head' }, [el('div', { class: 'card-title' }, 'Räume'), el('div', { class: 'hint' }, 'netto · brutto')]),
    list,
    el('button', { class: 'btn-add-room', onClick: addRoom }, '+ Raum hinzufügen'),
  ]);
}

function renderRaumView() {
  const room = getActiveRoom();
  if (!room) return el('div', { class: 'view' }, 'Kein Raum ausgewählt.');
  const c = calc(room);

  const hero = el('div', { class: 'card hero' }, [
    el('div', { class: 'live-dot' }, [el('span', { class: 'dot' }), el('div', { class: 'card-title' }, 'Ergebnis ' + room.name)]),
    el('div', { class: 'big-stat room' }, [el('div', { class: 'num' }, nf(c.netto, 1)), el('div', { class: 'unit' }, 'm² netto')]),
    el('div', { class: 'sub-line-flex' }, [
      el('div', { class: 'item' }, ['brutto ', el('b', {}, nf(c.brutto, 1)), ' m²']),
      el('div', { class: 'item' }, ['Abzüge ', el('b', {}, '−' + nf(c.abzug, 1)), ' m²']),
    ]),
    el('div', { class: 'tile-grid' }, [
      el('div', { class: 'tile' }, [el('div', { class: 'tile-label' }, 'Decke'), el('div', { class: 'tile-value' }, nf(c.decke, 1) + ' m²')]),
      el('div', { class: 'tile' }, [el('div', { class: 'tile-label' }, 'Boden'), el('div', { class: 'tile-value' }, nf(c.boden, 1) + ' m²')]),
    ]),
    el('div', { class: 'tile-row' }, [el('div', { class: 'k' }, 'Umfang'), el('div', { class: 'v' }, nf(c.umfang) + ' m')]),
  ]);

  const wallCountRow = el('div', { class: 'pill-row' },
    [3, 4, 5, 6, 7, 8].map(n => el('button', {
      class: 'pill-btn' + (room.walls.length === n ? ' active' : ''),
      onClick: () => patchRoom(r => {
        const ws = r.walls.slice(0, n);
        while (ws.length < n) ws.push({ id: nid(), len: 2.00, turn: 'r' });
        return { ...r, walls: ws, openings: r.openings.map(o => ({ ...o, wall: Math.min(o.wall, n - 1) })) };
      }),
    }, String(n)))
  );

  const raumdaten = el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, 'Raumdaten'),
    el('div', { class: 'card-row', style: { marginTop: '14px' } }, [
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, 'Bezeichnung'),
        el('input', { class: 'input', value: room.name, onChange: e => patchRoom(r => ({ ...r, name: e.target.value })) }),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, 'Raumhöhe in m'),
        el('input', { class: 'input mono', type: 'number', step: '0.01', value: room.height, onChange: e => patchRoom(r => ({ ...r, height: numFromEvent(e, room.height) })) }),
      ]),
      el('div', { class: 'field' }, [
        el('span', { class: 'field-label' }, 'Anzahl Wände'),
        wallCountRow,
      ]),
    ]),
  ]);

  const wallRows = c.g.segs.map((s, i) => el('div', { class: 'wall-row' }, [
    el('div', { class: 'tag' }, [el('div', { class: 'dir' }, s.label), el('div', { class: 'nr' }, 'Wand ' + s.nr)]),
    el('input', {
      class: 'input mono', type: 'number', step: '0.01', value: s.wall.len,
      onChange: e => { const v = numFromEvent(e, s.wall.len); patchRoom(r => ({ ...r, walls: r.walls.map((w, j) => (j === i ? { ...w, len: v } : w)) })); },
    }),
    el('div', { class: 'unit' }, 'm'),
    el('button', {
      class: 'turn-btn', title: 'Ecke nach links/rechts',
      onClick: () => patchRoom(r => ({ ...r, walls: r.walls.map((w, j) => (j === i ? { ...w, turn: w.turn === 'l' ? 'r' : 'l' } : w)) })),
    }, s.wall.turn === 'l' ? '↰' : '↱'),
  ]));

  const waende = el('div', { class: 'card' }, [
    el('div', { class: 'section-head', style: { padding: 0 } }, [el('div', { class: 'card-title' }, 'Wände'), el('div', { class: 'hint' }, 'Länge · Richtung')]),
    el('div', { class: 'card-row', style: { marginTop: '12px' } }, wallRows),
    el('div', { class: 'hint-text', style: { marginTop: '12px' } }, 'Die Richtung nach jeder Wand bestimmt die Raumform — für L-Form oder Erker einzelne Ecken umstellen.'),
  ]);

  const presetRow = el('div', { class: 'preset-row' },
    PRESETS.map(pr => el('button', {
      class: 'preset-btn',
      onClick: () => patchRoom(r => ({ ...r, openings: [...r.openings, { id: nid(), key: pr.key, label: pr.label, w: pr.w, h: pr.h, count: 1, wall: 0, offset: 0.50, color: pr.color }] })),
    }, '+ ' + pr.label))
  );

  const wallOptions = c.g.segs.map((s, i) => ({ value: i, label: s.label + ' (' + s.nr + ')' }));

  const openingRows = room.openings.map((o, i) => {
    const patch = upd => patchRoom(r => ({ ...r, openings: r.openings.map((x, j) => (j === i ? { ...x, ...upd } : x)) }));
    const wallSelect = el('select', {
      class: 'input', onChange: e => patch({ wall: parseInt(e.target.value, 10) || 0 }),
    }, wallOptions.map(wo => el('option', { value: wo.value }, wo.label)));
    wallSelect.value = String(o.wall);

    return el('div', { class: 'opening' }, [
      el('div', { class: 'opening-head' }, [
        el('div', { class: 'label' }, o.label),
        el('div', { class: 'area' }, '−' + nf(o.w * o.h * o.count) + ' m²'),
        el('button', { class: 'remove-btn', onClick: () => patchRoom(r => ({ ...r, openings: r.openings.filter((x, j) => j !== i) })) }, '✕'),
      ]),
      el('div', { class: 'opening-grid3' }, [
        el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Breite m'), el('input', { class: 'input mono', type: 'number', step: '0.01', value: o.w, onChange: e => patch({ w: numFromEvent(e, o.w) }) })]),
        el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Höhe m'), el('input', { class: 'input mono', type: 'number', step: '0.01', value: o.h, onChange: e => patch({ h: numFromEvent(e, o.h) }) })]),
        el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Anzahl'), el('input', { class: 'input mono', type: 'number', step: '1', min: '1', value: o.count, onChange: e => patch({ count: Math.max(1, Math.round(numFromEvent(e, o.count))) } ) })]),
      ]),
      el('div', { class: 'opening-grid2' }, [
        el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Wand'), wallSelect]),
        el('label', { class: 'field' }, [el('span', { class: 'field-label' }, 'Abstand ab Ecke m'), el('input', { class: 'input mono', type: 'number', step: '0.05', value: o.offset, onChange: e => patch({ offset: numFromEvent(e, o.offset) }) })]),
      ]),
    ]);
  });

  const abzuege = el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, 'Abzüge'),
    el('div', { class: 'card-row', style: { marginTop: '12px' } }, [
      presetRow,
      ...openingRows,
      room.openings.length === 0 ? el('div', { class: 'empty-note' }, 'Noch keine Abzüge — netto entspricht brutto.') : null,
    ]),
  ]);

  const kalkulation = el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, 'Kalkulation & Notizen'),
    el('div', { class: 'card-row', style: { marginTop: '14px' } }, [
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, 'Preis pro m² (Wand + Decke)'),
        el('input', { class: 'input mono', type: 'number', step: '0.1', value: room.price, onChange: e => patchRoom(r => ({ ...r, price: numFromEvent(e, room.price) })) }),
      ]),
      el('div', { class: 'tile-row', style: { marginTop: 0 } }, [
        el('div', { class: 'k' }, nf(c.abrechnung, 1) + ' m² abrechenbar'),
        el('div', { class: 'v' }, nf(c.preis) + ' €'),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, 'Notiz'),
        el('textarea', { class: 'input', rows: 3, value: room.note, onChange: e => patchRoom(r => ({ ...r, note: e.target.value })) }),
      ]),
      el('div', { class: 'photo-drop' }, [
        el('div', { class: 'icon' }, '▢'),
        el('div', {}, [
          el('div', { class: 'title' }, 'Foto hinzufügen'),
          el('div', { class: 'sub' }, 'Platzhalter — Kamera folgt in einem späteren Schritt.'),
        ]),
      ]),
    ]),
  ]);

  return el('div', { class: 'view' }, [
    hero, raumdaten, waende, abzuege, kalkulation,
    el('button', { class: 'btn btn-primary btn-block', onClick: () => setState({ tab: 'plan' }) }, 'Grundriss ansehen'),
  ]);
}

function renderPlanView() {
  const room = getActiveRoom();
  if (!room) return el('div', { class: 'view' }, 'Kein Raum ausgewählt.');
  const c = calc(room);
  const p = plan(room, c);

  const svgGroup = svgEl('g', {}, [
    ...p.planWalls.map(s => svgEl('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: '#5b6472', 'stroke-width': 7, 'stroke-linecap': 'square' })),
    ...p.planOpenings.map(o => svgEl('line', { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, stroke: o.color, 'stroke-width': 7, 'stroke-linecap': 'butt' })),
    ...p.planLabels.map(l => {
      const t = svgEl('text', { x: l.x, y: l.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#9aa0ac' });
      t.style.font = "500 11px 'Space Grotesk',sans-serif";
      t.textContent = l.text;
      return t;
    }),
    (() => {
      const t = svgEl('text', { x: p.cx, y: p.cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#dfe2e8' });
      t.style.font = "600 14px 'Space Grotesk',sans-serif";
      t.textContent = nf(c.boden, 1) + ' m²';
      return t;
    })(),
  ]);
  const svg = svgEl('svg', { viewBox: '0 0 320 300' }, [svgGroup]);

  const hero = el('div', { class: 'card hero' }, [
    el('div', { class: 'card-row' }, [
      el('div', { class: 'header-row' }, [
        el('div', { class: 'card-title' }, 'Grundriss ' + room.name),
        el('div', { style: { font: "500 11px/1 'Space Grotesk',sans-serif", color: 'var(--text-muted)' } }, 'M 1:' + p.scale),
      ]),
      el('div', { class: 'plan-frame' }, [svg]),
      !c.g.closed ? el('div', { class: 'warn-box' }, [
        el('span', { class: 'dot' }),
        el('div', { class: 'msg' }, 'Umriss nicht geschlossen — Längen oder Ecken anpassen. Flächen werden trotzdem berechnet.'),
      ]) : null,
      el('div', { class: 'legend' }, [
        el('div', { class: 'item' }, [el('span', { class: 'swatch', style: { background: '#5BA8F0' } }), 'Fenster']),
        el('div', { class: 'item' }, [el('span', { class: 'swatch', style: { background: '#5BD6A0' } }), 'Tür']),
        el('div', { class: 'item' }, [el('span', { class: 'swatch', style: { background: '#6f7682' } }), 'Fläche']),
      ]),
    ]),
  ]);

  const wallTable = el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, 'Wandliste'),
    el('div', { style: { marginTop: '10px' } }, c.g.segs.map(s => el('div', { class: 'wall-table-row' }, [
      el('div', { class: 'label' }, s.label + ' · Wand ' + s.nr),
      el('div', { class: 'detail' }, nf(s.len) + ' × ' + nf(room.height) + ' m'),
      el('div', { class: 'area' }, nf(s.len * room.height, 1) + ' m²'),
    ]))),
  ]);

  return el('div', { class: 'view' }, [
    hero,
    wallTable,
    el('button', { class: 'btn btn-outline btn-block', onClick: () => setState({ tab: 'raum' }) }, 'Maße bearbeiten'),
  ]);
}

function renderExportView() {
  const t = totals();

  const exportCard = el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, 'Export'),
    el('div', { class: 'export-copy', style: { marginTop: '12px' } }, 'Ein Angebotsblatt pro Projekt mit Datum und Gesamtsumme, je Raum eine Zeile. Excel als Tabelle mit Abzügen im Detail.'),
    el('div', { class: 'card-row', style: { marginTop: '12px' } }, [
      el('button', { class: 'btn btn-primary', onClick: exportPdf }, 'PDF-Angebot'),
      el('button', { class: 'btn btn-ghost', onClick: exportCsv }, 'Excel / CSV herunterladen'),
    ]),
    state.toast ? el('div', { class: 'toast', style: { marginTop: '4px' } }, state.toast) : null,
  ]);

  const sheet = el('div', { class: 'sheet' }, [
    el('div', { class: 'sheet-head' }, [
      el('div', {}, [
        el('div', { class: 'title' }, 'Flächenaufstellung'),
        el('div', { class: 'sub' }, state.projectName),
      ]),
      el('div', { class: 'date' }, state.projectDate),
    ]),
    el('div', {}, [
      el('div', { class: 'sheet-table-head' }, [el('div', {}, 'Raum'), el('div', {}, 'Brutto'), el('div', {}, 'Netto'), el('div', {}, 'Decke')]),
      ...state.rooms.map(r => {
        const rc = calc(r);
        return el('div', { class: 'sheet-row' }, [
          el('div', { class: 'name' }, r.name),
          el('div', { class: 'brutto' }, nf(rc.brutto, 1)),
          el('div', { class: 'netto' }, nf(rc.netto, 1)),
          el('div', { class: 'decke' }, nf(rc.decke, 1)),
        ]);
      }),
    ]),
    el('div', { class: 'sheet-total' }, [el('div', { class: 'k' }, 'Gesamtsumme'), el('div', { class: 'v' }, nf(t.preis) + ' €')]),
    el('div', { class: 'sheet-legal' }, 'Netto = Brutto-Wandfläche abzüglich Fenster, Türen und freier Flächen. Alle Maße in Metern, Flächen in m².'),
  ]);

  return el('div', { class: 'view' }, [
    exportCard,
    el('div', { class: 'card-title', style: { padding: '0 4px' } }, 'Vorschau Angebotsblatt'),
    sheet,
  ]);
}

function currentView() {
  switch (state.tab) {
    case 'raum': return renderRaumView();
    case 'plan': return renderPlanView();
    case 'export': return renderExportView();
    default: return renderProjektView();
  }
}

function render() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  root.appendChild(renderHeader());
  root.appendChild(el('div', { class: 'content' }, [currentView()]));
}

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support best-effort */ });
  });
}
