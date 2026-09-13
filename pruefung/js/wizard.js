'use strict';

/* Der Prüfungs-Wizard — Entscheidungsbaum-Engine.
 *
 * Zwei Entscheidungen tragen das Ganze:
 *
 * 1. Antworten setzen Fakten (set: {anlagenart: "ortsfest"}), keine
 *    Knoten-IDs. Der Baum darf umgebaut werden, ohne dass gespeicherte
 *    Aufträge oder when-Bedingungen brechen.
 * 2. Zurück ist ein Replay der Antwort-Historie von vorn, keine
 *    Rückgängig-Logik. Das schließt die ganze Fehlerklasse aus, in der ein
 *    Fakt hängen bleibt, obwohl die Antwort widerrufen wurde. Bei zehn
 *    Fragen kostet das nichts. */
(function (P) {
  const { matches } = P.util;

  const W = {};

  W.visibleOptions = (node, facts) => (node && node.options ? node.options : []).filter(o => matches(o.when, facts));

  /* Läuft über Fragen hinweg, die in diesem Kontext nichts zu fragen haben:
   * passt das when nicht, oder ist in der aktuellen Welt keine einzige Option
   * sichtbar, geht es per defaultNext weiter. So kann kein Leerbildschirm
   * entstehen, wenn eine Frage nur Industrie-Optionen hat. */
  function resolveCursor(pack, id, facts) {
    let guard = 0;
    while (id && guard++ < 200) {
      const node = pack.nodeById.get(id);
      if (!node) {
        console.warn('[Prüfassistent] Knoten fehlt:', id, 'in', pack.id);
        return null;
      }
      if (node.type === 'result') return node.id;
      if (matches(node.when, facts) && W.visibleOptions(node, facts).length) return node.id;
      id = node.defaultNext || null;
    }
    return null;
  }
  W.resolveCursor = resolveCursor;

  W.start = function start(pack, world) {
    const facts = { world: world };
    return {
      cursor: resolveCursor(pack, pack.entry, facts),
      facts,
      history: [],
      extraSteps: [],
      tags: [],
      done: false,
      resultId: null,
    };
  };

  W.node = (pack, session) => (session && session.cursor ? pack.nodeById.get(session.cursor) || null : null);

  function applyOptions(session, options) {
    for (const opt of options) {
      Object.assign(session.facts, opt.set || {});
      for (const id of opt.addSteps || []) if (!session.extraSteps.includes(id)) session.extraSteps.push(id);
      for (const tag of opt.addTags || []) if (!session.tags.includes(tag)) session.tags.push(tag);
    }
  }

  W.answer = function answer(pack, session, optionIds) {
    const node = W.node(pack, session);
    if (!node || node.type === 'result') return session;
    const chosen = (optionIds || [])
      .map(id => (node.options || []).find(o => o.id === id))
      .filter(Boolean);
    // Einfachauswahl braucht eine Antwort; Mehrfachauswahl darf leer bleiben
    // ("nichts davon verbaut") — das ist selbst eine Aussage.
    if (!chosen.length && !node.multi) return session;

    applyOptions(session, chosen);
    session.history.push({ nodeId: node.id, optionIds: chosen.map(o => o.id) });

    // Bei Mehrfachauswahl gewinnt das erste next einer gewählten Option — so
    // springt "EX-Bereich" auf seinen Hinweis, ohne dass die anderen Häkchen
    // verloren gehen.
    let next = null;
    for (const opt of chosen) if (opt.next) { next = opt.next; break; }
    if (!next) next = node.defaultNext || null;

    session.cursor = next ? resolveCursor(pack, next, session.facts) : null;
    const landed = W.node(pack, session);
    session.resultId = landed && landed.type === 'result' ? landed.id : null;
    session.done = !session.cursor;
    return session;
  };

  function replayFrom(pack, session, history) {
    const world = session.facts.world;
    session.facts = { world };
    session.extraSteps = [];
    session.tags = [];
    session.history = [];
    session.done = false;
    session.resultId = null;
    session.cursor = resolveCursor(pack, pack.entry, session.facts);
    for (const entry of history) {
      session.cursor = entry.nodeId;
      W.answer(pack, session, entry.optionIds);
    }
    return session;
  }

  W.replay = (pack, session) => replayFrom(pack, session, session.history.slice());

  W.canBack = session => !!(session && session.history.length);

  W.back = function back(pack, session) {
    if (!W.canBack(session)) return session;
    return replayFrom(pack, session, session.history.slice(0, -1));
  };

  /* Ein Hinweis-Knoten mit continue lässt den Prüfplan trotzdem bauen — der
   * EX-Hinweis darf die restliche Prüfung nicht blockieren. */
  W.finish = function finish(pack, session) {
    const node = W.node(pack, session);
    session.resultId = node ? node.id : session.resultId;
    session.cursor = null;
    session.done = true;
    return session;
  };

  /* Fortschritt ist geschätzt, nicht gezählt: der Baum verzweigt, also läuft
   * die Schätzung den wahrscheinlichsten Pfad ab dem aktuellen Knoten ab. */
  W.progress = function progress(pack, session) {
    const answered = session.history.length;
    let remaining = 0;
    let id = session.cursor;
    const seen = new Set();
    while (id && !seen.has(id) && remaining < 20) {
      seen.add(id);
      const node = pack.nodeById.get(id);
      if (!node || node.type === 'result') break;
      remaining++;
      const opts = W.visibleOptions(node, session.facts);
      id = node.defaultNext || (opts.length && opts[0].next) || null;
    }
    return { answered, total: answered + remaining };
  };

  P.wizard = W;
})(window.Pruefung);
