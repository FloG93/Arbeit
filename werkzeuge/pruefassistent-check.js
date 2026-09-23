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
    await p2.evaluate(() => Pruefung.store.set({ tab: 'protokoll' })); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT)); taps.push(...await p2.evaluate(TAPS));
    await p2.evaluate(() => Pruefung.openWiki('grenzwerte-iso')); await p2.waitForTimeout(100);
    found.push(...await p2.evaluate(AUDIT));
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
