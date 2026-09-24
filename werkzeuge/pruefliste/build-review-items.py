#!/usr/bin/env python3
"""Erzeugt die Prüfliste „Grenzwert-Abgleich“ aus den Datendateien der App.

Liest pruefung/data/grenzwerte.json, prueffristen.json und leitungen.json und schreibt nach
werkzeuge/pruefliste/out/ die Item-Liste (review-items.json) und die fertige
Seite (grenzwert-abgleich.html = abgleich-template.html + Daten). Die Seite
wird als Artifact mit capabilities {db: {}} veröffentlicht; die Item-IDs
(tabelle__zeile) sind die Schlüssel der Eintragungen und dürfen sich nicht
ändern, sonst verlieren Betatester ihre bisherigen Häkchen.
"""
import json, io, os

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, '..', '..', 'pruefung', 'data')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
g = json.load(io.open(os.path.join(BASE, 'grenzwerte.json'), encoding='utf-8'))
f = json.load(io.open(os.path.join(BASE, 'prueffristen.json'), encoding='utf-8'))
lt = json.load(io.open(os.path.join(BASE, 'leitungen.json'), encoding='utf-8'))

GROUPS = [
    {'id': 'a', 'norm': 'DIN VDE 0100-600 und 0100-410',
     'sub': 'Erstprüfung ortsfester Anlagen, Schutz durch automatische Abschaltung'},
    {'id': 'b', 'norm': 'DIN VDE 0100-520',
     'sub': 'Auswahl und Errichtung von Kabeln und Leitungen — Spannungsfall'},
    {'id': 'c', 'norm': 'DIN VDE 0105-100',
     'sub': 'Betrieb elektrischer Anlagen, Wiederholungsprüfung'},
    {'id': 'd', 'norm': 'DIN EN 50678 und 50699',
     'sub': 'Ortsveränderliche Betriebsmittel, früher DIN VDE 0701-0702'},
    {'id': 'e', 'norm': 'DGUV Vorschrift 3 und TRBS 1201',
     'sub': 'Prüffristen als Richtwerte'},
    {'id': 'f', 'norm': 'Ohne Normfundstelle',
     'sub': 'Rechenwege — hier ist nur zu bestätigen, dass die App richtig rechnet'},
    # Leitungsberechnung: neue Gruppen hinten anhängen, damit die bisherigen
    # Gruppen-IDs und ihre meta-Einträge unverändert bleiben.
    {'id': 'g', 'norm': 'DIN VDE 0298-4',
     'sub': 'Leitungsberechnung — Belastbarkeit, Umrechnungsfaktoren, Leitungstypen'},
    {'id': 'h', 'norm': 'DIN EN 60898-1 und DIN VDE 0636 / IEC 60269',
     'sub': 'Leitungsberechnung — Kennwerte von LS-Schaltern und gG-Sicherungen'},
    {'id': 'i', 'norm': 'DIN VDE 0100-520 Bbl. 2, 0100-430, DIN EN 60909-0',
     'sub': 'Leitungsberechnung — Rechenkonstanten'},
]

TABLE_GROUP = {
    'iso-nach-nennspannung': 'a', 'rcd-ausloesezeit': 'a', 'rcd-ausloesestrom': 'a',
    'rcd-ausloesestrom-abs': 'a', 'abschaltzeit': 'a', 'schutzleiter-durchgang': 'a',
    'erdungswiderstand-tt': 'a', 'beruehrungsspannung': 'a',
    'spannungsfall': 'b', 'anlage-differenzstrom': 'c',
    'geraet-schutzleiterwiderstand': 'd', 'geraet-iso': 'd',
    'geraet-schutzleiterstrom': 'd', 'geraet-beruehrungsstrom': 'd',
}
FORMULA_GROUP = {'zs-max': 'a', 'ra-max': 'a', 'ipe-heizgeraet': 'd', 'rpe-leitung': 'd', 'r-leiter': 'f',
                 'leitung-ueberlast': 'f', 'leitung-spannungsfall': 'f', 'leitung-abschaltung': 'f', 'leitung-kurzschluss': 'f'}


def de(v):
    """Zahl in deutscher Schreibweise, ohne Nachkommanullen."""
    if isinstance(v, float) and v == int(v):
        v = int(v)
    s = f'{v:,.3f}'.rstrip('0').rstrip('.') if isinstance(v, float) else f'{v:,}'
    return s.replace(',', ' ').replace('.', ',')


def limit_text(row):
    unit = ' ' + row['unit'] if row.get('unit') else ''
    lo, hi = row.get('min'), row.get('max')
    if lo is not None and hi is not None:
        return f'{de(lo)} bis {de(hi)}{unit}'
    if lo is not None:
        return f'mindestens {de(lo)}{unit}'
    if hi is not None:
        return f'höchstens {de(hi)}{unit}'
    return '—'


items = []
for t in g['tables']:
    grp = TABLE_GROUP.get(t['id'], 'a')
    cols = {c['id']: c for c in (t.get('columns') or [])}
    for row in t['rows']:
        extra = []
        for cid, col in cols.items():
            if cid in ('label', 'min', 'max') or cid not in row:
                continue
            extra.append(f"{col['label']} {de(row[cid])}{' ' + col['unit'] if col.get('unit') else ''}")
        claim = f"{row['label']}: {limit_text(row)}"
        if extra:
            claim += ' (' + ', '.join(extra) + ')'
        items.append({
            'id': f"{t['id']}__{row['key']}",
            'group': grp,
            'kind': 'Grenzwert',
            'topic': t['title'],
            'claim': claim,
            'addr': f"{t['id']} / {row['key']}",
            'source': row.get('source') or t.get('source') or '',
            'note': row.get('note', ''),
        })

for form in g.get('formulas', []):
    items.append({
        'id': f"formel__{form['id']}",
        'group': FORMULA_GROUP.get(form['id'], 'f'),
        'kind': 'Rechenweg',
        'topic': form['label'],
        'claim': form['expr'],
        'addr': f"formulas / {form['id']}",
        'source': '',
        'note': form.get('note', ''),
    })

for preset in f['presets']:
    months = preset['intervalMonths']
    dauer = f'{months // 12} Jahre' if months >= 24 and months % 12 == 0 else f'{months} Monate'
    items.append({
        'id': f"frist__{preset['id']}",
        'group': 'e',
        'kind': 'Prüffrist',
        'topic': 'Prüffrist ' + ('Gerät' if preset['scope'] == 'geraet' else 'Anlage'),
        'claim': f"{preset['label']}: alle {dauer}",
        'addr': f"prueffristen / {preset['id']}",
        'source': preset.get('basis', ''),
        'note': '',
    })

# ── Leitungsberechnung (leitungen.json) ───────────────────────────────────
# Je Tabellenzeile oder Kennlinie ein Item; die ID ist tabelle__schlüssel
# wie bei den Grenzwerten, damit reviewed-Blöcke sich zuordnen lassen.
def add(tab, key, group, topic, claim, note='', source=None):
    items.append({
        'id': f"{tab['id']}__{key}",
        'group': group,
        'kind': 'Leitungsdaten',
        'topic': topic,
        'claim': claim,
        'addr': f"{tab['id']} / {key}",
        'source': source if source is not None else tab.get('source', ''),
        'note': note,
    })

bel = lt['belastbarkeit']
for art, spalten in bel['werte'].items():
    for adern, werte in spalten.items():
        reihe = ' · '.join(f'{de(q)} mm² → {de(v)} A' for q, v in zip(bel['querschnitte'], werte))
        add(bel, f'{art}-{adern}', 'g', bel['title'], f'Verlegeart {art}, {adern} belastete Adern: {reihe}', bel.get('note', ''))
tf = lt['faktoren']['temperatur']
for medium in ('luft', 'erde'):
    stufen = ' · '.join(f"bis {de(x['bis'])} °C → {de(x['f'])}" for x in tf[medium]['stufen'])
    add(tf, medium, 'g', tf['title'], f"{'Luft' if medium == 'luft' else 'Erde'}, Bezug {tf[medium]['bezug']} °C: {stufen}", tf.get('note', ''))
hf = lt['faktoren']['haeufung']
for a in hf['anordnungen']:
    stufen = ' · '.join(f"{x['n']} → {de(x['f'])}" for x in a['stufen'])
    add(hf, a['id'], 'g', hf['title'], f"{a['label']}: {stufen}" + (' (darüber gleichbleibend)' if a['darueber'] == 'konstant' else ''), hf.get('note', ''))
df = lt['faktoren']['daemmung']
add(df, 'stufen', 'g', df['title'], ' · '.join(f"{x['label']} → {de(x['f'])}" for x in df['stufen']), df.get('note', ''))
of = lt['faktoren']['oberschwingungen']
add(of, 'stufen', 'g', of['title'], ' · '.join(f"{x['label']} → {de(x['f'])} ({'N-Strom' if x['basis'] == 'N' else 'Außenleiter'})" for x in of['stufen']), of.get('note', ''))
ty = lt['leitungstypen']
for t in ty['typen']:
    add(ty, t['id'], 'g', ty['title'], f"{t['label']}: Querschnitte {' · '.join(de(q) for q in t['querschnitte'])} mm², Verlegearten {', '.join(t['verlegearten'])}", t.get('beschreibung', ''))
va = lt['verlegearten']
add(va, 'zuordnung', 'g', va['title'], ' · '.join(f"{a['id']}: {a['kurz']}" for a in va['arten']))

ls = lt['schutzorgane']['ls']
for ch in ls['charakteristiken']:
    add(ls, 'ia-' + ch['id'], 'h', ls['title'], f"Charakteristik {ch['label']}: unverzögerte Auslösung spätestens bei {de(ch['ia_faktor'])} × In", ls.get('note', ''))
add(ls, 'i2', 'h', ls['title'], f"Großer Prüfstrom I2 = {de(ls['i2_faktor'])} × In")
add(ls, 'nennstroeme', 'h', ls['title'], 'Nennstromreihe: ' + ' · '.join(f'{x} A' for x in ls['nennstroeme']))
dl = lt['schutzorgane']['ls_durchlass']
for b in dl['bereiche']:
    for ch in ('B', 'C'):
        if ch in b:
            reihe = ' · '.join(f'{de(ik)} A → {de(v)} A²s' for ik, v in zip(dl['stufen_ik'], b[ch]))
            add(dl, f"{ch}-bis{b['in_max']}", 'h', dl['title'], f"{ch}, In bis {b['in_max']} A: {reihe}", dl.get('note', ''))
gg = lt['schutzorgane']['gg']
for r in gg['reihe']:
    ia = ', '.join(f"{de(t)} s → {de(r['ia'][str(t)])} A" for t in gg['zeiten'])
    add(gg, f"in{r['in']}", 'h', gg['title'], f"gG {r['in']} A: Ia bei {ia}; Ausschalt-I²t {de(r['i2t'])} A²s", gg.get('note', ''))
add(gg, 'i2', 'h', gg['title'], 'Großer Prüfstrom I2: ' + ' · '.join(
    (f"bis {x['in_max']} A → {de(x['f'])} × In" if x['in_max'] is not None else f"darüber → {de(x['f'])} × In") for x in gg['i2']))
add(gg, 'schaltvermoegen', 'h', gg['title'], f"Schaltvermögen angesetzt mit {de(gg['schaltvermoegen'])} A")

ko = lt['konstanten']
for key, w in ko['werte'].items():
    wert = f"{w['zaehler']}/{w['nenner']}" if 'zaehler' in w else de(w['wert'])
    add(ko, key, 'i', ko['title'], f"{w['label']}: {wert}{' ' + w['einheit'] if w.get('einheit') else ''}", w.get('note', ''))

out = {'groups': GROUPS, 'items': items}
path = os.path.join(OUT, 'review-items.json')
io.open(path, 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
print('Items:', len(items))
for grp in GROUPS:
    print(' ', grp['id'], grp['norm'], '→', sum(1 for i in items if i['group'] == grp['id']))

# ── Seite zusammensetzen: Template + Daten ────────────────────────────────
out['datenstand'] = g.get('datenstand', '')
tpl = io.open(os.path.join(HERE, 'abgleich-template.html'), encoding='utf-8').read()
html = tpl.replace('/*__DATA__*/', json.dumps(out, ensure_ascii=False).replace('</', '<\\/'))
page = os.path.join(OUT, 'grenzwert-abgleich.html')
io.open(page, 'w', encoding='utf-8').write(html)
print('Seite:', page, len(html), 'Zeichen')
