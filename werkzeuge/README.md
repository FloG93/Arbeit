# Werkzeuge

Hilfsskripte für die Entwicklung. Sie gehören nicht zu den Apps und werden
nicht veröffentlicht (der Pages-Workflow kopiert nur `app/`, `poster/` und
`pruefung/`). Das Repo selbst bleibt ohne npm-Abhängigkeiten; was ein Skript
braucht, wird außerhalb installiert.

## `pruefassistent-check.js` — Regressionstest im Browser

Spielt die Fehler aus der Durchsicht vom 23.09.2026 nach und prüft, dass sie
behoben bleiben: Komma beim Tippen („0,4" darf nicht 4 werden), Zs gegen den
eingetragenen Sollwert, sichtbares Überstimmen eines Messmangels,
Pflichtangaben, Plural, Ergebnissatz je Paket, Fälligkeit, Zurück-Taste,
Fristen-Beschriftung sowie Kontrast (≥ 4,5:1) und Tippziele (≥ 48 px) in allen
vier Farbmodi bei 360 px.

```sh
# einmalig, außerhalb des Repos
mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright-core

# im Repo-Wurzelordner
python3 -m http.server 8123 --bind 127.0.0.1 &
NODE_PATH=/tmp/pw/node_modules node werkzeuge/pruefassistent-check.js
```

In Claude-Code-Sitzungen ist Chromium unter `/opt/pw-browsers/chromium`
vorinstalliert (Standard des Skripts); anderswo `CHROMIUM=/pfad/zu/chrome`
setzen. Wichtig: immer `keyboard.type()` statt `fill()` für Zahlenfelder.

Außerdem gehört zu jeder Änderung am Prüfassistenten der eingebaute
Selbsttest: auf `localhost` läuft er automatisch (Konsole), sonst
`Pruefung.selftest()` in der Browser-Konsole. Er prüft Verweise,
Erreichbarkeit im Entscheidungsbaum, Reihenfolge der Prüfschritte,
Grenzwerttabellen und die Vollständigkeit des Offline-Caches.

## `leitungen-check.js` — Rechenkern der Leitungsberechnung in Node

Lädt `pruefung/js/util.js` und `cable.js` ohne Browser und rechnet die
handgerechneten Beispiele aus `pruefung/data/leitungen.json` (`beispiele`)
nach: Vorschlag, bestimmender Nachweis, Status und Einzelwerte. Derselbe
Abgleich läuft im Selbsttest der App.

```sh
node werkzeuge/leitungen-check.js            # nur Ergebnis
node werkzeuge/leitungen-check.js --zeigen   # Querschnittsleiter und Formeln je Beispiel
```

## `pruefliste/` — Grenzwert-Abgleich für die Betatester

`build-review-items.py` erzeugt aus `pruefung/data/grenzwerte.json` und
`prueffristen.json` die Prüfliste, mit der Betatester jeden Grenzwert gegen
ihre Normausgabe abhaken („stimmt / weicht ab / nicht gefunden").

```sh
python3 werkzeuge/pruefliste/build-review-items.py
# → werkzeuge/pruefliste/out/grenzwert-abgleich.html
```

Veröffentlicht ist die Liste als Claude-Artifact
<https://claude.ai/artifact/XxiXZMkffCHxmabQFVSgsM> mit der Fähigkeit `db`:
je Grenzwert ein Dokument `review/<tabelle>__<zeile>`, je Normgruppe ein
Dokument `meta/<gruppe>` (Ausgabestand, Prüfer). Neu veröffentlichen mit dem
Artifact-Werkzeug und derselben URL; die Item-IDs nicht ändern, sonst gehen
Eintragungen verloren. Auslesen der Eintragungen: `ArtifactData` → `list` auf
`review` und `meta`.

### Ergebnisse der Betatester einpflegen

Die Anpassung an die Normfassungen übernehmen die Betatester, nicht der
Assistent. Liegen Eintragungen vor, je Item:

- **stimmt** → den `reviewed`-Block der Tabelle füllen (`by`, `date`,
  `edition`, `fundstelle`); das Badge „Datenbasis ungeprüft“ verschwindet für
  genau diese Tabelle. Eine Tabelle gilt erst als geprüft, wenn alle ihre
  Items bestätigt sind.
- **weicht ab** → Wert in `pruefung/data/grenzwerte.json` bzw.
  `leitungen.json` korrigieren, die Abweichung in der Commit-Nachricht nennen,
  `note` der Zeile ergänzen. Bei Leitungsdaten danach
  `node werkzeuge/leitungen-check.js`: ändert sich ein handgerechnetes
  Beispiel, das Beispiel neu von Hand rechnen, nicht einfach anpassen.
- **nicht gefunden** → ungeprüft lassen, in `note` festhalten.
- Danach `CACHE` in `pruefung/sw.js` hochzählen und `datenstand` in
  `pruefung/data/index.json` setzen.

Neue Tabellen bekommen einen leeren `reviewed`-Block und werden in die
Prüfliste aufgenommen: `build-review-items.py` erweitern (neue Gruppen hinten
anhängen), unter derselben URL neu veröffentlichen, bestehende Item-IDs nicht
ändern.

Vor dem Neuveröffentlichen nachsehen, ob sich überhaupt etwas geändert hat:
die Liste neu erzeugen, den `<script id="data">`-Block der erzeugten Seite und
der veröffentlichten Fassung als JSON laden und Gruppen und Items vergleichen.
Sind sie gleich, nicht veröffentlichen — eine Version ohne Inhalt bringt
nichts und jedes Anfassen der Item-IDs gefährdet die Eintragungen. Stand
0.6.0: 126 Items in 9 Gruppen, unverändert gegenüber der veröffentlichten
Fassung.
