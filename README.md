# Raumrechner

Kleine Web-App, um unterwegs Wand-, Decken- und Bodenflächen zu berechnen —
mit Abzügen für Fenster und Türen, automatisch gezeichnetem Grundriss und
Export für Angebot und Kalkulation.

Läuft ohne Build-Schritt: reines HTML/CSS/JavaScript, installierbar auf dem
Android-Homescreen, funktioniert offline.

## Starten

Die App braucht einen HTTP-Server (wegen Service Worker und Manifest —
direktes Öffnen der Datei per `file://` reicht nicht):

```bash
cd app
python3 -m http.server 8000
```

Dann `http://localhost:8000/` im Browser öffnen.

Auf dem Android-Smartphone: Seite über HTTPS aufrufen und im Chrome-Menü
„Zum Startbildschirm hinzufügen“ wählen. Danach startet sie wie eine native
App im Vollbild und rechnet auch ohne Netz weiter.

## Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Projekt mit mehreren Räumen, Summenzeile | fertig |
| Raumformular: Höhe, 3–8 Wände, Nord/Ost/Süd/West, Ecken für L-Form | fertig |
| Abzüge mit Presets (Fenster, Zimmertür, Terrassentür, freie Fläche) | fertig |
| Netto groß / brutto klein, Decke und Boden getrennt | fertig |
| Preis pro m² → Summe je Raum und Projekt | fertig |
| Grundriss automatisch aus der Wandliste, Öffnungen mit Abstand ab Ecke | fertig |
| Speicherung auf dem Gerät (localStorage) | fertig |
| Excel-/CSV-Export mit Abzügen im Detail | fertig |
| Angebotsblatt als Vorschau | fertig |
| PDF-Angebot: Deckblatt + eine Seite je Raum mit Grundriss und Fotos | fertig |
| Fotos pro Raum: Kamera und Galerie, Vollbild-Ansicht | fertig |

Das PDF entsteht über den Druckdialog des Browsers („Als PDF speichern"), nicht
über eine mitgelieferte Bibliothek — das ist der einzige Weg, der auf Android
und am Rechner gleich funktioniert.

Fotos werden beim Aufnehmen auf max. 1600 px verkleinert. Das Vollbild liegt in
IndexedDB, in localStorage steht nur ein kleines Vorschaubild: ein paar Dutzend
Baustellenfotos als base64 würden sonst das ~5-MB-Limit sprengen und das ganze
Projekt am Speichern hindern.

Die Schriften (Hanken Grotesk, Space Grotesk) kommen von Google Fonts. Ohne
Netz fällt die App sauber auf die Systemschrift zurück; wer die Schriften auch
offline will, muss sie mit ausliefern.

## Aufbau

```
app/                    die eigentliche App
  index.html            Einstiegspunkt
  app.js                UI, Geometrie- und Flächenberechnung, Export
  styles.css            Design-Tokens und Layout
  sw.js                 Service Worker, Cache-first für den App-Shell
  manifest.webmanifest  Installierbarkeit auf Android
  icons/                Launcher-Icons (192/512, normal und maskable)

project/                Entwurf aus Claude Design (Referenz, nicht ausgeliefert)
  Raumrechner.dc.html   der freigegebene Entwurf
  HANDOFF.md            Original-Hinweise aus dem Design-Handoff
  _ds/                  Design-System-Tokens des Entwurfs

chats/                  Gesprächsverlauf aus dem Entwurf — hier steht,
                        was gewünscht war und wo die Entscheidungen fielen
```

Die Rechenlogik steckt in `app/app.js` in `geo()` und `calc()`:
`geo()` läuft die Wandliste ab, dreht an jeder Ecke nach links oder rechts und
bildet daraus das Polygon (Bodenfläche über die Gaußsche Trapezformel);
`calc()` macht daraus Umfang, Brutto-Wandfläche, Abzüge, Netto und Preis.
