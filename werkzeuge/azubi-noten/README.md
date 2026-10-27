# Azubi-Leistungen (Excel-Mappe)

Erzeugt `Azubi-Leistungen.xlsx` — eine Mappe zur Erfassung und Auswertung der
Leistungen von Auszubildenden. Sie liegt auf SharePoint, wird dort in eine
Seite eingebettet und von mehreren Kollegen gleichzeitig bearbeitet.

## Bauen und prüfen

```bash
cd werkzeuge/azubi-noten
python3 build.py Azubi-Leistungen.xlsx          # baut die Mappe neu
python3 test_varianten.py Azubi-Leistungen.xlsx /tmp/az   # 14 Rechenfälle
```

`build.py` braucht nur `openpyxl`. `test_varianten.py` braucht zusätzlich
`recalc.py` aus der xlsx-Skill und LibreOffice (`soffice`); der Pfad kommt aus
`XLSX_RECALC` oder wird unter `~/.claude/skills` gesucht. Beides wird außerhalb
des Repos installiert.

**Vor dem Einbetten in SharePoint** die Datei einmal in Excel öffnen und
speichern. Sie enthält keine zwischengespeicherten Formelergebnisse; Vorschau
und Webpart können sonst leere Zellen zeigen, bis sie jemand im Excel geöffnet
hat.

Die ausgelieferte Datei ist die von `openpyxl` geschriebene — **nicht** die von
LibreOffice neu gerechnete. LibreOffice verändert beim Speichern Formate,
bedingte Formatierung und Diagramme. Stattdessen steht `fullCalcOnLoad` in der
Mappe: Excel rechnet beim Öffnen einmal alles durch.

## Aufbau

| Datei | Inhalt |
|---|---|
| `stil.py` | Farben, Schriften, Zellstile, Notenlegende, Druckbild |
| `blaetter_basis.py` | Einstellungen, Stammdaten, Übungsliste, Übungsblätter, Vorlage |
| `blaetter_auswertung.py` | Rechenblatt „Daten“, Startseite, Azubi-Ansicht, Halbjahr |
| `blaetter_extra.py` | Gesprächsseite, Anleitung |
| `build.py` | setzt alles zusammen, legt die Beispieldaten an |
| `test_varianten.py` | ändert je eine Stellschraube und prüft das Ergebnis |

## Das Übungsblatt

Bewertungsparameter stehen untereinander (Zeilen 11–35, bis zu 25 Stück),
Azubis nebeneinander, fest an die Stammdaten-Zeile gebunden.
Über jeder Spalte steht das Lehrjahr, in dem der Azubi zum Zeitpunkt *dieser*
Übung stand (aus dem Halbjahr gerechnet, nicht aus TODAY) – so lassen sich
mehrere Jahrgänge in einer Liste führen, ohne die Spalten zu verwechseln.
Bei vielen Parametern scrollt man damit nach unten statt zur Seite, und der
Bewertungshorizont bekommt eine eigene, lesbare Spalte.

## Jahrgangsblöcke

Je 25 Azubis bilden einen Block (`AZUBIS_JE_JAHRGANG`), weil pro 01.09. rund
25 eingestellt werden. `az_sp(i)` lässt deshalb hinter jedem Block eine
Spalte frei: E–AC, AE–BC, BE–CC, CE–DC. Die Trennspalten sind zwei Einheiten
breit und bleiben auf Gliederungsebene 0, während alle Azubi-Spalten auf
Ebene 1 stehen. Erst dadurch entstehen in Excel **vier getrennte Gruppen**
statt einer einzigen — ein Klick auf das Minus über einem Block klappt einen
ganzen Jahrgang weg.

Gesetzt wird das über `outlineLevel` an den einzelnen `ColumnDimension`s,
nicht über `column_dimensions.group()`: dessen Hilfsfunktion fasst den
Bereich zu einer Dimension zusammen und nimmt die Spaltenbreiten mit.

Die Stammdaten zeigen dieselbe Gliederung: eine kräftige Linie alle 25 Zeilen
und die Spalte „Platz im Übungsblatt“, die per `ADDRESS` ausrechnet, wo ein
Azubi auf den Übungsblättern steht — inklusive der mitgezählten Trennspalten.

Der Druckbereich deckt bewusst nur den ersten Block ab: alle 100 Spalten zu
drucken ergäbe rund 40 Seiten. Für einen anderen Jahrgang markiert man dessen
Spalten und druckt die Auswahl; der Hinweis steht auch auf dem Blatt.

Fixiert ist alles bis Zeile 10 (`E11`): Name, Punkte, Prozent und IHK-Note
bleiben stehen, während unten eingetragen wird — rund 253 px hoch und 463 px
breit, damit auf einem normalen Notebook noch genug Kriterienzeilen sichtbar
bleiben. Jede Adresse des Blattes steht genau einmal in `blaetter_basis.py`
(`U_*` für Zeilen, `Z_*` für die Kopffelder, `az_sp(i)` für die Azubi-Spalte);
alle anderen Module greifen nur darüber zu.

Die Zeile `U_STAT` unter dem Parameterblock hält den Status jedes Azubis.
Sie ist nur für die bedingte Formatierung da: quer über Spalten verschiebt
sich ein Bezug auf die Stammdaten nicht mit, ein direkter Verweis träfe also
die falsche Zeile.

## Größe

Mit 100 Azubis hat die Mappe rund 62.000 Formeln und knapp 1 MB. Das ist
tragbar, aber nicht gratis: `fullCalcOnLoad` steht gesetzt, Excel rechnet beim
Öffnen also einmal alles durch. LibreOffice braucht dafür etwa 10 Sekunden,
Excel ist deutlich schneller — spürbar bleibt es trotzdem, besonders im
Browser. Wer die Datei einmal aus Excel heraus speichert, legt damit die
Zwischenergebnisse ab.

Der Löwenanteil sind die Bänder im Rechenblatt (16 × 100 × 20 ≈ 32.000) und
die Kopfzeilen der Übungsblätter (21 × 100 × 9 ≈ 19.000). Beides wächst linear
mit der Azubi-Zahl; wer kürzen muss, kürzt bei `N_UEBUNGEN`.

## Der Rechenkern

Das ausgeblendete Blatt `Daten` spiegelt jede Übung als Spalte (C–V) und jeden
Azubi als Zeile. Daraus entstehen Bänder von je 25 × 20 Werten: Prozent,
bewertet, Halbjahr, Punkte, Höchstpunkte, Grund, Bemerkung, Wertungsregel und
die beiden Zählflaggen. Alle Auswertungen lesen nur noch diese Bänder mit
`SUMMENPRODUKT` und `INDEX`.

Warum so: ohne `INDIREKT` und ohne neue Array-Funktionen bleiben die Formeln in
älteren Excel-Versionen, in Excel im Browser und in LibreOffice gleich. Die
Übungsblätter kennen den Rechenkern nicht — sie rechnen für sich allein, damit
die Vorlage kopierbar bleibt.

Zwei Zählflaggen, weil zwei Fragen zu beantworten sind:

* `zählt` — gilt dieser Versuch nach der Wiederholungsregel?
* `zählt fürs Halbjahr` — zusätzlich: steht die Übung auf „abgeschlossen“?
  Eine laufende Übung ist ein Zwischenstand und darf die Halbjahresnote nicht
  nach unten ziehen.

## Grenzen, die bewusst so sind

* **Farbtöne** der Noten stehen in der bedingten Formatierung, nicht in einer
  Zelle. Ohne Makros lässt sich eine Füllfarbe nicht aus einem Zellwert
  steuern. Die *Prozentgrenzen* dagegen kommen über `INDEX(NGrenze,k)` aus dem
  Einstellungsblatt — eine geänderte Grenze färbt die ganze Mappe sofort um.
* **100 Azubis (4 × 25), 20 Übungen, 25 Bewertungsparameter** als Konstanten in
  `stil.py` — vier Jahrgänge zu je 25 Einstellungen. Alle Rasterzeilen des
  Rechenblattes werden daraus gerechnet, Erhöhen heißt also: Konstante ändern
  und neu bauen. Der Preis dafür steht unten unter „Größe“.
* **Das Diagramm** verwendet `NV()` für nicht belegte Punkte. Excel lässt die
  Linie dort eine Lücke; LibreOffice zeichnet sie auf 0. Das ist eine
  Eigenheit der LibreOffice-Diagramme, kein Formelfehler.
* **Die Auswahlfelder sind gemeinsame Zellen.** Azubi-Ansicht C4/C5/H4,
  Gesprächsseite C6/F6 und Halbjahr C4 gelten für alle gleichzeitig. Wer beim
  Co-Authoring dort etwas umstellt, ändert die Ansicht der Kollegen mit. Ohne
  Makros ist das nicht zu trennen — Excels „Blattansichten“ speichern keine
  abweichenden Zellwerte. Die Anleitung weist darauf hin, vor dem Drucken den
  Namen oben zu prüfen. Die Auswahlliste der Gesprächsseite hängt bewusst
  **nicht** an den Filtern der Azubi-Ansicht (`AzubiAktiv` statt
  `AzubiAuswahl`).
* **Lange Übungsnamen** werden auf der Startseite abgeschnitten (ab etwa
  30 Zeichen). Die Spalte kann nicht breiter werden, ohne die 1200-px-Grenze
  für das SharePoint-Webpart zu reißen; der volle Name steht auf dem
  Übungsblatt und in der Übungsliste.
* **Die Stammdaten dürfen nicht sortiert werden.** Zeile 7 der Stammdaten
  gehört fest zu Spalte E der Übungsblätter. Das schützt beim Statuswechsel,
  hält aber einem Sortieren nicht stand: dabei wandern die Namen, die Noten
  bleiben. Erkennen lässt sich das hinterher nicht, deshalb steht die Warnung
  auf dem Blatt selbst und in der Anleitung.
* **Wiederholungsketten** werden zwei Ebenen tief aufgelöst (Wiederholung
  einer Wiederholung). Tiefer verschachtelt wäre ohne Makro nicht mehr
  nachvollziehbar.
