// Regressionstest des Prüfassistenten im echten Browser — mit echtem Tippen
// (keyboard.type), nicht fill(): fill() setzt den Text in einem Stück und hat
// deshalb nie gesehen, dass „0,4“ beim Tippen zu 4 wurde.
//
// Aufruf (siehe werkzeuge/README.md):
//   python3 -m http.server 8123 --bind 127.0.0.1     # im Repo-Wurzelordner
//   node werkzeuge/pruefassistent-check.js
// Umgebung: PRUEFUNG_URL (Standard http://localhost:8123/pruefung/),
//           CHROMIUM (Pfad zum Browser), OUT (Ordner für Screenshots).
const { chromium } = require('playwright-core');
const os = require('os');
const path = require('path');
const BASE = process.env.PRUEFUNG_URL || 'http://localhost:8123/pruefung/';
const OUT = process.env.OUT || os.tmpdir();
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

const AUDIT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = el => { const stack = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) stack.push(c); if (c && c.a >= 1) break; } let bg = parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const out = []; const seen = new Set();
  for (const el of document.querySelectorAll('#app *')) {
    if (el.closest('[disabled]')) continue;
    const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const fg0 = parse(cs.color); if (!fg0) continue;
    const bg = bgOf(el); const fg = blend(Object.assign({}, fg0, { a: fg0.a * Number(cs.opacity) }), bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 600;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) { const key = el.className + '|' + el.textContent.trim().slice(0, 30); if (seen.has(key)) continue; seen.add(key); out.push(ratio.toFixed(2) + ' (' + size + 'px) .' + String(el.className).split(' ').join('.') + ' "' + el.textContent.trim().slice(0, 40) + '"'); }
  }
  return out;
};
const TAPS = () => {
  const out = [];
  for (const el of document.querySelectorAll('#app button, #app input, #app textarea, #app select')) {
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    if (r.height < 47.5 || r.width < 44) out.push(Math.round(r.width) + '×' + Math.round(r.height) + ' .' + String(el.className).split(' ').join('.') + ' "' + (el.textContent || el.placeholder || '').trim().slice(0, 25) + '"');
  }
  return Array.from(new Set(out));
};

let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) fails++; };

async function runWizard(page) {
  for (let i = 0; i < 25; i++) {
    const a = page.locator('.answer');
    if (!(await a.count())) break;
    await a.nth(0).click();
    if (await page.locator('.answer.multi').count()) await page.locator('.bottom-bar .btn-primary').click();
    await page.waitForTimeout(60);
  }
  if (!(await page.locator('.q-title', { hasText: 'Prüfplan steht' }).count())) {
    const c = page.locator('.bottom-bar .btn-primary');
    if (await c.count()) await c.click();
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errors.push('[' + m.type() + '] ' + m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('Fix 1 — Komma beim Tippen');
  await page.locator('.norm-card:not([disabled])').first().click();
  await runWizard(page);
  await page.locator('.tab-btn', { hasText: /plan/i }).click();
  await page.locator('.step-card', { hasText: 'Isolationswiderstand' }).first().click();
  await page.waitForTimeout(150);
  const field = () => page.locator('.measure-line input.input').first();
  for (const typed of ['1,5', '0,05', '0,4']) {
    await field().click();
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await page.keyboard.type(typed, { delay: 60 });
    await page.waitForTimeout(200);
    check(await field().inputValue() === typed, 'getippt „' + typed + '“ → Feld zeigt „' + await field().inputValue() + '“');
  }
  const stored = await page.evaluate(() => { const j = Pruefung.store.activeJob(); return j.results['s-iso-widerstand'].values.riso_l_pe; });
  check(stored === 0.4, 'gespeichert als ' + stored);
  const badge = await page.locator('.measure-row').first().locator('.limit-badge').first().getAttribute('class');
  check(/mangel/.test(badge), 'Riso 0,4 MΩ am Feld als Mangel markiert (' + badge + ')');
  await page.screenshot({ path: path.join(OUT, 'f1-komma.png') });

  console.log('Fix 3 — Hand-OK über Messmangel');
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-iso-widerstand', { values: { riso_l_pe: 0.4, riso_n_pe: 50, riso_l_n: 50 }, verdict: 'ok' }); });
  await page.waitForTimeout(150);
  check(await page.locator('.w-warn', { hasText: 'Von Hand' }).count() === 1, 'Warnung im Schritt');
  await page.screenshot({ path: path.join(OUT, 'f3-ueberstimmt.png'), fullPage: true });
  await page.locator('.bottom-bar .btn-ghost').click();
  await page.waitForTimeout(150);
  check(/Von Hand/.test(await page.locator('.step-card', { hasText: 'Isolationswiderstand' }).locator('.s').textContent()), 'Hinweis in der Planzeile');

  console.log('Fix 2 — Zs gegen Sollwert');
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-schleifenimpedanz', { values: { zs: 0.8, zs_soll: 2.87 } }); S.set({ tab: 'protokoll' }); });
  await page.waitForTimeout(200);
  const rows = await page.locator('table.grid tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.children).map(td => td.textContent)));
  const zs = rows.find(r => /Schleifen/.test(r[0]));
  check(zs && zs[1] === '≤ 2,87 Ω' && zs[2] === '0,8 Ω' && /OK/.test(zs[3]), 'Protokoll Zs: ' + JSON.stringify(zs));
  const iso = rows.find(r => /Isolation/.test(r[0]));
  check(iso && /von Hand/.test(iso[3]), 'Protokoll Riso: ' + JSON.stringify(iso));
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-schleifenimpedanz', { values: { zs: 0.8 } }); });
  await page.waitForTimeout(150);
  const zs2 = (await page.locator('table.grid tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.children).map(td => td.textContent)))).find(r => /Schleifen/.test(r[0]));
  check(zs2 && zs2[1] === '≤ U0 / Ia' && /offen/.test(zs2[3]), 'ohne Sollwert: ' + JSON.stringify(zs2));
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-schleifenimpedanz', { values: { zs: 3.1, zs_soll: 2.87 } }); });
  await page.waitForTimeout(150);
  const zs3 = (await page.locator('table.grid tbody tr').evaluateAll(trs => trs.map(tr => Array.from(tr.children).map(td => td.textContent)))).find(r => /Schleifen/.test(r[0]));
  check(zs3 && /Mangel/.test(zs3[3]) && zs3[2] === '3,1 Ω', 'Zs 3,1 > 2,87: ' + JSON.stringify(zs3));

  console.log('Fix 8/10/11 — Pflichtangaben, Plural, Ergebnissatz');
  check(await page.locator('.w-warn', { hasText: 'Pflichtangaben fehlen' }).count() === 1, 'Pflichtangaben-Warnung im Protokoll: ' + await page.locator('.w-warn', { hasText: 'Pflichtangaben' }).textContent().catch(() => '—'));
  await page.locator('[data-fkey="prot-objekt"]').click();
  await page.keyboard.type('Musterstraße 5', { delay: 10 });
  check(await page.locator('.brand-name').textContent() === 'Musterstraße 5', 'Titel beim Tippen im Kopf: ' + await page.locator('.brand-name').textContent());
  await page.locator('[data-fkey="prot-pruefer"]').click();
  await page.keyboard.type('F. Prüfer', { delay: 10 });
  const pv = await page.locator('[data-fkey="prot-pruefer"]').inputValue();
  check(pv === 'F. Prüfer', 'Feldwechsel behält den Fokus, Prüfer = „' + pv + '“');
  await page.waitForTimeout(150);
  check(!(await page.locator('[data-missing-note]').isVisible()), 'Warnung verschwindet, wenn alles eingetragen ist');
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-drehfeld', { verdict: 'mangel' }); });
  await page.waitForTimeout(150);
  const chips = await page.locator('.card .chips .badge').allTextContents();
  check(chips.includes('2 Mängel'), 'Protokoll-Chip: ' + chips.join(' | '));
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator('.bottom-bar .btn-primary').click();
  await page.waitForTimeout(150);
  const sheet = (await page.locator('#print-root .p-note').allTextContents()).join(' || ');
  check(/2 Mängel festgestellt\. Die Anlage entspricht/.test(sheet), 'Bogen Anlage: ' + sheet.slice(0, 110));
  check(/von Hand/.test(await page.locator('#print-root').textContent()), 'Bogen vermerkt Hand-Bewertung');

  console.log('Fix 12 — Fälligkeit wandert mit dem Datum');
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setProtocolField(j.id, Pruefung.data.packById.get(j.normId), 'datum', '2026-01-31'); S.setInterval(j.id, Pruefung.intervals.byId('werkstatt')); S.setProtocolField(j.id, Pruefung.data.packById.get(j.normId), 'datum', '2026-03-31'); });
  const due = await page.evaluate(() => Pruefung.store.activeJob().interval.nextDue);
  check(due === '2027-03-31', 'Datum 31.03.2026 + 12 Monate → ' + due);

  console.log('Fix 7 — Zurück-Taste');
  await page.locator('.tab-btn', { hasText: /plan/i }).click();
  await page.waitForTimeout(100);
  await page.locator('.step-card', { hasText: 'Isolationswiderstand' }).first().click();
  await page.waitForTimeout(100);
  await page.goBack();
  await page.waitForTimeout(200);
  check(page.url().startsWith(BASE) && await page.locator('.step-card').count() > 3, 'Schritt → Zurück landet in der Planliste');
  await page.evaluate(() => Pruefung.openWiki('grenzwerte-iso'));
  await page.waitForTimeout(100);
  await page.goBack();
  await page.waitForTimeout(200);
  check(page.url().startsWith(BASE) && await page.locator('.step-card').count() > 3, 'Wiki-Eintrag → Zurück landet wieder im Plan');
  await page.goBack(); await page.waitForTimeout(200);
  check(page.url().startsWith(BASE), 'weiter zurück bleibt in der App (' + await page.evaluate(() => Pruefung.store.state.tab) + ')');

  console.log('Fix 9 — Fristen im Wiki');
  await page.evaluate(() => Pruefung.openWiki('prueffristen-uebersicht'));
  await page.waitForTimeout(150);
  const fr = await page.locator('table.grid td.v').allTextContents();
  check(!fr.some(t => /1 Jahre/.test(t)) && fr.includes('1 Jahr'), 'Fristen: ' + fr.join(' | '));

  console.log('Fix 11 — Ergebnissatz Gerät');
  await page.evaluate(() => { Pruefung.store.set({ tab: 'auftraege' }); });
  await page.locator('.norm-card:not([disabled])', { hasText: '50699' }).first().click();
  await runWizard(page);
  await page.evaluate(() => { const S = Pruefung.store; const j = S.activeJob(); S.setResult(j.id, 's-g-sicht', { verdict: 'mangel' }); S.set({ tab: 'protokoll' }); window.print = () => {}; });
  await page.waitForTimeout(150);
  await page.locator('.bottom-bar .btn-primary').click();
  await page.waitForTimeout(150);
  const gsheet = (await page.locator('#print-root .p-note').allTextContents()).join(' || ');
  check(/1 Mangel festgestellt\. Das Gerät hat die Prüfung nicht bestanden/.test(gsheet), 'Bogen Gerät: ' + gsheet.slice(0, 100));
  check(await page.locator('.w-warn', { hasText: 'Gerät' }).count() === 1, 'Pflichtangabe „Gerät“ angemahnt');
  await ctx.close();

  console.log('Paket 1 — Kopfdaten, Anlass, Potentialausgleich, RE');
  {
    const c4 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p4 = await c4.newPage();
    p4.on('pageerror', e => errors.push(e.message));
    p4.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errors.push('[' + m.type() + '] ' + m.text()); });
    await p4.goto(BASE, { waitUntil: 'networkidle' });
    await p4.evaluate(() => localStorage.clear());
    await p4.reload({ waitUntil: 'networkidle' }); await p4.waitForTimeout(400);

    // Der Anlass steht am Anfang der Erstprüfung und landet im Protokoll.
    await p4.locator('.norm-card:not([disabled])').first().click(); await p4.waitForTimeout(150);
    const erste = await p4.locator('.q-title').first().textContent();
    const anlassOptionen = await p4.locator('.answer .t').allTextContents();
    check(/Anlass der Prüfung/.test(erste) && anlassOptionen.length === 4,
      'Erstprüfung fragt zuerst den Anlass: ' + anlassOptionen.join(', '));
    await p4.locator('.answer', { hasText: 'Instandsetzung' }).click(); await p4.waitForTimeout(100);
    await runWizard(p4);
    await p4.locator('.tab-btn', { hasText: 'Aufträge' }).click(); await p4.waitForTimeout(150);
    const anlassFeld = await p4.locator('.field', { hasText: 'Prüfanlass' }).locator('.input').textContent();
    check(anlassFeld === 'Instandsetzung', 'Anlass steht im Protokoll: „' + anlassFeld + '“');

    // Kopfdaten: Gruppen, Vorbelegung, gemerkte Felder
    const gruppen = await p4.locator('.field-group').allTextContents();
    check(gruppen.join(',') === 'Auftrag,Anlage,Netz,Prüfung', 'Kopfdaten in vier Gruppen: ' + gruppen.join(' | '));
    check(await p4.locator('[data-fkey="prot-netz_spannung"]').inputValue() === '230/400'
       && await p4.locator('[data-fkey="prot-netz_frequenz"]').inputValue() === '50',
      'Netzspannung und Frequenz sind vorbelegt');
    await p4.locator('[data-fkey="prot-auftragnehmer"]').click();
    await p4.keyboard.type('Elektro Muster GmbH', { delay: 10 });
    await p4.waitForTimeout(400);
    check(await p4.evaluate(() => Pruefung.store.state.sticky.auftragnehmer) === 'Elektro Muster GmbH',
      'Auftragnehmer wird für weitere Prüfungen gemerkt');

    // Potentialausgleich: eigener Schritt mit den Zielen des Formulars
    await p4.locator('.tab-btn', { hasText: /^Plan$/ }).click(); await p4.waitForTimeout(150);
    await p4.locator('.step-card', { hasText: 'Durchgängigkeit des Potentialausgleichs' }).click();
    await p4.waitForTimeout(150);
    check(await p4.locator('.check-row').count() === 14, 'Potentialausgleich listet 14 Ziele');

    // Vierter Zustand: offen → OK → Mangel → n. a. → offen
    const gas = p4.locator('.check-row', { hasText: 'Gasinnenleitung' });
    const folge = [];
    for (let i = 0; i < 5; i++) {
      folge.push((await gas.getAttribute('aria-label')).split('— ')[1]);
      await gas.click(); await p4.waitForTimeout(60);
    }
    check(folge.join(' → ') === 'offen → in Ordnung → Mangel → nicht zutreffend → offen',
      'Checkliste kennt vier Zustände: ' + folge.join(' → '));

    // Alles „n. a." heißt bewertet, nicht offen — und kein Mangel.
    await p4.evaluate(() => {
      const S = Pruefung.store, j = S.activeJob();
      const pack = Pruefung.data.packById.get(j.normId);
      const step = pack.stepById.get('s-pa-durchgaengigkeit');
      const checks = {};
      for (const item of step.checklist) checks[item.id] = 'na';
      S.setResult(j.id, 's-pa-durchgaengigkeit', { checks, values: { r_pa: 0.2 } });
    });
    await p4.waitForTimeout(150);
    const urteil = await p4.evaluate(() => {
      const j = Pruefung.store.activeJob();
      const pack = Pruefung.data.packById.get(j.normId);
      return Pruefung.plan.verdict(pack, pack.stepById.get('s-pa-durchgaengigkeit'),
        j.session.facts, j.results['s-pa-durchgaengigkeit']);
    });
    check(urteil === 'ok', 'lauter „n. a." gilt als bewertet, nicht als offen (Bewertung: ' + urteil + ')');

    // RE außerhalb von TT: TN-C-S wurde im Assistenten gewählt
    await p4.locator('.bottom-bar .btn-ghost').click(); await p4.waitForTimeout(150);
    const schritte = await p4.locator('.step-card .t').allTextContents();
    check(schritte.some(t => /Erdungswiderstand RE/.test(t)),
      'Erdungswiderstand RE steht auch im TN-System im Plan');

    // Alter Auftrag: r_pa wandert zum neuen Schritt
    await p4.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('pruefung.v1'));
      const job = raw.jobs[0];
      job.results['s-durchgang-schutzleiter'] = { values: { r_pe_max: 0.3, r_pa: 0.42 }, at: 1 };
      delete job.results['s-pa-durchgaengigkeit'];
      localStorage.setItem('pruefung.v1', JSON.stringify(raw));
    });
    await p4.reload({ waitUntil: 'networkidle' }); await p4.waitForTimeout(500);
    const gewandert = await p4.evaluate(() => {
      const j = Pruefung.store.state.jobs[0];
      return {
        neu: j.results['s-pa-durchgaengigkeit'] && j.results['s-pa-durchgaengigkeit'].values.r_pa,
        alt: j.results['s-durchgang-schutzleiter'].values.r_pa,
        rpe: j.results['s-durchgang-schutzleiter'].values.r_pe_max,
      };
    });
    check(gewandert.neu === 0.42 && gewandert.alt === undefined && gewandert.rpe === 0.3,
      'alter Potentialausgleichswert wandert mit, der Schutzleiterwert bleibt: ' + JSON.stringify(gewandert));
    await c4.close();
  }

  console.log('Paket 2 — Ik, Berührungsspannung, Riso, Messstellen');
  {
    const c5 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p5 = await c5.newPage();
    p5.on('pageerror', e => errors.push(e.message));
    p5.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errors.push('[' + m.type() + '] ' + m.text()); });
    await p5.goto(BASE, { waitUntil: 'networkidle' });
    await p5.evaluate(() => localStorage.clear());
    await p5.reload({ waitUntil: 'networkidle' }); await p5.waitForTimeout(400);
    await p5.locator('.norm-card:not([disabled])').first().click(); await p5.waitForTimeout(120);
    await runWizard(p5);
    await p5.locator('.tab-btn', { hasText: /^Plan$/ }).click(); await p5.waitForTimeout(150);

    const typeInto = async (sel, text) => {
      await p5.locator(sel).click();
      await p5.keyboard.press('Control+A'); await p5.keyboard.press('Backspace');
      await p5.keyboard.type(text, { delay: 50 });
      await p5.waitForTimeout(200);
    };
    const bewertung = stepId => p5.evaluate(id => {
      const j = Pruefung.store.activeJob(), pack = Pruefung.data.packById.get(j.normId);
      const step = pack.stepById.get(id);
      return {
        verdict: Pruefung.plan.verdict(pack, step, j.session.facts, j.results[id]) || 'offen',
        key: Pruefung.plan.keyValue(step, j.results[id]),
      };
    }, stepId);

    // Riso: sechs Felder in zwei Gruppen
    await p5.locator('.step-card', { hasText: 'Isolationswiderstand' }).first().click(); await p5.waitForTimeout(150);
    const gruppen = await p5.locator('.field-group').allTextContents();
    check(gruppen.join(',') === 'Ohne Verbraucher,Mit Verbraucher' && await p5.locator('.measure-line input.input').count() === 6,
      'Riso: sechs Felder in zwei Gruppen (' + gruppen.join(' | ') + ')');

    // „mit Verbraucher" wird dokumentiert, nicht bewertet
    await typeInto('[data-fkey="m-s-iso-widerstand-riso_l_pe"]', '150');
    await typeInto('[data-fkey="m-s-iso-widerstand-riso_n_pe"]', '150');
    await typeInto('[data-fkey="m-s-iso-widerstand-riso_l_pe_mit"]', '0,4');
    const mitLast = await bewertung('s-iso-widerstand');
    check(mitLast.verdict === 'ok' && mitLast.key.value === 150,
      'Wert mit Verbraucher zählt nicht als Mangel: ' + JSON.stringify(mitLast));

    // Messstellen: „+", Bezeichnung, Wert — und ein Ausreißer schlägt durch
    await p5.locator('.punkt-add').click(); await p5.waitForTimeout(150);
    await p5.locator('.punkt-add').click(); await p5.waitForTimeout(150);
    check(await p5.locator('.punkt-row').count() === 2, 'zwei Messstellen über „+" angelegt');
    const leer = await bewertung('s-iso-widerstand');
    check(leer.verdict === 'offen', 'Messstelle ohne Wert hält den Schritt offen');
    const punkte = p5.locator('.punkt-row');
    await punkte.nth(0).locator('[data-fkey$="-ort"]').click();
    await p5.keyboard.type('Abgang Küche', { delay: 10 });
    await typeInto('.punkt-row:nth-of-type(1) [data-fkey$="-wert"]', '120');
    await typeInto('.punkt-row:nth-of-type(2) [data-fkey$="-wert"]', '0,4');
    check(await p5.locator('.punkt-row').nth(1).locator('[data-fkey$="-wert"]').inputValue() === '0,4',
      'Komma in der Messstelle bleibt beim Tippen stehen');
    const ausreisser = await bewertung('s-iso-widerstand');
    check(ausreisser.verdict === 'mangel' && ausreisser.key.value === 0.4,
      'ein Ausreißer in den Messstellen wird zum Mangel und steht im Protokoll: ' + JSON.stringify(ausreisser));

    // Löschen zieht den maßgeblichen Wert nach
    await p5.locator('.punkt-row').nth(1).locator('.mini-btn').click(); await p5.waitForTimeout(200);
    const nachLoeschen = await bewertung('s-iso-widerstand');
    check(await p5.locator('.punkt-row').count() === 1 && nachLoeschen.verdict === 'ok' && nachLoeschen.key.value === 120,
      'gelöschte Messstelle zieht den maßgeblichen Wert nach: ' + JSON.stringify(nachLoeschen));

    // Ik neben Zs
    await p5.locator('.bottom-bar .btn-ghost').click(); await p5.waitForTimeout(150);
    await p5.locator('.step-card', { hasText: 'Schleifenimpedanz' }).click(); await p5.waitForTimeout(150);
    await typeInto('[data-fkey="m-s-schleifenimpedanz-zs"]', '0,8');
    await typeInto('[data-fkey="m-s-schleifenimpedanz-zs_soll"]', '2,87');
    await typeInto('[data-fkey="m-s-schleifenimpedanz-ik"]', '287');
    const zsStep = await bewertung('s-schleifenimpedanz');
    check(zsStep.verdict === 'ok' && zsStep.key.value === 0.8,
      'Ik wird erfasst, bleibt aber aus der Bewertung heraus: ' + JSON.stringify(zsStep));

    // Berührungsspannung: Schnellwerte aus der Tabelle, Soll schlägt Tabelle
    await p5.locator('.bottom-bar .btn-ghost').click(); await p5.waitForTimeout(150);
    await p5.locator('.step-card', { hasText: 'Berührungsspannung' }).click(); await p5.waitForTimeout(150);
    const schnell = await p5.locator('.quick-chip').allTextContents();
    check(schnell.join(',') === '50,25', 'UL-Schnellwerte kommen aus der Grenzwerttabelle: ' + schnell.join(' | '));
    await typeInto('[data-fkey="m-s-beruehrungsspannung-u_mess"]', '30');
    const ohneSoll = await p5.evaluate(() => {
      const j = Pruefung.store.activeJob(), pack = Pruefung.data.packById.get(j.normId);
      const entry = Pruefung.plan.ensure(j, pack).find(e => e.step.id === 's-beruehrungsspannung');
      return Pruefung.limits.format(entry.limit);
    });
    check(ohneSoll === '≤ 50 V', 'ohne eingetragene Grenze gilt der Tabellenwert: ' + ohneSoll);
    await p5.locator('.quick-chip', { hasText: '25' }).click(); await p5.waitForTimeout(200);
    const mitSoll = await p5.evaluate(() => {
      const j = Pruefung.store.activeJob(), pack = Pruefung.data.packById.get(j.normId);
      const entry = Pruefung.plan.ensure(j, pack).find(e => e.step.id === 's-beruehrungsspannung');
      return { soll: Pruefung.limits.format(entry.limit),
               verdict: Pruefung.plan.verdict(pack, pack.stepById.get('s-beruehrungsspannung'), j.session.facts, j.results['s-beruehrungsspannung']) };
    });
    check(mitSoll.soll === '≤ 25 V' && mitSoll.verdict === 'mangel',
      'eingetragene Grenze schlägt die Tabelle, 30 V > 25 V ist ein Mangel: ' + JSON.stringify(mitSoll));

    // Anhang im Druckbogen
    await p5.evaluate(() => { window.print = () => {}; Pruefung.store.set({ tab: 'protokoll' }); });
    await p5.waitForTimeout(200);
    await p5.locator('.bottom-bar .btn-primary').click(); await p5.waitForTimeout(200);
    const bogen = await p5.locator('#print-root').innerText();
    check(/Weitere erfasste Werte und Messstellen/.test(bogen) && /Abgang Küche/.test(bogen)
       && /Mit Verbraucher · L–PE/.test(bogen) && /287 A/.test(bogen),
      'Anhang nennt Messstellen, dokumentierte Werte und Ik');
    await c5.close();
  }

  console.log('Leitungsberechnung (360 px)');
  {
    const c3 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p3 = await c3.newPage();
    p3.on('pageerror', e => errors.push(e.message));
    p3.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errors.push('[' + m.type() + '] ' + m.text()); });
    await p3.goto(BASE, { waitUntil: 'networkidle' });
    await p3.evaluate(() => { localStorage.clear(); localStorage.setItem('pruefung.v1', JSON.stringify({ schemaVersion: 1, world: 'efh', tab: 'auftraege', jobs: [], sticky: { pruefer: 'F. Prüfer' } })); });
    await p3.reload({ waitUntil: 'networkidle' }); await p3.waitForTimeout(400);
    const tabs = await p3.evaluate(() => Array.from(document.querySelectorAll('.tab-btn')).filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
    check(!tabs.length && await p3.locator('.tab-btn').count() === 5, 'fünf Reiter ohne Überlauf' + (tabs.length ? ': ' + tabs.join(', ') : ''));
    await p3.locator('.tab-btn', { hasText: 'Leitungen' }).click();
    await p3.locator('.norm-card', { hasText: 'Wallbox 11' }).click(); await p3.waitForTimeout(100);
    const typeInto = async (fkey, text) => {
      await p3.locator('[data-fkey="' + fkey + '"]').click();
      await p3.keyboard.press('Control+A'); await p3.keyboard.press('Backspace');
      await p3.keyboard.type(text, { delay: 50 });
      await p3.waitForTimeout(150);
    };
    await typeInto('calc-len', '28');
    await p3.locator('.chip', { hasText: '35 °C' }).click();
    await typeInto('calc-n', '2');
    const head = await p3.locator('.calc-head').innerText();
    check(/NYM-J 5×2,5 mm²/.test(head) && /Belastbarkeit/.test(head), 'Vorlage Wallbox → Vorschlag: ' + head.replace(/\s+/g, ' '));
    await p3.locator('.calc-rung[data-querschnitt="1.5"]').click(); await p3.waitForTimeout(100);
    const head15 = await p3.locator('.calc-head').innerText();
    const rung15 = await p3.locator('.calc-rung[data-querschnitt="1.5"]').innerText();
    check(/5×1,5/.test(head15) && /nicht erfüllt/.test(head15) && /Iz 13,2 A < In 16 A/.test(rung15), '1,5 antippen → ✗ mit Grund: ' + rung15.replace(/\s+/g, ' '));
    await p3.locator('.calc-head .mini-btn', { hasText: 'Vorschlag' }).click(); await p3.waitForTimeout(100);
    const proofAb = () => p3.locator('.calc-proof', { hasText: 'Abschaltbedingung' }).innerText();
    check(/erfüllt, wenn am Verteiler Zs ≤ 2,24 Ω/.test(await proofAb()), 'ohne Z_V: Bedingung am Verteiler');
    await typeInto('calc-zv', '0,8');
    check(await p3.locator('[data-fkey="calc-zv"]').inputValue() === '0,8', 'Z_V getippt „0,8“ bleibt stehen');
    const zv = await p3.evaluate(() => Pruefung.store.state.calcs[0].netz.zv);
    const ab = await proofAb();
    check(zv === 0.8 && /Ik,min = 0,95 · 230 V \/ \(0,8 \+ 0,494\) Ω/.test(ab) && !/erfüllt, wenn/.test(ab), 'mit Z_V 0,8 Ω: Zahl statt Bedingung (' + zv + ')');
    await typeInto('calc-zv', '');
    check(/erfüllt, wenn am Verteiler/.test(await proofAb()) && await p3.evaluate(() => Pruefung.store.state.calcs[0].netz.zv) == null, 'Z_V geleert → wieder Bedingung');
    await p3.locator('[data-fkey="calc-name"]').click();
    await p3.keyboard.press('Control+A'); await p3.keyboard.type('Wallbox Garage', { delay: 10 });
    check(await p3.locator('.brand-name').textContent() === 'Wallbox Garage' && await p3.evaluate(() => document.activeElement.dataset.fkey) === 'calc-name', 'Name beim Tippen im Kopf, Fokus bleibt');
    await p3.evaluate(() => { window.print = () => {}; });
    await p3.locator('.bottom-bar .btn-primary', { hasText: 'Nachweis' }).click(); await p3.waitForTimeout(100);
    const sheet = await p3.locator('#print-root').innerText();
    check(/Leitungsnachweis/.test(sheet) && /Wallbox Garage/.test(sheet) && (sheet.match(/Belastbarkeit und Überlastschutz|Spannungsfall|Abschaltbedingung|Kurzschlussfestigkeit/g) || []).length >= 4 && /Bearbeiter: F\. Prüfer/.test(sheet) && /nicht vollständig gegengeprüft/.test(sheet), 'Nachweisblatt: Eingaben, vier Nachweise, Bearbeiter, Prüfstand');
    await p3.goBack(); await p3.waitForTimeout(200);
    check(await p3.locator('.job-card', { hasText: 'Wallbox Garage' }).count() === 1, 'Rechnung → Zurück landet in der Liste');
    await p3.evaluate(() => Pruefung.openWiki('leitung-belastbarkeit')); await p3.waitForTimeout(100);
    check(await p3.locator('.w-table .cap', { hasText: 'Strombelastbarkeit' }).count() === 1 && await p3.locator('.badge', { hasText: 'Datenbasis ungeprüft' }).count() >= 1, 'Wiki: Tabelle aus leitungen.json mit Prüfstand');
    // Offline: Worker muss die Seite kontrollieren, dann Netz kappen.
    await p3.reload({ waitUntil: 'networkidle' }); await p3.waitForTimeout(600);
    await c3.setOffline(true);
    await p3.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await p3.waitForTimeout(800);
    await p3.evaluate(() => Pruefung.store.set({ tab: 'leitungen' })).catch(() => {});
    await p3.waitForTimeout(200);
    const offCard = p3.locator('.job-card', { hasText: 'Wallbox Garage' });
    let offOk = await offCard.count() === 1;
    if (offOk) { await offCard.locator('.job-open').click(); await p3.waitForTimeout(150); offOk = /NYM-J 5×2,5/.test(await p3.locator('.calc-head').innerText()); }
    check(offOk, 'offline: Leitungen-Tab und gespeicherte Rechnung öffnen' + (offOk ? '' : ' — ' + (await p3.evaluate(() => (window.Pruefung ? Pruefung.store.state.tab + ' ' + !!navigator.serviceWorker.controller + ' ' : 'keine App ') + document.querySelector('.content').innerText.replace(/\s+/g, ' ').slice(0, 300)).catch(e => e.message))));
    await c3.setOffline(false);
    await c3.close();
  }

  console.log('Fix 4/5/6 — Kontrast und Tippziele (360 px, alle vier Modi)');
  for (const [world, hc] of [['efh', false], ['industrie', false], ['efh', true], ['industrie', true]]) {
    const c2 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p2 = await c2.newPage();
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.evaluate(([w, h]) => localStorage.setItem('pruefung.v1', JSON.stringify({ schemaVersion: 1, world: w, hc: h, tab: 'auftraege', jobs: [] })), [world, hc]);
    await p2.reload({ waitUntil: 'networkidle' }); await p2.waitForTimeout(400);
    const found = [];
    const taps = [];
    found.push(...await p2.evaluate(AUDIT));
    await p2.locator('.norm-card:not([disabled])').first().click(); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT));
    await runWizard(p2);
    found.push(...await p2.evaluate(AUDIT));
    await p2.locator('.tab-btn', { hasText: /plan/i }).click(); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.locator('.step-card', { hasText: 'Isolationswiderstand' }).first().click(); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    // Potentialausgleich: lange Checkliste, und alle vier Zustände einmal
    // gezeichnet — „n. a." muss im Kontrast-Audit vorkommen.
    await p2.evaluate(() => { Pruefung.nav.stepId = 's-pa-durchgaengigkeit'; Pruefung.render(); });
    await p2.waitForTimeout(100);
    const naRow = p2.locator('.check-row').first();
    for (let i = 0; i < 3; i++) { await naRow.click(); await p2.waitForTimeout(40); }
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    // Messstellen und Feldgruppen einmal zeichnen lassen: die „+"-Fläche und
    // die Punktzeilen müssen Kontrast und Tippziel auch halten.
    await p2.evaluate(() => { Pruefung.nav.stepId = 's-iso-widerstand'; Pruefung.render(); });
    await p2.waitForTimeout(100);
    await p2.locator('.punkt-add').click(); await p2.waitForTimeout(120);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.evaluate(() => { Pruefung.nav.stepId = null; Pruefung.render(); });
    await p2.waitForTimeout(100);
    await p2.evaluate(() => Pruefung.store.set({ tab: 'protokoll' })); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.evaluate(() => Pruefung.openWiki('grenzwerte-iso')); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT));
    await p2.evaluate(() => Pruefung.openWiki('leitung-faktoren')); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT));
    await p2.evaluate(() => Pruefung.store.set({ tab: 'leitungen' })); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.locator('.norm-card').first().click(); await p2.waitForTimeout(100);
    await p2.locator('[data-fkey="calc-len"]').click(); await p2.keyboard.type('70');
    await p2.waitForTimeout(100);
    // Alle Karten einmal ins Bild holen: die mitlaufende Ergebniszeile deckt
    // sonst beim Kontrast-Audit darunterliegende Texte ab.
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.evaluate(() => Pruefung.store.set({ tab: 'auftraege' })); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    const ow = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const label = world + (hc ? ' + Tageslicht' : ' dunkel');
    check(!found.length, label + ': Kontrast' + (found.length ? '\n      ' + Array.from(new Set(found)).join('\n      ') : ' ok'));
    if (!hc && world === 'efh') check(!taps.length, 'Tippziele ≥ 48 px' + (taps.length ? '\n      ' + Array.from(new Set(taps)).join('\n      ') : ''));
    check(ow <= 0, label + ': kein Querüberlauf (' + ow + ' px)');
    if (hc && world === 'industrie') await p2.screenshot({ path: path.join(OUT, 'f4-tageslicht-industrie.png') });
    await c2.close();
  }

  console.log(errors.length ? 'Konsole:\n  ' + errors.join('\n  ') : 'Konsole sauber');
  console.log(fails ? fails + ' FEHLGESCHLAGEN' : 'ALLE PRÜFUNGEN BESTANDEN');
  await browser.close();
  process.exitCode = fails ? 1 : 0;
})();
