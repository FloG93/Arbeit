'use strict';

/* Prüffristen aus data/prueffristen.json.
 *
 * Die App legt keine Frist fest — das tut der Betreiber aus der
 * Gefährdungsbeurteilung. Sie rechnet nur das Fälligkeitsdatum aus dem
 * gewählten Richtwert aus und hält es fest, damit die nächste Prüfung nicht
 * an einem Zettel im Schaltschrank hängt. */
(function (P) {
  const I = {};

  I.presets = () => (P.data.intervals && P.data.intervals.presets) || [];

  I.presetsFor = function presetsFor(worldId, scope) {
    return I.presets().filter(preset => {
      if (scope && preset.scope !== scope) return false;
      if (preset.worlds && worldId && !preset.worlds.includes(worldId)) return false;
      return true;
    });
  };

  I.byId = id => I.presets().find(preset => preset.id === id) || null;

  /* Monate addieren und den Tag klemmen: der 31.03. plus 1 Monat ist der
   * 30.04., nicht der 01.05. */
  I.computeDue = function computeDue(startISO, months) {
    if (!startISO || !months) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startISO);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1 + Number(months);
    const day = Number(m[3]);
    const target = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    const p = n => String(n).padStart(2, '0');
    return `${target.getUTCFullYear()}-${p(target.getUTCMonth() + 1)}-${p(target.getUTCDate())}`;
  };

  I.label = function label(months) {
    if (!months) return '';
    if (months >= 12 && months % 12 === 0) return (months / 12) + (months === 12 ? ' Jahr' : ' Jahre');
    return months + ' Monate';
  };

  I.isOverdue = dueISO => !!dueISO && dueISO < P.util.todayISO();

  P.intervals = I;
})(window.Pruefung);
