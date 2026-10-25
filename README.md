# Arbeit

Kleine, eigenständige Web-Apps in einem Repo — kein Build-Schritt, kein
Login, jede läuft für sich.

| App | Pfad | Kurzbeschreibung |
| --- | --- | --- |
| [Übersicht](#übersicht) | `/` | Kacheln zu allen Apps, Einstieg der Seite |
| [Prüfassistent](#prüfassistent) | `/pruefung/` | Anlagen- und Geräteprüfung nach VDE: Assistent, Grenzwerte, Messwerte, Protokoll |
| [PPT-Konverter](#ppt-konverter) | `/ppt/` | Alte PowerPoint-Dateien (`.ppt`) im Browser in `.pptx` umwandeln |
| [Raumrechner](#umgezogen-raumrechner-und-poster-generator) | [Privat-Projekte `/raum/`](https://flog93.github.io/Privat-Projekte/raum/) | umgezogen |
| [Musik-Poster-Generator](#umgezogen-raumrechner-und-poster-generator) | [Privat-Projekte `/poster/`](https://flog93.github.io/Privat-Projekte/poster/) | umgezogen |

Live: https://flog93.github.io/Arbeit/ (Übersicht),
https://flog93.github.io/Arbeit/pruefung/ (Prüfassistent) und
https://flog93.github.io/Arbeit/ppt/ (PPT-Konverter).

## Hosting

`.github/workflows/pages.yml` veröffentlicht bei jedem Push auf GitHub Pages:
`start/` an die Wurzel, `pruefung/` nach `/pruefung/` und `ppt/` nach `/ppt/`.
Ohne Build-Schritt — die Ordner werden nebeneinander in ein Artefakt kopiert.

**Einmalig von Hand nötig**, bevor der erste Deploy durchläuft:

> Settings → Pages → Build and deployment → Source: **GitHub Actions**

Der Workflow-Token darf Pages nicht selbst einschalten (die API antwortet mit
`Resource not accessible by integration`), deshalb ist dieser eine Klick nicht
automatisierbar. Jeder weitere Push läuft dann von allein durch.

HTTPS ist hier nicht nur Kosmetik: Der Prüfassistent läuft mit Service Worker,
der nur auf einer sicheren Herkunft aktiv wird. Ohne echtes Hosting gibt es dort
weder Offline-Betrieb noch Installation auf dem Startbildschirm.

---

## Übersicht

Die Startseite an der Wurzel: eine Kachel je App, mit Symbol, einem Satz zur
Funktion und dem Pfad. Mehr macht sie nicht — sie wird angetippt und wieder
verlassen. Quelle ist `start/`, veröffentlicht an der Seitenwurzel.

- Folgt der Hell-/Dunkel-Einstellung des Geräts, ohne eigenen Umschalter.
- Offline wie die Apps, über einen eigenen Service Worker.
- Dieser Worker liegt nach dem Deploy unter `/sw.js` — genau dort, wo vorher
  der des Raumrechners lag. Das ist Absicht: So löst er die alte Registrierung
  ab. Ohne diese Ablösung bekämen Besucher an der Wurzel weiter die
  zwischengespeicherte Fassung des Raumrechners.
- Kein eigenes Manifest: Wer eine App auf den Startbildschirm legt, tut das
  aus der App heraus.

---

## Umgezogen: Raumrechner und Poster-Generator

Der **Raumrechner** (früher `/raum/`, Ordner `app/`) und der **Musik-Poster-Generator**
(früher `/poster/` mit Release- und Beta-Kanal) liegen jetzt im Repo
[`FloG93/Privat-Projekte`](https://github.com/FloG93/Privat-Projekte), mit unveränderten Pfaden:

| App | Neue Adresse | Anleitung |
| --- | --- | --- |
| Raumrechner | https://flog93.github.io/Privat-Projekte/raum/ | [raum/README.md](https://github.com/FloG93/Privat-Projekte/blob/main/raum/README.md) |
| Poster-Generator, freigegeben | https://flog93.github.io/Privat-Projekte/poster/ | [poster/README.md](https://github.com/FloG93/Privat-Projekte/blob/main/poster/README.md) |
| Poster-Generator, Beta | https://flog93.github.io/Privat-Projekte/poster/beta/ | |

Die vollständige Beschreibung beider Apps steht dort. Die Dateien sind
übernommen, nicht verändert — bis auf den Service Worker des Raumrechners, der
jetzt ein eigenes Cache-Präfix hat. Gespeicherte Räume bleiben erhalten, weil
`localStorage` und IndexedDB an der Herkunft (`flog93.github.io`) hängen und
nicht am Pfad.

Hier blieb `project/`: der Design-Entwurf des Raumrechners (Handoff,
`Raumrechner.dc.html`).

---

## Prüfassistent

Werkzeug für Elektrofachkräfte auf der Baustelle: Der Assistent fragt ab, was
geprüft wird — bei Anlagen Netzform, Stromkreisart und RCD, bei Geräten
Schutzklasse, Geräteart und Messverfahren — und stellt daraus den Prüfplan
zusammen, in der Reihenfolge, die fachlich nötig ist. Zu jedem Schritt stehen
Ablauf, Messmittel, Grenzwert und typische Fehlerquellen dabei; Messwerte
werden direkt gegen den Grenzwert bewertet und am Ende als Protokoll gedruckt.

Vier Normen, zwei Datenpakete:

| Norm | Was |
| --- | --- |
| DIN VDE 0100-600 | Erstprüfung ortsfester Anlagen |
| DIN VDE 0105-100 | Wiederholungsprüfung im Betrieb — auch ohne Freischaltung |
| DIN EN 50699 | Wiederholungsprüfung ortsveränderlicher Geräte |
| DIN EN 50678 | Geräteprüfung nach Instandsetzung |

Läuft wie die anderen Apps ohne Build-Schritt, installierbar, und **vollständig
offline** — im Hausanschlussraum, im Keller und in der Halle gibt es meist kein
Netz, und genau dort wird die App gebraucht.

> Hilfsmittel, kein Ersatz für Normtext, Herstellerangaben und eigene
> Fachkunde. Die Datenpakete enthalten keine Normzitate, sondern eigene
> Zusammenfassungen des Ablaufs und die allgemein publizierten Grenzwerte mit
> Quellenangabe. Vor der ersten Verwendung gegen die gültige Normfassung prüfen.

### Starten

```bash
cd pruefung
python3 -m http.server 8000
```

Dann `http://localhost:8000/` öffnen. Ein Start im Wurzelverzeichnis des Repos
(`http://localhost:8000/pruefung/`) stellt die echte Deploy-Situation nach —
drei Apps auf einer Herkunft, mit einem fremden Service Worker im Scope.
`file://` reicht nicht: dort blockiert der Browser das Laden der Datenpakete.

Auf `localhost` läuft beim Start automatisch `Pruefung.selftest()` und meldet in
der Konsole, ob alle Verweise, Grenzwerte, Reihenfolgen und der Offline-Cache
stimmen. Von Hand ist er jederzeit über `Pruefung.selftest()` aufrufbar.

### Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Anlagen-Erstprüfung nach DIN VDE 0100-600 | fertig |
| Wiederholungsprüfung nach DIN VDE 0105-100, auch ohne Freischaltung | fertig |
| Geräteprüfung nach DIN EN 50678 / 50699, Schutzklasse I, II und III | fertig |
| Zwei-Welten-Modus EFH / Industrie: Fragen, Schritte, Wiki und Begriffe | fertig |
| Prüfplan mit verbindlicher Reihenfolge (`requires`) und Sperrhinweis | fertig |
| Verteiler mit beliebig vielen Stromkreisen, jeder mit eigenen Stammdaten und eigenen Grenzwerten | fertig |
| Messwerte mit Live-Bewertung gegen den passenden Grenzwert | fertig |
| Checklisten mit vier Zuständen (offen / OK / Mangel / n. a.), Bewertung je Schritt überschreibbar | fertig |
| Kopfdaten im Aufbau des IHK-Prüfprotokolls, nach Auftrag, Anlage, Netz und Prüfung gruppiert | fertig |
| Durchgängigkeit des Potentialausgleichs mit den 14 Zielen des Protokolls | fertig |
| Messstellen je Schritt frei anlegen („+"), der maßgebliche Wert zählt | fertig |
| Berührungsspannung, Kurzschlussstrom Ik, Isolationswiderstand mit und ohne Verbraucher | fertig |
| Prüffristen: Richtwert wählen, Fälligkeit im Auftrag und im Protokoll | fertig |
| Serienprüfung: „Nächstes Gerät" übernimmt die Kopfdaten | fertig |
| Wissensdatenbank: Messverfahren, Netzformen, Fehlerquellen, Grenzwerte | fertig |
| Protokoll als A4-Bogen im Aufbau des IHK-Prüfprotokolls, über den Druckdialog (auch „Als PDF speichern") | fertig |
| Tageslicht-Modus und größere Schrift für den Einsatz draußen | fertig |
| Speicherung auf dem Gerät, Prüfer und Messgerät werden gemerkt | fertig |
| Leitungsberechnung: Querschnitt vorschlagen, vier Nachweise, Nachweisblatt | fertig |
| Sollwert für Zs aus dem Schutzorgan des Stromkreises, Stromkreis mit einer Leitungsrechnung verknüpfbar | fertig |
| Offline-Betrieb inklusive aller Datenpakete | fertig |
| Erinnerung an fällige Prüfungen (Kalender-Export) | geplant |
| Mängelfotos im Protokoll | geplant |

Bekannte Grenze: Bemerkungsfelder und die Wiki-Suche zeichnen bei jedem
Tastendruck neu. Auf Android-Tastaturen mit Wortvorschlägen kann das die
Eingabe stören (ungetestet, kein Gerät). Falls gemeldet: wie bei den
Kopfdaten und dem Namen einer Leitungsrechnung gezielt nachführen statt neu
zeichnen.

### Leitungsberechnung

Eigener Reiter „Leitungen“: Verbraucher, Schutzorgan, Leitung, Umgebung und
Netz eintragen — die App rechnet jeden Querschnitt der Reihe durch und
schlägt den kleinsten vor, der alle vier Nachweise erfüllt:

| Nachweis | Rechenweg |
| --- | --- |
| Belastbarkeit und Überlastschutz | Iz = Tabellenwert × Faktoren (Temperatur, Häufung, Dämmung, Oberschwingungen); Ib ≤ In ≤ Iz und I2 ≤ 1,45 · Iz |
| Spannungsfall | ΔU = k · L · Ib · (ρ/S · cos φ + x′ · sin φ), plus Anteil bis zum Verteiler, gegen die gewählte Grenze |
| Abschaltbedingung | Ik,min = c_min · U0 / (Z_V + Z_L) ≥ Ia bei der zulässigen Abschaltzeit; mit Z_V auch L_max |
| Kurzschlussfestigkeit | Schaltvermögen ≥ Ik,max; thermisch (k · S / Ik)² ≥ t bzw. k² · S² ≥ Durchlass-I²t |

* **Leitungen:** NYM-J/-O, NYY-J/-O, H07V-U/-R, NYIF — jeweils nur in den
  Verlegearten, für die sie vorgesehen sind. **Schutzorgane:** LS B/C/D, gG.
* **Ohne Vorimpedanz** nimmt die App keinen Wert an, sondern rechnet zurück:
  „erfüllt, wenn am Verteiler Zs ≤ … Ω“. Das Ergebnis heißt dann „bedingt“.
  Dazu steht der Sollwert für die spätere Messung am Leitungsende (2/3-Regel).
* **Querschnittsleiter:** jeder Querschnitt mit ✓/◐/✗ und Grund; antippen
  prüft genau diesen. „Bestimmend“ ist der Nachweis, an dem der nächstkleinere
  Querschnitt scheitert.
* **Nachweisblatt** über den Druckdialog: Eingaben, vier Nachweise mit Soll,
  Ist und Formel mit eingesetzten Zahlen, Hinweise, Prüfstand, Bearbeiter.
* **Vorlagen je Welt** (EFH: Steckdosen, Licht, Herd, Durchlauferhitzer,
  Wallbox 11/22 kW, Wärmepumpe, UV-Zuleitung · Industrie: Motor, Maschine,
  CEE 16/32 A, UV-Zuleitung gG, Baustromverteiler).

**Brücke zur Prüfung.** Ein Stromkreis kennt sein Schutzorgan, und dort liegt
die Auslösekennlinie: Im Schritt „Schleifenimpedanz“ rechnet die App daraus
Ia und den Sollwert `Zs,max = U0 / Ia` vor — mit Abschaltzeit, Formel und
Prüfstand der beteiligten Tabellen, zum Übernehmen per Tipp. Eingetragen wird
er nicht von allein: Zs wird gegen ihn bewertet, und ein Bezugswert, der
stillschweigend erscheint, wird nicht mehr geprüft. Ein vorgeschalteter RCD
weicht ihn nicht auf; angeboten wird die Abschaltbedingung des
Überstromorgans, dazu der strengere Wert nach der 2/3-Regel. Umgekehrt lässt
sich an jeden Stromkreis eine Leitungsrechnung hängen — aus dem Kreis heraus
angelegt oder eine vorhandene verknüpft —, und Leitungstyp, Querschnitt und
Schutzorgan kommen von dort zurück, statt zweimal gepflegt zu werden.

Alle Zahlen stehen in `data/leitungen.json` (Belastbarkeit, Faktoren,
Kennwerte der Schutzorgane, Konstanten, Vorlagen, Hinweise) und in
`data/grenzwerte.json` (Spannungsfall-Grenzen, Abschaltzeiten). Jede Tabelle
trägt `reviewed`; solange er leer ist, zeigt die App „Datenbasis ungeprüft“.
Der Rechenkern `js/cable.js` hat kein DOM: `node werkzeuge/leitungen-check.js`
rechnet die handgerechneten Beispiele aus `leitungen.json` nach, der
Selbsttest der App ebenso.

### Normdaten pflegen

Normen, Grenzwerte und Wiki-Inhalte stehen als JSON unter `pruefung/data/`. Eine
Änderung an der Norm ist damit ein Datei-Austausch, kein Eingriff in den Code:

* **Geltungsbereich eines Prüfschrittes** — `"scope": "stromkreis"` heißt: je
  Stromkreis einmal, mit den Fakten und Messwerten dieses Kreises. Ohne
  `scope` gilt der Schritt einmal für die Anlage. Ein Stromkreis-Schritt darf
  einen Anlagen-Schritt voraussetzen (Freischaltung vor Isolationsmessung),
  umgekehrt nie — der Anlagen-Schritt fände das Ergebnis in keinem Beutel und
  bliebe für immer gesperrt. Der Selbsttest erzwingt das.
* **Abweichung am Stromkreis anbieten** — Eintrag unter `kreisFakten`. Jede
  Option setzt über `set` einen oder mehrere Fakten, `when` blendet sie nach
  Netzform aus. Was der Kreis nicht selbst setzt, erbt er von der Anlage.
* **Spalte im Druckbogen ergänzen** — Eintrag unter `protocol.messtabelle`.
  `from` sagt, woher der Wert kommt: `{ "step", "input" }` ein einzelnes Feld,
  `{ "step", "gruppe" }` der maßgebliche Wert einer Feldgruppe, `{ "step" }`
  der maßgebliche Wert des Schrittes samt Messstellen, `{ "fact" }` eine
  Antwort aus dem Assistenten, `{ "kreis" }` eine Angabe des Stromkreises.
  Was eine Spalte hat, lässt der Anhang weg; was keine hat, landet unter
  „Weitere Prüfschritte" — aus dem Bogen fällt nichts heraus.
* **Messwert ergänzen** — Eingabe unter `measure.inputs` anlegen. `role` sagt,
  wie die App damit umgeht: ohne Rolle wird bewertet, `"reference"` ist ein
  Sollwert (der Grenzwert, gegen den ein anderes Feld über `limitFromInput`
  bewertet wird), `"doku"` wird festgehalten, aber nicht bewertet. Über
  `measure.gruppen` und `gruppe` bekommen viele Felder Zwischenüberschriften,
  über `quickFromLimit` holt ein Feld seine Schnellwerte aus einer
  Grenzwerttabelle, statt die Zahlen ein zweites Mal zu führen.
* **Messstellen zulassen** — `measure.messstellen` mit `unit`, `aggregate`
  (`min` oder `max`), optionalem `limitKey` und `felder`. Dann kann der Prüfer
  im Feld beliebig viele benannte Messpunkte anlegen; der maßgebliche Wert geht
  ins Protokoll, die Einzelwerte in den Anhang.
* **Protokollfeld ergänzen** — Eintrag unter `protocol.fields` anlegen und
  einer Gruppe aus `protocol.groups` zuordnen. `"kind": "fact"` übernimmt eine
  Antwort aus dem Assistenten, statt sie zweimal abzufragen; `"default"` gibt
  eine Vorbelegung vor, `"sticky"` merkt den Wert für weitere Prüfungen. Ein
  Fakt, der aus `presetFacts` einer Variante stammt, braucht seinen Klartext
  in `factLabels` — sonst bleibt das Feld im Bogen leer, und der Selbsttest
  sagt es.
* **Grenzwert ändern** — Zeile in `data/grenzwerte.json` anpassen. Jeder
  Grenzwert steht genau einmal im Repo; Prüfschritt, Wiki und Protokoll lesen
  dieselbe Zeile.
* **Neue Norm ergänzen** — Datei unter `data/normen/` anlegen und in
  `data/index.json` eintragen. `"status": "geplant"` zeigt sie als deaktivierte
  Karte, `"aktiv"` schaltet sie frei.
* **Norm-Variante ergänzen** — unterscheiden sich zwei Normen nur im Anlass,
  gehören sie ins selbe Paket: ein Eintrag unter `variants` mit eigenem
  Einstiegsknoten (`entry`) und Vorab-Fakten (`presetFacts`) ergibt eine eigene
  Karte in der Normauswahl, ohne einen einzigen Prüfschritt zu duplizieren.
  So teilen sich 0100-600 und 0105-100 eine Datei, ebenso 50678 und 50699.
* **Wiki-Eintrag ergänzen** — Objekt in eine der Dateien unter `data/wiki/`.

Danach zwei Pflichten: die `CACHE`-Version in `pruefung/sw.js` hochzählen (sonst
liefert der Service Worker installierten Geräten weiter den alten Stand) und
`datenstand` in `data/index.json` setzen.

**Prüfstand der Zahlen.** Jede Grenzwerttabelle trägt einen `reviewed`-Block:

```json
"reviewed": { "by": "M. Keller", "date": "2026-09-17",
              "edition": "DIN VDE 0100-600:2017-06", "fundstelle": "Tab. 61.1" }
```

Solange `date` leer ist, zeigt die App an jeder Stelle, die diese Tabelle
darstellt, ein Badge **„Datenbasis ungeprüft"**, und das Protokoll nennt über dem
Unterschriftsfeld, wie viele der verwendeten Tabellen ohne Nachweis sind. Ist der
Block gefüllt, steht dort stattdessen, wer wann gegen welche Ausgabe geprüft hat.
Die Werte stammen aus öffentlich zugänglichen Zusammenstellungen — sie sind eine
Arbeitshilfe, bis jemand sie mit der Norm in der Hand bestätigt hat, und die App
behauptet nichts anderes.

Die wichtigsten Felder:

| Feld | Bedeutung |
| --- | --- |
| `when` | Bedingung als `{fakt: wert}` oder `{fakt: [werte]}` — gilt für Fragen, Antwortoptionen, Prüfschritte, Checklistenpunkte und Wiki-Einträge |
| `worlds` | Kurzform für `when.world`, etwa `["industrie"]` |
| `set` | Fakten, die eine Antwort setzt (`{"netzform": "tt"}`) |
| `addSteps` | Prüfschritte, die eine Antwort zusätzlich zuschaltet |
| `phase` + `order` | grobe und feine Sortierung im Prüfplan |
| `requires` | zwingende Vorbedingung — schlägt jede Sortierung |
| `limitRef` + `limitKeyFrom` | Grenzwerttabelle und der Fakt, der die Zeile bestimmt |
| `limitKeySuffix` | an einem Eingabefeld: eigene Zeile derselben Tabelle (5 × IΔn) |
| `interval` | macht einen Schritt zum Fristen-Schritt (`{"scope": "anlage"}`) |
| `perDevice` | Protokollfeld, das „Nächstes Gerät" leert (Gerät, Seriennummer) |
| `kind: "fact"` | Protokollfeld, das eine Antwort aus dem Assistenten übernimmt |

### Wissenswertes zur Umsetzung

Die Reihenfolge im Prüfplan hängt **nicht** an der gepflegten Zahl `order`. Die
sortiert nur dort, wo die Reihenfolge beliebig ist. Wo sie zwingend ist — der
Schutzleiterwiderstand vor dem Isolationswiderstand, der RCD-Auslösestrom vor
der Auslösezeit — steht `requires`, und eine topologische Sortierung setzt das
durch. Ein falsch gepflegtes `order` oder ein umsortiertes `steps`-Array kann
die fachliche Reihenfolge damit nicht mehr kippen. Genau das ist der Kern der
App, deshalb hängt er nicht an Disziplin beim Datenpflegen.

Antworten speichern **Fakten**, keine Knoten-IDs: aus „Ortsfeste Anlage" wird
`{"anlagenart": "ortsfest"}`. Der Entscheidungsbaum darf deshalb umgebaut
werden, ohne gespeicherte Aufträge oder `when`-Bedingungen zu brechen. „Zurück"
ist aus demselben Grund kein Rückgängig, sondern ein Replay der Antwort-Historie
von vorn — so kann kein Fakt hängen bleiben, dessen Antwort widerrufen wurde.

Zwei Normen, die sich nur im Anlass unterscheiden, liegen in einer Datei.
0100-600 und 0105-100 teilen sich rund 80 % der Prüfschritte; was sie trennt —
Freischaltbarkeit, Umfang, Sicherheitshinweise — steckt in `when`-Bedingungen
und in den Vorab-Fakten der Variante. Zwei gepflegte Dateien mit denselben
Grenzwerten wären zwei Gelegenheiten, eine Korrektur zu vergessen.

Eine Voraussetzung, die auf die laufende Prüfung nicht zutrifft, ist keine: die
Isolationsmessung am Gerät verlangt `requires: ["s-g-schutzleiter"]`, aber ein
Gerät der Schutzklasse II hat keinen Schutzleiter. Der Prüfplan zieht eine
Vorbedingung deshalb nur nach, wenn ihr eigenes `when` zu den Antworten passt —
sonst stünde im Plan ein Schritt, den es für dieses Gerät gar nicht gibt.

Der Zwei-Welten-Modus ist kein Sonderfall in der Engine: `"worlds": [...]` wird
beim Laden zu `when.world` normalisiert. Damit ist EFH oder Industrie ein Fakt
wie jeder andere und kann Fragen überspringen, Prüfschritte zuschalten und das
Wiki filtern, ohne eine Zeile Spezialcode. Die Welt eines Auftrags wird beim
Anlegen eingefroren; der Umschalter im Kopf ändert sie nicht rückwirkend,
sondern bietet das Umstellen an — sonst driften Antworten und Prüfplan
auseinander.

Der Prüfplan eines Auftrags wird beim ersten Öffnen eingefroren. Ein späteres
Daten-Update sortiert eine laufende Prüfung dadurch nicht um; neu
hinzugekommene Schritte hängen hinten an und sind als „neu" markiert, statt
lautlos zwischen bereits erledigte Zeilen zu rutschen.

Der Selbsttest rät keine Fakten mehr, sondern läuft den Entscheidungsbaum ab:
von jedem Varianten-Einstieg aus jede sichtbare Antwort, bei Mehrfachauswahl
zusätzlich „nichts davon". Für jedes erreichte Ende muss ein Prüfplan entstehen,
der alle `requires`-Kanten einhält. Vorher stand dort eine Handvoll fest
verdrahteter Anlagen-Fakten — für ein Gerätepaket hätte die Prüfung nur
„leerer Prüfplan" gemeldet und nichts geprüft.

Zahlenfelder sind wie im Raumrechner bewusst **kein** `type="number"` — dieses
Feld verschluckt das Komma der deutschen Tastatur, aus „0,4" würde 4. Bei einem
Isolationswiderstand ist das der Unterschied zwischen Mangel und „alles gut".

Ein Zustand wird nie allein durch Farbe ausgedrückt: jede Bewertung trägt
Symbol, Text und Farbe. Mit Handschuhen, in der Sonne oder mit Farbsehschwäche
bleibt die Oberfläche damit lesbar. Aus demselben Grund gibt es keine Gesten —
alles hat einen sichtbaren Knopf, mindestens 56 px hoch, Primäraktionen unten
für die Bedienung mit einer Hand.

`js/sw-guard.js` läuft als erstes Skript und räumt Einträge dieser App aus
fremden Caches. Ältere Fassungen des Raumrechner-Workers hatten die ganze Site
im Scope und lieferten Nachbar-Apps eingefroren aus — neues HTML mit altem
JavaScript (siehe [Wissenswertes zur Umsetzung](#wissenswertes-zur-umsetzung-1)
beim Poster-Generator). Der eigene Worker beantwortet nur die eigenen Pfade.

Wiki-Inhalte sind Blocklisten (`{"type": "p"}`, `"steps"`, `"warn"`, `"limits"`
…), kein HTML. Gerendert wird über `textContent`, damit ein Datenpaket keine
Skripte einschleppen kann — und die Inhalte bleiben deklarativ genug, um sie
später auch anders darzustellen.

### Aufbau

```
pruefung/
  index.html            Einstiegspunkt, lädt die Skripte in fester Reihenfolge
  styles.css            Tokens (aus dem Raumrechner), Feldeinsatz, Tageslicht-Modus, Druckbogen
  sw.js                 Service Worker: App-Shell und alle Datenpakete cache-first
  manifest.webmanifest  Installierbarkeit
  version.json          Version und Datenstand
  fonts/                dieselben variablen Fonts wie im Raumrechner
  icons/                Launcher-Icons (192/512, normal und maskable)
  js/
    sw-guard.js         räumt fremde Cache-Einträge dieser App weg (zuerst geladen)
    util.js             el(), Zahlen-/Komma-Behandlung, matches(), Fokusrettung
    data.js             lädt die Datenpakete, baut Indizes, Varianten, Welt-Terminologie
    limits.js           Grenzwerte auflösen, formatieren, bewerten
    intervals.js        Prüffristen: Richtwerte, Fälligkeitsdatum
    cable.js            Leitungsberechnung: Rechenkern ohne DOM, vier Nachweise, Vorschlag
    wizard.js           Entscheidungsbaum: Fragen überspringen, antworten, Replay
    plan.js             Prüfplan bauen, topologisch ordnen, Bewertungen ableiten
    store.js            Zustand, localStorage, Aufträge, Messergebnisse, Leitungsrechnungen
    ui.js               Bausteine: Messzeile, Bewertungsschalter, Grenzwerttabelle, Wiki-Blöcke
    view-auftraege.js   Aufträge, Normauswahl, Auftragsdaten
    view-wizard.js      Fragen, Hinweisknoten, Antwortübersicht
    view-plan.js        Prüfplan und Schritt-Detail mit Messwerterfassung
    view-wiki.js        Wissensdatenbank mit Suche und Filtern
    view-protokoll.js   Zusammenfassung und A4-Druckbogen
    view-leitungen.js   Leitungsberechnung: Liste, Rechnung, Querschnittsleiter, Nachweisblatt
    app.js              Kopfzeile, Router, Service-Worker-Registrierung, Selbsttest
  data/
    index.json          Registry: Datenstand, Welten, Grenzwerte, Normen, Wiki
    welten.json         EFH und Industrie: Labels, Begriffe, Akzent, Schwerpunkte
    grenzwerte.json     alle Grenzwerttabellen und Formeln, per ID referenzierbar
    prueffristen.json   Richtwerte für Prüffristen, getrennt nach Anlage und Gerät
    leitungen.json      Leitungsberechnung: Belastbarkeit, Faktoren, Schutzorgane, Vorlagen, Beispiele
    normen/
      anlagenpruefung.json   DIN VDE 0100-600 und 0105-100 als zwei Varianten
      geraetepruefung.json   DIN EN 50678 und 50699 als zwei Varianten
    wiki/               Messverfahren, Netzformen, Fehlerquellen, Geräte, Grundlagen, Leitungen
```

---

## PPT-Konverter

Wandelt alte PowerPoint-Dateien (`.ppt`, `.pps`, `.pot`) in `.pptx` um.
Live: https://flog93.github.io/Arbeit/ppt/

- Läuft komplett im Browser — die Dateien werden **nicht** hochgeladen.
- Mehrere Dateien auf einmal per Drag & Drop oder Dateiauswahl; jede fertige
  Datei wird sofort heruntergeladen.
- Die Umwandlung übernimmt LibreOffice als WebAssembly
  ([ZetaOffice](https://zetaoffice.net), per CDN geladen). Beim ersten Aufruf
  sind das ca. 50 MB, danach kommt es aus dem Browser-Cache.

### Wissenswertes zur Umsetzung

- LibreOffice-WASM braucht Threads und damit `SharedArrayBuffer`, also die
  Header COOP/COEP. GitHub Pages setzt sie nicht; das übernimmt
  [`coi-serviceworker`](https://github.com/gzuidhof/coi-serviceworker) (MIT).
  Beim allerersten Besuch lädt sich die Seite deshalb einmal kurz neu. Sein
  Scope ist `/ppt/`, die anderen Apps bleiben unberührt.
- Bewusst **kein Offline-Betrieb**: Die LibreOffice-Dateien kommen vom
  ZetaOffice-CDN und wären für einen eigenen Cache zu groß.
- `index.html` hält Oberfläche und Warteschlange, `office_thread.js` läuft im
  LibreOffice-Worker, öffnet die Datei und speichert sie mit dem Filter
  `Impress MS PowerPoint 2007 XML`. `vendor/zetajs/` ist
  [zetajs](https://github.com/allotropia/zetajs) 1.2.0 (MIT), unverändert.
- Lokal starten: `python3 -m http.server 8123 --bind 127.0.0.1` im
  Repo-Wurzelordner, dann `http://localhost:8123/ppt/`.
