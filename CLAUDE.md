# CLAUDE.md

Vier eigenständige Web-Apps in einem Repo, veröffentlicht über GitHub Pages
(`.github/workflows/pages.yml`): Übersicht (`start/`, Seitenwurzel) mit
Kacheln zu Raumrechner (`app/` → `/raum/`), Musik-Poster-Generator
(`poster/`, Kanäle `/poster/` und `/poster/beta/`), Prüfassistent für
VDE-Prüfungen (`pruefung/`) und PPT-Konverter (`ppt/`). Beschreibung aller
Apps in `README.md`. Quellordner und veröffentlichter Pfad sind nicht
überall gleich — maßgeblich ist der Schritt „Assemble site" im Workflow.

**Nach einem Umzug oder Sitzungswechsel zuerst `UEBERGABE.md` lesen**, falls
vorhanden — dort stehen Projektstand, getroffene Entscheidungen und die
nächste freigegebene Aufgabe.

## Regeln, die überall gelten

- Reines HTML/CSS/JavaScript, **kein Build-Schritt, keine npm-Abhängigkeiten
  im Repo**. Hilfsskripte liegen in `werkzeuge/` und installieren, was sie
  brauchen, außerhalb.
- Jede App läuft offline über ihren eigenen Service Worker. Der Worker
  beantwortet nur die eigenen Pfade (`SHELL`) und löscht beim Aktivieren nur
  Caches mit dem eigenen Namenspräfix, weil alle Apps auf derselben Herkunft
  liegen — ein „alles außer meinem Cache" nimmt den anderen den
  Offline-Betrieb. Ausnahme ist der PPT-Konverter: Sein Service Worker
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
- Ein Auftrag ist ein Verteiler mit n Stromkreisen. `scope: "stromkreis"` am
  Prüfschritt heißt: je Kreis einmal, mit dessen Fakten und Messwerten. Die
  Grenzwerte hängen an den zusammengeführten Fakten (`P.plan.facts`) — ein
  Kreis mit 300-mA-RCD wird anders bewertet als der mit 30 mA daneben.
- Nichts Erfasstes darf unterwegs verloren gehen — der gefährlichste Fehler
  hier. Ein Messwert wandert über `P.plan.keyValue`/`measureVerdict` in
  Bewertung und Protokoll: beide müssen `result.punkte` einrechnen und Felder
  mit `role` (Bezugs- und Dokuwerte) auslassen. Was im Druckbogen keine Spalte
  hat, gehört in den Anhang, statt still zu verschwinden. Ein Protokoll, das
  einen erfassten Mangel nicht zeigt, ist schlimmer als gar keines.
- Neben den festen Feldern eines Schrittes kann es `measure.messstellen`
  geben: benannte Punkte, die im Feld per „+" entstehen. Ein Stromkreis hat so
  viele davon, wie er Steckdosen hat — das weiß keine Datendatei im Voraus.
  Der maßgebliche Wert (größter bzw. kleinster) steht im Protokoll, die
  Einzelwerte im Anhang.
- Erklärungen werden nie gerechnet. Der Leitsatz und die Konformitätsangabe
  sind Aussagen des Prüfers: nie selbsttätig auf „ja", schon gar nicht bei
  erfasstem Mangel. Dasselbe gilt für sicherheitsrelevante Bezugswerte wie den
  Zs-Sollwert — die App rechnet ihn vor und legt den Rechenweg offen,
  übernehmen muss ihn der Prüfer. Was stillschweigend erscheint, wird nicht
  mehr geprüft.
- Höchstwerte abschneiden, nicht runden: 2,875 Ω wird zu 2,87 Ω, weil 2,88 die
  laxere Forderung wäre.
- Der Druckbogen bildet die Spalten des IHK-Formulars nach, Hochformat A4.
  18 schmale Spalten tragen; jede weitere bringt die Tabelle zum Kippen — vor
  dem Hinzufügen im Druckbild nachmessen.
- `SCHEMA` in `store.js` **nicht** hochzählen, um Daten zu ändern: `load()`
  migriert, `migrateJob()` ist die Stelle dafür. Ein Stand aus einer neueren
  Fassung wird übernommen, nicht verworfen.
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
- Mitwachsendes Layout: Eine Ansicht darf neben `view` ein zweites Stück
  `aside` liefern; ab 1040 px stehen beide nebeneinander. Gebaut wird es nur,
  wenn `P.layout.wide` gilt — nie bauen und per CSS verstecken: Zweimal
  dasselbe `data-fkey` im Baum schickt die Fokuswiederherstellung auf das
  falsche Feld. Tippziele und Messfelder wachsen mit der Breite nicht mit.
