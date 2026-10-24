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
* **25 Azubis, 20 Übungen, 8 Parameter** stecken als Konstanten in `stil.py`.
  Mehr heißt: Konstante erhöhen und neu bauen.
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
* **Wiederholungsketten** werden zwei Ebenen tief aufgelöst (Wiederholung
  einer Wiederholung). Tiefer verschachtelt wäre ohne Makro nicht mehr
  nachvollziehbar.
