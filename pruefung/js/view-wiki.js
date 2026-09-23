'use strict';

/* Wissensdatenbank: Messverfahren, Netzformen, Fehlerquellen, Grenzwerte,
 * Begriffe. Standardfilter ist die aktuelle Welt, abschaltbar — im Zweifel
 * will man im Keller auch den Industrie-Eintrag lesen können. */
(function (P) {
  const { el, fold, matches } = P.util;
  const U = P.ui;

  P.views = P.views || {};

  const KINDS = [
    { id: 'messverfahren', label: 'Messverfahren' },
    { id: 'netzform', label: 'Netzformen' },
    { id: 'fehler', label: 'Fehlerquellen' },
    { id: 'grenzwerte', label: 'Grenzwerte' },
    { id: 'begriff', label: 'Begriffe' },
    { id: 'leitungen', label: 'Leitungen' },
  ];

  function highlighted(entry, world) {
    const tags = (world && world.highlightTags) || [];
    return (entry.tags || []).some(t => tags.includes(t));
  }

  P.wiki = {
    search(query, opts) {
      const o = opts || {};
      const world = P.data.world(o.world);
      const needles = fold(query).split(/\s+/).filter(Boolean);
      let list = P.data.wiki.slice();
      if (!o.allWorlds) list = list.filter(entry => matches(entry.when, { world: o.world }));
      if (o.kind) list = list.filter(entry => entry.kind === o.kind);
      if (needles.length) {
        list = list.filter(entry => {
          const hay = fold([entry.title, entry.summary, entry.search, (entry.tags || []).join(' ')].join(' '));
          return needles.every(n => hay.includes(n));
        });
      }
      // Treffer, die zur aktuellen Welt besonders passen, zuerst.
      return list.sort((a, b) => {
        const ha = highlighted(a, world) ? 0 : 1;
        const hb = highlighted(b, world) ? 0 : 1;
        if (ha !== hb) return ha - hb;
        return a.title.localeCompare(b.title, 'de');
      });
    },
  };

  P.views.wiki = function wikiView() {
    if (P.nav.wikiId) {
      const entry = P.data.wikiById.get(P.nav.wikiId);
      if (entry) return detail(entry);
      P.nav.wikiId = null;
    }

    const state = P.store.state;
    const world = P.data.world(state.world);
    const results = P.wiki.search(P.nav.query, { world: state.world, kind: P.nav.kind, allWorlds: P.nav.allWorlds });

    const children = [
      el('input', {
        class: 'input', type: 'search', inputmode: 'search', 'data-fkey': 'wiki-q',
        placeholder: 'Suchen: Riso, RCD, TT, Schleifenimpedanz …',
        'aria-label': 'Wissensdatenbank durchsuchen',
        value: P.nav.query,
        onInput: e => { P.nav.query = e.target.value; P.render(); },
      }),
      el('div', { class: 'chips' }, [
        el('button', {
          class: 'chip' + (P.nav.kind ? '' : ' active'), type: 'button',
          onClick: () => { P.nav.kind = null; P.render(); },
        }, 'Alles'),
        KINDS.map(kind => el('button', {
          class: 'chip' + (P.nav.kind === kind.id ? ' active' : ''), type: 'button',
          onClick: () => { P.nav.kind = P.nav.kind === kind.id ? null : kind.id; P.render(); },
        }, kind.label)),
      ]),
      el('div', { class: 'chips' }, [
        el('button', {
          class: 'chip' + (P.nav.allWorlds ? '' : ' active'), type: 'button',
          onClick: () => { P.nav.allWorlds = !P.nav.allWorlds; P.render(); },
        }, P.nav.allWorlds ? 'Alle Bereiche' : 'Nur ' + (world ? world.short : '')),
        el('div', { class: 'hint-text', style: { alignSelf: 'center' } }, results.length + ' Einträge'),
      ]),
    ];

    if (!results.length) {
      children.push(el('div', { class: 'empty-note' }, 'Nichts gefunden. Andere Schreibweise probieren oder den Filter „Alle Bereiche“ einschalten.'));
    }

    children.push(el('div', { class: 'step-list' }, results.map(entry => el('button', {
      class: 'wiki-card', type: 'button', onClick: () => { P.nav.wikiId = entry.id; P.render(); },
    }, [
      el('div', { class: 't' }, [
        highlighted(entry, world) ? el('span', { class: 'chip', style: { minHeight: 'auto', padding: '.125rem .375rem' } }, [el('span', { class: 'dot' })]) : null,
        el('span', {}, entry.title),
      ]),
      entry.summary ? el('div', { class: 's' }, entry.summary) : null,
    ]))));

    return { view: el('div', { class: 'view' }, children) };
  };

  function detail(entry) {
    const kind = KINDS.find(k => k.id === entry.kind);
    const related = (entry.related || []).map(id => {
      const wikiEntry = P.data.wikiById.get(id);
      if (wikiEntry) return { id, label: wikiEntry.title, kind: 'wiki' };
      for (const pack of P.data.packs) {
        const step = pack.stepById && pack.stepById.get(id);
        if (step) return { id, label: step.title, kind: 'step' };
      }
      return null;
    }).filter(Boolean);

    const children = [
      el('div', { class: 'q-head' }, [
        kind ? U.badge(kind.label, 'accent') : null,
        el('div', { class: 'q-title' }, entry.title),
        entry.summary ? el('div', { class: 'q-help' }, entry.summary) : null,
      ]),
      el('div', { class: 'wiki-body' }, U.blocks(entry.body, { onLink: id => P.openWiki(id) })),
    ];

    if (related.length) {
      children.push(U.sectionHead('Verwandt'));
      children.push(el('div', { class: 'chips' }, related.map(item => el('button', {
        class: 'chip', type: 'button', onClick: () => P.openWiki(item.id),
      }, (item.kind === 'step' ? '⌾ ' : 'ⓘ ') + item.label))));
    }

    const bottom = U.bottomBar([
      el('button', { class: 'btn btn-ghost btn-block', type: 'button', onClick: () => { P.nav.wikiId = null; P.render(); } }, 'Zurück zur Übersicht'),
    ]);

    return { view: el('div', { class: 'view' }, children), bottom };
  }
})(window.Pruefung);
