# CLAUDE.md

Drei eigenständige Web-Apps in einem Repo, veröffentlicht über GitHub Pages
(`.github/workflows/pages.yml`): Raumrechner (`app/`, Seitenwurzel),
Musik-Poster-Generator (`poster/`, Kanäle `/poster/` und `/poster/beta/`),
Prüfassistent für VDE-Prüfungen (`pruefung/`), dazu der PPT-Konverter
(`ppt/`). Beschreibung aller Apps in `README.md`.

**Nach einem Umzug oder Sitzungswechsel zuerst `UEBERGABE.md` lesen**, falls
vorhanden — dort stehen Projektstand, getroffene Entscheidungen und die
nächste freigegebene Aufgabe.

## Regeln, die überall gelten

- Reines HTML/CSS/JavaScript, **kein Build-Schritt, keine npm-Abhängigkeiten
  im Repo**. Hilfsskripte liegen in `werkzeuge/` und installieren, was sie
  brauchen, außerhalb.
- Jede App läuft offline über ihren eigenen Service Worker. Der Worker
  beantwortet nur die eigenen Pfade (`SHELL`), weil drei Apps auf derselben
  Herkunft liegen. Ausnahme ist der PPT-Konverter: Sein Service Worker
  (`coi-serviceworker`) setzt nur die COOP/COEP-Header, offline geht er nicht.
  **Bei jeder Dateiänderung die `CACHE`-Version im `sw.js` der
  App hochzählen** und neue Dateien in `ASSETS` eintragen.
- Zahlenfelder als `type="text" inputmode="decimal"` mit `parseNum`/`inputNum`
  (deutsches Komma). Beim Neuzeichnen den getippten Rohtext nicht durch den
  geparsten Wert ersetzen.
- Render-Strategie: `#app` wird bei Änderungen neu gezeichnet, der Fokus über
  `data-fkey` wiederhergestellt. Textfelder, deren Änderung nur Anzeigen an
  anderer Stelle betrifft, führen diese gezielt nach, statt neu zu zeichnen.
- Code-Kommentare auf Deutsch, sie begründen das „Warum". Commit-Betreff auf
  Englisch im Imperativ.

## Prüfassistent (`pruefung/`)

- Datengetrieben: Normen, Entscheidungsbäume, Grenzwerte, Fristen und Wiki
  stehen als JSON unter `pruefung/data/`; Einstieg ist `data/index.json`. Eine
  Zahl steht genau einmal im Repo. Keine Normzitate — eigene Zusammenfassungen
  plus Zahlenwerte mit Quelle.
- Ein Bedingungsmechanismus für alles: `when: {fakt: wert | [werte]}`.
  Reihenfolge der Prüfschritte über `requires` (topologisch erzwungen), nicht
  über `order` allein.
- Jede Grenzwerttabelle trägt `reviewed`; leer heißt „Datenbasis ungeprüft"
  (Badge in der App). Werte prüfen die Betatester über die Prüfliste, siehe
  `werkzeuge/README.md`.
- Prüfen nach jeder Änderung: Selbsttest (`Pruefung.selftest()`, läuft auf
  localhost automatisch) und `werkzeuge/pruefassistent-check.js`
  (Browser-Regressionstest mit echtem Tippen). Starten:
  `python3 -m http.server 8123 --bind 127.0.0.1` im Repo-Wurzelordner, dann
  `http://localhost:8123/pruefung/`.
- Bedienung im Feld: Ziele, die beim Messen getroffen werden, ≥ 56 px, sonst
  ≥ 48 px; Kontrast ≥ 4,5:1 in allen vier Farbmodi (dunkel/Tageslicht ×
  EFH/Industrie); Zustände nie nur über Farbe.
