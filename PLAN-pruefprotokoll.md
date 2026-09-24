# Plan: Prüfassistent an das IHK-Prüfprotokoll angleichen

Stand 24.09.2026. **Noch nicht freigegeben, noch nichts gebaut.** Grundlage ist
der Abgleich des Prüfassistenten mit dem Prüf- und Messprotokoll „Erst- und
Wiederholungsprüfung el. Anlagen" der IHK-Abschlussprüfung Winter 2023/24
(Industrieelektriker/-in Betriebstechnik, Formular W23 1086 B1).

Das Formular ist kein Normtext, aber es bildet die übliche Protokollstruktur
ab und ist damit ein brauchbarer Maßstab. Wo die App mehr kann als das
Formular (Spannungsfall, SELV/PELV, Wallbox, PV, EX, Not-Halt), bleibt das
so — sie ist ein Assistent, kein Formularvordruck.

---

## 1. Leitentscheidungen

Diese sechs Punkte bestimmen alles Weitere. Sie stehen hier vorn, damit sie
einmal entschieden und nicht in jedem Unterpunkt neu verhandelt werden.

### L1 — Ein Auftrag ist ein Verteiler, nicht ein Stromkreis

Heute ist ein Auftrag genau ein Stromkreis: `job.results` hält je Prüfschritt
einen Wertesatz, der Assistent fragt „Welcher Stromkreis wird bewertet?" im
Singular. Künftig ist ein Auftrag ein **Stromkreisverteiler mit n
Stromkreisen** — wie das Formular, das unter einer Verteiler-Nr. eine Zeile je
Stromkreis führt.

### L2 — Der Geltungsbereich steht am Prüfschritt, nicht im Code

Neuer Schlüssel im Schritt-JSON: `scope: "stromkreis"`. Fehlt er, gilt
`"anlage"`. Damit entscheidet die Datenbasis, was je Stromkreis und was einmal
je Anlage erfasst wird — kein Sonderfall im Code, dieselbe Linie wie `when`
und `requires`.

### L3 — Grenzwerte folgen den Fakten des Stromkreises

Heute lösen sich Grenzwerte aus `job.session.facts` auf (Netzform,
Stromkreisart, RCD-Nennfehlerstrom). In einem Verteiler unterscheiden sich
diese Fakten **je Stromkreis**: Endstromkreis 16 A neben Verteilungsstromkreis
63 A, RCD 30 mA neben 300 mA. Jeder Stromkreis bekommt deshalb ein eigenes,
kleines Faktenblatt; die Antworten des Assistenten sind die Vorbelegung für
neue Stromkreise, kein Zwang.

Aufgelöst wird gegen `Object.assign({}, job.session.facts, kreis.facts)`.

### L4 — Der Druckbogen bildet die Spalten des Formulars nach

Hochformat A4, die Messtabelle mit denselben Spalten und in derselben
Reihenfolge wie das IHK-Formular. Das Formular zeigt, dass es im Hochformat
geht (rund 14 schmale Spalten auf 182 mm). Wer den Bogen kennt, findet sich
sofort zurecht.

### L5 — Keine Schema-Erhöhung

`store.js` verwirft heute den **gesamten** gespeicherten Zustand, wenn
`schemaVersion` nicht exakt `SCHEMA` ist:

```js
if (parsed && parsed.schemaVersion === SCHEMA) S.state = Object.assign(defaultState(), parsed);
```

Ein Hochzählen von `SCHEMA` löscht also alle Aufträge, Messwerte und
Leitungsrechnungen auf dem Gerät. `SCHEMA` bleibt deshalb auf 1; migriert wird
je Auftrag in `migrateJob()`, wie schon bei den umbenannten Normpaketen.

> **Nebenbefund, unabhängig von diesem Plan:** Dieses Verwerfen ist eine
> Falle für jede künftige Änderung. Eigener kleiner Schritt: `load()` so
> umbauen, dass es bei kleinerer `schemaVersion` migriert statt wegwirft, und
> nur bei größerer (Zustand aus einer neueren App-Fassung) unangetastet lässt.

### L6 — Paket 1 und 2 zusammen ausliefern, Paket 3 danach

Paket 1 und 2 sind additiv und berühren den Druckbogen nur an seinen Rändern.
Paket 3 schreibt den Bogen ohnehin neu. Zwei Auslieferungen statt drei sparen
einen kompletten Durchgang durch Druckbogen, Tests und Prüfliste.

---

## 2. Paket 1 — Kopfdaten, Anlass, Erder, Sichtprüfung

Additiv, keine Strukturänderung. Alles davon ist auch ohne Paket 3 sinnvoll.

### 1.1 Kopfdaten vervollständigen

`data/normen/anlagenpruefung.json`, Block `protocol.fields`. Neue Felder, in
der Reihenfolge des Formulars:

| Feld-ID | Label | kind | Eigenschaften | Formular |
| --- | --- | --- | --- | --- |
| `kundennr` | Kunden-Nr. | text | — | Kopf rechts |
| `auftragsnr` | Auftrags-Nr. | text | — | Kopf Mitte |
| `auftragnehmer` | Auftragnehmer | text | `sticky` | Kopf rechts |
| `netzbetreiber` | Verteilungsnetzbetreiber | text | `sticky` | eigene Zeile |
| `netz_spannung` | Netz (V) | text | `default: "230/400"` | Zeile „Netz:" |
| `netz_frequenz` | Netz (Hz) | text | `default: "50"` | Zeile „Netz:" |
| `messgeraet2` | Messgerät 2 (Fabrikat, Typ) | text | `sticky` | „Verwendete Messgeräte" |
| `messgeraet3` | Messgerät 3 (Fabrikat, Typ) | text | `sticky` | „Verwendete Messgeräte" |

`auftragnehmer` ist **nicht dasselbe wie `pruefer`**: das Formular trennt die
ausführende Firma von der prüfenden Person. Beide sind `sticky`, beide wechseln
selten.

Das bestehende `messgeraet` bekommt das Label „Messgerät 1 (Fabrikat, Typ)".

**Nötige Code-Änderung:** `S.newJob()` in `js/store.js` wertet `field.default`
bisher nur für `"today"` aus. Es muss jeden anderen `default`-Wert als
Vorbelegung übernehmen (drei Zeilen).

**Blatt-Nr.:** „Blatt __ von __" ist Papier-Paginierung. Kein Eingabefeld —
der Druckbogen setzt sie selbst, sobald er mehrseitig wird (Paket 3).

### 1.2 Prüfanlass auf fünf Werte

Das Formular kennt: Neuanlage, Erweiterung, Änderung, Instandsetzung,
Wiederholungsprüfung. Die App kennt zwei (`pruefanlass`: `erstpruefung`,
`wiederholung`).

- Neue Frage `q-anlass` im Einstieg der Variante `erstpruefung`, Fakt `anlass`
  mit `neuanlage` / `erweiterung` / `aenderung` / `instandsetzung`.
- Variante `wiederholung` setzt `anlass: "wiederholung"` in `presetFacts`.
- Neues Protokollfeld `anlass` mit `kind: "fact"`, `factKey: "anlass"` — es
  übernimmt die Antwort, statt sie ein zweites Mal abzufragen (Mechanismus
  existiert bereits, siehe Feld `schutzklasse` im Gerätepaket).
- `pruefanlass` bleibt, wie es ist: es steuert die Varianten und damit die
  Prüfschritte. `anlass` ist die feinere Angabe fürs Protokoll.
- Abgleich mit `q-w-veraenderung`: Die Wiederholungsvariante fragt bereits
  „seit der letzten Prüfung erweitert oder geändert?" und führt auf
  `r-w-erweiterung` („Geänderter Teil: Erstprüfung nötig"). Die Formulierung
  dort muss zur neuen Anlass-Auswahl passen, damit nicht zwei Stellen
  dasselbe unterschiedlich benennen.

### 1.3 Erdungswiderstand auch außerhalb von TT

Heute: `s-erdungswiderstand-ra` mit `when: {netzform: "tt"}`. Das Formular
erfasst `RE` unabhängig von der Netzform — der Fundamenterder wird auch im
TN-System gemessen und dokumentiert.

Lösung ohne neuen Mechanismus: **zweiter Schritt** statt bedingtem Grenzwert.

| Schritt | `when` | Grenzwert | Zweck |
| --- | --- | --- | --- |
| `s-erdungswiderstand-ra` (vorhanden) | `{netzform: "tt"}` | `erdungswiderstand-tt` | bewertet, RA ≤ 50 V / IΔn |
| `s-erder-re` (neu) | `{netzform: ["tn-c","tn-s","tn-c-s","it"]}` | keiner | dokumentiert RE, kein Grenzwert |

`s-erder-re` bekommt `protocolSoll: "—"` und einen `limitHint`, der sagt,
warum hier kein Grenzwert steht: Der Wert dient dem Nachweis des Erders und
dem Vergleich über die Jahre, nicht einer Abschaltbedingung.

### 1.4 Durchgängigkeit des Potenzialausgleichs als eigener Schritt

Das Formular listet 14 Anbindungen zum Abhaken plus `RE`. Die App misst heute
einen einzelnen Wert `r_pa` ohne Angabe, *wohin* gemessen wurde.

Neuer Schritt `s-pa-durchgaengigkeit`, `phase: "messen"`, `scope: "anlage"`,
mit einer Checkliste aus genau den Zielen des Formulars:

Fundamenterder · Potenzialausgleichsschiene · Wasserzwischenzähler ·
Hauptwasserleitung · Hauptschutzleiter · Gasinnenleitung · Heizungsanlage ·
Klimaanlage · Aufzugsanlage · EDV-Anlage · Telefonanlage · Blitzschutzanlage ·
Antennenanlage/BK · Gebäudekonstruktion

**Das braucht einen vierten Zustand in der Checkliste.** `U.checkRow` kennt
heute offen → OK → Mangel. „Gasinnenleitung nicht vorhanden" ist aber der
Normalfall in vielen Objekten und darf im Protokoll nicht wie ein übersehener
Punkt aussehen. Vorschlag: offen → vorhanden/OK → Mangel → **n. a.**, mit
eigenem Symbol (`–`) und eigenem Text. Betrifft `js/ui.js` (eine Funktion) und
alle Checklisten — die drei bestehenden Zustände bleiben unverändert, der
vierte kommt nur dazu.

Der Messwert `r_pa` wandert aus `s-durchgang-schutzleiter` hierher, denn er
gehört fachlich zum Potenzialausgleich, nicht zum Schutzleiter des
Stromkreises. Das ist zugleich die Voraussetzung dafür, dass
`s-durchgang-schutzleiter` in Paket 3 sauber auf `scope: "stromkreis"` gehen
kann (siehe 3.2).

### 1.5 Lücken in Besichtigen und Erproben

Im Formular eigene Punkte, in den Checklisten der App nicht ausdrücklich:

| Punkt | Wohin |
| --- | --- |
| Kennzeichnung N- und PE-Leiter | `s-sicht-anlage`, neue Checklistenzeile |
| Trenn- und Schaltgeräte | `s-sicht-anlage`, neue Zeile (steht bisher nur in `s-sicht-schaltschrank`, also nur bei Maschinen) |
| Gebäudesystemtechnik (Besichtigen) | `s-sicht-anlage`, neue Zeile mit `when: {smarthome: "ja"}` — sonst steht sie in jedem Wohnungsverteiler ohne Aktorik im Weg |
| Gebäudesystemtechnik (Erproben) | `s-funktion-schutzeinrichtungen`, neue Zeile, gleiches `when` |

Der Fakt für das `when` existiert bereits: die Mehrfachauswahl
`q-besonderheiten` mit Option `o-smarthome`.

---

## 3. Paket 2 — Fehlende Messgrößen

### 2.1 Kurzschlussstrom Ik

Das Formular führt `Ik (A)` direkt neben `Zs (Ω)`. Jeder Installationstester
gibt beides aus.

- Neues Eingabefeld `ik` in `s-schleifenimpedanz`, Einheit A, `aggregate` bleibt
  `max` — `ik` bekommt `role: "reference"`, damit `keyValue()` weiterhin Zs als
  maßgeblichen Wert ins Protokoll schreibt und nicht den viel größeren Strom.
- Bewertung: Ohne Paket 3 rein dokumentierend. **Mit** Paket 3 kennt der
  Stromkreis sein Schutzorgan, und `P.cable` kann Ia bestimmen → `ik` wird
  gegen `Ia` bewertet (`Ik ≥ Ia`). Dieselbe Brücke liefert dann auch den
  Zs-Sollwert, der heute von Hand eingetragen wird.
- Der Rechenkern kann das längst; es fehlt nur die Verbindung zwischen
  Leitungsberechnung und Prüfprotokoll.

### 2.2 Berührungsspannung

Fehlt in der App vollständig. Das Formular hat drei Angaben: die Grenze
`UL ≤ __ V`, die Auswahl `AC ☐ DC ☐` und den Messwert `Umess (V)`.

Neuer Schritt `s-beruehrungsspannung`, `phase: "messen"`, `scope: "stromkreis"`:

| Eingabe | Label | Einheit | Besonderheit |
| --- | --- | --- | --- |
| `ul_grenze` | Grenze UL | V | `role: "reference"`, `quickValues` 50 und 25 |
| `u_mess` | Umess | V | `limitFromInput: "ul_grenze"` |

Damit greift exakt der Mechanismus, der schon bei der Schleifenimpedanz
funktioniert: Der Sollwert ist ein zweites Feld desselben Schrittes, und das
Protokoll zeigt Soll und Ist richtig. Kein neuer Code.

Die Stromart AC/DC wird ein Fakt `beruehrung_art` aus einer neuen
Wizard-Frage — oder, kleiner, eine Checklistenzeile im Schritt. **Offene
Entscheidung, siehe O4.**

Neue Grenzwertzeilen in `data/grenzwerte.json`, Tabelle
`beruehrungsspannung` (neu): 50 V (Standard) und 25 V (erhöhte Gefährdung,
z. B. landwirtschaftliche Betriebsstätten). Leerer `reviewed`-Block, damit das
Badge „Datenbasis ungeprüft" auch hier steht, und Aufnahme in die Prüfliste.

### 2.3 Isolationswiderstand ohne und mit Verbraucher

Das Formular hat je Stromkreis zwei Zeilen: `1` ohne, `2` mit Verbraucher.

Sechs Eingabefelder (L–PE, N–PE, L–N je zweimal) wären im Feld unbedienbar.
Vorschlag: die drei bestehenden Felder gelten als „ohne Verbraucher", dazu
**ein** neues Feld `riso_mit_verbraucher` („Gesamtwert mit Verbrauchern",
optional). Das trifft die Absicht des Formulars — zeigen, ob ein angeschlossener
Verbraucher den Wert drückt — ohne die Eingabemaske zu verdreifachen.

Der Druckbogen füllt damit beide Zeilen: Zeile 1 aus dem kleinsten der drei
Einzelwerte, Zeile 2 aus dem neuen Feld.

---

## 4. Paket 3 — Stromkreise

Der große Umbau. Berührt Datenmodell, Assistent, Plan, Protokoll, Druckbogen,
Speicher und Tests.

### 3.1 Datenmodell

```js
job = {
  id, world, normId, variantId,
  protocol: { … },            // unverändert, plus Felder aus Paket 1
  session: { facts, … },      // unverändert: die Antworten des Assistenten
  results: { stepId: {…} },   // NUR noch Schritte mit scope "anlage"
  kreise: [                   // NEU
    {
      id,                     // laufende Nummer, stabil
      nr: "1",                // Nr. im Formular, frei editierbar
      ziel: "Steckdosen Küche",
      leitung: { typ: "NYM-J", adern: 3, querschnitt: 1.5 },
      schutz:  { art: "ls", char: "B", in: 16 },
      facts:   { stromkreisart: "end-tn", rcd: "ja", rcd_in: "30ma", … },
      results: { stepId: {…} },   // Schritte mit scope "stromkreis"
      calcId: null            // optionale Verknüpfung zur Leitungsberechnung
    }
  ],
  verteiler: "UV Keller",     // NEU: „Stromkreisverteiler-Nr." des Formulars
  interval: { … }             // unverändert
}
```

`leitung` und `schutz` haben bewusst dieselbe Form wie in
`data/leitungen.json` — so lässt sich eine Leitungsrechnung direkt an einen
Stromkreis hängen (`calcId`), statt die Angaben doppelt zu pflegen.

### 3.2 Welcher Schritt bekommt welchen Geltungsbereich

`scope: "stromkreis"`:

- `s-durchgang-schutzleiter` — RPE low je Stromkreis (nachdem `r_pa` in Paket 1
  herausgelöst wurde)
- `s-iso-widerstand` — Riso je Stromkreis
- `s-schleifenimpedanz` — Zs und Ik je Stromkreis
- `s-spannungsfall` — je Stromkreis
- `s-beruehrungsspannung` (neu aus Paket 2)
- `s-rcd-ausloesestrom`, `s-rcd-ausloesezeit` — das Formular führt die
  RCD-Spalten je Stromkreiszeile
- `s-w-differenzstrom` — IΔ je Stromkreis
- `s-selv-pelv-trennung` — betrifft den einzelnen Kreis

`scope: "anlage"` (alles Übrige, ausdrücklich):

- alle Sichtprüfungen, alle Erprobungen, `s-drehfeld`
- `s-pa-durchgaengigkeit`, `s-erdungswiderstand-ra`, `s-erder-re`
- `s-boden-wand-widerstand`
- `s-pruefplakette`, `s-frist`, `s-doku-protokoll`
- die Nachweise zu Wallbox, PV, Not-Halt, SPD

**Ein RCD versorgt oft mehrere Stromkreise.** Das Formular löst das durch
Wiederholung der Werte in jeder Zeile. Die App bekommt dafür im Stromkreis
die Aktion „Werte vom vorigen Stromkreis übernehmen" (RCD-Felder und
Schutzorgan) — abtippen wäre im Keller die sichere Quelle für Zahlendreher.

### 3.3 Assistent

- `q-stromkreisart`, `q-rcd`, `q-rcd-nennfehlerstrom`, `q-nennspannung`
  beantworten künftig die Frage „*wie sieht der typische* Stromkreis dieser
  Anlage aus?" Ihre Antworten werden **Vorbelegung** für neue Stromkreise.
  Die Fragetexte müssen das sagen, sonst wirkt der Assistent, als frage er
  nach einem einzelnen Kreis.
- `q-netzform` bleibt Anlagen-Fakt: Die Netzform wechselt innerhalb eines
  Verteilers nicht.
- Am Ende des Assistenten: „Wie viele Stromkreise hat der Verteiler?" mit
  Schnellwerten, legt gleich n Stromkreise an. Nachträgliches Hinzufügen und
  Löschen bleibt jederzeit möglich.

### 3.4 Plan-Ansicht

- Der Plan zeigt oben die Anlagen-Schritte wie heute.
- Darunter ein Abschnitt **Stromkreise**: je Kreis eine Karte mit Nr.,
  Zielbezeichnung, Leitung, Schutzorgan und einem Fortschritt („4 von 6
  bewertet", Mängel als Kennzeichen).
- Eine Karte antippen öffnet den Stromkreis: oben seine Stammdaten
  (Nr., Ziel, Leitung, Schutzorgan, seine Fakten), darunter seine Prüfschritte
  in derselben Darstellung wie heute.
- `P.nav.kreisId` kommt zu `P.nav` und in `navState()`, damit die Zurück-Taste
  Stromkreis → Liste → Plan führt.
- Aktionen je Stromkreis: hinzufügen, duplizieren (für gleichartige Kreise),
  löschen, Reihenfolge ändern.

### 3.5 Betroffene Funktionen im Code

| Datei | Was sich ändert |
| --- | --- |
| `js/store.js` | `kreise` in `defaultState`/`normalizeJob`; `newKreis`, `patchKreis`, `duplicateKreis`, `removeKreis`, `moveKreis`; `setResult` bekommt einen optionalen `kreisId`-Parameter und schreibt in den richtigen Beutel; Migration in `migrateJob` |
| `js/plan.js` | `build()` bekommt den Geltungsbereich als Filter und die zusammengeführten Fakten; `summary()` summiert über Anlage **und** alle Stromkreise; `verdict`, `keyValue`, `overridden` bleiben unverändert (sie bekommen ohnehin `result` übergeben) |
| `js/view-plan.js` | Abschnitt Stromkreise, Stromkreis-Ansicht, Stammdaten-Formular |
| `js/view-protokoll.js` | Zusammenfassung über alle Kreise; Druckbogen neu (siehe 3.6) |
| `js/app.js` | `P.nav.kreisId`, `navState`, Selbsttest um Geltungsbereichs-Prüfungen |
| `js/limits.js` | unverändert — es bekommt die Fakten übergeben |

**Achtung bei `requires`:** Heute prüft `blockedBy`, ob der vorausgesetzte
Schritt bewertet ist, und sucht dessen Ergebnis in `job.results`. Bei
gemischten Geltungsbereichen muss die Suche in den richtigen Beutel greifen.
Regel: Ein Stromkreis-Schritt darf einen Anlagen-Schritt voraussetzen
(Freischaltung vor Isolationsmessung), umgekehrt nicht. Der Selbsttest muss
das erzwingen, sonst entsteht eine Vorbedingung, die nie erfüllbar ist.

### 3.6 Druckbogen

Aufbau in der Reihenfolge des Formulars:

1. Kopf: Prüfung nach / Anlass / Netz / Netzsystem / Netzbetreiber, Kopfdaten
   zweispaltig wie heute, dazu die neuen Felder aus Paket 1.
2. **Besichtigen** — die Checklistenpunkte dreispaltig mit i.O./n.i.O.
3. **Erproben** — ebenso.
4. **Messen** — die Tabelle, eine Zeile je Stromkreis, Spalten in der
   Reihenfolge des Formulars:

   Nr. · Zielbezeichnung · Typ · Anzahl × Querschnitt · Art/Charakteristik ·
   In (A) · Zs (Ω) · Ik (A) · Riso ohne (MΩ) · Riso mit (MΩ) · IΔn/Art ·
   IΔn (mA) · Imess (mA) · tA (ms) · UL (V) · Umess (V) · RPE (Ω)

5. **Durchgängigkeit des Potenzialausgleichs** — die 14 Ziele als Raster,
   dazu RE.
6. **Verwendete Messgeräte** — drei Felder.
7. **Prüfergebnis** — keine Mängel / Mängel, Prüfplakette ja/nein, nächster
   Prüftermin Monat/Jahr.
8. **Mängel/Bemerkungen** samt dem Satz des Formulars: „Die elektrische Anlage
   entspricht den anerkannten Regeln der Elektrotechnik. Ein sicherer Gebrauch
   bei bestimmungsgemäßer Anwendung ist gewährleistet." mit ja/nein. Dieser
   Satz ist eine **Erklärung des Prüfers**, keine Rechenfolge der App: Er wird
   aus dem Ergebnis vorbelegt, bleibt aber von Hand änderbar, und das Protokoll
   vermerkt, wenn er vom Messergebnis abweicht — dieselbe Regel wie bei einer
   von Hand überstimmten Bewertung.
9. **Unterschriften** — Auftraggeber und Prüfer, je mit Ort, Datum,
   Unterschrift (heute fehlen Ort und Datum).
10. Prüfstand-Satz der Grenzwerte und Haftungshinweis wie bisher.

Mehrseitigkeit: „Blatt 1 von n" im Kopf, Seitenumbruch zwischen den Blöcken
über `break-inside: avoid`. Ab etwa 12 Stromkreisen bricht die Messtabelle auf
eine zweite Seite; der Tabellenkopf wiederholt sich (`thead` mit
`display: table-header-group`).

### 3.7 Migration bestehender Aufträge

In `migrateJob()`: Hat ein Auftrag `kreise` noch nicht, wird aus den
vorhandenen Werten **ein** Stromkreis „1" gebildet. Die Werte der Schritte mit
`scope: "stromkreis"` wandern aus `job.results` in `kreis.results`, der Rest
bleibt. Der Kreis erbt die Fakten der Sitzung. Nichts geht verloren, kein
Auftrag muss neu angelegt werden.

Dazu ein Selbsttest-Fall, der genau diesen alten Auftragsstand aufbaut,
migriert und prüft, dass jeder Messwert wieder an seinem Platz steht.

---

## 5. Querschnittsarbeiten (für jedes Paket)

### Grenzwerte und Prüfliste

- Neue Tabellen (`beruehrungsspannung`) bekommen einen leeren
  `reviewed`-Block — Badge „Datenbasis ungeprüft".
- `werkzeuge/pruefliste/build-review-items.py` erweitern, neue Gruppen hinten
  anhängen, **bestehende Item-IDs nicht ändern**, unter derselben URL neu
  veröffentlichen.

### Selbsttest (`P.selftest`)

Neue Prüfungen:
- Jeder Schritt hat einen gültigen `scope` (`anlage` oder `stromkreis`).
- Kein Anlagen-Schritt setzt einen Stromkreis-Schritt voraus.
- Jedes Protokollfeld mit `kind: "fact"` verweist auf einen Fakt, den der Baum
  tatsächlich setzen kann.
- Die Vorbelegung neuer Stromkreise ergibt für jede Welt einen auflösbaren
  Grenzwert (kein Kreis ohne Abschaltzeit-Zeile).
- Migration alter Aufträge (siehe 3.7).

### Regressionstest (`werkzeuge/pruefassistent-check.js`)

Je Paket ergänzen:
- **P1:** neue Kopfdaten tippen und im Bogen wiederfinden; Anlass-Auswahl
  erscheint im Protokoll; RE-Schritt taucht im TN-System auf; vierter
  Checklisten-Zustand „n. a." schaltet durch und steht im Bogen.
- **P2:** Berührungsspannung gegen die eingetragene Grenze bewertet (Soll/Ist
  wie bei Zs, inklusive Mangel bei Überschreitung); Ik erfasst und im Bogen;
  Riso mit Verbraucher als zweite Zeile.
- **P3:** zwei Stromkreise anlegen, in beiden messen, unterschiedliche Fakten
  je Kreis (RCD 30 mA gegen 300 mA) und prüfen, dass **jeder Kreis gegen
  seinen eigenen Grenzwert** bewertet wird; Zurück-Taste Kreis → Liste → Plan;
  Druckbogen enthält beide Zeilen; Migration eines Alt-Auftrags; alles bei
  360 px, Kontrast und Tippziele in allen vier Farbmodi.

### Pflichtprogramm nach jeder Änderung

`CACHE` in `pruefung/sw.js` hochzählen, neue Dateien in `ASSETS`,
`version.json` und `data/index.json` (`datenstand`) setzen, README-Abschnitt
„Prüfassistent" nachziehen, Selbsttest und `pruefassistent-check.js` grün.

---

## 6. Reihenfolge

| Schritt | Inhalt | Ergebnis |
| --- | --- | --- |
| 1 | Paket 1 (1.1–1.5) | Kopfdaten und Sichtprüfung vollständig, RE überall |
| 2 | Paket 2 (2.1–2.3) | alle Messgrößen des Formulars erfasst |
| 3 | Druckbogen auf Formularaufbau umstellen, noch ein Stromkreis | Bogen sieht aus wie das Formular |
| 4 | Auslieferung 0.4.0 | |
| 5 | Paket 3: Datenmodell, Migration, Store | Stromkreise im Speicher |
| 6 | Paket 3: Plan-Ansicht | Stromkreise bedienbar |
| 7 | Paket 3: Protokoll und Druckbogen mehrzeilig | |
| 8 | Brücke zur Leitungsberechnung (Zs-Sollwert und Ia aus `P.cable`) | |
| 9 | Auslieferung 0.5.0, Prüfliste neu veröffentlichen | |

Schritt 3 vor Paket 3 zu ziehen, hat einen Grund: Der Bogen bekommt seine
endgültige Gliederung, solange er noch einfach ist. Paket 3 fügt dann nur
Zeilen hinzu, statt die Gliederung gleichzeitig umzubauen.

---

## 7. Fallen, die beim Bauen warten

1. **`SCHEMA`-Erhöhung löscht alle Daten** (L5). Nicht anfassen; stattdessen
   `migrateJob`.
2. **Grenzwerte hängen an Fakten** (L3). Wer das übersieht, bewertet jeden
   Stromkreis gegen den RCD des ersten. Der Regressionstest mit zwei
   unterschiedlichen RCD ist genau dafür da.
3. **Neuzeichnen beim Tippen.** Die Stammdaten eines Stromkreises (Nr., Ziel)
   sind Textfelder, deren Änderung nur Anzeigen an anderer Stelle betrifft —
   sie müssen gezielt nachführen statt neu zu zeichnen, sonst schluckt es den
   Fokus. Muster: `P.views.refreshJobMeta` und der Name einer Leitungsrechnung.
4. **Druckbreite.** 17 Spalten im Hochformat sind machbar (das Formular zeigt
   es), aber jede zusätzliche Spalte bringt die Tabelle zum Kippen. Vor dem
   Hinzufügen im Druckbild nachmessen.
5. **Tippziele im Feld.** Die Stromkreisliste wird im Keller mit Handschuhen
   bedient: Karten ≥ 56 px, nicht ≥ 48 px.
6. **Der Konformitätssatz** (3.6, Punkt 8) ist eine Erklärung, keine Rechnung.
   Er darf nie automatisch auf „ja" stehen, wenn ein Mangel erfasst ist.

---

## 8. Offene Entscheidungen

| Nr. | Frage | Empfehlung |
| --- | --- | --- |
| **O1** | Stromkreise überhaupt — oder bleibt die App bewusst ein Ein-Kreis-Werkzeug? | Bauen. Ohne sie bleibt jedes Protokoll einer Unterverteilung eine Sammlung von Einzelbögen. |
| **O2** | Vierter Checklisten-Zustand „n. a." | Ja. Ohne ihn sieht „Gasinnenleitung nicht vorhanden" im Protokoll aus wie ein übersehener Punkt. |
| **O3** | Riso mit Verbraucher: ein zusätzliches Feld statt sechs | Ein Feld. Sechs Felder sind im Feld unbedienbar. |
| **O4** | Berührungsspannung AC/DC: eigene Wizard-Frage oder Checklistenzeile im Schritt? | Checklistenzeile. Eine Frage im Assistenten für eine Angabe, die nur ein Feld des Protokolls füllt, verlängert den Einstieg für alle. |
| **O5** | Verknüpfung Stromkreis ↔ Leitungsberechnung (`calcId`) in Paket 3 oder später? | Später (Schritt 8). Sie ist der Lohn der Arbeit, aber kein Teil davon — Paket 3 steht auch ohne sie. |
| **O6** | `load()` migrationsfähig machen (Nebenbefund aus L5) | Ja, als eigener kleiner Schritt vor Paket 3. |
| **O7** | Gerätepaket (`geraetepruefung.json`) — bleibt es unberührt? | Ja. Das IHK-Formular betrifft Anlagen; Geräte haben ihre eigene Norm und ihr eigenes Protokoll. |
