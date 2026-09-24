'use strict';

/* Startbildschirm: laufende Prüfungen, neue Prüfung anlegen, Auftragsdaten.
 *
 * Die Welt (EFH / Industrie) wird beim Anlegen im Auftrag festgehalten. Ein
 * späterer Wechsel im Kopf ändert sie nicht rückwirkend — sonst driften
 * Prüfplan und Antworten auseinander. */
(function (P) {
  const { el, formatDateDE, plural } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  /* Eine Anlagenprüfung trägt das Objekt im Titel, eine Geräteprüfung das
   * Gerät — welches Feld das ist, sagt das Normpaket. */
  function jobTitle(job) {
    return P.data.jobTitle(job);
  }

  function jobMeta(job) {
    const variant = P.data.variant(job.normId, job.variantId);
    const world = P.data.world(job.world);
    const parts = [variant ? variant.norm : job.normId, world ? world.short : null];
    if (job.protocol.datum) parts.push(formatDateDE(job.protocol.datum));
    return parts.filter(Boolean).join(' · ');
  }

  function dueBadge(job) {
    const due = job.interval && job.interval.nextDue;
    if (!due) return null;
    return P.intervals.isOverdue(due)
      ? U.badge('überfällig seit ' + formatDateDE(due), 'mangel')
      : U.badge('fällig ' + formatDateDE(due));
  }

  const hasPerDeviceFields = job => {
    const pack = P.data.packById.get(job.normId);
    return ((pack && pack.protocol && pack.protocol.fields) || []).some(f => f.perDevice);
  };

  function jobStatus(job) {
    const pack = P.data.packById.get(job.normId);
    if (!pack || !job.session.done) return U.badge('Assistent offen');
    const entries = P.plan.build(pack, job.session, job.results);
    const sum = P.plan.summary(pack, job.session, entries, job.results);
    if (sum.mangel) return U.badge(plural(sum.mangel, 'Mangel', 'Mängel'), 'mangel');
    if (sum.open) return U.badge(sum.done + '/' + sum.total + ' erledigt');
    return U.badge('vollständig', 'ok');
  }

  /* Kopfdaten eines Auftrags als Eingabefelder. Hier und im Protokoll
   * dieselben Felder: eingetragen wird, wo man gerade ist — meist erst kurz
   * vor dem Drucken.
   *
   * Beim Tippen wird nicht neu gezeichnet, sondern nur nachgeführt, was davon
   * abhängt (Titel in Kopf und Liste, Pflichtangaben). Ein Neuzeichnen beim
   * Verlassen des Feldes hat den Fokus des nächsten Feldes geschluckt — und
   * zerstört auf dem Handy die Wortvorschläge der Tastatur. */
  P.views.refreshJobMeta = function refreshJobMeta(job, pack) {
    const title = P.data.jobTitle(job);
    document.querySelectorAll('[data-job-title="' + job.id + '"]').forEach(node => { node.textContent = title; });
    const missing = P.data.missingFields(job, pack);
    const ids = new Set(missing.map(f => f.id));
    document.querySelectorAll('[data-missing-for]').forEach(node => node.classList.toggle('missing', ids.has(node.getAttribute('data-missing-for'))));
    const note = document.querySelector('[data-missing-note]');
    if (note) {
      note.hidden = !missing.length;
      note.querySelector('.t').textContent = missingText(job, missing);
    }
  };

  function missingText(job, missing) {
    return 'Pflichtangaben fehlen: ' + missing.map(f => P.data.term(f.termKey, job.world, f.label)).join(', ')
      + '. Unter „Kopfdaten“ eintragen — ohne sie ist der Bogen kein Nachweis.';
  }

  /* Hinweis auf fehlende Pflichtangaben — immer im DOM, nur ausgeblendet,
   * damit refreshJobMeta ihn beim Tippen ein- und ausschalten kann. */
  P.views.missingNote = function missingNote(job, pack) {
    const missing = P.data.missingFields(job, pack);
    return el('div', { class: 'w-warn', 'data-missing-note': '1', hidden: !missing.length }, [
      el('span', { class: 'sym' }, '!'),
      el('div', { class: 't' }, missingText(job, missing)),
    ]);
  };

  P.views.protocolFields = function protocolFields(job, pack) {
    // Felder mit place gehören woanders hin: die Messgeräte und die Erklärung
    // des Prüfers stehen im Bogen am Ende, nicht bei den Kopfdaten.
    const fields = ((pack.protocol && pack.protocol.fields) || []).filter(f => !f.place || f.place === 'messgeraete');
    const groups = (pack.protocol && pack.protocol.groups) || [];
    const missing = new Set(P.data.missingFields(job, pack).map(f => f.id));

    const oneField = field => el('div', { class: 'field' }, [
      el('label', { class: 'field-label' + (missing.has(field.id) ? ' missing' : ''), 'data-missing-for': field.id },
        P.data.term(field.termKey, job.world, field.label) + (field.required ? ' *' : '')),
      // Aus dem Assistenten übernommen — nicht zweimal abfragen.
      field.kind === 'fact'
        ? el('div', { class: 'input', style: { display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' } },
            P.plan.factLabel(pack, job.session, field.factKey) || 'aus dem Assistenten')
        : field.kind === 'date'
          ? el('input', {
              class: 'input', type: 'date', 'data-fkey': 'prot-' + field.id,
              value: job.protocol[field.id] || '',
              onChange: e => { P.store.setProtocolField(job.id, pack, field.id, e.target.value); P.render(); },
            })
          : U.textInput('prot-' + field.id, job.protocol[field.id] || '',
              v => { P.store.setProtocolField(job.id, pack, field.id, v); P.views.refreshJobMeta(job, pack); },
              { placeholder: field.sticky ? 'wird für weitere Prüfungen gemerkt' : '' }),
      field.hint ? el('div', { class: 'hint-text' }, field.hint) : null,
    ]);

    if (!groups.length) return U.card(null, fields.map(oneField), { bodyClass: 'grid-fields' });

    /* Sechzehn Felder am Stück sind eine Wand. Die Gruppen des Datenpakets
     * teilen sie in Auftrag, Anlage, Netz und Prüfung — gezeichnet wird nur,
     * was auch Felder hat. */
    const children = fields.filter(f => !f.gruppe).map(oneField);
    for (const group of groups) {
      const mine = fields.filter(f => f.gruppe === group.id);
      if (!mine.length) continue;
      children.push(el('div', { class: 'field-group' }, group.label));
      children.push(mine.map(oneField));
    }
    return U.card(null, children, { bodyClass: 'grid-fields' });
  };

  P.views.auftraege = function auftraege() {
    const state = P.store.state;
    const world = P.data.world(state.world);
    const children = [];

    const jobs = state.jobs;
    if (jobs.length) {
      children.push(U.sectionHead('Prüfungen', jobs.length + (jobs.length === 1 ? ' Auftrag' : ' Aufträge')));
      children.push(el('div', { class: 'step-list grid-cards' }, jobs.map(job => el('div', {
        class: 'job-card' + (job.id === state.activeJobId ? ' active' : ''),
      }, [
        el('button', { class: 'job-open', type: 'button', onClick: () => P.store.openJob(job.id) }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'name', 'data-job-title': job.id }, jobTitle(job)),
            el('div', { class: 'meta' }, jobMeta(job)),
          ]),
          jobStatus(job),
          el('div', { class: 'chevron' }, '›'),
        ]),
        dueBadge(job) ? el('div', { class: 'chips' }, [dueBadge(job)]) : null,
        el('div', { class: 'job-actions' }, [
          el('button', { class: 'mini-btn', type: 'button', onClick: () => P.store.openJob(job.id) }, 'Öffnen'),
          job.session.done
            ? el('button', { class: 'mini-btn', type: 'button', onClick: () => { P.store.set({ activeJobId: job.id, tab: 'protokoll' }); } }, 'Protokoll')
            : null,
          hasPerDeviceFields(job)
            ? el('button', { class: 'mini-btn', type: 'button', onClick: () => P.store.duplicateJob(job.id) }, 'Nächstes Gerät')
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

    // Die Daten des laufenden Auftrags vor der Normauswahl: sonst liegen sie
    // unter vier Normkarten außerhalb des Bildschirms.
    const job = P.store.activeJob();
    const pack = job ? P.data.packById.get(job.normId) : null;
    if (job && pack) {
      const variant = P.data.variant(job.normId, job.variantId);
      children.push(U.sectionHead('Auftragsdaten', variant ? variant.norm : ''));
      children.push(P.views.protocolFields(job, pack));
    }

    // Eine Karte je Norm, nicht je Datei: 0100-600 und 0105-100 teilen sich ein
    // Paket, treten hier aber als zwei Normen auf.
    children.push(U.sectionHead('Neue Prüfung', world ? world.label : ''));
    children.push(el('div', { class: 'step-list grid-cards' }, P.data.variants().map(({ variant, pack }) => {
      const planned = variant.status !== 'aktiv';
      const fitsWorld = !variant.worlds || variant.worlds.includes(state.world);
      return el('button', {
        class: 'norm-card', type: 'button', disabled: planned || !fitsWorld,
        onClick: planned || !fitsWorld ? null : () => P.store.newJob(pack, variant, state.world),
      }, [
        el('div', { class: 'info' }, [
          el('div', { class: 'norm' }, variant.norm),
          el('div', { class: 'sub' }, planned ? variant.plannedNote || variant.title : variant.title),
        ]),
        planned ? U.badge('geplant') : U.badge('starten', 'accent'),
      ]);
    })));

    children.push(el('div', { class: 'footnote' }, [
      P.data.registry.disclaimer,
      el('div', { style: { marginTop: '.5rem' } }, 'Datenstand ' + P.data.registry.datenstand),
    ]));

    return { view: el('div', { class: 'view' }, children) };
  };
})(window.Pruefung);
