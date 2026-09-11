# Jungfernstieg

Kleine, eigenständige Web-Apps in einem Repo — kein Build-Schritt, kein
Login, jede läuft für sich.

| App | Pfad | Kurzbeschreibung |
| --- | --- | --- |
| [Raumrechner](#raumrechner) | `/` | Wand-/Decken-/Bodenflächen berechnen, Angebot exportieren |
| [Musik-Poster-Generator](#musik-poster-generator) | `/poster/` | Aus Künstler/Album/Song ein druckreifes Poster bauen |

Live: https://flogramsch-blip.github.io/Jungfernstieg/ (Raumrechner) und
https://flogramsch-blip.github.io/Jungfernstieg/poster/ (Poster-Generator).

## Hosting

`.github/workflows/pages.yml` veröffentlicht `app/` (Wurzel) und `poster/`
(unter `/poster/`) bei jedem Push auf GitHub Pages — ohne Build-Schritt,
beide Ordner werden nur nebeneinander in ein Artefakt kopiert und so
hochgeladen wie sie sind.

**Einmalig von Hand nötig**, bevor der erste Deploy durchläuft:

> Settings → Pages → Build and deployment → Source: **GitHub Actions**

Der Workflow-Token darf Pages nicht selbst einschalten (die API antwortet mit
`Resource not accessible by integration`), deshalb ist dieser eine Klick nicht
automatisierbar. Jeder weitere Push läuft dann von allein durch.

HTTPS ist hier nicht nur für den Poster-Generator Kosmetik: der Raumrechner
läuft mit Service Worker, der nur auf einer sicheren Herkunft aktiv wird.
Ohne echtes Hosting gibt es dort weder Offline-Betrieb noch Installation auf
dem Startbildschirm.

---

## Raumrechner

Kleine Web-App, um unterwegs Wand-, Decken- und Bodenflächen zu berechnen —
mit Abzügen für Fenster und Türen, automatisch gezeichnetem Grundriss und
Export für Angebot und Kalkulation.

Läuft ohne Build-Schritt: reines HTML/CSS/JavaScript, installierbar auf dem
Android-Homescreen, funktioniert offline.

### Starten

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

### Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Projekte: mehrere nebeneinander, Name und Datum frei editierbar | fertig |
| Räume: leer anlegen, duplizieren, auf Null zurücksetzen, löschen | fertig |
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

### Wissenswertes zur Umsetzung

Ein neuer oder zurückgesetzter Raum ist wirklich leer: vier Wände mit Länge 0,
alle Flächen 0,0 m². Ein vorbelegter 4 × 3-m-Raum sah aus, als hätte
„Zurücksetzen" nichts getan. Erhalten bleiben nur der Name und die
Standardhöhe des Projekts. Solange keine Maße erfasst sind, zeigen Grundriss
und PDF einen Hinweis statt einer entarteten Zeichnung.

`render()` wirft die gesamte Oberfläche weg und baut sie neu auf. Jedes Feld
trägt deshalb ein stabiles `data-fkey`, über das Fokus und Cursorposition
danach wiederhergestellt werden — sonst reißt jede Neuzeichnung den Nutzer aus
dem Feld, in dem er gerade tippt. Der Hinweis-Balken liegt aus demselben Grund
außerhalb von `#app` und außerhalb des App-Zustands: sein Ausblende-Timer hat
früher die ganze Seite neu gebaut.

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

### Aufbau

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

---

## Musik-Poster-Generator

Künstler, Album oder Song suchen und daraus automatisch ein druckreifes
Poster generieren — Albumcover groß im Bild, dazu ein scanbarer Code (echter
Spotify-Code, sonst ein QR-Code) zum Song oder Album, in einem von drei
Design-Stilen. Kein Login, kein eigener Server — reines HTML/CSS/JavaScript.

### Starten

```bash
cd poster
python3 -m http.server 8000
```

Dann `http://localhost:8000/` öffnen. Kein Service Worker, kein Manifest —
die App braucht nur den HTTP-Server, damit `fetch()` und Web-Fonts laufen;
direktes Öffnen per `file://` scheitert an CORS.

### Datenquellen

- **Suche**: primär die [iTunes Search API](https://performance-partners.apple.com/search-api)
  (kein Login, CORS-fähig). Ist im Bereich „Spotify-Zugang" ein eigener,
  kostenloser Spotify-Client (Client-ID + Secret, siehe
  [developer.spotify.com](https://developer.spotify.com/dashboard)) hinterlegt,
  sucht die App stattdessen zuerst in Spotifys eigenem Katalog — über den
  Client-Credentials-Flow, also App-seitige Anmeldung ohne Nutzer-Login/Redirect.
- **Cover**: erst die von der Suche gelieferte Artwork-URL (iTunes bis 2000 px,
  Spotify in der größten verfügbaren Auflösung). Schlägt das fehl, sucht die
  App über MusicBrainz + Cover Art Archive nach einem Ersatz; schlägt auch das
  fehl, gibt es ein Platzhalter-Cover plus manuellen Upload.
- **Code**: „Spotify-Code" ist nur wählbar, wenn eine Spotify-URI vorliegt
  (direkt aus der Spotify-Suche, oder — bei hinterlegten Zugangsdaten — im
  Hintergrund über eine Zusatzsuche aufgelöst) und sich das öffentliche,
  loginfreie Scannable-Code-Bild von `scannables.spotify.com` laden lässt.
  Sonst greift automatisch ein selbst gezeichneter QR-Code, der zum passenden
  `open.spotify.com`-Link (falls eine URI bekannt ist), sonst zum
  Apple-Music-Link, sonst zur Spotify-Suche nach Künstler + Titel führt.

### Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Suche nach Song/Album über iTunes, optional Spotify | fertig |
| Cover-Fallback über MusicBrainz/Cover Art Archive, manueller Upload | fertig |
| 3 Stile: Minimalistisch, Vintage/Vinyl-Retro, Grunge/Konzertflyer | fertig |
| Editor mit editierbaren Feldern (Text, Cover, Code-Typ, Akzentfarbe, Größe) | fertig |
| Automatische Farbpalette aus dem Cover, frei überschreibbar | fertig |
| Echter Spotify-Code oder QR-Code, je nach Verfügbarkeit wählbar | fertig |
| Gerahmte Wand-Vorschau (nur Anzeige, nicht Teil des Exports) | fertig |
| Export als PNG und PDF, A4/A3/A2 bei echten 300 dpi | fertig |
| Manuelles Anlegen ganz ohne Suche/Internetzugriff | fertig |

### Wissenswertes zur Umsetzung

Alle drei ISO-A-Formate haben dasselbe Seitenverhältnis (1:√2). Deshalb
zeichnet ein einziger, größenunabhängiger Layoutcode je Stil (Koordinaten
relativ zu Breite/Höhe) sowohl die kleine Live-Vorschau als auch den Export
— beim Export ändert sich nur die Pixelauflösung, nicht das Layout.

Fremde Bilder (Cover, Spotify-Code) werden ausschließlich mit
`crossOrigin="anonymous"` geladen. Fehlen die CORS-Header des jeweiligen
Servers, bricht das Laden dadurch sauber mit einem Fehler ab und die App
weicht automatisch aus (MusicBrainz → Platzhalter-Cover, Spotify-Code → QR-Code)
— statt einen Export zu erzeugen, der an einer „getainteten" Canvas scheitert.

Schriften werden vor dem ersten Rendern explizit über die Font-Loading-API
geladen (`document.fonts.load(...)`), nicht nur per `@font-face` deklariert.
Ein Font, der nirgends im DOM sichtbar ist, wird von Browsern sonst nie
geladen — Canvas-Text bliebe beim Systemfont hängen.

Spotify-Zugangsdaten landen ausschließlich in `localStorage` dieses Browsers
und werden nur direkt an `accounts.spotify.com`/`api.spotify.com` gesendet.
Es gibt keinen eigenen Server, der sie sehen oder weiterleiten könnte — genau
deshalb ist die Konfiguration optional und pro Browser lokal, nicht Teil des
Repos.

Die Farbpalette entsteht aus einer 48-Pixel-Miniatur des Covers per
Bucket-Histogramm, nicht per k-Means: Farben werden nach Häufigkeit,
Sättigung und Nähe zur mittleren Helligkeit gewichtet, damit dominante
Weiß- oder Schwarzflächen im Cover nicht automatisch zur Akzentfarbe werden.

### Aufbau

```
poster/
  index.html            Einstiegspunkt
  styles.css            Design-Tokens, Formulare, Rahmen-Vorschau
  fonts/                Fonts für alle drei Stile, offline mitgeliefert (woff2)
  vendor/               jsPDF und ein QR-Code-Generator, offline mitgeliefert
  js/
    api.js              iTunes-, MusicBrainz/Cover-Art-Archive- und Spotify-Anbindung
    color.js             Farbpalette aus dem Cover extrahieren
    qrcode.js             Wrapper um den QR-Code-Generator
    export.js              PNG-/PDF-Export bei echten 300 dpi (A4/A3/A2)
    utils.js                Canvas-, Farb- und Text-Hilfsfunktionen
    main.js                  Zustand, Verkabelung, Live-Vorschau
    styles/
      minimal.js             Stil „Minimalistisch"
      vintage.js              Stil „Vintage / Vinyl-Retro"
      grunge.js                Stil „Grunge / Konzertflyer"
```
