# Arbeit

Kleine, eigenständige Web-Apps in einem Repo — kein Build-Schritt, kein
Login, jede läuft für sich.

| App | Pfad | Kurzbeschreibung |
| --- | --- | --- |
| [Raumrechner](#raumrechner) | `/` | Wand-/Decken-/Bodenflächen berechnen, Angebot exportieren |
| [Musik-Poster-Generator](#musik-poster-generator) | `/poster/` | Aus Künstler/Album/Song ein druckreifes Poster bauen |
| [Prüfassistent](#prüfassistent) | `/pruefung/` | Anlagen- und Geräteprüfung nach VDE: Assistent, Grenzwerte, Messwerte, Protokoll |

Live: https://flog93.github.io/Arbeit/ (Raumrechner),
https://flog93.github.io/Arbeit/poster/ (Poster-Generator,
freigegebene Fassung),
https://flog93.github.io/Arbeit/poster/beta/ (derselbe
Generator, aktueller Entwicklungsstand) und
https://flog93.github.io/Arbeit/pruefung/ (Prüfassistent).

## Hosting

`.github/workflows/pages.yml` veröffentlicht bei jedem Push auf GitHub Pages:
`app/` an die Wurzel, den Poster-Generator in zwei Kanälen (siehe
[Kanäle und Freigabe](#kanäle-und-freigabe)) und `pruefung/` nach `/pruefung/`.
Ohne Build-Schritt — die Ordner werden nebeneinander in ein Artefakt kopiert;
erzeugt wird nur je Poster-Kanal eine `build.js` mit Version, Commit und Datum.

**Einmalig von Hand nötig**, bevor der erste Deploy durchläuft:

> Settings → Pages → Build and deployment → Source: **GitHub Actions**

Der Workflow-Token darf Pages nicht selbst einschalten (die API antwortet mit
`Resource not accessible by integration`), deshalb ist dieser eine Klick nicht
automatisierbar. Jeder weitere Push läuft dann von allein durch.

HTTPS ist hier nicht nur für den Poster-Generator Kosmetik: Raumrechner und
Prüfassistent laufen mit Service Worker, der nur auf einer sicheren Herkunft
aktiv wird. Ohne echtes Hosting gibt es dort weder Offline-Betrieb noch
Installation auf dem Startbildschirm.

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

Künstler, Album, Song **oder Film** suchen und daraus automatisch ein
druckreifes Poster generieren — Motiv groß im Bild, dazu ein scanbarer Code
(echter Spotify-Code, sonst ein QR-Code), in einem von zwölf Design-Stilen.
Kein Login, kein eigener Server — reines HTML/CSS/JavaScript.

Der Umschalter oben in der Suche bestimmt die Art: **Musik** (neun Stile, Daten
von iTunes/Spotify) oder **Film** (drei Stile, Daten von TMDB). Er tauscht nicht
die Oberfläche aus, sondern beschriftet dieselben Felder um — „Künstler" wird
„Regie", „Tracklist" wird „Besetzung" — und blendet die passenden Stile ein.

### Starten

```bash
cd poster
python3 -m http.server 8000
```

Dann `http://localhost:8000/` öffnen. Kein Service Worker, kein Manifest —
die App braucht nur den HTTP-Server, damit `fetch()` und Web-Fonts laufen;
direktes Öffnen per `file://` scheitert an CORS.

### Kanäle und Freigabe

| Kanal | Adresse | Stand |
| --- | --- | --- |
| Release | `/poster/` | der in `poster/release.json` eingetragene Commit |
| Beta | `/poster/beta/` | der aktuelle Stand des Branches |

Beide liegen auf derselben Seite, die Dateien aber nur einmal im Repo: der
Release-Kanal wird beim Deploy mit `git archive <commit> poster` aus der
Historie ausgepackt. Freigeben heißt deshalb, einen Zeiger umzusetzen, statt
Ordner zu kopieren — `poster/release.json`:

```json
{ "version": "1.1.0", "commit": "9a827f6", "released": "2026-09-12" }
```

Der Push dieser Änderung löst den Workflow aus, danach liefert `/poster/` den
eingetragenen Stand. Zurückrollen ist derselbe Handgriff mit einem älteren
Commit, und jede Freigabe steht als eigener Commit in der Historie.

Git-Tags wären der übliche Weg dafür. Sie scheiden hier aus: der Git-Proxy der
Entwicklungsumgebung weist Tag-Pushes ab (`the remote end hung up
unexpectedly`), Branch-Pushes gehen. Ein Zeiger im Repo leistet dasselbe, ohne
von der Umgebung abzuhängen.

Jeder Kanal zeigt oben ein Abzeichen mit Kanal, Version und Commit — Beta in
Gelb, damit die beiden nicht zu verwechseln sind — und einen Link auf den
jeweils anderen. Dieselbe Zeile steht als erste im Diagnose-Protokoll: bei
jeder Fehlermeldung ist damit belegt, welcher Stand gemeint war. Die Version
des Beta-Kanals steht in `poster/version.json`, die freigegebene in
`poster/release.json`. Fehlt der Zeiger oder ist der Commit unbekannt, bekommt
auch der Release-Kanal den aktuellen Stand — besser eine ungekennzeichnete
Fassung als eine 404.

### Formate

| Format | Maße | Auflösung |
| --- | --- | --- |
| A4 / A3 / A2 | 21 × 29,7 bis 42 × 59,4 cm | 300 dpi |
| A1 | 59,4 × 84,1 cm | 210 dpi |
| A0 | 84,1 × 118,9 cm | 150 dpi |
| 50 × 70 | Plakatmaß | 250 dpi |
| 70 × 100 | Kinoplakat | 170 dpi |

Die Auflösung ist gestaffelt, weil nicht der Drucker die Grenze setzt, sondern
die Canvas-Fläche des Browsers: A2 bei 300 dpi sind 34,8 Megapixel und laufen
nachweislich durch, A1 wären bei 300 dpi schon 70 und A0 gar 140. Jedes Format
bleibt deshalb unter etwa 35 Megapixeln. Fachlich ist das ohnehin richtig — ein
A0-Plakat wird aus zwei Metern Abstand gesehen, 150 dpi sind dort üblich. Der
Dateiname nennt die tatsächliche Auflösung.

Die Plakatmaße haben andere Seitenverhältnisse als die A-Reihe (1:1,40 und
1:1,43 gegen 1:1,414). Vorschau, Wand-Ansicht und Layout rechnen deshalb mit
dem Verhältnis des gewählten Formats statt mit einem festen Wert.

### Datenquellen

- **Suche**: primär die [iTunes Search API](https://performance-partners.apple.com/search-api)
  (kein Login, CORS-fähig), wahlweise nach Song, Album oder Künstler. Ist im
  Bereich „Spotify-Zugang" ein eigener, kostenloser Spotify-Client (Client-ID +
  Secret, siehe [developer.spotify.com](https://developer.spotify.com/dashboard))
  hinterlegt, sucht die App stattdessen zuerst in Spotifys eigenem Katalog —
  über den Client-Credentials-Flow, also App-seitige Anmeldung ohne
  Nutzer-Login/Redirect.
- **Künstlersuche** liefert kein Poster, sondern die Diskografie: ein Klick auf
  den Künstler listet seine Alben, neueste zuerst (iTunes `lookup?entity=album`
  bzw. Spotify `/artists/{id}/albums`). Von dort geht es wie gewohnt weiter.
- **Cover**: erst die von der Suche gelieferte Artwork-URL (Apple bis zur Größe
  des hinterlegten Masters, Spotify höchstens 640 px). Schlägt das fehl, sucht
  die App über MusicBrainz + Cover Art Archive nach einem Ersatz; schlägt auch
  das fehl, gibt es ein Platzhalter-Cover plus manuellen Upload. „Schärferes
  Cover suchen" stellt beide Quellen nebeneinander zur Auswahl.
- **Filme**: [TMDB](https://www.themoviedb.org). Apple hat seine Filmsuche
  abgeschaltet (`media=movie` antwortet mit 403, `entity=movie` mit null
  Treffern), und eine schlüsselfreie Quelle für Plakate gibt es nicht —
  Filmplakate sind geschützt und liegen in keiner freien Bilddatenbank. TMDB
  passt technisch: API und Bild-CDN senden beide
  `Access-Control-Allow-Origin: *`, und `/t/p/original` liefert 2000 × 3000 px,
  also 285 dpi auf A4 und 202 auf A3. Ein Aufruf holt über `append_to_response`
  Stab, Freigaben und Bilder mit: Tagline, Laufzeit, Genre, Studio, FSK aus
  `release_dates`, Besetzung und Billing Block aus `credits` — und mit Glück den
  Original-Titelschriftzug als transparentes PNG aus `images.logos`. Der
  kostenlose Schlüssel liegt wie die Spotify-Daten nur im Browser.
- **Tracklist und Albumangaben** (Titel, Gesamtlänge, Label, genaues Datum):
  bei Spotify aus dem vollständigen Album-Objekt, bei iTunes aus
  `lookup?entity=song`. Findet die eigene Quelle nichts, sucht die App das
  Album über Interpret + Albumtitel bei der jeweils anderen. Alles Geladene
  bleibt im Editor frei überschreibbar.
- **Code**: „Spotify-Code" ist nur wählbar, wenn eine Spotify-URI vorliegt
  (direkt aus der Spotify-Suche, oder — bei hinterlegten Zugangsdaten — im
  Hintergrund über eine Zusatzsuche aufgelöst) und sich das öffentliche,
  loginfreie Scannable-Code-Bild von `scannables.spotify.com` laden lässt.
  Sonst greift automatisch ein selbst gezeichneter QR-Code, der zum passenden
  `open.spotify.com`-Link (falls eine URI bekannt ist), sonst zum
  Apple-Music-Link, sonst zur Spotify-Suche nach Künstler + Titel führt.

### Stile

| Stil | Aufbau |
| --- | --- |
| **Tracklist-Klassiker** | Cover, Titelzeile mit Code daneben, volle Tracklist, Farbpalette und Eckdaten in der Fußzeile |
| **Now Playing** | Poster als Player-Oberfläche: Cover mit runden Ecken, Fortschrittsbalken, Laufzeit, Transporttasten |
| **Swiss / Editorial** | Cremegrund, Farbbalken, riesiger Interpretenname, Albumtitel rechts, Tracklist dreispaltig unten |
| **Pantone-Karte** | Cover als aufgeklebtes Foto, Namenskärtchen und Farbfächer daneben, Titelblock und Tracklist unten |
| **Liner Notes** | Cover groß, darunter Trennlinie, links die Tracklist, rechts Titel, Palette, Datum und Label |
| **Vinyl-Hülle** | Getönter Passepartout-Grund, Name und Titel oben, Platte ragt seitlich aus der Cover-Hülle |
| **Minimalistisch** | Cover, Titel, Interpret, Wellenform-Balken in der Akzentfarbe, Laufzeit |
| **Vintage / Vinyl-Retro** | Doppelte Rahmenlinie, Cover als Plattenlabel auf gezeichneter Schallplatte, Serifen-Display |
| **Grunge / Konzertflyer** | Dunkler Grund, Duoton-Cover, Risskanten, gestempelte Schreibmaschinenschrift |
| **Key Art** (Film) | Motiv randlos, Darstellerzeile, Titelschriftzug, Startzeile, Billing Block, FSK |
| **Minimal** (Film) | Flächige Farbe aus dem Motiv, Plakat als eingesetztes Bild im 2:3-Format, Titel und Regie groß |
| **Kinoprogramm** (Film) | Das Plakat als Eintrittskarte: Motiv, Perforation, Angaben als Tabelle, Strichcode |

### Funktionsumfang

| Bereich | Stand |
| --- | --- |
| Suche nach Song, Album oder Künstler über iTunes, optional Spotify | fertig |
| Künstlertreffer klappt die Diskografie auf, neueste Alben zuerst | fertig |
| Deutscher Store (`country=DE`), 25 Treffer, Doppeltreffer zusammengefasst | fertig |
| Tracklist, Gesamtlänge, Label und Datum automatisch laden | fertig |
| Cover-Fallback über MusicBrainz/Cover Art Archive, manueller Upload | fertig |
| Auflösungsanzeige und dpi-Warnung fürs gewählte Format | fertig |
| „Schärferes Cover suchen": Apple- und CAA-Ausgaben zur Auswahl | fertig |
| Notfall-Hochrechnung (Lanczos + Unscharfmaske), nur bei zu wenig dpi | fertig |
| 9 Stile (siehe Tabelle oben) | fertig |
| Editor: Text, Tracklist, Cover, Code-Typ, Akzentfarbe, Größe frei editierbar | fertig |
| Automatische Farbpalette aus dem Cover, frei überschreibbar | fertig |
| Echter Spotify-Code oder QR-Code, je nach Verfügbarkeit wählbar | fertig |
| Explicit-Kennzeichen aufs Cover, automatisch vorbelegt | fertig |
| Wand-Vorschau im Wohnzimmer, maßstabsgetreu, Rahmen in drei Farben | fertig |
| Export als PNG und PDF, A4/A3/A2 bei echten 300 dpi | fertig |
| Manuelles Anlegen ganz ohne Suche/Internetzugriff | fertig |

### Was die Datenquellen nicht hergeben

- **Künstler-Logos** (der gesetzte Schriftzug einer Band) liefert keine der
  Schnittstellen — sie sind Markenzeichen. Stattdessen wird der Name gesetzt.
- **Künstlerfotos** hat nur Spotify. iTunes liefert zu Künstlern gar kein Bild;
  die Trefferliste zeigt dort einen gezeichneten Schattenriss.
- **Aufnahmejahr** gibt es nirgends, nur das Veröffentlichungsdatum.
- **Label** kennt nur Spotify als eigenes Feld. Bei iTunes wird es aus der
  Copyright-Zeile abgeleitet („℗ 2013 Daft Life Limited, under exclusive…" →
  „Daft Life Limited") — eine Heuristik, deshalb ist das Feld editierbar.
- **Cover-Auflösung** begrenzt den sinnvollen Druck. Apple deckelt bei der
  Auflösung des hinterlegten Masters: eine Anfrage nach `3000x3000` liefert
  dieselben Bytes wie `2000x2000`, bei vielen Alben real nur 1500 px. Spotify
  gibt höchstens 640 px. Das Cover Art Archive hält dagegen den Originalscan
  der jeweiligen Ausgabe, häufig größer — und sendet `Access-Control-Allow-Origin: *`,
  ist also ohne getaintete Canvas exportierbar. Unter dem Cover steht deshalb
  immer die echte Auflösung samt geschätzter dpi im gewählten Format, rot ab
  etwa 150 dpi. „Schärferes Cover suchen" stellt Apple- und CAA-Ausgaben zur
  Wahl — bewusst als Knopf mit Auswahl, weil über Namen gematcht sonst still
  das Cover einer anderen Ausgabe (Remaster, Deluxe, Single) auf dem Poster landet.
- **Hochrechnen bringt keine Details zurück.** Der Knopf „Notfall:
  hochrechnen" erscheint nur unter etwa 220 dpi und ersetzt die weiche
  Standard-Interpolation des Browsers durch Lanczos plus leichte
  Unscharfmaskierung. Gemessen an einem Testcover steigt der mittlere
  Kantenkontrast um rund ein Viertel — die Kanten matschen also weniger, aber
  erfundene Schärfe bleibt erfundene Schärfe. Echte Pixel gehen vor.
- **Das Explicit-Kennzeichen** ist nachgezeichnet, nicht das Originallogo des
  RIAA-Markenzeichens.
- **MusicBrainz** wird hier nur für Cover-Art genutzt, nicht für Tracklists.
- **Filme brauchen zwingend einen TMDB-Schlüssel.** Ohne ihn bleibt für Film
  nur der manuelle Weg: Plakat hochladen und die Felder selbst füllen.
- **Der Original-Titelschriftzug** ist nicht zu jedem Film erfasst. Was hochkant
  ankommt, ist bei TMDB falsch einsortiert und wird verworfen — ein
  Titelschriftzug ist immer breiter als hoch; dann wird der Titel gesetzt.
- **FSK-Logos** sind Marken wie das Explicit-Zeichen und deshalb nachgezeichnet.
- **TMDB verlangt Attribution**, mit vorgeschriebenem Wortlaut und Logo. Beides
  steht im Block „TMDB-Zugang". Kommerzielle Nutzung bräuchte eine eigene
  Vereinbarung mit TMDB; privat ist die Nutzung frei.

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

Die Tracklist setzt sich selbst: Spaltenzahl nach Titelanzahl, dann die größte
Schrift, die in die Höhe passt — und anschließend noch einmal verkleinert, bis
auch der längste Titel in seine Spalte passt. Erst wenn das an der Untergrenze
nicht reicht, wird mit „…" gekürzt. Ohne diesen zweiten Schritt stand in der
dreispaltigen Variante hinter jedem zweiten Titel ein Auslassungszeichen.

Auf dem iPad scheiterte in Brave jede Abfrage nach der ersten mit „Load
failed" — WebKits Wortlaut dafür, dass die Verbindung nicht zustande kam.
Safari auf demselben Gerät lief dabei durch, ebenso Brave auf PC und Android;
es liegt also weder an der API (`itunes.apple.com` sendet
`Access-Control-Allow-Origin: *` und drosselt bei zwölf Abfragen nicht) noch an
WebKit allein, sondern an Braves eigener Anfrage-Pipeline auf iOS.

Dagegen stehen zwei Ebenen. `request()` wiederholt dreimal mit wachsender Pause
(0/400/1400 ms) statt einmal nach 250 ms — ein zu schneller zweiter Versuch
greift dieselbe tote Verbindung aus dem Pool wieder ab. Kommt `fetch`
überhaupt nicht durch, laufen die drei iTunes-Endpunkte über JSONP: ein
`<script>`-Tag nimmt einen anderen Weg durch den Browser, ohne CORS und an
blockierten XHR-Pfaden vorbei. Der Preis dafür ist real — JSONP führt Code der
Gegenseite in dieser Seite aus —, deshalb ist es Rückfallebene und gilt nur für
Apples eigene API über HTTPS.

Verschärft hatte das eine eigene Unart: die Cover-Suche über MusicBrainz lud
jedes Bild per `fetch` nur zum Dasein-Test und las den Body nie aus; eine
solche Antwort hält in WebKit die Verbindung offen. Geprüft wird jetzt gar
nicht mehr, das entscheidet der Ladeversuch des Bildes selbst.

Weil sich der iPad-Fehler von hier aus nicht nachstellen lässt, hat die App
einen Abschnitt „Diagnose": ein Protokoll im Speicher der Seite, das jeden
API-Aufruf mit Weg, Ergebnis und **Dauer** festhält, dazu Browserkennung,
Service-Worker-Status und Cache-Namen. Die Dauer ist dabei die eigentliche
Auskunft — bricht eine Anfrage nach wenigen Millisekunden ab, wurde sie
abgelehnt, bevor etwas über die Leitung ging; eine echte Netzstörung braucht
länger. „Verbindung testen" prüft zusätzlich alle beteiligten Hosts einzeln
gegen die eigene Herkunft, und nach einem Fehlschlag läuft automatisch eine
Gegenprobe an einen anderen Host. Das Protokoll verlässt das Gerät nicht.

Die Poster-App bringt selbst keinen Service Worker mit — der des Raumrechners
liegt aber auf derselben Herkunft und hat damit die ganze Site im Scope. Seine
erste Fassung cachte jede Anfrage darin, also auch diese App, und lieferte sie
danach eingefroren aus: neues HTML mit altem JavaScript, die Initialisierung
brach ab, die Suche reagierte nicht mehr. Sichtbar wurde das nur auf Geräten,
auf denen der Raumrechner schon einmal lief. `app/sw.js` cacht jetzt
ausschließlich die eigenen Dateien aus `ASSETS`; die Cache-Version wanderte auf
v6, damit die alte samt Poster-Resten gelöscht wird. Weil ein reparierter
Worker betroffene Geräte aber erst erreicht, wenn er nachgeladen wird, räumt
`poster/js/sw-recovery.js` beim Start die eigenen Einträge aus jedem Cache und
lädt einmalig neu — überall sonst ein No-Op.

Die Wand-Vorschau hängt das Poster über ein Sofa, und zwar maßstabsgetreu:
`room.svg` zeigt einen Ausschnitt von 130 cm Wandbreite, daraus rechnet
`updateWallScale()` die Breite des Rahmens in Prozent. Ein A4-Poster nimmt dort
16 % der Bildbreite ein, ein A2 32 % — der Größenunterschied, den man sonst
erst nach dem Drucken sieht. Die Szene ist gezeichnetes SVG statt Foto: kein
Lizenzthema, ein paar Kilobyte, und sie lässt sich gegen ein echtes Foto
tauschen, indem `room.svg` ersetzt wird (gleicher Ausschnitt, gleiche 130 cm).

Spotify-Code und QR-Code haben verschiedene Formate — ein breiter Streifen
gegen ein Quadrat. Die Stile geben deshalb nur eine Box samt Ausrichtung vor,
gezeichnet wird darin je nach Codeart unterschiedlich; sonst klebte der QR-Code
dort in der Ecke, wo der Spotify-Streifen bündig säße.

### Aufbau

```
poster/
  index.html            Einstiegspunkt
  version.json          Version des Beta-Kanals
  release.json          Zeiger auf den freigegebenen Commit
  img/tmdb.svg          Logo für die vorgeschriebene TMDB-Attribution
  build.js              Kanal/Version/Commit — beim Deploy je Kanal erzeugt
  styles.css            Design-Tokens, Formulare, Wand-Vorschau
  room.svg              gezeichnete Wohnzimmerwand für die Wand-Vorschau
  fonts/                Fonts für alle drei Stile, offline mitgeliefert (woff2)
  vendor/               jsPDF und ein QR-Code-Generator, offline mitgeliefert
  js/
    api.js              Suche, Tracklist/Albumangaben, Spotify-Anbindung
    color.js            Farbpalette aus dem Cover extrahieren
    parts.js            geteilte Bausteine: Tracklist, Farbfelder, Player, Platte
    qrcode.js           Wrapper um den QR-Code-Generator
    log.js              Diagnose-Protokoll (bleibt auf dem Gerät)
    sw-recovery.js      räumt Reste des Raumrechner-Workers aus dem Cache
    tmdb.js             Filmdaten und Plakate von TMDB
    upscale.js          Notfall-Hochrechnung kleiner Cover (Lanczos + Unscharfmaske)
    export.js           PNG-/PDF-Export bei echten 300 dpi (A4/A3/A2)
    utils.js            Canvas-, Farb-, Datums- und Text-Hilfsfunktionen
    main.js             Zustand, Verkabelung, Live-Vorschau
    styles/             ein Modul je Stil, alle mit derselben draw(ctx, W, H, model)
      filmkeyart.js     filmminimal.js  filmticket.js
      tracklist.js      nowplaying.js   swiss.js
      pantone.js        linernotes.js   vinylsleeve.js
      minimal.js        vintage.js      grunge.js
```

Ein Stil ist eine Datei mit einer einzigen Funktion `draw(ctx, W, H, model)`.
Alle Koordinaten darin sind Vielfache von `W` und `H`, nie feste Pixel — deshalb
zeichnet derselbe Code die 720-Pixel-Vorschau und das A2-Poster mit 4961 Pixeln
Breite. Ein neuer Stil braucht nur diese Datei, einen Eintrag in `index.html`
und eine Zeile in der Stilauswahl.

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
| Messwerte mit Live-Bewertung gegen den passenden Grenzwert | fertig |
| Checklisten mit drei Zuständen, Bewertung je Schritt überschreibbar | fertig |
| Prüffristen: Richtwert wählen, Fälligkeit im Auftrag und im Protokoll | fertig |
| Serienprüfung: „Nächstes Gerät" übernimmt die Kopfdaten | fertig |
| Wissensdatenbank: Messverfahren, Netzformen, Fehlerquellen, Grenzwerte | fertig |
| Protokoll als A4-Bogen über den Druckdialog (auch „Als PDF speichern") | fertig |
| Tageslicht-Modus und größere Schrift für den Einsatz draußen | fertig |
| Speicherung auf dem Gerät, Prüfer und Messgerät werden gemerkt | fertig |
| Offline-Betrieb inklusive aller Datenpakete | fertig |
| Erinnerung an fällige Prüfungen (Kalender-Export) | geplant |
| Mängelfotos im Protokoll | geplant |

### Normdaten pflegen

Normen, Grenzwerte und Wiki-Inhalte stehen als JSON unter `pruefung/data/`. Eine
Änderung an der Norm ist damit ein Datei-Austausch, kein Eingriff in den Code:

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
    wizard.js           Entscheidungsbaum: Fragen überspringen, antworten, Replay
    plan.js             Prüfplan bauen, topologisch ordnen, Bewertungen ableiten
    store.js            Zustand, localStorage, Aufträge und Messergebnisse
    ui.js               Bausteine: Messzeile, Bewertungsschalter, Grenzwerttabelle, Wiki-Blöcke
    view-auftraege.js   Aufträge, Normauswahl, Auftragsdaten
    view-wizard.js      Fragen, Hinweisknoten, Antwortübersicht
    view-plan.js        Prüfplan und Schritt-Detail mit Messwerterfassung
    view-wiki.js        Wissensdatenbank mit Suche und Filtern
    view-protokoll.js   Zusammenfassung und A4-Druckbogen
    app.js              Kopfzeile, Router, Service-Worker-Registrierung, Selbsttest
  data/
    index.json          Registry: Datenstand, Welten, Grenzwerte, Normen, Wiki
    welten.json         EFH und Industrie: Labels, Begriffe, Akzent, Schwerpunkte
    grenzwerte.json     alle Grenzwerttabellen und Formeln, per ID referenzierbar
    prueffristen.json   Richtwerte für Prüffristen, getrennt nach Anlage und Gerät
    normen/
      anlagenpruefung.json   DIN VDE 0100-600 und 0105-100 als zwei Varianten
      geraetepruefung.json   DIN EN 50678 und 50699 als zwei Varianten
    wiki/               Messverfahren, Netzformen, Fehlerquellen, Geräte, Grundlagen
```
