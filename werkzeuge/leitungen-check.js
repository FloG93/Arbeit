// Rechenkern der Leitungsberechnung in Node, ohne Browser: lädt
// pruefung/js/util.js und cable.js so, wie sie im Browser laufen, und rechnet
// die handgerechneten Beispiele aus data/leitungen.json nach. Mit --zeigen
// druckt es je Beispiel die Querschnittsleiter und die Formeln.
//
// Aufruf im Repo-Wurzelordner:  node werkzeuge/leitungen-check.js [--zeigen]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', 'pruefung');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['js/util.js', 'js/cable.js']) vm.runInContext(read(file), sandbox, { filename: file });
const C = sandbox.Pruefung.cable;

const data = { cables: JSON.parse(read('data/leitungen.json')), limits: JSON.parse(read('data/grenzwerte.json')) };
const zeigen = process.argv.includes('--zeigen');
const ZEICHEN = { ok: '✓', cond: '◐', fail: '✗', offen: '·' };

if (zeigen) {
  for (const bsp of data.cables.beispiele) {
    const r = C.compute(bsp.calc, data, 'efh');
    console.log('\n━━ ' + bsp.titel);
    if (r.fehler.length) { console.log('  Fehler: ' + r.fehler.join(' ')); continue; }
    console.log('  Ib = ' + C.fmt(r.ib, 2) + ' A' + (r.ibText ? '  (' + r.ibText + ')' : '') + ', In = ' + r.In + ' A');
    for (const z of r.zeilen) {
      const mark = z.S === r.vorschlag ? '   ← Vorschlag' : '';
      const text = z.status === 'fail' ? z.grund.join('; ') : z.nachweise.filter(n => n.status !== 'ok').map(n => n.titel.split(' ')[0] + ': ' + n.grund).join('; ') || 'alle Nachweise';
      console.log('  ' + String(C.fmt(z.S)).padStart(4) + '  ' + ZEICHEN[z.status] + ' ' + text + mark);
    }
    console.log('  Bestimmend: ' + (r.bestimmend.join(', ') || (r.kleinster ? 'kleinster Querschnitt der Reihe' : '—')));
    if (r.ergebnis) {
      for (const n of r.ergebnis.nachweise) {
        console.log('  ' + ZEICHEN[n.status] + ' ' + n.titel + (n.bedingung ? ' — ' + n.bedingung : ''));
        for (const zl of n.zeilen) console.log('      ' + zl);
        if (n.messung) console.log('      ' + n.messung);
      }
    }
    if (r.hinweise.length) console.log('  Hinweise: ' + r.hinweise.map(h => h.id).join(', '));
  }
  console.log('');
}

const befunde = C.checkExamples(data);
if (befunde.length) {
  befunde.forEach(b => console.log('✗ ' + b));
  console.log(befunde.length + ' Abweichung(en)');
  process.exit(1);
}
console.log('✓ Alle ' + data.cables.beispiele.length + ' handgerechneten Beispiele stimmen.');
