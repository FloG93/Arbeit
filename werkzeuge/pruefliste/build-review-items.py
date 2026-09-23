#!/usr/bin/env python3
"""Erzeugt die Prüfliste „Grenzwert-Abgleich“ aus den Datendateien der App.

Liest pruefung/data/grenzwerte.json und prueffristen.json und schreibt nach
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
]

TABLE_GROUP = {
    'iso-nach-nennspannung': 'a', 'rcd-ausloesezeit': 'a', 'rcd-ausloesestrom': 'a',
    'rcd-ausloesestrom-abs': 'a', 'abschaltzeit': 'a', 'schutzleiter-durchgang': 'a',
    'erdungswiderstand-tt': 'a', 'spannungsfall': 'b', 'anlage-differenzstrom': 'c',
    'geraet-schutzleiterwiderstand': 'd', 'geraet-iso': 'd',
    'geraet-schutzleiterstrom': 'd', 'geraet-beruehrungsstrom': 'd',
}
FORMULA_GROUP = {'zs-max': 'a', 'ra-max': 'a', 'ipe-heizgeraet': 'd', 'rpe-leitung': 'd', 'r-leiter': 'f'}


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
