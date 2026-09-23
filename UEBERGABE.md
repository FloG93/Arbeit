# Übergabe — Umzug nach FloG93/Arbeit

Stand 23.09.2026, letzter Commit vor dem Umzug: `e191a00`, danach dieser
Übergabe-Commit. Diese Datei beschreibt, wo das Projekt steht, was entschieden
ist und was als Nächstes ansteht. Nach dem Umzug und dem ersten Durchgang der
Leitungsberechnung kann sie gelöscht werden; was dauerhaft gilt, steht in
`CLAUDE.md` und `README.md`.

## 1. Warum der Umzug

Der Zugriff auf `flogramsch-blip/Jungfernstieg` ist verloren und nicht
wiederherstellbar (GitHub antwortet mit „repository not found"). Das Projekt
zieht vollständig nach **`FloG93/Arbeit`** (öffentlich, Pages auf „GitHub
Actions" gestellt). Die Historie kommt als Git-Bundle mit; die Commit-Hashes
bleiben dabei gleich — wichtig, weil `poster/release.json` den ausgelieferten
Poster-Stand über einen Commit-Hash (`9a827f6`) festlegt.

### Nach dem Import zu erledigen

1. Historie als `main` nach `FloG93/Arbeit` pushen — der Pages-Workflow läuft
   auf `main` und veröffentlicht dann alle drei Apps.
2. `.github/workflows/pages.yml`: den veralteten Branch
   `claude/inspiring-ritchie-kaz8vn` aus `on.push.branches` entfernen.
3. `README.md`: Live-Links von `flogramsch-blip.github.io/Jungfernstieg/…` auf
   `flog93.github.io/Arbeit/…` umstellen (erst nach dem ersten erfolgreichen
   Deploy, dann die echte URL aus dem Workflow-Lauf nehmen). Titel „Jungfernstieg"
   darf bleiben oder umbenannt werden — Nutzer fragen.
4. Deploy prüfen: `/`, `/poster/`, `/poster/beta/`, `/pruefung/` laden; im
   Prüfassistenten `Pruefung.selftest()` in der Konsole.
5. **Gespeicherte Daten ziehen nicht mit um.** Aufträge (Prüfassistent),
   Projekte und Fotos (Raumrechner) liegen im `localStorage`/IndexedDB des
   Browsers, gebunden an die Herkunft `flogramsch-blip.github.io`. Unter
   `flog93.github.io` fängt jede App leer an. Keine der Apps hat bisher einen
   Export/Import von Rohdaten. Solange die alte Seite noch ausgeliefert wird,
   liegen die Daten dort. Den Nutzer darauf hinweisen; eine Export/Import-
   Funktion wäre der Weg, wenn er Daten mitnehmen will.

## 2. Was im Repo steckt

| Ordner | App | Stand |
| --- | --- | --- |
| `app/` | Raumrechner — Wand-/Decken-/Bodenflächen, Grundriss, PDF-Angebot, Fotos je Raum | fertig, läuft an der Seitenwurzel |
| `poster/` | Musik-Poster-Generator (Spotify/iTunes/Deezer, TMDB für Filme), zwei Kanäle: `/poster/` = Release aus `poster/release.json`, `/poster/beta/` = aktueller Stand | fertig |
| `pruefung/` | Prüfassistent für Elektrofachkräfte (VDE-Prüfungen) | aktive Baustelle, siehe unten |
| `project/`, `chats/` | Design-Übergabe (Claude Design) zum Raumrechner, nur Referenz | — |
| `werkzeuge/` | Browser-Regressionstest und Generator der Grenzwert-Prüfliste | siehe `werkzeuge/README.md` |

Alle Apps: reines HTML/CSS/JS, kein Build-Schritt, keine npm-Abhängigkeiten,
Service Worker für Offline-Betrieb. Keine Schlüssel im Repo — Spotify- und
TMDB-Zugangsdaten gibt der Nutzer in der App ein, sie bleiben im Browser.

## 3. Prüfassistent — Stand

`pruefung/version.json`: 0.2.0, Datenstand 2026-09, Service-Worker-Cache
`pruefung-v4`. Ausführlich: `README.md`, Abschnitt „Prüfassistent".

**Fertig:** Erstprüfung DIN VDE 0100-600 und Wiederholungsprüfung DIN VDE
0105-100 (ein Paket `anlagenpruefung.json`, zwei Varianten), Geräteprüfung
DIN EN 50699 / 50678 (`geraetepruefung.json`), Zwei-Welten-Modus EFH/Industrie,
Entscheidungsbaum-Assistent, Prüfplan mit topologisch erzwungener Reihenfolge
(`requires`), Live-Bewertung der Messwerte, Checklisten, Prüffristen mit
Fälligkeit, „Nächstes Gerät", Wiki, A4-Protokoll über den Druckdialog,
Tageslicht-Modus, große Schrift, vollständig offline.

**Letzte Runde (Commit `e191a00`), Fehlerdurchsicht mit Browser-Test:**
- Komma beim Tippen verschluckt („0,4 MΩ" wurde als 4 MΩ gespeichert) —
  `U.numInput` hält jetzt den Rohtext (`js/ui.js`).
- Schleifenimpedanz: Sollwert ist ein Bezugsfeld (`role: "reference"`,
  `limitFromInput`), Zs wird dagegen bewertet, das Protokoll zeigt Soll und Ist
  richtig (`js/limits.js`, `js/plan.js`).
- Hand-Bewertung über einem Messmangel bleibt erlaubt, wird aber in Schritt,
  Plan und Protokoll vermerkt (`PL.overridden`).
- Kontrast ≥ 4,5:1 in allen vier Farbmodi (`--accent-text`, hellere
  Grautöne), Tippziele ≥ 48 px (Schnellwerte 56 px), Zurück-Taste über die
  Browser-History, Auftragsdaten über der Normauswahl und im Protokoll
  editierbar, Pflichtangaben-Hinweis, Plural „Mängel", „1 Jahr",
  Ergebnissatz je Paket (`protocol.resultText`), Fälligkeit folgt dem Prüfdatum.
- Wichtige Lehre: Kopfdaten-Felder werden beim Tippen **nicht** neu
  gezeichnet (nur `P.views.refreshJobMeta` führt Titel und Pflichtangaben
  nach). Ein Neuzeichnen beim Feldwechsel hat den Fokus des nächsten Feldes
  geschluckt.

**Bekannte Restpunkte (nicht behoben, niedrige Priorität):**
- Bemerkungsfelder (`textarea`) und die Wiki-Suche zeichnen bei jedem
  Tastendruck neu. Auf Android-Tastaturen mit Wortvorschlägen kann das die
  Eingabe stören — ungetestet, weil ohne echtes Gerät nicht prüfbar. Falls der
  Nutzer das meldet: wie bei den Kopfdaten gezielt nachführen statt neu zeichnen.
- Kalender-Export (.ics) für Fälligkeiten und Mängelfotos: zurückgestellt.

## 4. Grenzwerte — Prüfstand

Alle 13 Grenzwerttabellen und die Prüffristen sind **ungeprüft** (leerer
`reviewed`-Block); die App zeigt deshalb überall das Badge „Datenbasis
ungeprüft" und einen Satz über der Unterschrift im Protokoll.

**Entscheidung des Nutzers:** Die Anpassung an die Normfassungen übernehmen
die Betatester. Werkzeug dafür ist die Prüfliste
<https://claude.ai/artifact/XxiXZMkffCHxmabQFVSgsM> (52 Werte in sechs Gruppen,
Eintragungen gespeichert). Wenn der Nutzer meldet, dass Ergebnisse vorliegen:

- Eintragungen mit `ArtifactData` lesen (`list` auf `review` und `meta`).
- **stimmt** → `reviewed` der Tabelle füllen (`by`, `date`, `edition`,
  `fundstelle`); das Badge verschwindet für genau diese Tabelle.
- **weicht ab** → Wert in `pruefung/data/grenzwerte.json` korrigieren, die
  Abweichung in der Commit-Nachricht nennen, `note` der Zeile ergänzen.
- **nicht gefunden** → ungeprüft lassen, in `note` festhalten.
- Danach `CACHE` in `pruefung/sw.js` hochzählen und `datenstand` in
  `pruefung/data/index.json` setzen.

Neue Tabellen (z. B. aus der Leitungsberechnung) bekommen ebenfalls einen
leeren `reviewed`-Block und werden in die Prüfliste aufgenommen
(`werkzeuge/pruefliste/build-review-items.py` erweitern, unter derselben URL neu
veröffentlichen, bestehende Item-IDs nicht ändern).

## 5. Nächste Aufgabe: Leitungsberechnung

Vom Nutzer freigegebener Plan, noch **nicht begonnen**. Alle Entscheidungen
unten hat der Nutzer getroffen — nicht erneut fragen.

**Entschieden:**
- Alle vier Nachweise: Belastbarkeit + Überlastschutz, Spannungsfall,
  Abschaltbedingung, Kurzschlussfestigkeit (k²S²).
- Die App **schlägt den kleinsten passenden Querschnitt vor**; jeder andere
  lässt sich antippen und prüfen.
- Leitungen: **NYM und die PVC-Kupfer-Verwandten** (NYY, H07V-U/-R, NYIF).
- **Eigener Tab „Leitungen"**, Rechnungen gespeichert und als Nachweisblatt
  druckbar.
- Schutzorgane: **LS B/C/D und Schmelzsicherung gG**.
- Vorimpedanz am Verteiler **optional — ohne sie rechnet die App zurück**
  („erfüllt, wenn am Verteiler Zs ≤ 0,85 Ω"), statt einen Wert anzunehmen.

### Grundsätze (wie im Rest der App)

- Jede Zahl steht in einer Datendatei, keine im Code: Belastbarkeiten,
  Faktoren, Kennwerte der Schutzorgane, ρ, k, c. Jede Tabelle trägt `source`
  und `reviewed` → dasselbe Badge und dieselbe Prüfliste.
- Erklären statt behaupten: jeder Nachweis zeigt die Formel mit den
  eingesetzten Zahlen („ΔU = 2 · 28 m · 16 A · 0,0225 / 4 mm² = 5,0 V = 2,2 %").
- Nichts Sicherheitsrelevantes annehmen: fehlt die Vorimpedanz, steht dort eine
  Bedingung, kein geschätzter Wert.
- Rechenkern ohne DOM (`js/cable.js`), damit er im Selbsttest und in Node
  gegen handgerechnete Beispiele laufen kann.
- Keine Normzitate in den Daten, nur eigene Zusammenfassungen und Zahlenwerte
  mit Quellenangabe.

### Daten: `pruefung/data/leitungen.json` (neu, in `data/index.json` als `cables`)

| Block | Inhalt |
| --- | --- |
| `konstanten` | U0 230 V, U 400 V, ρ20 Cu, Faktor Betriebstemperatur (Spannungsfall), Faktor 80 °C (Fehlerfall), c_min/c_max, k für Cu/PVC, 2/3-Regel für den Zs-Messwert |
| `leitungstypen` | NYM-J/-O, NYY-J/-O, H07V-U/-R, NYIF — Isolierung, Querschnittsreihe, erlaubte Verlegearten (NYM ohne Erde, H07V nur im Rohr/Kanal, NYIF nur im/unter Putz) |
| `verlegearten` | A1, A2, B1, B2, C, D (Erde), E — Kurzbeschreibung und Beispiele in eigenen Worten |
| `belastbarkeit` | Iz bei 30 °C Luft / 20 °C Erde, je Verlegeart × 2 oder 3 belastete Adern × Querschnitt (DIN VDE 0298-4) |
| `faktoren` | Umgebungstemperatur (Luft, Erde), Häufung je Anordnung (gebündelt, einlagig auf Wand, einlagig auf Pritsche, Erde), vollständige Wärmedämmung, Oberschwingungen im N-Leiter |
| `schutzorgane` | LS B/C/D: Ia als Vielfaches von In, I2 = 1,45 In, Durchlass-I²t (Energieklasse 3), Nennstromreihe, Schaltvermögen · gG: Ia bei 5 s / 0,4 s / 0,1 s je In, I2-Faktor je In-Bereich, Ausschalt-I²t |
| `vorlagen` | je Welt: EFH Steckdosen, Licht, Herd, Durchlauferhitzer, Wallbox 11/22 kW, Wärmepumpe, UV-Zuleitung · Industrie Motor, Maschine, CEE 16/32 A, UV-Zuleitung gG, Baustromverteiler |
| `hinweise` | Regeln mit dem bekannten `when` (NYM + Erde, NYM im Freien, Beton, Oberschwingungen, Wallbox-RCD …) — derselbe `matches()` wie im Assistenten |
| `beispiele` | handgerechnete Fälle mit erwartetem Querschnitt und bestimmendem Nachweis — der Selbsttest rechnet sie nach |

`grenzwerte.json` bekommt zwei weitere Spannungsfall-Zeilen (3 % ab Zähler
nach DIN 18015-1, 0,5 % Hauptleitung nach TAR) und die Formeln des Rechenwegs;
die Default-Zeile des vorhandenen Prüfschritts bleibt unverändert.
Abschaltzeiten kommen aus der vorhandenen Tabelle `abschaltzeit`.

### Rechenweg (`pruefung/js/cable.js`, `P.cable`)

1. **Betriebsstrom** Ib aus Leistung und cos φ (1~: U0, 3~: √3 · U) oder
   direkt in A. Belastete Adern: 1~ → 2, 3~ → 3.
2. **Belastbarkeit** Iz = Iz,Tabelle × f_Temperatur × f_Häufung × f_Dämmung
   × f_Oberschwingung. **Überlastschutz:** Ib ≤ In ≤ Iz und I2 ≤ 1,45 · Iz.
3. **Spannungsfall** ΔU % = k · L · Ib · (ρ_B / S · cos φ + x′ · sin φ) / U
   · 100, k = 2 (1~, bezogen auf U0) bzw. √3 (3~, bezogen auf U), plus
   optionaler Spannungsfall bis zum Verteiler, gegen die gewählte Grenze.
4. **Abschaltbedingung** Z_L = 2 · L · ρ_80 / S, Ik,min = c_min · U0 /
   (Z_V + Z_L) ≥ Ia(t), t aus `abschaltzeit` (Netzform, End-/Verteilungs-
   stromkreis). Mit Z_V: Ergebnis plus L_max. Ohne Z_V: Rückrechnung
   Z_V,max = c_min · U0 / Ia − Z_L (≤ 0 → ✗). Dazu der Sollwert für die
   spätere Messung am Leitungsende (2/3-Regel). Mit RCD als Fehlerschutz bleibt
   der Nachweis als Kurzschlussschutz (t = 5 s) stehen und ist so beschriftet.
5. **Kurzschlussfestigkeit** (a) Schaltvermögen ≥ Ik,max am Verteiler (ohne
   Z_V: Bedingung an Z_V). (b) Thermisch, konservativ ohne
   Kennlinien-Interpolation: aus den Stützstellen 5 s / 0,4 s / 0,1 s die
   kleinste Zeit t_b mit Ia(t_b) ≤ Ik,min; t_b ≥ 0,1 s → (k · S / Ik,min)² ≥
   t_b, sonst k² · S² ≥ Durchlass-I²t. Ohne Z_V mit Ik,min = Ia rechnen (der
   ungünstigste noch zulässige Fall).
6. **Vorschlag:** Querschnittsreihe des Leitungstyps ab 1,5 mm² von unten
   durchrechnen; Vorschlag ist der erste ohne ✗. „Bestimmend" ist der
   Nachweis, der beim nächstkleineren Querschnitt scheitert. Nennstrom
   vorbelegt mit dem kleinsten Normwert ≥ Ib, änderbar.

### Oberfläche: Tab „Leitungen"

- Fünf Reiter (Aufträge · Assistent · Plan · Leitungen · Wiki), „Prüfplan"
  wird zu „Plan"; bei 360 px ohne Überlauf nachmessen.
- **Liste:** gespeicherte Rechnungen als Karten („Wallbox Garage · NYM-J 5×4 ·
  28 m · B16" + ✓/✗/bedingt), darunter „Neue Berechnung" mit den Vorlagen der
  eingestellten Welt.
- **Rechnung** (eine Seite, Karten): Verbraucher (Name, 1~/3~, kW oder A,
  cos φ als Chips) · Schutzorgan (Art, Nennstrom) · Leitung (Typ, Verlegeart
  als große Karten mit Kürzel und Beschreibung, Länge) · Umgebung
  (Temperatur-Chips + Feld, Anzahl gehäufter Stromkreise, Anordnung, Dämmung,
  Oberschwingungen nur bei 3~ mit N) · Netz (TN/TT, RCD, Vorimpedanz optional,
  Spannungsfall bis Verteiler, Grenze).
- **Ergebnis:** oben eine mitlaufende Zeile „Vorschlag NYM-J 5×4 mm² —
  bestimmt durch Belastbarkeit"; unten die Querschnittsleiter (je Querschnitt
  ✓/✗ mit Grund, antippen = diesen prüfen) und je Nachweis eine Karte mit
  Soll/Ist, Formel mit Zahlen, Quelle und Prüfstand; dann die Hinweise.
  So hat es der Nutzer in der Vorschau gesehen und gewählt:

  ```
  Wallbox Garage · 11 kW · 3~ · 28 m
  NYM-J 5×… · Verlegeart C · 35 °C · 2 gebündelt

    1,5   ✗ Belastbarkeit  Iz 13,3 A < In 16 A
    2,5   ✗ Belastbarkeit  Iz 18,1 A < In 20 A
    4     ✓ alle Nachweise           ← Vorschlag
    6     ✓ alle Nachweise

  Bestimmend: Belastbarkeit (Häufung 0,80 × Temp. 0,94)
  Spannungsfall 1,4 % ≤ 3 %  ✓
  Abschaltung  Zs 0,62 Ω ≤ 1,15 Ω  ✓
  ```
  (Zahlen in der Vorschau waren illustrativ, nicht gerechnet.)
- Untere Leiste: „Liste" · „Nachweis drucken". Nachweisblatt über
  `#print-root` wie das Protokoll: Eingaben, vier Nachweise mit Soll/Ist,
  Hinweise, Prüfstand-Satz, Bearbeiter (gemerkter Prüfername), Datum.
- Welt-Umschalter wirkt auf Vorbelegung und Vorlagen (EFH: NYM, C, 30 °C, B16,
  3 % ab Zähler · Industrie: C-Charakteristik, 35 °C, Pritsche,
  Oberschwingungen sichtbar), nicht auf gespeicherte Rechnungen.
- Zahlenfelder über `U.numInput` (Rohtext-Fix gilt damit automatisch).

### Wiki, Speicher, Selbsttest

- `pruefung/data/wiki/leitungen.json`, neue Rubrik „Leitungen": Verlegearten,
  Umrechnungsfaktoren, Überlastschutz, Spannungsfall, Abschaltbedingung und
  Leitungslänge, Kurzschlussfestigkeit, NYM richtig einsetzen. Tabellen über
  einen neuen Block `cable-table` aus `leitungen.json` (eine Zahl, eine
  Stelle, mit Prüfstand-Zeile).
- `js/store.js`: `calcs: []` im Zustand (`defaultState()` ergänzt es bei alten
  Ständen), `newCalc`, `patchCalc`, `duplicateCalc`, `removeCalc`;
  `P.nav.calcId` für die geöffnete Rechnung, auch in `navState()` der History.
- `js/app.js`: Tab, Router; Selbsttest um Datenintegrität der Leitungsdaten
  (jede erlaubte Verlegeart hat Werte für jeden Querschnitt, Faktoren monoton,
  jedes Schutzorgan vollständig, Vorlagen verweisen gültig) und das
  Nachrechnen der `beispiele`; Prüfstand-Zeile zählt die neuen Tabellen mit.
- `index.html` (Skripte), `sw.js` (neue Dateien in `ASSETS`, `CACHE` →
  `pruefung-v5`), `README.md` (Abschnitt Leitungsberechnung).

### Verifikation

- Rechenkern in Node gegen handgerechnete Fälle: Steckdosenkreis NYM 3×1,5
  B16, C, 30 °C (Belastbarkeit knapp ✓, Spannungsfall bei 20 m ✗ → 2,5),
  Wallbox 11 kW 28 m mit Häufung, UV-Zuleitung NYY gG 63 A in Erde, langer
  Kreis mit Z_V 0,8 Ω (Abschaltung bestimmend), Grenzfall ohne Z_V.
- Selbsttest ohne Befund; `werkzeuge/pruefassistent-check.js` weiter grün.
- UI bei 360 px: Vorlage Wallbox → Vorschlag, anderen Querschnitt antippen →
  ✗ mit Grund, Z_V eintragen/leeren → Bedingung ↔ Zahl, Nachweisblatt
  drucken, Tableiste ohne Überlauf.
- Offline: Netz kappen, neu laden, Leitungen-Tab und gespeicherte Rechnung
  öffnen; Cache enthält alle neuen Dateien.
- Prüfliste um die neuen Tabellen erweitern und neu veröffentlichen.

## 6. Zusammenarbeit mit dem Nutzer

- Sprache: Deutsch. Der Nutzer ist Elektrofachkraft und baut die App für die
  Arbeit auf der Baustelle (Handschuhe, Zeitdruck, Keller ohne Netz).
- Größere Schritte: erst planen, Rückfragen per Auswahlfragen stellen, Plan
  freigeben lassen, dann umsetzen. Der Nutzer wünscht ausdrücklich Rückfragen,
  wo Richtungsentscheidungen anstehen.
- Offline-Fähigkeit ist nicht verhandelbar; große Bedienelemente, klarer
  Kontrast.
- Norm-Grenzwerte prüfen die Betatester, nicht der Assistent.
- Commit-Nachrichten: englische Betreffzeile im Imperativ, die das „Warum"
  trägt; Code-Kommentare auf Deutsch und begründend.
