# Plan: Ausbaustufe 0.2 — Industrie zuerst, und ein Schaltschrank-Planer

Drei Wünsche: die App soll sich an jedes Endgerät anpassen, Industrie soll der
Standardmodus sein, und ein Planungsteil für Schaltschränke mit Hutschienen und
einer Bauteilbibliothek soll dazukommen. Die bestehende Funktionsweise bleibt.

---

## Vorab: drei Dinge, die den Zuschnitt ändern

**1. „0.2" ist eine Ausbaustufe, keine Versionsnummer.** `version.json` steht
bei `0.7.0`. Ich führe „Ausbaustufe 0.2" in diesem Plan als Namen des Vorhabens
und lasse die Dateiversion weiterlaufen — `0.8.0` für die Darstellung, `1.0.0`,
wenn der Planer steht. Zwei Zählungen nebeneinander sind in Ordnung, solange
nur eine davon im Repo steht.

**2. Der erste Wunsch ist zum größten Teil schon gebaut — aber nicht
ausgeliefert.** Commit `428258b` auf `claude/eager-goodall-nqxd72` bringt die
mitwachsende Darstellung: breitere Spalte und zweispaltige Felder ab 700 px,
Liste und Detail nebeneinander ab 1040 px. `main` trägt noch `0.6.0`, deshalb
ist auf der Live-Adresse nichts davon zu sehen. Wer den Branch misst, dem
fehlen nur noch zwei Fälle (1.2 und 1.3 unten); wer den Deploy misst, dem fehlt
alles.

**3. Der alte Android-Planer liegt in keinem Repo, an das ich komme.** Von den
drei erreichbaren ist `JungfernstiegProjekt` heute ein Kindle-Metadaten-Werkzeug,
`3D-Druck` gehört nicht dazu, `Arbeit` ist dieses hier. Wenn du den Quelltext,
die APK oder auch nur Screenshots hast: Das spart in Paket 2 (Bauteildaten und
Symbole) am meisten, und das ist das teuerste Paket. Ohne sie baue ich die
Bibliothek neu auf.

---

## Gemessen, nicht behauptet

Zum ersten Wunsch habe ich den aktuellen Branch auf drei Geräteformen
vermessen, damit im Plan keine erfundenen Probleme stehen:

| Fenster | Kopfbereich | Platz für Inhalt | zwei Bereiche | Breite genutzt |
| --- | --- | --- | --- | --- |
| Handy quer 844 × 390 | 207 px = **53 % der Höhe** | **96 px** | nein | 83 % |
| Tablet quer 1180 × 820 | 207 px = 25 % | 613 px | ja | 92 % |
| Widescreen 2560 × 1440 | 207 px = 14 % | 1233 px | ja | **43 %** |

Das Tablet im Querformat sitzt. Die beiden anderen Fälle sind die offene
Arbeit: Am Handy im Querformat sieht man Kopfzeile, Überschrift und
Aktionsleiste — und sonst nichts. Am Widescreen liegt mehr als die halbe
Breite brach.

---

## Leitentscheidungen

Sieben Punkte, die alles Weitere bestimmen. Sie stehen vorn, damit sie einmal
entschieden und nicht in jedem Unterpunkt neu verhandelt werden.

### L1 — Planen und Prüfen sind eine Kette, nicht zwei Apps

Der Planer ist nur dann mehr als ein hübsches Spielzeug, wenn sein Ergebnis
weiterläuft. Die Kette:

```
Schrank planen  →  Abgänge sind Stromkreise  →  Leitung berechnen  →  prüfen  →  Protokoll
   (neu)              (Paket 6)                   (0.6.0, steht)      (steht)    (steht)
```

Ein geplanter Abgang trägt bereits Schutzorgan, Charakteristik und Nennstrom.
Genau diese drei Angaben braucht der Stromkreis in Paket 3 der letzten
Ausbaustufe, und genau aus ihnen rechnet die Brücke seit `0.6.0` Ia und den
Zs-Sollwert. Die Verzahnung ist deshalb billig — und sie ist der Grund, das
Ganze in diese App zu bauen statt daneben.

### L2 — Belegungsplaner, kein Stromlaufplan

Der Planer beantwortet: *Was sitzt wo, passt es, was kostet es an Platz und
Wärme, was muss ich bestellen?* Er beantwortet **nicht**: *Wie ist es
verdrahtet?* Kein Stromlaufplan, keine Strompfade, keine Querverweise, keine
Schaltlogik.

Diese Grenze ist der wichtigste Satz im ganzen Plan. Ein E-CAD ist ein
Jahresprojekt, und jeder Schritt dorthin sieht einzeln klein aus. Wenn später
doch Verdrahtung dazukommen soll, ist das Ausbaustufe 0.3 und bekommt einen
eigenen Plan.

### L3 — Die Bibliothek ist herstellerneutral

Ein Schütz der Baugröße S00 ist 45 mm breit, egal wessen Name draufsteht; die
genaue Verlustleistung ist es nicht. Die Bibliothek führt deshalb **Baugrößen
mit typischen Werten**, jede Zahl mit Quelle und mit leerem `reviewed`-Block —
dieselbe Regel wie bei den Grenzwerten, dieselbe Prüfliste für die Betatester.
Jedes gesetzte Teil bekommt zusätzlich ein Freitextfeld für den tatsächlichen
Typ („3RT2015-1BB41"), das in die Stückliste durchschlägt.

Die Alternative — eine echte Herstellerreihe nachbauen — wäre für die Hälfte
der Einsätze falsch und müsste gepflegt werden, sobald ein Hersteller etwas
ändert.

### L4 — Gesetzt wird durch Tippen, nicht durch Ziehen

Zwei Gründe, einer fachlich, einer technisch.

Fachlich: Der Schrank wird im Zweifel auf der Baustelle am Tablet geplant, mit
Handschuhen. Ein Bauteil von 45 px Breite über eine Schiene zu ziehen, ohne es
fallen zu lassen, ist dort die schlechtere Bedienung — Tippen auf „Schütz S00",
dann Tippen auf die Lücke, ist schneller und geht auch mit kalten Fingern.
Verschieben übernehmen zwei große Pfeiltasten am ausgewählten Teil.

Technisch: `#app` wird bei jeder Änderung komplett neu gezeichnet (siehe
`CLAUDE.md`). Ein Ziehvorgang verträgt das nicht — er bräuchte einen Bereich,
der während der Geste vom Neuzeichnen ausgenommen ist und erst beim Loslassen
in den Speicher schreibt. Das ist machbar, aber es ist ein eigener
Architektureingriff und das größte technische Risiko im ganzen Vorhaben.

Deshalb: Tippen-Setzen ist die Grundlage (Paket 4.1). Ziehen ist ein eigenes,
abwählbares Paket (4.2), das man später nachrüsten kann, ohne etwas
umzubauen — oder eben nie.

### L5 — Der Zustand wächst, `SCHEMA` bleibt 1

Schränke kommen als neuer Zweig in den gespeicherten Zustand. `SCHEMA`
hochzuzählen würde alle Aufträge, Messwerte und Leitungsrechnungen auf dem
Gerät löschen. Migriert wird in `load()`, wie bei den Stromkreisen.

### L6 — Industrie wird Vorbelegung, nicht Sonderfall

Nur zwei Dinge ändern sich: die Vorbelegung für neue Installationen und die
Reihenfolge im Umschalter. EFH bleibt im Code und in den Daten gleichwertig —
kein `if (world === 'industrie')` irgendwo. Bestehende Installationen behalten
ihre Einstellung; wer bisher EFH eingestellt hatte, findet es so vor, wie er
es verlassen hat.

Nebenwirkung, die man wissen muss: Die Akzentfarbe hängt an der Welt
(`html[data-world]`). Die App startet damit künftig in Bernstein statt in Blau.
Der Kontrast ist für beide Welten in allen vier Farbmodi bereits nachgemessen.

### L7 — Der Planer ist offline-pflichtig wie alles andere

Bauteildaten und Symbole gehören in den Cache des Prüfassistenten, die
`ASSETS`-Liste wächst entsprechend. Im Schaltraum gibt es kein Netz, und dort
wird der Schrank aufgebaut.

---

## Paket 0 — Ausliefern, was fertig ist

| | Inhalt |
| --- | --- |
| 0.1 | `428258b` nach `main`, Deploy gegen die Live-Adresse prüfen |

Ohne das ist jede weitere Darstellungsarbeit unsichtbar. **Aufwand: XS.**

---

## Paket 1 — Darstellung vervollständigen

### 1.1 Industrie als Standardmodus

- `defaultState()` in `store.js`: `world: 'industrie'`
- `welten.json`: Industrie an die erste Stelle, damit der Umschalter in der
  Reihenfolge steht, in der gearbeitet wird
- `cable.js`: die beiden Rückfallwerte `|| 'efh'` durch „erste Welt aus den
  Daten" ersetzen — eine hartkodierte Welt-ID im Rechenkern ist genau die
  Sorte Annahme, die bei so einer Umstellung stehen bleibt
- Regressionstest: die Vorrichtungen setzen die Welt bisher auf `efh`; der
  Vier-Modi-Durchlauf ist bereits parametrisiert und bleibt unverändert, aber
  ein neuer Fall muss prüfen, dass eine **frische** Installation in Industrie
  startet und eine gespeicherte EFH-Einstellung überlebt

**Aufwand: S.** Klein, aber nicht null — der Wert steht an vier Stellen.

### 1.2 Flache Fenster: Handy im Querformat

96 px für den Inhalt sind unbrauchbar. Der Kopfbereich muss sich zurücknehmen,
sobald das Fenster flach ist (`@media (max-height: 520px)`):

- Welt-Umschalter und Reiterleiste in eine Zeile
- Bereichsbeschreibung der Welt aus (wie unter 420 px Breite schon)
- Kopfzeile auf eine Zeile, Werkzeuge daneben
- Die Aktionsleiste bleibt — sie ist im Feld die wichtigste Fläche

Ziel: Kopfbereich unter 25 % der Höhe, also rund 100 px statt 207 px.

**Aufwand: S.** Reine CSS-Arbeit, eine neue Abfrage, keine neue Ansicht.

### 1.3 Widescreen: der dritte Bereich

Ab etwa 1600 px liegt die halbe Breite brach. Die Struktur dafür steht schon:
Ansichten liefern seit `0.7.0` neben `view` ein `aside`. Ein dritter Bereich
ist dieselbe Erweiterung noch einmal.

Sinnvolle Dreiteilung je Reiter:

| Reiter | links | Mitte | rechts |
| --- | --- | --- | --- |
| Prüfen | Stromkreise | Prüfschritte | offener Schritt |
| Planen | Bibliothek | Schrank | Eigenschaften des gewählten Teils |
| Wiki | Suche und Treffer | Artikel | — (zwei reichen) |

Beim Prüfen ist das der echte Gewinn: Wer einen Verteiler mit zwölf
Stromkreisen abarbeitet, sieht Kreis, Schritt und Messfeld gleichzeitig und
springt nicht mehr.

**Aufwand: M.** Die Ansichten müssen ein drittes Stück liefern können, die
Fokus- und Verlaufslogik muss mitkommen, und der Kontrast- und
Tippziel-Durchlauf braucht eine vierte Breite.

---

## Paket 2 — Die Bauteilbibliothek (Daten)

Das teuerste Paket, und das, bei dem der alte Planer am meisten sparen würde.

### 2.1 `data/bauteile.json`

Schema je Eintrag:

```
id, name, kategorie, montage ('hutschiene' | 'einbau22' | 'platte'),
breite_te | ausschnitt_mm | breite_mm × hoehe_mm,
spannung, nennstrom, kontakte {schliesser, oeffner, wechsler},
verlustleistung_w, anschluesse [Klemmenbezeichnungen],
hinweis, quelle, reviewed {}
```

Die Teilungseinheit (17,5 mm, DIN 43880) steht als Konstante genau einmal,
wie `u0` in den Leitungsdaten.

Geplanter Umfang, rund 70 bis 80 Einträge:

| Gruppe | etwa | Beispiele |
| --- | --- | --- |
| Schalten | 14 | Leistungsschütze S00–S3, Hilfsschütze, Koppelrelais, Steckrelais mit Sockel |
| Zeit und Impuls | 8 | ansprech-/rückfallverzögert, Stern-Dreieck, Blinkgeber, Stromstoßschalter, Treppenlicht |
| Schützen | 12 | LS B/C/D, RCD, FI/LS, Motorschutzschalter, Thermorelais, NH-Lasttrennleiste, Hauptschalter |
| Klemmen | 8 | Durchgang 2,5/4/6/10 mm², PE, N, Trenn-, Sicherungs-, Initiatorklemme |
| Versorgung und Überwachung | 8 | 24-V-Netzteile, Phasenwächter, Messrelais, Betriebsstundenzähler |
| Steuerung | 6 | SPS-Grundgerät, Digital-/Analogmodule, Busklemmen |
| Front (22,5 mm) | 16 | Taster bündig/erhaben/Pilz, Not-Halt, Knebelschalter 1-0-2, Schlüsselschalter, Leuchtmelder, Leuchtdrucktaster, Poti, Hupe, Summer, Blitzleuchte |
| Zubehör | 8 | Verdrahtungskanäle (25/40/60/80 mm), Endkappen, Trennstege, Beschriftung |

Die Kanäle sind kein Beiwerk: Sie fressen Schrankhöhe, und genau daran
scheitern Aufbauten in der Praxis.

**Aufwand: L.** Nicht wegen der Technik, sondern wegen der Sorgfalt — jede
Zahl braucht eine Quelle, und falsche Maße machen den Planer wertlos.

### 2.2 Symbole

Ein kleines SVG je Kategorie, nicht je Bauteil — Schütz, Relais, Zeitrelais,
LS, RCD, Klemme, Netzteil, Taster, Melder, Hupe, Kanal. Inline im Quelltext wie
die Symbole der Übersichtsseite, damit sie offline da sind und die Farbe des
Modus annehmen. Rund 15 Zeichnungen.

**Aufwand: M.**

### 2.3 Wiki

Vier bis sechs Einträge: Aufbau eines Schaltschranks, Teilungseinheit und
Baugrößen, Verdrahtungskanäle und Platzreserve, Wärme im Schrank, Schutzart.
Dieselbe Form wie die bestehenden Einträge, verlinkt mit den Bauteilgruppen.

**Aufwand: S.**

---

## Paket 3 — Rechenkern und Speicher

### 3.1 `js/schrank.js` — DOM-frei, wie `cable.js`

- Belegung einer Schiene: Summe der Breiten, freie TE, Kollisionsprüfung
- Einfügen an der nächsten freien Stelle, Verschieben, Entnehmen
- Reserve in Prozent je Schiene und für den ganzen Schrank
- **Wärmebilanz**: Summe der Verlustleistung gegen die Schrankfläche, mit
  Hinweis ab einer Schwelle — eine echte Prüfung, die fast nichts kostet,
  sobald `verlustleistung_w` in den Daten steht
- Stückliste: nach Kategorie gruppiert, mit Mengen und Freitext-Typen
- Selbstprüfung gegen handgerechnete Beispiele, wie `C.checkExamples`

**Aufwand: M.**

### 3.2 Speicher

`S.state.schraenke`, dazu `newSchrank`, `patchSchrank`, `duplicateSchrank`,
`removeSchrank`, `addSchiene`, `setzeBauteil`, `verschiebeBauteil`,
`entferneBauteil` — dieselbe Form wie `calcs` und `kreise`. Migration in
`load()`, `SCHEMA` bleibt 1 (L5).

**Aufwand: S.**

---

## Paket 4 — Bedienung

### 4.1 Die Ansicht (Tippen-Setzen)

- Schrankliste, Schrank anlegen mit Maßen und Schutzart
- Schienen hinzufügen, benennen, in der Höhe ordnen
- Schrank maßstäblich: Schiene für Schiene, Bauteile als Blöcke in echter
  Breite, freie Plätze sichtbar
- Bibliothek mit Suche und Filter nach Kategorie
- Setzen: Bauteil wählen → Lücke antippen. Verschieben: ausgewähltes Teil,
  zwei große Pfeiltasten. Entnehmen: eine Taste.
- Eigenschaftenbereich für das gewählte Teil: Freitext-Typ, Bemerkung, bei
  Abgängen Schutzorgandaten
- Zustände nie nur über Farbe: Kollision und Überbelegung tragen Symbol und
  Wort, wie überall in dieser App

**Aufwand: L.** Die größte einzelne Ansicht, die die App bekommen hat.

### 4.2 Ziehen mit dem Zeiger — abwählbar

Ein Live-Bereich, der während der Geste nicht neu gezeichnet wird, Pointer
Events für Maus und Finger gleichzeitig, Einrasten auf das TE-Raster, Abbruch
mit Escape, und beim Loslassen ein einziger Schreibvorgang.

**Aufwand: L.** Empfehlung: erst nach 4.1 entscheiden, ob es überhaupt fehlt.

### 4.3 Navigation auf vier Reiter

Fünf Reiter passen auf 360 px gerade so. Ein sechster passt nicht. Vorschlag:

| heute | künftig |
| --- | --- |
| Aufträge · Assistent · Plan · Leitungen · Wiki | **Aufträge · Planen · Prüfen · Wissen** |

„Planen" fasst Schrank und Leitungsberechnung zusammen — die gehören
fachlich ohnehin zueinander. „Prüfen" fasst Assistent, Prüfplan und Protokoll.
Die zweite Ebene steht als Segmentumschalter im jeweiligen Reiter.

Das ist der einzige Punkt im ganzen Plan, der an „die Funktionsweise bleibt"
kratzt — deshalb steht er unten als Entscheidung E3.

**Aufwand: M.**

---

## Paket 5 — Ausgaben

### 5.1 Druckbild

A4 quer: Schrankaufbau maßstäblich, darunter die Stückliste nach Kategorien,
Kopfzeile mit Schrank, Ort, Planer, Datum. Über denselben Weg wie das
Prüfprotokoll — `#print-root` und der Druckdialog, kein zweiter Mechanismus.

**Aufwand: M.**

### 5.2 Reserve und Wärme in der Ansicht

Je Schiene die freien TE, für den Schrank die Reserve in Prozent und die
Wärmebilanz. Fällt aus 3.1 fast heraus.

**Aufwand: S.**

---

## Paket 6 — Verzahnung (L1)

### 6.1 Stromkreise aus dem Schrank

„Abgänge als Stromkreise übernehmen" legt in einem Prüfauftrag je Abgang einen
Stromkreis an, mit Nummer, Zielbezeichnung und Schutzorgan vorbelegt. Ab da
greift alles, was seit `0.6.0` steht: eigene Fakten, eigene Grenzwerte, der
Zs-Sollwert aus der Auslösekennlinie.

**Aufwand: M.** Der Nutzen pro Zeile ist hier am größten.

### 6.2 Weiter in die Leitungsberechnung

`kreis.calcId` ist seit `0.6.0` belegt. Ein Abgang kann direkt eine Rechnung
bekommen, die sein Schutzorgan erbt.

**Aufwand: S.**

---

## Paket 7 — Absicherung

| | Inhalt | Aufwand |
| --- | --- | --- |
| 7.1 | Selbsttest-Regeln für die Bauteildaten: Maße vorhanden, Kategorie bekannt, Montageart gültig, keine doppelten IDs, Symbol vorhanden | S |
| 7.2 | Regressionstest: Setzen, Kollision, Verschieben, Stückliste, Wärmebilanz, Druckbild, dazu Kontrast und Tippziele in allen vier Breiten | M |
| 7.3 | Prüfliste um die Bauteilmaße erweitern und neu veröffentlichen (neue Gruppen hinten anhängen, bestehende Item-IDs nicht ändern) | S |

---

## Aufwand im Überblick

Maßstab: **S** ist ein halber Arbeitsgang, **M** einer, **L** zwei bis drei.
Ein Arbeitsgang ist eine Sitzung in der Größe, in der die Pakete 1 bis 3 der
letzten Ausbaustufe entstanden sind — jeweils gebaut, geprüft, dokumentiert und
ausgeliefert.

| Paket | Inhalt | Gewicht | neue Zeilen (geschätzt) |
| --- | --- | --- | --- |
| 0 | Fertiges ausliefern | XS | — |
| 1.1 | Industrie als Standard | S | ~40 |
| 1.2 | Flache Fenster | S | ~50 CSS |
| 1.3 | Widescreen, dritter Bereich | M | ~150 |
| 2.1 | Bauteildaten | **L** | ~900 JSON |
| 2.2 | Symbole | M | ~250 |
| 2.3 | Wiki | S | ~200 JSON |
| 3.1 | Rechenkern `schrank.js` | M | ~350 |
| 3.2 | Speicher und Migration | S | ~120 |
| 4.1 | Ansicht mit Tippen-Setzen | **L** | ~650 |
| 4.2 | Ziehen *(abwählbar)* | **L** | ~300 |
| 4.3 | Vier Reiter | M | ~200 |
| 5.1 | Druckbild | M | ~250 |
| 5.2 | Reserve und Wärme | S | ~60 |
| 6.1 | Stromkreise aus dem Schrank | M | ~180 |
| 6.2 | Weiter in die Leitung | S | ~50 |
| 7.1 | Selbsttest | S | ~60 |
| 7.2 | Regressionstest | M | ~300 |
| 7.3 | Prüfliste | S | ~40 |

**Schätzung für das Ganze: 7 bis 10 Arbeitsgänge**, davon

- **Darstellung und Industrie-Standard (Pakete 0 und 1): etwa 1,5** —
  das ist der Teil, der sofort sichtbar ist
- **Planer bis zum ersten brauchbaren Stand (2, 3, 4.1, 5.1, 7): etwa 5 bis 7**
- **Verzahnung (6): etwa 1**
- **Ziehen (4.2): 2 bis 3 obendrauf, falls gewünscht**

Neuer Umfang rund **2 200 Zeilen Code und 1 100 Zeilen Daten**. Zum Vergleich:
Der Prüfassistent hat heute 6 189 Zeilen Code und 3 199 Zeilen Daten. Der
Planer macht die App also etwa ein Drittel größer.

Die Spanne ist ehrlich gemeint. Die Pakete 1, 3, 6 und 7 kann ich gut
schätzen — das ist Arbeit derselben Art, wie wir sie schon gemacht haben. Bei
2.1 hängt alles daran, wie viel Recherche je Bauteil nötig ist, und bei 4.1
daran, wie oft die Bedienung im Test durchfällt und neu zugeschnitten werden
muss. Das sind die beiden Posten, die aus 7 Arbeitsgängen 10 machen können.

---

## Reihenfolge, und wo man sinnvoll aufhören kann

```
0  →  1.1  →  1.2            ← erster Auslieferstand (0.8.0): sichtbar, klein, sofort
      ↓
2.1 → 2.2 → 3.1 → 3.2 → 4.1  ← zweiter Auslieferstand (0.9.0): der Planer trägt
      ↓
5.1 → 5.2 → 7.1 → 7.2        ← dritter (1.0.0): druckbar und abgesichert
      ↓
6.1 → 6.2 → 1.3 → 2.3 → 7.3  ← vierter: die Kette schließt sich
      ↓
4.2                          ← nur, wenn 4.1 es vermissen lässt
```

Drei Gründe für diesen Schnitt:

1. **Paket 1.3 (Widescreen) steht bewusst spät.** Es ist der angenehmste Teil,
   aber der Planer braucht die Dreiteilung ohnehin — wer sie vorher baut, baut
   sie zweimal.
2. **Der Druckbogen kommt vor der Verzahnung.** Ein Planer, aus dem nichts
   herauskommt, wird nicht benutzt, und ohne Benutzung erfährt man nicht, ob
   die Bedienung taugt.
3. **4.2 steht ganz am Ende und hat ein Fragezeichen.** Siehe L4.

---

## Fallen, die beim Bauen warten

1. **Ziehen gegen die Neuzeichen-Strategie** (L4). `#app` wird komplett neu
   gezeichnet; eine Geste verträgt das nicht. Wer 4.2 angeht, baut zuerst den
   Live-Bereich und erst dann die Geste — nicht umgekehrt.
2. **Der sechste Reiter passt nicht.** Auf 360 px sind fünf das Maximum, und
   das nur mit verkleinerter Schrift. Entweder 4.3 oder der Planer bekommt
   keinen eigenen Reiter.
3. **Verdrahtungskanäle sind Bauteile.** Wer sie als Dekoration behandelt,
   plant Schränke, die in Wirklichkeit nicht aufgehen.
4. **Front und Hutschiene sind zwei Flächen.** Taster, Knebelschalter,
   Leuchtmelder und Hupe sitzen nicht auf der Schiene, sondern in einem
   22,5-mm-Ausschnitt in Tür oder Frontplatte. Ein Planer, der sie auf die
   Schiene setzt, ist fachlich falsch.
5. **Bauteilmaße sind Herstellerdaten, keine Normwerte** (L3). Sie gehören mit
   Quelle und leerem `reviewed` in die Prüfliste — sonst steht in der App eine
   Zahl, für die niemand geradesteht.
6. **`SCHEMA` nicht anfassen** (L5). Dieselbe Falle wie beim letzten Mal.
7. **Die Akzentfarbe kippt** (L6). Mit Industrie als Standard startet die App
   in Bernstein. Der Kontrast ist nachgemessen, aber die Screenshots in
   `README.md` und die Kachel der Übersichtsseite zeigen dann die falsche
   Farbe.
8. **Offline wächst mit.** Jede neue Datei in `ASSETS`, `CACHE` hochzählen.
   Die Liste steht bei 41 Einträgen; der Planer bringt rund ein halbes Dutzend
   dazu.
9. **Der Umfang will zum Stromlaufplan wandern** (L2). Jeder einzelne Schritt
   dorthin sieht klein aus. Bei „können wir nicht schnell noch die Klemmen
   verbinden?" ist die Antwort: eigene Ausbaustufe, eigener Plan.

---

## Entscheidungen, die ich dir vorlege

Bei allen fünf habe ich eine Empfehlung; ohne Gegenrede baue ich so.

| | Frage | Empfehlung |
| --- | --- | --- |
| **E1** | Alten Android-Planer verfügbar? | Wenn Quelltext, APK oder Screenshots da sind: her damit, bevor Paket 2 anfängt. Spart dort am meisten. |
| **E2** | Tippen-Setzen oder Ziehen? | **Tippen** als Grundlage (L4), Ziehen später und nur bei Bedarf. |
| **E3** | Navigation auf vier Reiter? | **Ja** — sonst passt der Planer nicht ins Fenster. Einzige Änderung an der Funktionsweise, die ich vorschlage. |
| **E4** | Stromlaufplan im Umfang? | **Nein** (L2). Als eigene Ausbaustufe denkbar. |
| **E5** | Bibliothek herstellerneutral oder eine konkrete Reihe? | **Neutral** mit Freitext-Typ je gesetztem Teil (L3). |

Eine sechste Frage stelle ich nicht, sondern merke sie nur an: Die
Bauteilbibliothek ist der Punkt, an dem du am meisten Zeit sparen kannst, indem
du mir eine Liste der Teile gibst, die bei dir tatsächlich verbaut werden. 80
Einträge zu recherchieren ist teuer; 80 Einträge abzuschreiben ist billig.
