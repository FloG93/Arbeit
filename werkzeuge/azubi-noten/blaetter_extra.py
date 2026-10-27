# -*- coding: utf-8 -*-
"""Stufe 3: druckfertige Gesprächsseite und Kurzanleitung."""

from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.pagebreak import Break
from openpyxl.worksheet.properties import PageSetupProperties

import blaetter_auswertung as ba
import blaetter_basis as bb
from stil import (BG, EINGABE_BG, legende_eingabe, FMT_DATUM, FMT_PROZ, FORMEL_BG, FORMEL_TXT,
                  LINIE_STARK, LINKS, LINKS_OBEN, LINKS_UM, MAX_HJ, MITTE,
                  MITTE_UM, NAVY_100, NAVY_500, NAVY_700, PANEL,
                  RAHMEN_EINGABE, RAHMEN_ZART, TEAL, TXT, TXT_HELL,
                  TXT_WEISS, ampel_regeln, aussenrahmen, breiten, f, hoehen,
                  link_zelle, note_text, notenlegende_bereiche, rahmen,
                  setze, verbinde)

GIDX = f"Daten!$B${ba.R_GIDX}"
GHJ = f"Daten!$B${ba.R_GHJ}"
N_GES_UEB = 8          # Zeilen für Übungen auf der Gesprächsseite


# =========================================================== Gesprächsseite ==
def baue_gespraech(ws):
    ws.sheet_properties.tabColor = TEAL
    ws.sheet_view.showGridLines = False
    breiten(ws, {"A": 3, "B": 18, "C": 16, "D": 12, "E": 17, "F": 13,
                 "G": 12, "H": 3})
    hoehen(ws, {1: 22, 2: 20})

    link_zelle(ws, "A1", "Start!A1", "«  Zurück zur Startseite",
               align=LINKS)
    ws.merge_cells("A1:D1")
    verbinde(ws, "E1:H1",
             "Diese Seite ist für den Ausdruck gedacht: A4 hochkant, eine "
             "Seite.", font=f(9, color=TXT_HELL), align=LINKS)

    legende_eingabe(ws, "A2:H2")
    verbinde(ws, "A3:H3", "Beurteilungsgespräch",
             font=f(20, bold=True, color=TXT_WEISS), bg=NAVY_700,
             align=MITTE)
    verbinde(ws, "A4:H4",
             '="Halbjahresgespräch · Halbjahr "&Daten!$B$' + str(ba.R_GHJ) +
             '&" · Stand "&' +
             'RIGHT("0"&DAY(TODAY()),2)&"."&RIGHT("0"&MONTH(TODAY()),2)&"."&'
             'YEAR(TODAY())',
             font=f(10, color="DCE4EF"), bg=NAVY_700, align=MITTE)
    hoehen(ws, {3: 32, 4: 18, 5: 8})

    # ---- Auswahl ------------------------------------------------------------
    verbinde(ws, "A6:B6", " Azubi", font=f(10.5, bold=True, color=NAVY_700),
             bg=NAVY_100, align=LINKS, border=RAHMEN_ZART)
    verbinde(ws, "C6:D6", None, font=f(12, bold=True), bg=EINGABE_BG,
             align=LINKS, border=RAHMEN_EINGABE)
    setze(ws, "E6", " Halbjahr", font=f(10.5, bold=True, color=NAVY_700),
          bg=NAVY_100, align=LINKS, border=RAHMEN_ZART)
    setze(ws, "F6", 4, font=f(12, bold=True), bg=EINGABE_BG, align=MITTE,
          border=RAHMEN_EINGABE)
    verbinde(ws, "G6:H6",
             f'=IF({GIDX}=0,"bitte Azubi wählen","")',
             font=f(10, color="C0392B"), align=LINKS)
    hoehen(ws, {6: 26, 7: 10})

    # Bewusst AzubiAktiv statt AzubiAuswahl: diese Seite darf nicht davon
    # abhängen, was jemand anders gerade in der Azubi-Ansicht filtert.
    dv_a = DataValidation(type="list", formula1="AzubiAktiv",
                          allow_blank=True, showErrorMessage=True,
                          errorTitle="Azubi nicht in der Liste",
                          error="Bitte einen aktiven Azubi aus der Liste "
                                "wählen.")
    ws.add_data_validation(dv_a)
    dv_a.add("C6")
    dv_h = DataValidation(type="whole", operator="between", formula1="1",
                          formula2=str(MAX_HJ), allow_blank=False,
                          showErrorMessage=True,
                          errorTitle="Halbjahr außerhalb des Bereichs",
                          error=f"Bitte eine ganze Zahl von 1 bis {MAX_HJ} "
                                f"eingeben.")
    ws.add_data_validation(dv_h)
    dv_h.add("F6")

    # ---- Steckbrief ---------------------------------------------------------
    def karte(rng_label, rng_wert, label, form, fmt=None):
        verbinde(ws, rng_label, label, font=f(9, color=TXT_HELL), bg=PANEL,
                 align=MITTE_UM, border=RAHMEN_ZART)
        verbinde(ws, rng_wert, form, font=f(11.5, bold=True, color=NAVY_700),
                 bg=PANEL, align=MITTE, border=RAHMEN_ZART, fmt=fmt)

    def sd(spalte, fmt=None):
        return (f'=IF({GIDX}=0,"–",INDEX(\'Stammdaten\'!${spalte}${bb.SD0}:'
                f'${spalte}${bb.SD1},{GIDX}))')

    karte("B8:C8", "B9:C9", "Name, Vorname", sd("J"))
    karte("D8:G8", "D9:G9", "Ausbildungsberuf", sd("D"))
    karte("B10:B10", "B11:B11", "Jahrgang", sd("E"), "0")
    karte("C10:C10", "C11:C11", "Ausbildungsstart", sd("F"), FMT_DATUM)
    karte("D10:D10", "D11:D11", "Lehrjahr", sd("H"))
    karte("E10:E10", "E11:E11", "Halbjahr", f'=IF({GIDX}=0,"–",{GHJ})')
    karte("F10:G10", "F11:G11", "Status", sd("G"))
    aussenrahmen(ws, "B8:G11", LINIE_STARK, "thin")
    hoehen(ws, {8: 16, 9: 24, 10: 16, 11: 24, 12: 10})

    # ---- Ergebnis Praxis / Theorie / Gesamt ---------------------------------
    verbinde(ws, "A13:H13", " Ergebnis des Halbjahres",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {13: 26, 14: 24})
    for s, t in (("B", "Bereich"), ("C", "gewertete Übungen"),
                 ("D", "Prozent"), ("E", "IHK-Note")):
        setze(ws, f"{s}14", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    verbinde(ws, "F14:H14", "Hinweis", font=f(10, bold=True, color=TXT_WEISS),
             bg=NAVY_500, align=MITTE, border=rahmen(PANEL))

    zeilen = [("Praxis", "anzP", "P"), ("Theorie", "anzT", "T"),
              ("Gesamt", "anz", "G")]
    for k, (name, anz_key, pct_key) in enumerate(zeilen):
        r = 15 + k
        fett = name == "Gesamt"
        setze(ws, f"B{r}", name,
              font=f(12 if fett else 11, bold=True,
                     color=NAVY_700 if fett else TXT),
              bg=NAVY_100 if fett else FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        setze(ws, f"C{r}",
              f'=IF(OR({GIDX}=0,{GHJ}<1,{GHJ}>{MAX_HJ}),"",'
              f'INDEX({ba.hjb(anz_key)},{GIDX},{GHJ}))',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0")
        setze(ws, f"D{r}",
              f'=IF(OR({GIDX}=0,{GHJ}<1,{GHJ}>{MAX_HJ}),"",'
              f'INDEX({ba.hjb(pct_key)},{GIDX},{GHJ}))',
              font=f(13 if fett else 12, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"E{r}",
              f'=IF(NOT(ISNUMBER(D{r})),"",{note_text(f"D{r}")})',
              font=f(11.5 if fett else 11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART)
        ws.merge_cells(f"F{r}:H{r}")
        setze(ws, f"F{r}",
              f'=IF(C{r}="","",IF(C{r}=0,"in diesem Halbjahr nicht bewertet",'
              f'IF(C{r}<SchwelleDB,"wenig Datenbasis ("&C{r}&" Übung"&'
              f'IF(C{r}=1,"","en")&")","")))',
              font=f(10, italic=True, color=TXT_HELL), bg=FORMEL_BG,
              align=LINKS, border=RAHMEN_ZART)
        hoehen(ws, {r: 24})
        ampel_regeln(ws, f"D{r}:E{r}", f"$D{r}")
    hoehen(ws, {18: 10})

    # ---- Einzelne Übungen ---------------------------------------------------
    verbinde(ws, "A19:H19", " Gewertete Übungen in diesem Halbjahr",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {19: 26, 20: 26})
    ws.merge_cells("B20:C20")
    setze(ws, "B20", "Übung", font=f(10, bold=True, color=TXT_WEISS),
          bg=NAVY_500, align=MITTE, border=rahmen(PANEL))
    for s, t in (("D", "Art"), ("E", "Datum"), ("F", "Punkte")):
        setze(ws, f"{s}20", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    verbinde(ws, "G20:H20", "Prozent",
             font=f(10, bold=True, color=TXT_WEISS), bg=NAVY_500,
             align=MITTE, border=rahmen(PANEL))
    for k in range(1, N_GES_UEB + 1):
        r = 20 + k
        nr = f'IFERROR(SMALL(Daten!{ba.meta(ba.R_KEYGES)},{k}),"")'
        setze(ws, f"A{r}", f"={nr}", font=f(9, color=TXT_HELL), align=MITTE)
        ws.row_dimensions[r].height = 21
        ws.merge_cells(f"B{r}:C{r}")
        leer = f'IF($A{r}="","",'
        setze(ws, f"B{r}", f'={leer}INDEX(Daten!{ba.meta(ba.M_NAME)},$A{r}))',
              font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=LINKS, border=RAHMEN_ZART)
        setze(ws, f"D{r}", f'={leer}INDEX(Daten!{ba.meta(ba.M_ART)},$A{r}))',
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"E{r}",
              f'={leer}INDEX(Daten!{ba.meta(ba.M_DATUM)},$A{r}))',
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_DATUM)
        setze(ws, f"F{r}",
              f'={leer}INDEX(Daten!{ba.blk(ba.B_PKT)},{GIDX},$A{r})&" / "&'
              f'INDEX(Daten!{ba.blk(ba.B_MAX)},{GIDX},$A{r}))',
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        ws.merge_cells(f"G{r}:H{r}")
        setze(ws, f"G{r}",
              f'={leer}INDEX(Daten!{ba.blk(ba.B_PCT)},{GIDX},$A{r}))',
              font=f(11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
    ampel_regeln(ws, f"G21:H{20 + N_GES_UEB}", "$G21")
    hoehen(ws, {20 + N_GES_UEB + 1: 10})

    # ---- Freifelder ---------------------------------------------------------
    r0 = 20 + N_GES_UEB + 2
    for titel, hoehe in (("Stärken", 4), ("Entwicklungsziele bis zum "
                                          "nächsten Gespräch", 4)):
        verbinde(ws, f"A{r0}:H{r0}", f" {titel}",
                 font=f(13, bold=True, color=NAVY_700), align=LINKS)
        hoehen(ws, {r0: 26})
        verbinde(ws, f"B{r0 + 1}:G{r0 + hoehe}", None, font=f(11),
                 bg=EINGABE_BG, align=LINKS_OBEN, border=RAHMEN_EINGABE)
        for rr in range(r0 + 1, r0 + hoehe + 1):
            hoehen(ws, {rr: 20})
        r0 += hoehe + 2

    # ---- Unterschriften -----------------------------------------------------
    verbinde(ws, f"A{r0}:H{r0}", " Bestätigung",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {r0: 26, r0 + 1: 30})
    for sp_links, sp_rechts, text in (("B", "D", "Datum, Unterschrift Azubi"),
                                      ("E", "G", "Datum, Unterschrift "
                                                 "Ausbilder/-in")):
        ws.merge_cells(f"{sp_links}{r0 + 1}:{sp_rechts}{r0 + 1}")
        aussenrahmen(ws, f"{sp_links}{r0 + 1}:{sp_rechts}{r0 + 1}",
                     "000000", "thin")
        ws.merge_cells(f"{sp_links}{r0 + 2}:{sp_rechts}{r0 + 2}")
        setze(ws, f"{sp_links}{r0 + 2}", text, font=f(9, color=TXT_HELL),
              align=LINKS)
    hoehen(ws, {r0 + 2: 16, r0 + 3: 10})

    # ---- Farblegende --------------------------------------------------------
    rl = r0 + 4
    verbinde(ws, f"A{rl}:B{rl + 1}", " Farblegende",
             font=f(10, bold=True, color=NAVY_700), align=LINKS)
    notenlegende_bereiche(
        ws, [f"C{rl}:D{rl}", f"E{rl}:F{rl}", f"G{rl}:H{rl}",
             f"C{rl + 1}:D{rl + 1}", f"E{rl + 1}:F{rl + 1}",
             f"G{rl + 1}:H{rl + 1}"], mit_grenzen=False)
    hoehen(ws, {rl: 20, rl + 1: 20})
    verbinde(ws, f"A{rl + 2}:H{rl + 4}",
             "Übungen, bei denen der Azubi nicht bewertet wurde (krank, "
             "Urlaub, Berufsschule), sind hier bewusst nicht enthalten – sie "
             "zählen weder als 0 Punkte noch im Durchschnitt. Bei einer "
             "Wiederholung zählt die im Übungsblatt eingestellte Wertung "
             "(Standard: die letzte).",
             font=f(9, color=TXT_HELL), bg=BG, align=LINKS_UM)
    hoehen(ws, {rl + 2: 13, rl + 3: 13, rl + 4: 13})

    # ---- Druckeinrichtung ---------------------------------------------------
    ws.print_area = f"A3:H{rl + 4}"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.page_margins.left = 0.6
    ws.page_margins.right = 0.5
    ws.page_margins.top = 0.6
    ws.page_margins.bottom = 0.5
    ws.freeze_panes = "A7"


# ================================================================ Anleitung ==
SCHRITTE = [
    ("t", "So arbeiten Sie mit dieser Datei"),
    ("i", "Gelb hinterlegte Felder werden ausgefüllt. Grau-blaue Felder "
          "rechnet die Datei selbst – dort bitte nichts hineinschreiben. "
          "Auf jedem Blatt oben rechts führt ein Link zurück zur Startseite."),
    ("h", "1. Eine Note eintragen"),
    ("s", "Auf der Startseite in der Liste „Übungen“ auf den Namen der "
          "Übung klicken."),
    ("s", "Der Azubi steht in einer Spalte, die Bewertungsparameter "
          "untereinander. In seiner Spalte je Parameter die Punkte "
          "eintragen."),
    ("s", "Nicht gebrauchte Jahrgänge zuklappen: über jedem Block sitzt "
          "oben eine Schaltfläche mit Minus, Plus holt ihn zurück."),
    ("s", "Punkte, Prozent und IHK-Note stehen oben über der Spalte und "
          "laufen beim Scrollen mit."),
    ("s", "Ist die Übung fertig bewertet, oben im Kopf den Status auf "
          "„abgeschlossen“ stellen. Erst dann zählt sie für das Halbjahr."),
    ("h", "2. Eine neue Übung anlegen"),
    ("s", "Startseite > „Übungen verwalten“ öffnen."),
    ("s", "In der ersten freien Zeile den Übungsnamen eintragen. Damit ist "
          "das zugehörige Blatt freigeschaltet."),
    ("s", "Links in der Zeile auf den Blattnamen klicken."),
    ("s", "Im Kopf des Blattes eintragen: Art (Praxis oder Theorie), Datum, "
          "Status und Ihr Kürzel bei „Bewertet von“."),
    ("s", "Untereinander die Prüfpunkte eintragen, daneben den "
          "Bewertungshorizont (z. B. „10 von 10 Bohrungen korrekt“). Die "
          "Höchstpunktzahl in Spalte D darf überschrieben werden."),
    ("h", "3. Einen Azubi aufnehmen"),
    ("s", "Startseite > „Stammdaten“ öffnen."),
    ("s", "In der ersten freien Zeile Name, Vorname, Beruf und "
          "Ausbildungsstart (meist der 01.09.) eintragen, Status „aktiv“."),
    ("s", "Jahrgang, Lehrjahr und Halbjahr rechnet die Datei selbst. Der "
          "Azubi erscheint sofort als Spalte auf allen Übungsblättern. "
          "Mehrere Lehrjahre dürfen gemischt untereinander stehen."),
    ("s", "Zeilen nie sortieren, einfügen oder löschen: jede Zeile gehört "
          "fest zu einer Spalte der Übungsblätter, beim Sortieren wandern "
          "die Noten zum falschen Azubi."),
    ("s", "Je 25 Zeilen bilden einen Jahrgangsblock (siehe Linien). Neuen "
          "Jahrgang in den nächsten freien Block eintragen."),
    ("s", "Verlässt jemand die Ausbildung: nichts löschen, nur den Status "
          "auf „ausgeschieden“ oder „fertig“ setzen."),
    ("h", "4. Nicht-Teilnahme eintragen"),
    ("s", "War ein Azubi bei einzelnen Prüfpunkten nicht dabei: in das "
          "Punktefeld „n.b.“ schreiben. Dieser Punkt fällt dann aus Summe "
          "und Höchstpunktzahl heraus."),
    ("s", "War er bei der ganzen Übung nicht dabei: in alle Punktefelder "
          "seiner Spalte „n.b.“ schreiben."),
    ("s", "Unter dem Parameterblock in der Zeile „Grund (n.b.)“ krank, "
          "Urlaub, Berufsschule oder sonstiges wählen; eine Zeile tiefer "
          "steht „Bemerkung“ für eine Notiz."),
    ("s", "Die Übung zählt für ihn dann nirgends mit – auch nicht als "
          "0 Punkte."),
    ("h", "5. Eine frühere Version zurückholen (SharePoint)"),
    ("s", "Ist etwas durcheinandergeraten, ist nichts verloren: SharePoint "
          "speichert jede Version."),
    ("s", "In Excel: Datei > Informationen > Versionsverlauf. Im Browser: "
          "rechte Maustaste auf die Datei > Versionsverlauf."),
    ("s", "Die gewünschte Version anklicken, ansehen und bei Bedarf "
          "„Wiederherstellen“ wählen."),
    ("u", ""),
    ("h", "6. Nachholen und Wiederholen"),
    ("s", "Den Nachholtermin als ganz normale neue Übung anlegen "
          "(Schritt 2)."),
    ("s", "Im Kopf dieses Blattes bei „Wiederholung von“ die ursprüngliche "
          "Übung auswählen."),
    ("s", "Standardmäßig zählt die letzte Wertung. Soll bei einem einzelnen "
          "Azubi die beste zählen oder gar keine Wiederholungswertung, in "
          "seiner Spalte unten in der Zeile „Wertung bei Wiederholung“ "
          "beste oder keine wählen."),
    ("s", "In der Azubi-Ansicht zeigt die Spalte „zählt?“, welcher Versuch "
          "gewertet wird."),
    ("h", "7. Das Halbjahresgespräch vorbereiten"),
    ("s", "Startseite > „Gesprächsseite“ öffnen, oben Azubi und Halbjahr "
          "wählen."),
    ("s", "Die Seite ist für A4 hochkant eingerichtet: Datei > Drucken "
          "genügt."),
    ("s", "Wichtig beim gleichzeitigen Arbeiten: Die Auswahlfelder oben auf "
          "der Gesprächsseite, in der Azubi-Ansicht und im Blatt „Halbjahr“ "
          "sind für alle dieselben Zellen. Stellt ein Kollege dort gerade "
          "jemand anderen ein, ändert sich Ihre Ansicht mit. Vor dem Drucken "
          "deshalb bitte kurz prüfen, ob oben noch der richtige Name steht."),
    ("s", "Ein Überblick über alle Azubis eines Halbjahres steht auf dem "
          "Blatt „Halbjahr“."),
    ("h", "8. Wenn der Platz nicht reicht"),
    ("s", "Mehr als 20 Übungen: Blattreiter „Vorlage“ mit der rechten "
          "Maustaste anklicken > Verschieben oder kopieren > Kopie "
          "erstellen. Auf dem kopierten Blatt wird der Übungsname von Hand "
          "eingetragen; in den Auswertungen erscheint es nicht automatisch."),
    ("s", "Platz ist für 100 Azubis, also vier Jahrgänge zu je 25. Wird es "
          "mehr, bitte kurz Bescheid geben – dafür muss die Datei einmal "
          "neu erzeugt werden, die Daten bleiben erhalten."),
    ("h", "9. Was die Farben bedeuten"),
    ("s", "Die Einfärbung folgt dem IHK-Notenschlüssel: dunkelgrün = Note 1, "
          "hellgrün = 2, gelb = 3, orange = 4, rot = 5, dunkelrot = 6."),
    ("s", "Neben der Farbe steht immer die Note als Zahl mit Kurztext – "
          "der Ausdruck in Schwarz-Weiß bleibt damit lesbar."),
    ("s", "Die Prozentgrenzen stehen im Blatt „Einstellungen“. Wer sie dort "
          "ändert, ändert die Einfärbung in der ganzen Datei mit."),
    ("i", "Die Datei enthält keine Makros. Mehrere Kollegen können sie "
          "gleichzeitig bearbeiten, auch in Excel im Browser."),
]


def baue_anleitung(ws):
    ws.sheet_properties.tabColor = NAVY_500
    ws.sheet_view.showGridLines = False
    breiten(ws, {"A": 3, "B": 5, "C": 86, "D": 3})
    hoehen(ws, {1: 22, 2: 20})
    link_zelle(ws, "A1", "Start!A1", "«  Zurück zur Startseite", align=LINKS)
    ws.merge_cells("A1:D1")

    r = 3
    nummer = 0
    for typ, text in SCHRITTE:
        if typ == "t":
            verbinde(ws, f"A{r}:D{r}", text,
                     font=f(20, bold=True, color=TXT_WEISS), bg=NAVY_700,
                     align=MITTE)
            hoehen(ws, {r: 26})
            r += 1
        elif typ == "h":
            nummer = 0
            hoehen(ws, {r: 7})
            r += 1
            verbinde(ws, f"A{r}:D{r}", " " + text,
                     font=f(12.5, bold=True, color=NAVY_700), bg=NAVY_100,
                     align=LINKS)
            hoehen(ws, {r: 22})
            r += 1
        elif typ == "u":
            ws.row_breaks.append(Break(id=r - 1))
        elif typ == "i":
            verbinde(ws, f"B{r}:C{r + 1}", text, font=f(10.5, color=TXT),
                     bg=BG, align=LINKS_UM)
            aussenrahmen(ws, f"B{r}:C{r + 1}", LINIE_STARK, "thin")
            hoehen(ws, {r: 15, r + 1: 15})
            r += 2
        else:
            nummer += 1
            setze(ws, f"B{r}", f"{nummer}.", font=f(11, bold=True,
                                                    color=TEAL),
                  align=MITTE)
            zeilen = max(1, (len(text) + 85) // 86)
            setze(ws, f"C{r}", text, font=f(10.5), align=LINKS_UM)
            hoehen(ws, {r: 13 * zeilen + 4})
            r += 1

    ws.print_area = f"A3:D{r}"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.freeze_panes = "A4"
