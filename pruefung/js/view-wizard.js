'use strict';

/* Der Assistent: eine Frage pro Bildschirm, große Antwortkarten, Zurück immer
 * erreichbar. Einfachauswahl schaltet sofort weiter — im Feld zählt jeder
 * gesparte Tipp. Mehrfachauswahl sammelt und braucht ein bewusstes „Weiter“. */
(function (P) {
  const { el } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  function answerCard(opt, checked, multi, onClick) {
    return el('button', {
      class: 'answer' + (checked ? ' checked' : '') + (multi ? ' multi' : ''),
      type: 'button', 'aria-pressed': checked ? 'true' : 'false', onClick,
    }, [
      el('span', { class: 'ind' }, checked ? '✓' : ''),
      el('span', { class: 'txt' }, [
        el('span', { class: 't' }, opt.label),
        opt.sub ? el('span', { class: 's' }, opt.sub) : null,
      ]),
    ]);
  }

  function recap(pack, session) {
    const rows = [];
    for (const entry of session.history) {
      const node = pack.nodeById.get(entry.nodeId);
      if (!node) continue;
      const labels = (entry.optionIds || [])
        .map(id => (node.options || []).find(o => o.id === id))
        .filter(Boolean).map(o => o.label);
      rows.push({ k: node.title, v: labels.length ? labels.join(', ') : 'nichts davon' });
    }
    return rows;
  }

  P.views.wizard = function wizard() {
    const job = P.store.activeJob();
    if (!job) {
      return {
        view: el('div', { class: 'view' }, [
          U.card('Kein Auftrag', [
            el('p', { class: 'w-p' }, 'Lege zuerst eine Prüfung an — dann führt der Assistent durch die Fragen und stellt den Prüfplan zusammen.'),
            el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => P.store.set({ tab: 'auftraege' }) }, 'Zu den Aufträgen'),
          ]),
        ]),
      };
    }
    const pack = P.data.packById.get(job.normId);
    if (!pack) return { view: el('div', { class: 'view' }, [U.card('Norm fehlt', el('p', { class: 'w-p' }, 'Das Norm-Paket „' + job.normId + '“ ist nicht geladen.'))]) };

    const session = job.session;

    if (session.done) return doneView(job, pack, session);

    const node = P.wizard.node(pack, session);
    if (!node) return doneView(job, pack, session);
    if (node.type === 'result') return resultView(job, pack, session, node);

    const prog = P.wizard.progress(pack, session);
    const options = P.wizard.visibleOptions(node, session.facts);
    const multi = !!node.multi;
    if (P.nav.multiNode !== node.id) { P.nav.multiNode = node.id; P.nav.multi = []; }
    const selected = P.nav.multi;

    const answers = options.map(opt => answerCard(opt, multi && selected.includes(opt.id), multi, () => {
      if (!multi) {
        P.store.patchJob(job.id, j => {
          P.wizard.answer(pack, j.session, [opt.id]);
          if (j.session.done) j.plan = null;
        });
        return;
      }
      P.nav.multi = selected.includes(opt.id) ? selected.filter(id => id !== opt.id) : selected.concat([opt.id]);
      P.render();
    }));

    const view = el('div', { class: 'view' }, [
      U.progress(prog.answered, prog.total, 'Frage ' + (prog.answered + 1) + ' von etwa ' + Math.max(prog.total, prog.answered + 1)),
      el('div', { class: 'q-head' }, [
        el('div', { class: 'q-title' }, node.title),
        node.help ? el('div', { class: 'q-help' }, node.help) : null,
        node.hint ? el('div', { class: 'q-hint' }, node.hint) : null,
      ]),
      el('div', { class: 'answers' }, answers),
      node.wiki && node.wiki.length
        ? el('div', { class: 'chips' }, P.data.wikiFor(node.wiki).map(entry =>
            el('button', { class: 'chip', type: 'button', onClick: () => P.openWiki(entry.id) }, 'ⓘ ' + entry.title)))
        : null,
    ]);

    const bottom = U.bottomBar([
      el('button', {
        class: 'btn btn-ghost back', type: 'button', disabled: !P.wizard.canBack(session),
        onClick: () => P.store.patchJob(job.id, j => { P.wizard.back(pack, j.session); j.plan = null; }),
      }, 'Zurück'),
      multi
        ? el('button', {
            class: 'btn btn-primary', type: 'button',
            onClick: () => P.store.patchJob(job.id, j => {
              P.wizard.answer(pack, j.session, P.nav.multi);
              if (j.session.done) j.plan = null;
            }),
          }, selected.length ? 'Weiter mit ' + selected.length + ' Angabe' + (selected.length === 1 ? '' : 'n') : 'Nichts davon')
        : el('div', { class: 'hint-text', style: { flex: '1', alignSelf: 'center', textAlign: 'center' } }, 'Antwort tippen'),
    ]);

    return { view, bottom };
  };

  function resultView(job, pack, session, node) {
    const view = el('div', { class: 'view' }, [
      el('div', { class: 'q-head' }, [
        U.badge(node.kind === 'warnung' ? 'Warnung' : 'Hinweis', node.kind === 'warnung' ? 'mangel' : 'accent'),
        el('div', { class: 'q-title' }, node.title),
      ]),
      el('div', { class: 'wiki-body' }, U.blocks(node.body, { onLink: id => P.openWiki(id) })),
    ]);
    const bottom = U.bottomBar([
      el('button', {
        class: 'btn btn-ghost back', type: 'button', disabled: !P.wizard.canBack(session),
        onClick: () => P.store.patchJob(job.id, j => { P.wizard.back(pack, j.session); j.plan = null; }),
      }, 'Zurück'),
      node.continue
        ? el('button', {
            class: 'btn btn-primary', type: 'button',
            onClick: () => P.store.patchJob(job.id, j => { P.wizard.finish(pack, j.session); j.plan = null; }),
          }, node.continueLabel || 'Weiter zum Prüfplan')
        : el('button', { class: 'btn btn-outline', type: 'button', onClick: () => P.store.set({ tab: 'auftraege' }) }, 'Zur Normauswahl'),
    ]);
    return { view, bottom };
  }

  function doneView(job, pack, session) {
    const entries = P.plan.ensure(job, pack);
    const sum = P.plan.summary(pack, session, entries, job.results);
    const result = session.resultId ? pack.nodeById.get(session.resultId) : null;

    const view = el('div', { class: 'view' }, [
      U.card('Prüfplan steht', [
        el('div', { class: 'q-title' }, entries.length + ' Prüfschritte'),
        el('p', { class: 'w-p' }, 'Die Reihenfolge ist verbindlich, wo es fachlich nötig ist: Schutzleiter vor Isolation, Auslösestrom vor Auslösezeit. Schritte mit offener Vorbedingung sind markiert.'),
        el('button', { class: 'btn btn-primary btn-block', type: 'button', onClick: () => P.store.set({ tab: 'plan' }) },
          sum.done ? 'Weiter im Prüfplan (' + sum.done + '/' + sum.total + ')' : 'Prüfplan öffnen'),
      ]),
      result ? U.card('Hinweis aus dem Assistenten', [
        el('div', { class: 'q-help' }, result.title),
        el('button', { class: 'mini-btn', type: 'button', style: { alignSelf: 'flex-start' }, onClick: () => P.store.patchJob(job.id, j => { j.session.done = false; j.session.cursor = result.id; }) }, 'Hinweis erneut lesen'),
      ]) : null,
      U.sectionHead('Deine Antworten', 'Grundlage des Plans'),
      U.card(null, [el('div', { class: 'w-kv' }, recap(pack, session).map(row =>
        el('div', { class: 'row' }, [el('div', { class: 'k' }, row.k), el('div', { class: 'v' }, row.v)])))]),
    ]);

    const bottom = U.bottomBar([
      el('button', {
        class: 'btn btn-ghost back', type: 'button',
        onClick: () => P.store.patchJob(job.id, j => { P.wizard.back(pack, j.session); j.plan = null; }),
      }, 'Antwort ändern'),
      el('button', {
        class: 'btn btn-outline', type: 'button',
        onClick: () => {
          if (!confirm('Fragen von vorn durchgehen? Der Prüfplan wird neu berechnet, erfasste Messwerte bleiben erhalten.')) return;
          P.store.patchJob(job.id, j => { j.session = P.wizard.start(pack, j.world); j.plan = null; });
        },
      }, 'Von vorn'),
    ]);

    return { view, bottom };
  }
})(window.Pruefung);
