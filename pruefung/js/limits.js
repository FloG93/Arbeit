'use strict';

/* Grenzwerte auflösen und bewerten.
 *
 * Ein Grenzwert steht genau einmal im Repo — in data/grenzwerte.json. Schritte
 * verweisen mit limitRef auf die Tabelle und über limitKeyFrom auf die Zeile,
 * die zu den Antworten des Wizards passt. Das Wiki rendert dieselben Tabellen
 * aus derselben Quelle, damit keine zweite Wahrheit entsteht. */
(function (P) {
  const { num } = P.util;

  const L = {};

  L.table = id => P.data.limitTableById.get(id) || null;

  /* Prüfstand der Grenzwerte, die in diesem Auftrag tatsächlich verwendet
   * wurden — nicht der aller Tabellen: was nicht gemessen wurde, muss auch
   * nicht gegengeprüft sein, damit das Protokoll sauber ist. */
  L.reviewStatus = function reviewStatus(tableIds) {
    const seen = new Set((tableIds || []).filter(Boolean));
    const tables = Array.from(seen).map(L.table).filter(Boolean);
    const offen = tables.filter(t => !(t.reviewed && t.reviewed.date));
    const geprueft = tables.filter(t => t.reviewed && t.reviewed.date);
    const editions = Array.from(new Set(geprueft.map(t => t.reviewed.edition).filter(Boolean)));
    const pruefer = Array.from(new Set(geprueft.map(t => t.reviewed.by).filter(Boolean)));
    const datum = geprueft.map(t => t.reviewed.date).sort().pop() || null;
    return { gesamt: tables.length, offen: offen.length, geprueft: geprueft.length, editions, pruefer, datum };
  };
  L.formula = id => P.data.formulaById.get(id) || null;

  function rowFor(table, key) {
    if (!table || !table.rows || !table.rows.length) return null;
    if (key) {
      const hit = table.rows.find(r => r.key === key);
      if (hit) return hit;
    }
    return table.rows.find(r => r.default) || table.rows[0];
  }

  /* opts.limitKey setzt die Zeile direkt, opts.keyFrom nennt den Fakt, der sie
   * bestimmt, opts.keySuffix hängt an den gefundenen Schlüssel an — damit ein
   * einzelnes Eingabefeld (5 × IΔn) eine eigene Zeile derselben Tabelle
   * treffen kann, ohne dass es ein zweiter Prüfschritt sein muss. */
  L.resolve = function resolve(limitRef, facts, opts) {
    const o = opts || {};
    const table = L.table(limitRef);
    if (!table) return null;
    let key = o.limitKey;
    if (key == null && o.keyFrom) key = facts ? facts[o.keyFrom] : null;
    if (key != null && o.keySuffix) key = String(key) + o.keySuffix;
    const row = rowFor(table, key);
    if (!row) return null;
    return {
      tableId: table.id,
      title: table.title,
      source: row.source || table.source,
      rowKey: row.key,
      label: row.label,
      min: row.min == null ? null : row.min,
      max: row.max == null ? null : row.max,
      unit: row.unit || null,
      note: row.note || null,
      warnBand: row.warnBand == null ? 0.1 : row.warnBand,
    };
  };

  /* Grenzwert eines Schrittes, wie er im Prüfplan angezeigt wird. */
  L.forStep = function forStep(step, facts) {
    if (!step || !step.limitRef) return null;
    return L.resolve(step.limitRef, facts, { limitKey: step.limitKey, keyFrom: step.limitKeyFrom });
  };

  /* Grenzwert, der kein Tabellenwert ist, sondern ein zweites Feld desselben
   * Schrittes: bei der Schleifenimpedanz hängt Zs,max an der Schutzeinrichtung
   * und steht erst nach dem Blick auf die Kennlinie fest. limitFromInput nennt
   * das Feld, limitBound die Richtung (Standard: Obergrenze). */
  L.fromInput = function fromInput(step, input, values) {
    const refId = input.limitFromInput;
    const ref = ((step.measure && step.measure.inputs) || []).find(i => i.id === refId);
    const v = values ? values[refId] : null;
    if (v == null || !isFinite(v)) return null;
    const bound = input.limitBound === 'min' ? 'min' : 'max';
    return {
      tableId: null,
      title: null,
      source: null,
      rowKey: null,
      label: ref ? ref.label : refId,
      min: bound === 'min' ? v : null,
      max: bound === 'max' ? v : null,
      unit: input.unit || (ref && ref.unit) || null,
      note: null,
      warnBand: 0.1,
      fromInput: refId,
    };
  };

  /* Grenzwert eines einzelnen Eingabefeldes — erbt den des Schrittes, kann ihn
   * aber über limitKey oder limitKeySuffix verschieben. */
  L.forInput = function forInput(step, input, facts, values) {
    if (input && input.limitFromInput) return L.fromInput(step, input, values);
    if (!step || !step.limitRef) return null;
    return L.resolve(step.limitRef, facts, {
      limitKey: input.limitKey || step.limitKey,
      keyFrom: input.limitKey ? null : step.limitKeyFrom,
      keySuffix: input.limitKeySuffix,
    });
  };

  L.format = function format(limit) {
    if (!limit) return '';
    const unit = limit.unit ? ' ' + limit.unit : '';
    if (limit.min != null && limit.max != null) return `${num(limit.min)} – ${num(limit.max)}${unit}`;
    if (limit.min != null) return `≥ ${num(limit.min)}${unit}`;
    if (limit.max != null) return `≤ ${num(limit.max)}${unit}`;
    return '';
  };

  L.formatRow = function formatRow(row) {
    return L.format({ min: row.min == null ? null : row.min, max: row.max == null ? null : row.max, unit: row.unit });
  };

  /* 'grenzwertig' ist kein Normbegriff, sondern eine Warnung fürs Feld: der
   * Wert hält den Grenzwert, liegt aber im letzten Zehntel davor. Genau dort
   * lohnt der zweite Blick, bevor die Anlage übergeben wird. */
  L.evaluate = function evaluate(value, limit, opts) {
    const o = opts || {};
    if (limit == null) return 'unbekannt';
    if (o.overrange) {
      // "> 300 MΩ": erfüllt eine Mindestforderung immer, eine Obergrenze nie.
      if (limit.max == null && limit.min != null) return 'ok';
      if (limit.max != null) return 'mangel';
    }
    if (value == null || !isFinite(value)) return 'unbekannt';
    if (limit.min != null && value < limit.min) return 'mangel';
    if (limit.max != null && value > limit.max) return 'mangel';
    const band = limit.warnBand == null ? 0.1 : limit.warnBand;
    if (limit.min != null && value < limit.min * (1 + band)) return 'grenzwertig';
    if (limit.max != null && value > limit.max * (1 - band)) return 'grenzwertig';
    return 'ok';
  };

  P.limits = L;
})(window.Pruefung);
