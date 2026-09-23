'use strict';

/* Leitungsberechnung — der Rechenkern, ohne DOM.
 *
 * Vier Nachweise je Querschnitt: Belastbarkeit mit Überlastschutz,
 * Spannungsfall, Abschaltbedingung, Kurzschlussfestigkeit. Jede Zahl kommt
 * aus data/leitungen.json oder data/grenzwerte.json; hier steht nur der
 * Rechenweg. Der Kern läuft im Browser (P.cable) und in Node
 * (werkzeuge/leitungen-check.js) gegen dieselben handgerechneten Beispiele.
 *
 * Status je Nachweis: 'ok', 'fail', 'cond' (erfüllt unter einer Bedingung an
 * den Verteiler, weil die Vorimpedanz fehlt) und 'offen' (Eingabe fehlt).
 * Was die App nicht weiß, nimmt sie nicht an — sie nennt die Bedingung. */
(function (P) {
  const { nf, matches } = P.util;

  const C = {};

  /* Zahl mit fester Stellenzahl, Nachkommanullen weg: 0,02225 bleibt lesbar,
   * 16,0 wird 16. Formeln brauchen mehr Stellen als die Messwertanzeige. */
  function z(v, d) {
    if (v == null || !isFinite(v)) return '—';
    let s = nf(v, d == null ? 2 : d);
    if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  }
  C.fmt = z;

  const WORST = { fail: 4, offen: 3, cond: 2, ok: 1 };
  const worst = list => list.reduce((a, b) => (WORST[b] > WORST[a] ? b : a), 'ok');
  C.worst = worst;

  /* Kurze Namen für die Datenblöcke — cables = leitungen.json,
   * limits = grenzwerte.json. */
  function ctxOf(data) {
    const cb = data.cables;
    const k = cb.konstanten.werte;
    const zs = k.zs_mess;
    return {
      cb,
      limits: data.limits,
      u0: k.u0.wert,
      u: k.u.wert,
      rho20: k.rho20.wert,
      rhoB: k.rho20.wert * k.f_betrieb.wert,
      rho80: k.rho20.wert * k.f_fehler.wert,
      cMin: k.c_min.wert,
      cMax: k.c_max.wert,
      k: k.k_cu_pvc.wert,
      x: k.x_strich.wert,
      ue: k.ueberlast_i2.wert,
      zsMess: zs.zaehler / zs.nenner,
      zsMessLabel: zs.zaehler + '/' + zs.nenner,
      ik3: k.ik3_faktor.wert,
    };
  }

  const typ = (cb, id) => cb.leitungstypen.typen.find(t => t.id === id) || null;
  const verlegeart = (cb, id) => cb.verlegearten.arten.find(a => a.id === id) || null;
  C.typ = typ;
  C.verlegeart = verlegeart;

  function limitRow(limits, tableId, key) {
    const table = (limits.tables || []).find(t => t.id === tableId);
    if (!table) return null;
    return table.rows.find(r => r.key === key) || table.rows.find(r => r.default) || null;
  }

  /* Eine gespeicherte Rechnung trägt nur, was der Nutzer eingegeben hat.
   * Fehlende Felder füllt die Vorbelegung der Welt, damit alte Stände nach
   * einer Datenerweiterung weiter rechnen. */
  C.normalize = function normalize(calc, cb, worldId) {
    const base = cb.vorbelegung[worldId] || cb.vorbelegung[Object.keys(cb.vorbelegung)[0]];
    const out = {};
    for (const part of ['verbraucher', 'schutz', 'leitung', 'umgebung', 'netz']) {
      out[part] = Object.assign({}, base[part], calc && calc[part]);
    }
    out.querschnitt = calc && calc.querschnitt != null ? calc.querschnitt : null;
    out.vorlage = (calc && calc.vorlage) || null;
    out.world = (calc && calc.world) || worldId;
    return out;
  };

  /* Betriebsstrom aus Leistung oder direkt. */
  function betriebsstrom(v, x) {
    if (v.modus === 'kw') {
      if (!(v.leistung > 0) || !(v.cosphi > 0)) return null;
      const p = v.leistung * 1000;
      if (v.phasen === 3) {
        return { ib: p / (Math.sqrt(3) * x.u * v.cosphi), text: `Ib = ${z(p, 0)} W / (√3 · ${z(x.u, 0)} V · ${z(v.cosphi, 2)})` };
      }
      return { ib: p / (x.u0 * v.cosphi), text: `Ib = ${z(p, 0)} W / (${z(x.u0, 0)} V · ${z(v.cosphi, 2)})` };
    }
    if (!(v.strom > 0)) return null;
    return { ib: v.strom, text: null };
  }

  /* Schutzorgan: Nennstromreihe, I2, Ia je Stützstelle, Schaltvermögen. */
  function schutzorgan(s, cb) {
    if (s.art === 'gg') {
      const g = cb.schutzorgane.gg;
      return {
        art: 'gg',
        label: 'gG',
        tables: [g.id],
        reihe: g.reihe.map(r => r.in),
        zeiten: g.zeiten.slice().sort((a, b) => b - a),
        i2f: In => (g.i2.find(r => r.in_max == null || In <= r.in_max) || {}).f,
        ia: (In, t) => { const r = g.reihe.find(x => x.in === In); return r ? r.ia[String(t)] : null; },
        icu: () => g.schaltvermoegen,
        i2t: In => { const r = g.reihe.find(x => x.in === In); return r ? r.i2t : null; },
        name: In => 'gG ' + In + ' A',
      };
    }
    const ls = cb.schutzorgane.ls;
    const ch = ls.charakteristiken.find(c => c.id === s.char) || ls.charakteristiken[0];
    const dl = cb.schutzorgane.ls_durchlass;
    return {
      art: 'ls',
      label: ch.label,
      tables: [ls.id, dl.id],
      reihe: ls.nennstroeme.slice(),
      zeiten: ls.zeiten.slice().sort((a, b) => b - a),
      i2f: () => ls.i2_faktor,
      ia: In => ch.ia_faktor * In,
      iaFaktor: ch.ia_faktor,
      icu: () => s.icu || (ls.schaltvermoegen.find(x => x.default) || ls.schaltvermoegen[0]).wert,
      // Durchlass-I²t je Stufe des unbeeinflussten Kurzschlussstroms, oder null.
      durchlass: In => {
        const bereich = dl.bereiche.find(b => In <= b.in_max);
        if (!bereich || !bereich[ch.id]) return null;
        return dl.stufen_ik.map((ik, i) => ({ ik, i2t: bereich[ch.id][i] }));
      },
      name: In => ch.label + In,
    };
  }

  /* Faktor aus einer Stufentabelle: nächsthöhere Stufe, nie interpolieren. */
  function stufe(stufen, wert, key) {
    return stufen.find(s => wert <= s[key]) || null;
  }

  function faktorTemperatur(cb, erde, temp) {
    const tab = cb.faktoren.temperatur[erde ? 'erde' : 'luft'];
    if (temp == null || !isFinite(temp)) return { f: 1, label: 'Bezug ' + tab.bezug + ' °C', ok: true, t: tab.bezug };
    const hit = stufe(tab.stufen, temp, 'bis');
    if (!hit) return { f: null, ok: false, label: 'über ' + tab.stufen[tab.stufen.length - 1].bis + ' °C nicht tabelliert' };
    return { f: hit.f, ok: true, label: hit.bis + ' °C', t: hit.bis };
  }

  function faktorHaeufung(cb, anordnungId, n) {
    const list = cb.faktoren.haeufung.anordnungen;
    const a = list.find(x => x.id === anordnungId) || list[0];
    const anzahl = Math.max(1, Math.round(n || 1));
    let hit = stufe(a.stufen, anzahl, 'n');
    if (!hit && a.darueber === 'konstant') hit = a.stufen[a.stufen.length - 1];
    if (!hit) return { f: null, ok: false, label: anzahl + ' Stromkreise „' + a.label + '“ nicht tabelliert', anordnung: a };
    return { f: hit.f, ok: true, label: anzahl + (anzahl === 1 ? ' Stromkreis' : ' Stromkreise') + ', ' + a.label.toLowerCase(), anordnung: a, n: anzahl };
  }

  function faktorDaemmung(cb, id) {
    const d = cb.faktoren.daemmung.stufen;
    const hit = d.find(x => x.id === id) || d[0];
    return { f: hit.f, label: hit.label };
  }

  function faktorOS(cb, anteil) {
    const os = cb.faktoren.oberschwingungen;
    const h = anteil > 0 ? anteil : 0;
    const hit = stufe(os.stufen, h, 'bis') || os.stufen[os.stufen.length - 1];
    return { f: hit.f, basis: hit.basis, label: hit.label, h, nFaktor: os.n_faktor };
  }

  /* ─── Die vier Nachweise ─── */

  function nachweisBelastbarkeit(S, e, x) {
    const cb = x.cb;
    const bel = cb.belastbarkeit;
    const idx = bel.querschnitte.indexOf(S);
    const reihe = bel.werte[e.leitung.verlegeart] && bel.werte[e.leitung.verlegeart][String(e.adern)];
    const izTab = idx >= 0 && reihe ? reihe[idx] : null;
    const n = { id: 'belastbarkeit', titel: 'Belastbarkeit und Überlastschutz', quellen: [bel.id, cb.faktoren.temperatur.id, cb.faktoren.haeufung.id].concat(e.schutz.tables), zeilen: [], werte: {} };
    if (izTab == null) {
      n.status = 'fail';
      n.grund = 'kein Tabellenwert für ' + z(S) + ' mm² in ' + e.leitung.verlegeart;
      return n;
    }
    if (!e.fT.ok || !e.fH.ok) {
      n.status = 'fail';
      n.grund = !e.fT.ok ? 'Temperatur ' + e.fT.label : 'Häufung: ' + e.fH.label;
      return n;
    }
    const teile = [`${z(izTab, 1)} A`];
    if (e.fT.f !== 1) teile.push(`${z(e.fT.f)} (Temp. ${e.fT.label})`);
    if (e.fH.f !== 1) teile.push(`${z(e.fH.f)} (Häufung ${e.fH.n})`);
    if (e.fD.f !== 1) { teile.push(`${z(e.fD.f)} (Dämmung)`); n.quellen.push(cb.faktoren.daemmung.id); }
    const fOhneOS = e.fT.f * e.fH.f * e.fD.f;
    const osL = e.fOS && e.fOS.basis === 'L' && e.fOS.f !== 1;
    if (osL) teile.push(`${z(e.fOS.f)} (Oberschw.)`);
    if (e.fOS && (osL || e.fOS.basis === 'N')) n.quellen.push(cb.faktoren.oberschwingungen.id);
    const iz = izTab * fOhneOS * (osL ? e.fOS.f : 1);
    n.zeilen.push(teile.length > 1 ? `Iz = ${teile.join(' · ')} = ${z(iz, 1)} A` : `Iz = ${z(iz, 1)} A (Tabellenwert, keine Abminderung)`);

    const In = e.In;
    const i2 = e.schutz.i2f(In) * In;
    const okIb = e.ib <= In + 1e-9;
    const okIz = In <= iz + 1e-9;
    const okI2 = i2 <= x.ue * iz + 1e-9;
    n.zeilen.push(`Ib ${z(e.ib, 1)} A ≤ In ${z(In, 0)} A ≤ Iz ${z(iz, 1)} A ${okIb && okIz ? '✓' : '✗'}`);
    n.zeilen.push(`I2 = ${z(e.schutz.i2f(In))} · ${z(In, 0)} A = ${z(i2, 1)} A ≤ ${z(x.ue)} · Iz = ${z(x.ue * iz, 1)} A ${okI2 ? '✓' : '✗'}`);
    let okN = true;
    if (e.fOS && e.fOS.basis === 'N') {
      const iN = e.fOS.nFaktor * e.fOS.h / 100 * e.ib;
      const izN = izTab * fOhneOS * e.fOS.f;
      okN = iN <= izN + 1e-9;
      n.zeilen.push(`IN = ${z(e.fOS.nFaktor, 0)} · ${z(e.fOS.h, 0)} % · Ib = ${z(iN, 1)} A ≤ Iz,N = ${z(izN, 1)} A ${okN ? '✓' : '✗'}`);
      n.werte.iN = iN;
    }
    n.werte = Object.assign(n.werte, { izTab, iz, i2, In, ib: e.ib });
    n.soll = `In ≤ Iz, I2 ≤ ${z(x.ue)} · Iz`;
    n.ist = `Iz ${z(iz, 1)} A`;
    if (!okIb) { n.status = 'fail'; n.grund = `In ${z(In, 0)} A < Ib ${z(e.ib, 1)} A`; }
    else if (!okIz) { n.status = 'fail'; n.grund = `Iz ${z(iz, 1)} A < In ${z(In, 0)} A`; }
    else if (!okI2) { n.status = 'fail'; n.grund = `I2 ${z(i2, 1)} A > ${z(x.ue)} · Iz ${z(x.ue * iz, 1)} A`; }
    else if (!okN) { n.status = 'fail'; n.grund = `N-Strom ${z(n.werte.iN, 1)} A > Iz`; }
    else { n.status = 'ok'; n.grund = `Iz ${z(iz, 1)} A ≥ In ${z(In, 0)} A`; }
    return n;
  }

  function nachweisSpannungsfall(S, e, x) {
    const grenze = limitRow(x.limits, 'spannungsfall', e.netz.duGrenze);
    const n = { id: 'spannungsfall', titel: 'Spannungsfall', quellen: ['spannungsfall', x.cb.konstanten.id], zeilen: [], werte: {} };
    if (!(e.leitung.laenge > 0)) { n.status = 'offen'; n.grund = 'Länge fehlt'; return n; }
    const L = e.leitung.laenge;
    const cos = e.cosphi;
    const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const drei = e.verbraucher.phasen === 3;
    const kf = drei ? Math.sqrt(3) : 2;
    const uBez = drei ? x.u : x.u0;
    const du = kf * L * e.ib * (x.rhoB / S * cos + x.x * sin);
    const pct = du / uBez * 100;
    const vor = e.netz.duVor > 0 ? e.netz.duVor : 0;
    const gesamt = pct + vor;
    const kText = drei ? '√3' : '2';
    const klammer = sin > 1e-6
      ? `(${z(x.rhoB, 4)} / ${z(S)} · ${z(cos, 2)} + ${z(x.x * 1000, 2)} mΩ/m · ${z(sin, 2)})`
      : `${z(x.rhoB, 4)} Ω·mm²/m / ${z(S)} mm²`;
    n.zeilen.push(`ΔU = ${kText} · ${z(L, 1)} m · ${z(e.ib, 1)} A · ${klammer} = ${z(du, 2)} V = ${z(pct, 2)} % von ${z(uBez, 0)} V`);
    if (vor) n.zeilen.push(`+ ${z(vor, 2)} % bis zum Verteiler = ${z(gesamt, 2)} %`);
    const max = grenze ? grenze.max : null;
    n.werte = { du, pct, gesamt, max };
    n.soll = max != null ? `≤ ${z(max)} % (${grenze.label})` : '—';
    n.ist = `${z(gesamt, 2)} %`;
    if (max == null) { n.status = 'offen'; n.grund = 'Grenze fehlt'; return n; }
    const ok = gesamt <= max + 1e-9;
    n.status = ok ? 'ok' : 'fail';
    n.grund = `ΔU ${z(gesamt, 2)} % ${ok ? '≤' : '>'} ${z(max)} %`;
    return n;
  }

  /* Abschaltzeit aus der Tabelle der Grenzwerte, Ia an der passenden
   * Stützstelle. Liegt die geforderte Zeit zwischen zwei Stützstellen (TT:
   * 0,2 s und 1 s), gilt die schnellere — das verlangt den höheren Strom und
   * liegt auf der sicheren Seite. */
  function abschaltziel(e, x) {
    const netz = e.netz.form === 'TT' ? 'tt' : 'tn';
    const kreis = e.netz.kreis === 'end' && e.In <= 32 ? 'endstromkreis' : 'verteilung';
    const row = limitRow(x.limits, 'abschaltzeit', netz + '-' + kreis);
    let t = row ? row.max : null;
    let label = row ? row.label : '';
    if (e.netz.rcd) { t = Math.max.apply(null, e.schutz.zeiten); label = 'Kurzschlussschutz, Fehlerschutz über RCD'; }
    const stuetz = e.schutz.zeiten.filter(s => s <= t + 1e-9);
    const tS = stuetz.length ? Math.max.apply(null, stuetz) : Math.min.apply(null, e.schutz.zeiten);
    const ia = e.schutz.ia(e.In, tS);
    return { t, tS, ia, label, rowKey: row ? row.key : null };
  }

  function nachweisAbschaltung(S, e, x) {
    const ziel = e.ziel;
    const n = { id: 'abschaltung', titel: e.netz.rcd ? 'Abschaltbedingung (als Kurzschlussschutz)' : 'Abschaltbedingung', quellen: ['abschaltzeit', x.cb.konstanten.id].concat(e.schutz.tables), zeilen: [], werte: {} };
    if (ziel.ia == null) { n.status = 'fail'; n.grund = 'keine Kennwerte für ' + e.schutz.name(e.In); return n; }
    if (!(e.leitung.laenge > 0)) { n.status = 'offen'; n.grund = 'Länge fehlt'; return n; }
    const L = e.leitung.laenge;
    const zl = 2 * L * x.rho80 / S;
    const zsMax = x.cMin * x.u0 / ziel.ia;
    const zsMess = x.zsMess * x.u0 / ziel.ia;
    n.zeilen.push(`t ≤ ${z(ziel.t, 1)} s (${ziel.label}) → Ia = ${z(ziel.ia, 0)} A (${e.schutz.name(e.In)}${ziel.tS !== ziel.t ? ', Stützstelle ' + z(ziel.tS, 1) + ' s' : ''})`);
    n.zeilen.push(`Z_L = 2 · ${z(L, 1)} m · ${z(x.rho80, 4)} / ${z(S)} mm² = ${z(zl, 3)} Ω`);
    n.zeilen.push(`Zs,max = ${z(x.cMin)} · ${z(x.u0, 0)} V / ${z(ziel.ia, 0)} A = ${z(zsMax, 3)} Ω`);
    n.werte = { zl, zsMax, zsMess, ia: ziel.ia, t: ziel.t };
    n.messung = `Sollwert Messung am Leitungsende: Zs ≤ ${x.zsMessLabel} · ${z(x.u0, 0)} V / ${z(ziel.ia, 0)} A = ${z(zsMess, 2)} Ω`;
    if (e.zv != null) {
      const zs = e.zv + zl;
      const ikMin = x.cMin * x.u0 / zs;
      const lMax = Math.max(0, (zsMax - e.zv) * S / (2 * x.rho80));
      n.zeilen.push(`Ik,min = ${z(x.cMin)} · ${z(x.u0, 0)} V / (${z(e.zv, 3)} + ${z(zl, 3)}) Ω = ${z(ikMin, 1)} A`);
      n.zeilen.push(`L_max = (${z(zsMax, 3)} − ${z(e.zv, 3)}) Ω · ${z(S)} / (2 · ${z(x.rho80, 4)}) = ${z(lMax, 1)} m`);
      Object.assign(n.werte, { zs, ikMin, lMax });
      n.soll = `Zs ≤ ${z(zsMax, 2)} Ω`;
      n.ist = `Zs ${z(zs, 2)} Ω`;
      const ok = ikMin >= ziel.ia - 1e-9;
      n.status = ok ? 'ok' : 'fail';
      n.grund = ok ? `Zs ${z(zs, 2)} Ω ≤ ${z(zsMax, 2)} Ω` : `Leitung länger als L_max ${z(lMax, 0)} m`;
      return n;
    }
    const zvMax = zsMax - zl;
    n.werte.zvMax = zvMax;
    n.soll = `Zs ≤ ${z(zsMax, 2)} Ω`;
    if (zvMax <= 0) {
      n.zeilen.push(`Z_L ${z(zl, 3)} Ω > Zs,max ${z(zsMax, 3)} Ω — die Leitung allein ist schon zu lang`);
      n.status = 'fail';
      n.ist = `Z_L ${z(zl, 2)} Ω`;
      n.grund = `Z_L ${z(zl, 2)} Ω > Zs,max ${z(zsMax, 2)} Ω`;
      return n;
    }
    n.zeilen.push(`Z_V,max = ${z(zsMax, 3)} − ${z(zl, 3)} = ${z(zvMax, 3)} Ω`);
    n.status = 'cond';
    n.ist = 'Vorimpedanz offen';
    n.bedingung = `erfüllt, wenn am Verteiler Zs ≤ ${z(zvMax, 2)} Ω`;
    n.grund = n.bedingung;
    return n;
  }

  function nachweisKurzschluss(S, e, x, ab) {
    const n = { id: 'kurzschluss', titel: 'Kurzschlussfestigkeit', quellen: [x.cb.konstanten.id].concat(e.schutz.tables), zeilen: [], werte: {} };
    const teile = [];
    const faktor3 = e.verbraucher.phasen === 3 ? x.ik3 : 1;
    const icu = e.schutz.icu();
    const k2s2 = x.k * x.k * S * S;
    n.werte.k2s2 = k2s2;

    // (a) Schaltvermögen gegen den größten Kurzschlussstrom am Verteiler.
    let ikMax = null;
    if (e.zv != null) {
      ikMax = x.cMax * x.u0 / e.zv * faktor3;
      const ok = ikMax <= icu;
      n.zeilen.push(`Ik,max = ${z(x.cMax)} · ${z(x.u0, 0)} V / ${z(e.zv, 3)} Ω${faktor3 !== 1 ? ' · ' + z(faktor3, 0) + ' (Drehstrom, obere Abschätzung)' : ''} = ${z(ikMax, 0)} A ${ok ? '≤' : '>'} Schaltvermögen ${z(icu, 0)} A`);
      teile.push({ status: ok ? 'ok' : 'fail', grund: ok ? null : `Ik,max ${z(ikMax, 0)} A > Schaltvermögen ${z(icu, 0)} A` });
      n.werte.ikMax = ikMax;
    } else {
      // Nur als Hinweis, nicht als Bedingung: Ein zu kleines Zs am Verteiler
      // ist die Ausnahme (Trafonähe), und eine zweite Bedingung neben der
      // Abschaltung würde jedes Ergebnis ohne Vorimpedanz verwässern.
      const zvMin = x.cMax * x.u0 * faktor3 / icu;
      n.hinweis = `Schaltvermögen ${z(icu, 0)} A reicht, solange am Verteiler Zs ≥ ${z(x.cMax)} · ${z(x.u0, 0)} V${faktor3 !== 1 ? ' · ' + z(faktor3, 0) : ''} / ${z(icu, 0)} A = ${z(zvMin, 3)} Ω — bei der Prüfung am Verteiler mit ansehen.`;
      n.werte.zvMin = zvMin;
    }

    // (b) Thermisch. Ohne Vorimpedanz ist Ik,min = Ia der ungünstigste noch
    // zulässige Fall: jeder kleinere Strom scheitert schon an der Abschaltung.
    let ikMin = null;
    if (e.zv != null) ikMin = ab.werte.ikMin != null ? ab.werte.ikMin : null;
    else ikMin = e.ziel.ia;
    if (ikMin == null) {
      teile.push({ status: 'offen', grund: 'Länge fehlt' });
    } else {
      n.werte.ikMin = ikMin;
      const zeiten = e.schutz.zeiten; // absteigend: 5, 0,4, 0,1
      const tMin = zeiten[zeiten.length - 1];
      let tb = null;
      for (const t of zeiten) {
        const ia = e.schutz.ia(e.In, t);
        if (ia != null && ia <= ikMin + 1e-9) tb = t;
      }
      n.werte.tb = tb;
      const quelle = e.zv != null ? 'Ik,min' : 'Ik,min = Ia (ohne Vorimpedanz)';
      if (tb == null) {
        n.zeilen.push(`${quelle} ${z(ikMin, 0)} A: Schutzorgan löst nicht innerhalb ${z(zeiten[0], 0)} s aus`);
        teile.push({ status: 'fail', grund: 'löst bei Ik,min nicht aus' });
      } else if (tb > tMin + 1e-9) {
        const tZul = Math.pow(x.k * S / ikMin, 2);
        n.werte.tZul = tZul;
        const ok = tZul >= tb;
        n.zeilen.push(`${quelle} ${z(ikMin, 0)} A → Abschaltung ≤ ${z(tb, 1)} s; zulässig (${z(x.k, 0)} · ${z(S)} / ${z(ikMin, 0)})² = ${z(tZul, 2)} s ${ok ? '≥' : '<'} ${z(tb, 1)} s`);
        teile.push({ status: ok ? 'ok' : 'fail', grund: ok ? null : `thermisch: ${z(tZul, 2)} s < ${z(tb, 1)} s` });
      } else {
        teile.push(durchlassPruefung(S, e, x, n, ikMax, k2s2, tMin));
      }
    }
    n.status = worst(teile.map(t => t.status));
    const schlecht = teile.find(t => t.status === n.status && t.grund);
    n.grund = schlecht ? schlecht.grund : `k²S² ${z(k2s2, 0)} A²s`;
    const bed = teile.filter(t => t.status === 'cond' && t.bedingung).map(t => t.bedingung);
    if (bed.length) n.bedingung = 'erfüllt, wenn ' + bed.join(' und ');
    n.soll = `k²S² ≥ I²t`;
    n.ist = `k²S² ${z(k2s2, 0)} A²s`;
    return n;
  }

  /* Abschaltung im Bereich der schnellsten Stützstelle: dann zählt die
   * Energie, die das Schutzorgan durchlässt, nicht mehr die Zeit. */
  function durchlassPruefung(S, e, x, n, ikMax, k2s2, tMin) {
    const s = e.schutz;
    if (s.art === 'gg') {
      // Bis zur 0,1-s-Grenze kann die Sicherung höchstens Ia(0,1 s)² · 0,1 s
      // durchlassen, darüber begrenzt sie auf ihr Ausschalt-I²t. Der größere
      // Wert deckt beide Bereiche ab.
      const ia01 = s.ia(e.In, tMin);
      const i2t = Math.max(s.i2t(e.In) || 0, ia01 * ia01 * tMin);
      const ok = k2s2 >= i2t;
      n.zeilen.push(`Abschaltung < ${z(tMin, 1)} s: k²S² = ${z(x.k, 0)}² · ${z(S)}² = ${z(k2s2, 0)} A²s ${ok ? '≥' : '<'} I²t ${z(i2t, 0)} A²s`);
      return { status: ok ? 'ok' : 'fail', grund: ok ? null : `k²S² ${z(k2s2, 0)} < I²t ${z(i2t, 0)} A²s` };
    }
    const stufen = s.durchlass(e.In);
    if (!stufen) {
      n.zeilen.push(`Abschaltung < ${z(tMin, 1)} s: k²S² = ${z(k2s2, 0)} A²s — Durchlass-I²t für ${s.name(e.In)} nicht tabelliert`);
      return { status: 'cond', grund: 'Durchlass-I²t vom Hersteller nötig', bedingung: `das Durchlass-I²t laut Hersteller ≤ ${z(k2s2, 0)} A²s ist` };
    }
    // Maßgeblich ist der größte mögliche Kurzschlussstrom: bekannt aus Z_V,
    // sonst begrenzt durch das Schaltvermögen. Zwischen den Stufen die höhere.
    const ikRef = ikMax != null ? ikMax : s.icu();
    const stufe = stufen.find(st => st.ik >= ikRef - 1e-9) || stufen[stufen.length - 1];
    const ok = k2s2 >= stufe.i2t;
    n.zeilen.push(`Abschaltung < ${z(tMin, 1)} s: k²S² = ${z(x.k, 0)}² · ${z(S)}² = ${z(k2s2, 0)} A²s ${ok ? '≥' : '<'} I²t ${z(stufe.i2t, 0)} A²s (bei ${z(stufe.ik, 0)} A)`);
    n.werte.i2t = stufe.i2t;
    if (ok) return { status: 'ok' };
    if (ikMax != null) return { status: 'fail', grund: `k²S² ${z(k2s2, 0)} < I²t ${z(stufe.i2t, 0)} A²s` };
    // Ohne Vorimpedanz: bis zu welchem Kurzschlussstrom reicht der Querschnitt?
    const reicht = stufen.filter(st => st.i2t <= k2s2).pop();
    if (!reicht) return { status: 'fail', grund: `k²S² ${z(k2s2, 0)} < I²t ${z(stufen[0].i2t, 0)} A²s` };
    const zvMin = x.cMax * x.u0 * (e.verbraucher.phasen === 3 ? x.ik3 : 1) / reicht.ik;
    n.zeilen.push(`reicht bis Ik,max ${z(reicht.ik, 0)} A, also Zs am Verteiler ≥ ${z(zvMin, 3)} Ω`);
    return { status: 'cond', grund: `Ik,max ≤ ${z(reicht.ik, 0)} A`, bedingung: `Zs am Verteiler ≥ ${z(zvMin, 3)} Ω (Ik,max ≤ ${z(reicht.ik, 0)} A)` };
  }

  /* ─── Rechnung ─── */

  C.compute = function compute(calcIn, data, worldId) {
    const x = ctxOf(data);
    const cb = x.cb;
    const calc = C.normalize(calcIn, cb, worldId || (calcIn && calcIn.world) || 'efh');
    const v = calc.verbraucher;
    const res = { calc, fehler: [], zeilen: [], hinweise: [], vorschlag: null, bestimmend: [], tabellen: [] };

    const t = typ(cb, calc.leitung.typ);
    const va = verlegeart(cb, calc.leitung.verlegeart);
    if (!t) res.fehler.push('Unbekannter Leitungstyp „' + calc.leitung.typ + '“');
    if (!va) res.fehler.push('Unbekannte Verlegeart „' + calc.leitung.verlegeart + '“');
    if (t && va && !t.verlegearten.includes(va.id)) res.fehler.push(t.label + ' ist für Verlegeart ' + va.id + ' (' + va.kurz + ') nicht vorgesehen.');

    const b = betriebsstrom(v, x);
    if (!b) res.fehler.push(v.modus === 'kw' ? 'Leistung und cos φ eintragen.' : 'Betriebsstrom eintragen.');

    const schutz = schutzorgan(calc.schutz, cb);
    let In = calc.schutz.In;
    if (b && (In == null || !isFinite(In))) {
      In = schutz.reihe.find(r => r >= b.ib - 1e-9);
      if (In == null) res.fehler.push('Kein Nennstrom der Reihe ' + schutz.label + ' deckt Ib ' + z(b.ib, 1) + ' A.');
      res.inVorgeschlagen = true;
    }
    if (In != null && !schutz.reihe.includes(In)) res.fehler.push('Nennstrom ' + z(In, 0) + ' A gibt es für ' + schutz.label + ' in den Daten nicht.');
    if (res.fehler.length) return finish(res, calc, x, null);

    const erde = va.umgebung === 'erde';
    const u = calc.umgebung;
    const drei = v.phasen === 3;
    const e = {
      verbraucher: v,
      leitung: calc.leitung,
      netz: calc.netz,
      schutz,
      In,
      ib: b.ib,
      ibText: b.text,
      cosphi: v.modus === 'kw' || v.cosphi > 0 ? v.cosphi : 1,
      adern: drei ? 3 : 2,
      zv: calc.netz.zv != null && isFinite(calc.netz.zv) && calc.netz.zv > 0 ? calc.netz.zv : null,
      fT: faktorTemperatur(cb, erde, u.temp),
      // In Erde gilt die Erde-Anordnung, auf Wand und Pritsche gibt es dort nicht.
      fH: faktorHaeufung(cb, erde ? 'erde' : (u.anordnung === 'erde' ? 'gebuendelt' : u.anordnung), u.anzahl),
      fD: faktorDaemmung(cb, u.daemmung),
      fOS: drei && v.mitN ? faktorOS(cb, u.os) : null,
    };
    e.ziel = abschaltziel(e, x);
    res.ib = b.ib;
    res.ibText = b.text;
    res.In = In;
    res.e = e;

    const querschnitte = t.querschnitte.filter(S => S >= 1.5 && cb.belastbarkeit.querschnitte.includes(S));
    for (const S of querschnitte) {
      const bel = nachweisBelastbarkeit(S, e, x);
      const du = nachweisSpannungsfall(S, e, x);
      const ab = nachweisAbschaltung(S, e, x);
      const ks = nachweisKurzschluss(S, e, x, ab);
      const nachweise = [bel, du, ab, ks];
      const status = worst(nachweise.map(nw => nw.status));
      const schlecht = nachweise.filter(nw => nw.status === 'fail');
      res.zeilen.push({
        S,
        status,
        nachweise,
        grund: schlecht.length ? schlecht.map(nw => nw.titel.split(' ')[0] + ': ' + nw.grund) : [],
      });
    }

    const idx = res.zeilen.findIndex(r => r.status !== 'fail');
    if (idx >= 0) {
      res.vorschlag = res.zeilen[idx].S;
      if (idx > 0) res.bestimmend = res.zeilen[idx - 1].nachweise.filter(nw => nw.status === 'fail').map(nw => nw.id);
      else res.kleinster = true;
    }
    return finish(res, calc, x, e);
  };

  function finish(res, calc, x, e) {
    const cb = x.cb;
    const gewaehlt = calc.querschnitt != null && res.zeilen.some(r => r.S === calc.querschnitt) ? calc.querschnitt : res.vorschlag;
    res.gewaehlt = gewaehlt;
    res.ergebnis = res.zeilen.find(r => r.S === gewaehlt) || null;
    res.status = res.fehler.length ? 'fail' : res.ergebnis ? res.ergebnis.status : 'fail';

    const t = typ(cb, calc.leitung.typ);
    const facts = {
      world: calc.world,
      typ: calc.leitung.typ,
      familie: t ? t.familie : null,
      verlegeart: calc.leitung.verlegeart,
      phasen: calc.verbraucher.phasen,
      mitN: !!calc.verbraucher.mitN,
      rcd: !!calc.netz.rcd,
      netzform: calc.netz.form,
      ort: calc.umgebung.ort || 'innen',
      vorlage: calc.vorlage,
      schutz: calc.schutz.art,
      zvBekannt: !!(e && e.zv != null),
      osBasis: e && e.fOS ? e.fOS.basis : null,
    };
    res.facts = facts;
    res.hinweise = (cb.hinweise || []).filter(h => matches(h.when, facts));

    const seen = new Set();
    for (const r of res.zeilen) for (const nw of r.nachweise) for (const q of nw.quellen) seen.add(q);
    res.tabellen = Array.from(seen);
    return res;
  }

  /* Alle Prüfstand-Tabellen der Leitungsdaten, für Badge, Selbsttest und
   * Prüfliste — dieselbe Form wie die Grenzwerttabellen (id, title, source,
   * reviewed). */
  C.reviewTables = function reviewTables(cb) {
    const f = cb.faktoren;
    const s = cb.schutzorgane;
    return [cb.konstanten, cb.leitungstypen, cb.verlegearten, cb.belastbarkeit,
      f.temperatur, f.haeufung, f.daemmung, f.oberschwingungen, s.ls, s.ls_durchlass, s.gg].filter(Boolean);
  };

  /* Nachrechnen der handgerechneten Beispiele aus den Daten. Liefert je
   * Abweichung einen Satz; leer heißt: alle Beispiele stimmen. */
  C.checkExamples = function checkExamples(data) {
    const out = [];
    const statusName = { ok: 'ok', cond: 'bedingt', fail: 'fail', offen: 'offen' };
    for (const bsp of data.cables.beispiele || []) {
      const r = C.compute(bsp.calc, data, 'efh');
      const w = bsp.erwartet;
      const tag = 'Beispiel „' + bsp.id + '“';
      if (r.fehler.length) { out.push(tag + ': ' + r.fehler.join(' ')); continue; }
      if (r.vorschlag !== w.querschnitt) out.push(tag + ': Vorschlag ' + r.vorschlag + ' mm², erwartet ' + w.querschnitt + ' mm²');
      if (w.status && statusName[r.status] !== w.status) out.push(tag + ': Status ' + statusName[r.status] + ', erwartet ' + w.status);
      if (w.In != null && r.In !== w.In) out.push(tag + ': In ' + r.In + ' A, erwartet ' + w.In + ' A');
      if (w.bestimmend && w.bestimmend.slice().sort().join(',') !== r.bestimmend.slice().sort().join(',')) {
        out.push(tag + ': bestimmend ' + (r.bestimmend.join(', ') || '—') + ', erwartet ' + w.bestimmend.join(', '));
      }
      for (const soll of w.werte || []) {
        const zeile = r.zeilen.find(zl => zl.S === soll.S);
        const nw = zeile && zeile.nachweise.find(n => n.id === soll.nachweis);
        const ist = nw ? nw.werte[soll.groesse] : null;
        const tol = soll.toleranz != null ? soll.toleranz : Math.max(Math.abs(soll.wert) * 0.002, 0.001);
        if (ist == null || Math.abs(ist - soll.wert) > tol) {
          out.push(tag + ': ' + soll.nachweis + '/' + soll.groesse + ' bei ' + soll.S + ' mm² = ' + (ist == null ? '—' : z(ist, 4)) + ', erwartet ' + z(soll.wert, 4));
        }
      }
    }
    return out;
  };

  P.cable = C;
})(window.Pruefung);
