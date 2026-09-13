'use strict';

/* Startbildschirm: laufende Prüfungen, neue Prüfung anlegen, Auftragsdaten.
 *
 * Die Welt (EFH / Industrie) wird beim Anlegen im Auftrag festgehalten. Ein
 * späterer Wechsel im Kopf ändert sie nicht rückwirkend — sonst driften
 * Prüfplan und Antworten auseinander. */
(function (P) {
  const { el, formatDateDE } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  function jobTitle(job) {
    return job.protocol.objekt || 'Prüfung ohne Objekt';
  }

  function jobMeta(job) {
    const pack = P.data.packById.get(job.normId);
    const world = P.data.world(job.world);
    const parts = [pack ? pack.norm : job.normId, world ? world.short : null];
    if (job.protocol.datum) parts.push(formatDateDE(job.protocol.datum));
    return parts.filter(Boolean).join(' · ');
  }

  function jobStatus(job) {
    const pack = P.data.packById.get(job.normId);
    if (!pack || !job.session.done) return U.badge('Assistent offen');
    const entries = P.plan.build(pack, job.session, job.results);
    const sum = P.plan.summary(pack, job.session, entries, job.results);
    if (sum.mangel) return U.badge(sum.mangel + ' Mangel', 'mangel');
    if (sum.open) return U.badge(sum.done + '/' + sum.total + ' erledigt');
    return U.badge('vollständig', 'ok');
  }

  P.views.auftraege = function auftraege() {
    const state = P.store.state;
    const world = P.data.world(state.world);
    const children = [];

    const jobs = state.jobs;
    if (jobs.length) {
      children.push(U.sectionHead('Prüfungen', jobs.length + (jobs.length === 1 ? ' Auftrag' : ' Aufträge')));
      children.push(el('div', { class: 'step-list' }, jobs.map(job => el('div', {
        class: 'job-card' + (job.id === state.activeJobId ? ' active' : ''),
      }, [
        el('button', { class: 'job-open', type: 'button', onClick: () => P.store.openJob(job.id) }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, jobTitle(job)),
            el('div', { class: 'meta' }, jobMeta(job)),
          ]),
          jobStatus(job),
          el('div', { class: 'chevron' }, '›'),
        ]),
        el('div', { class: 'job-actions' }, [
          el('button', { class: 'mini-btn', type: 'button', onClick: () => P.store.openJob(job.id) }, 'Öffnen'),
          job.session.done
            ? el('button', { class: 'mini-btn', type: 'button', onClick: () => { P.store.set({ activeJobId: job.id, tab: 'protokoll' }); } }, 'Protokoll')
            : null,
          el('button', {
            class: 'mini-btn', type: 'button',
            onClick: () => {
              if (confirm('Prüfung „' + jobTitle(job) + '“ mit allen Messwerten löschen?')) P.store.removeJob(job.id);
            },
          }, 'Löschen'),
        ]),
      ]))));
    }

    children.push(U.sectionHead('Neue Prüfung', world ? world.label : ''));
    children.push(el('div', { class: 'step-list' }, P.data.packs.map(pack => {
      const planned = pack.status !== 'aktiv';
      const fitsWorld = !pack.worlds || pack.worlds.includes(state.world);
      return el('button', {
        class: 'norm-card', type: 'button', disabled: planned || !fitsWorld,
        onClick: planned || !fitsWorld ? null : () => P.store.newJob(pack, state.world),
      }, [
        el('div', { class: 'info' }, [
          el('div', { class: 'norm' }, pack.norm),
          el('div', { class: 'sub' }, planned ? pack.plannedNote || pack.title : pack.title),
        ]),
        planned ? U.badge('geplant') : U.badge('starten', 'accent'),
      ]);
    })));

    const job = P.store.activeJob();
    const pack = job ? P.data.packById.get(job.normId) : null;
    if (job && pack) {
      const fields = (pack.protocol && pack.protocol.fields) || [];
      children.push(U.sectionHead('Auftragsdaten', pack.norm));
      children.push(U.card(null, fields.map(field => el('div', { class: 'field' }, [
        el('label', { class: 'field-label' }, P.data.term(field.termKey, job.world, field.label) + (field.required ? ' *' : '')),
        field.kind === 'date'
          ? el('input', {
              class: 'input', type: 'date', 'data-fkey': 'prot-' + field.id,
              value: job.protocol[field.id] || '',
              onChange: e => P.store.setProtocolField(job.id, pack, field.id, e.target.value),
            })
          : U.textInput('prot-' + field.id, job.protocol[field.id] || '',
              v => P.store.setProtocolField(job.id, pack, field.id, v),
              { placeholder: field.sticky ? 'wird für weitere Prüfungen gemerkt' : '' }),
      ]))));
    }

    children.push(el('div', { class: 'footnote' }, [
      P.data.registry.disclaimer,
      el('div', { style: { marginTop: '.5rem' } }, 'Datenstand ' + P.data.registry.datenstand),
    ]));

    return { view: el('div', { class: 'view' }, children) };
  };
})(window.Pruefung);
