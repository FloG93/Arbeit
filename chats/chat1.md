# Raum- und Deckenflächen Rechner

_Started 2026-09-11 09:09 UTC_

---

## User

Ich möchte eine kleine, unkomplizierte Web App, die mich schnell und einfach Raumwandflächen, Deckenflächen berechnen lässt. 
Es soll eine Option geben um Fenster, Terassentüren, Türen etc abzuziehen von der Brutto Wandfläche. Gerne auch beide Darstellungen anzeigen, brutto wandfläche und netto wandfläche.
am Ende soll sie auf einem Android Smartphone laufen für unterwegs.

In einem zweiten schritt sollen über eingegebene Maße Grundrisse eingezeichnet werden können. erstmal nur Raum spezifisch kein vollständiger Grundriss für eine ganze Etage. 

Alle Ergebnisse sollen formschön in einem PDF und/ oder einer Excel ausgegeben werden können.

Plane erstmal lass uns danach entscheiden in welcher Reihenfolge was gemacht werden soll.

## Assistant



## Assistant

_[tool: list_files]_

**Plan — 3 Bausteine**

**A · Flächenrechner (Kern)**
Raum anlegen (Name, Länge × Breite × Höhe) → automatisch: Umfang, Deckenfläche, Bodenfläche, Brutto-Wandfläche. Darunter eine Abzugsliste: Fenster / Türen / Terrassentür / Sonstiges, jeweils B × H × Anzahl, mit Presets (z. B. Standardtür 0,885 × 2,01 m). Ergebnis-Karte zeigt Brutto und Netto nebeneinander, plus Abzugssumme. Mehrere Räume in einem Projekt, Summenzeile. Läuft als installierbare Web-App (Android-Homescreen, offline, Speicherung lokal).

**B · Grundriss pro Raum**
Aus den Maßen wird der Raumumriss maßstäblich gezeichnet. Fenster/Türen werden als Öffnungen auf eine Wand gelegt (Wand wählen + Abstand von der Ecke). Optional später: L-förmige Räume / Dachschrägen — das ist der eigentliche Komplexitätssprung, deshalb Frage unten.

**C · Export**
PDF: Deckblatt Projekt + je Raum eine Seite mit Maßtabelle, Brutto/Netto und Grundriss-Zeichnung. Excel/CSV: eine Zeile pro Raum + eine Zeile pro Abzug, Summen unten.

**Vorgeschlagene Reihenfolge:** A komplett → Export PDF (weil dort schon Nutzen entsteht) → B → Excel. Aber das entscheidest du.

Ein paar Fragen, damit ich nicht falsch abbiege:

_[tool: ask_user]_

Warte auf deine Antworten — vor allem auf die Reihenfolge und die Raumkomplexität (Dachschrägen wären der größte Zusatzaufwand).

## User

Answered — Asked for follow-up questions; order: Erst ein klickbarer Entwurf aller drei, dann Details; purpose: Malern / Tapezieren, Angebote & Kalkulation, Gemischt; geometry: Nur Rechtecke (L × B × H), Rechtecke + einzelne Wände frei eingeben, Auch L-Form / Erker; deductions: Fenster, Zimmertür, Terrassen-/Balkontür, Freie Fläche (B×H); presets: Ja, mit Standardmaßen; projects: Projekte mit Räumen darin; extras: Preis pro m² → Summe, Foto pro Raum, Notizfeld pro Raum; export_look: Kundenfähiges Angebot-Layout; device: Android-Smartphone

## Assistant



## Assistant

_[tool: ask_user]_

Zweite Runde ist oben — wichtigste Punkte: L-Form-Eingabe und Umfang des Angebots-PDFs.

## User

Answered — Asked for follow-up questions; lform_input: Wandliste: jede Wand einzeln mit Länge, Höhe gemeinsam; pricing: Ein Preis pro m² für alles; offer_header: Datum, Gesamtsumme; netto_default: Netto groß, Brutto klein; ceiling_floor: Decke und Boden getrennt zeigen; entry_flow: Ein Formular, alles auf einer Scroll-Seite

## Assistant



## Assistant

_[tool: ask_user]_

Letzte Runde ist oben — vor allem die Frage, wie der Grundriss aus der Wandliste entsteht.

## User

Answered — wall_count: Anzahl vorher wählen (3–8); wall_naming: Nord / Ost / Süd / West; plan_source: Grundriss automatisch aus der Wandliste zeichnen; plan_openings: Ja, mit Position ab Ecke; sum_scope: Netto-Wandfläche, Brutto-Wandfläche, Deckenfläche, Anzahl Räume, Summe €

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Klickbarer Entwurf aller drei Bausteine liegt vor — bedienbar, die Zahlen rechnen live.

Drin: Projekt mit Räumen und Summenzeile · Raumformular (Höhe, Wandanzahl 3–8, Wände als Nord/Ost/Süd/West mit Länge, Ecke links/rechts für L-Form) · Abzüge mit Presets, Wandzuordnung und Abstand ab Ecke · Netto groß / brutto klein, Decke und Boden getrennt · Preis pro m² · Grundriss automatisch aus der Wandliste mit verorteten Öffnungen · Angebotsblatt-Vorschau. CSV lädt echt herunter.

Noch Attrappe: Foto, echter PDF-Druck, Speichern auf dem Gerät. Sag, was zuerst richtig gebaut wird.

