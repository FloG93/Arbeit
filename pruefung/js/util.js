'use strict';

/* Prüfassistent — gemeinsame Helfer.
 *
 * el(), parseNum()/inputNum() und captureFocus()/restoreFocus() sind aus dem
 * Raumrechner übernommen (app/app.js): dieselbe Render-Strategie (Voll-
 * Re-Render, Fokus per data-fkey retten) und dieselbe Komma-Behandlung bei
 * Zahlenfeldern, weil ein type="number" auf deutschen Tastaturen das Komma
 * verschluckt. */
window.Pruefung = window.Pruefung || {};

(function (P) {
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

  const nf = (v, d = 2) => (isFinite(v) ? v : 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* Messwerte spannen mehrere Größenordnungen (0,03 mA bis 1666 Ω), deshalb
   * keine feste Nachkommastelle: so wird aus 1666 nicht "1.666,00". */
  function num(v) {
    if (v == null || !isFinite(v)) return '—';
    const abs = Math.abs(v);
    const d = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
    let s = nf(v, d);
    // Nachkommanullen weg, ohne 300 zu 3 zu machen: nur hinter dem Komma.
    if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  }

  const inputNum = v => (v == null || !isFinite(v) ? '' : String(Math.round(v * 1000) / 1000).replace('.', ','));

  function parseNum(raw, fallback) {
    let t = String(raw).trim().replace(/\s/g, '');
    if (!t) return fallback;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    const v = parseFloat(t);
    return isFinite(v) ? v : fallback;
  }

  /* Der eine Bedingungsmechanismus der ganzen App: Fragen, Antwortoptionen,
   * Prüfschritte, Checklistenpunkte und Wiki-Einträge benutzen alle dieses
   * when — auch der Zwei-Welten-Modus, der beim Laden zu when.world wird. */
  function matches(when, facts) {
    if (!when) return true;
    for (const [k, v] of Object.entries(when)) {
      const have = facts ? facts[k] : undefined;
      if (Array.isArray(v)) { if (!v.includes(have)) return false; }
      else if (have !== v) return false;
    }
    return true;
  }

  const byId = (arr, key = 'id') => {
    const map = new Map();
    for (const item of arr || []) map.set(item[key], item);
    return map;
  };

  /* Suche ohne Umlaut- und Großschreibungsfalle: "prufung" findet "Prüfung". */
  function fold(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  const todayISO = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  function formatDateDE(iso) {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  }

  function captureFocus() {
    const a = document.activeElement;
    if (!a || !a.getAttribute) return null;
    const key = a.getAttribute('data-fkey');
    if (!key) return null;
    let start = null, end = null;
    try { start = a.selectionStart; end = a.selectionEnd; } catch { /* kein Textfeld */ }
    return { key, start, end };
  }

  function restoreFocus(mark) {
    if (!mark) return;
    const node = document.querySelector('[data-fkey="' + mark.key + '"]');
    if (!node) return;
    node.focus();
    if (mark.start != null) {
      try { node.setSelectionRange(mark.start, mark.end); } catch { /* kein Textfeld */ }
    }
  }

  P.util = { el, nf, num, inputNum, parseNum, matches, byId, fold, todayISO, formatDateDE, captureFocus, restoreFocus };
})(window.Pruefung);
