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

## Hosting

`.github/workflows/pages.yml` veröffentlicht den Ordner `app/` bei jedem Push
auf GitHub Pages — ohne Build-Schritt, der Ordner wird so hochgeladen wie er
ist. Zieladresse:

```
https://flogramsch-blip.github.io/Jungfernstieg/
```

**Einmalig von Hand nötig**, bevor der erste Deploy durchläuft:

> Settings → Pages → Build and deployment → Source: **GitHub Actions**

Der Workflow-Token darf Pages nicht selbst einschalten (die API antwortet mit
`Resource not accessible by integration`), deshalb ist dieser eine Klick nicht
automatisierbar. Jeder weitere Push läuft dann von allein durch.

HTTPS ist hier nicht Kosmetik: ein Service Worker läuft nur auf einer sicheren
Herkunft. Ohne echtes Hosting gibt es weder Offline-Betrieb noch Installation
auf dem Startbildschirm.


## Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Projekte: mehrere nebeneinander, Name und Datum frei editierbar | fertig |
| Räume: anlegen, duplizieren, zurücksetzen, löschen | fertig |
| Rückgängig direkt nach jedem Löschen oder Zurücksetzen | fertig |
| Raumformular: Höhe, 3–8 Wände, Nord/Ost/Süd/West, Ecken für L-Form | fertig |
| Abzüge mit Presets (Fenster, Zimmertür, Terrassentür, freie Fläche) | fertig |
| Netto groß / brutto klein, Decke und Boden getrennt | fertig |
| Ein Preis pro m² und eine Standardhöhe fürs ganze Projekt | fertig |
| Grundriss automatisch aus der Wandliste, Öffnungen mit Abstand ab Ecke | fertig |
| Speicherung auf dem Gerät, Fotos in IndexedDB | fertig |
| Excel-/CSV-Export mit Abzügen im Detail | fertig |
| PDF-Angebot: Deckblatt + eine Seite je Raum mit Grundriss und Fotos | fertig |
| Fotos pro Raum: Kamera und Galerie, Vollbild-Ansicht | fertig |
| Schriften mitgeliefert — offline identisches Schriftbild | fertig |

## Wissenswertes zur Umsetzung

Zahlenfelder sind bewusst **kein** `type="number"`. Dieses Feld verschluckt das
Komma, das eine deutsche Tastatur liefert: aus „2,75" wurde 275, eine
Raumhöhe von 275 Metern — ohne jede Fehlermeldung. Stattdessen `type="text"`
mit `inputmode="decimal"`: der Ziffernblock bleibt, beide Trennzeichen gehen.

Das PDF entsteht über den Druckdialog des Browsers („Als PDF speichern"), nicht
über eine mitgelieferte Bibliothek — das ist der einzige Weg, der auf Android
und am Rechner gleich funktioniert.

Fotos werden beim Aufnehmen auf max. 1600 px verkleinert. Das Vollbild liegt in
IndexedDB, in localStorage steht nur ein kleines Vorschaubild: ein paar Dutzend
Baustellenfotos als base64 würden sonst das ~5-MB-Limit sprengen und das ganze
Projekt am Speichern hindern. Gelöschte Fotos bleiben zunächst liegen, damit
Rückgängig sie zurückholen kann; verwaiste Bilder räumt der nächste Start weg.

Die Schriften liegen als variable Fonts im Ordner `app/fonts` und werden
mitgeliefert statt von einem CDN geholt — ein Service Worker cacht nur
Anfragen an die eigene Herkunft, sonst sähe die installierte App offline
anders aus. Je Familie reicht eine Datei für alle Schnitte (zusammen ~57 kB).

Gespeicherte Projekte aus der ersten Fassung werden beim ersten Start
automatisch ins neue Format überführt; der alte Eintrag bleibt als Sicherung
liegen.

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
