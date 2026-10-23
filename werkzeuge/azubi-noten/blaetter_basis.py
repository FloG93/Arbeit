# -*- coding: utf-8 -*-
"""Stufe 1: Einstellungen, Stammdaten, Übungsliste, Übungsblätter, Vorlage."""

from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties

from stil import (BG, EINGABE_BG, EINGABE_RAND, FMT_DATUM, FMT_HJ, FMT_PROZ,
                  FMT_PUNKT, FORMEL_BG, FORMEL_TXT, GESPERRT_BG, LINIE,
                  LINIE_STARK, LINKS, LINKS_UM, MAX_AZUBIS, MAX_PARAM, MITTE,
                  MITTE_UM, N_UEBUNGEN, NAVY_100, NAVY_500, NAVY_700, PANEL,
                  RAHMEN_EINGABE, RAHMEN_ZART, TEAL, TEAL_100, TXT, TXT_HELL,
                  TXT_WEISS, UEB_BLATT, aussenrahmen, bereich, blattkopf,
                  breiten, datum_text, f, fill, hoehen, legende_eingabe,
                  druck, link_zelle, note_text, notenlegende, rahmen, setze,
                  verbinde)

# ------------------------------------------------- Raster der Übungsblätter --
R_BANNER = 3
R_K1 = 4          # Übungsname | Art | Datum
R_K2 = 5          # Status | Bewertet von | Gewicht
R_K3 = 6          # Wiederholung von | Hinweis
R_LEG = 7
R_PNAME = 9
R_PHOR = 10
R_PMAX = 11
R_THEAD = 12
R_DAT0 = 13
R_DAT1 = R_DAT0 + MAX_AZUBIS - 1          # 37
R_FUSS = R_DAT1 + 2                        # 39
SD0 = 6                                     # erste Datenzeile der Stammdaten
SD1 = SD0 + MAX_AZUBIS - 1                  # 30
UV0 = 6                                     # erste Zeile der Übungsliste
UV1 = UV0 + N_UEBUNGEN - 1                  # 25

SPALTEN_UEB = {
    "A": 6, "B": 17, "C": 14, "D": 11, "E": 11, "F": 11, "G": 11,
    "H": 11, "I": 11, "J": 11, "K": 11, "L": 9.5, "M": 8.5, "N": 10, "O": 21, "P": 14,
    "Q": 26, "R": 14, "S": 7,
}
PARAM_SPALTEN = ["D", "E", "F", "G", "H", "I", "J", "K"]


# ============================================================ Einstellungen ==
def baue_einstellungen(ws):
    blattkopf(ws, "F", "Einstellungen",
              "Zentrale Stellschrauben – wirken sofort in der ganzen Datei",
              tabfarbe=NAVY_500, link_breite=1)
    breiten(ws, {"A": 3, "B": 30, "C": 16, "D": 22, "E": 12, "F": 46})
    legende_eingabe(ws, "A3:F3")
    hoehen(ws, {3: 24, 4: 10})

    # ---- Notenschlüssel -----------------------------------------------------
    verbinde(ws, "B5:F5", "Notenschlüssel (IHK)",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {5: 26, 6: 22})
    kopf = ["Note", "ab Prozent", "Kurztext", "Farbe", "Bedeutung"]
    for i, t in enumerate(kopf):
        setze(ws, f"{chr(66 + i)}6", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE, border=rahmen(PANEL))
    from stil import NOTENFARBEN, NOTENGRENZEN, NOTENTEXTE
    bedeutung = ["sehr gut – Spitzenleistung", "gut – sicher über Erwartung",
                 "befriedigend – im Blick behalten",
                 "ausreichend – gefährdet, Gespräch empfohlen",
                 "mangelhaft – nicht bestanden",
                 "ungenügend – nicht bestanden"]
    for i in range(6):
        r = 7 + i
        bgc, txtc = NOTENFARBEN[i]
        setze(ws, f"B{r}", i + 1, font=f(12, bold=True), bg=EINGABE_BG,
              align=MITTE, border=RAHMEN_EINGABE)
        setze(ws, f"C{r}", NOTENGRENZEN[i], font=f(12), bg=EINGABE_BG,
              align=MITTE, border=RAHMEN_EINGABE, fmt="0%")
        setze(ws, f"D{r}", NOTENTEXTE[i], font=f(11), bg=EINGABE_BG,
              align=LINKS, border=RAHMEN_EINGABE)
        setze(ws, f"E{r}", f"Note {i + 1}", font=f(10, bold=True, color=txtc),
              bg=bgc, align=MITTE, border=rahmen(PANEL))
        setze(ws, f"F{r}", bedeutung[i], font=f(10, color=TXT_HELL),
              align=LINKS, border=RAHMEN_ZART)
        hoehen(ws, {r: 22})
    verbinde(
        ws, "B13:F13",
        "Die Grenzen gelten „ab“ (92 % → Note 1). Reihenfolge Note 1 oben bis "
        "Note 6 unten bitte beibehalten – alle Formeln und Farben lesen die "
        "Tabelle von oben nach unten.",
        font=f(9.5, color=TXT_HELL), bg=BG, align=LINKS_UM)
    hoehen(ws, {13: 28, 14: 10})

    # ---- Grundeinstellungen -------------------------------------------------
    verbinde(ws, "B15:F15", "Grundeinstellungen",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {15: 26})
    grund = [
        ("Punkte je Parameter (Standard)", 10, "0",
         "Wird auf neuen Übungsblättern als Höchstpunktzahl vorgeschlagen."),
        ("Schwelle „wenig Datenbasis“", 3, "0",
         "Unter so vielen bewerteten Übungen erscheint neben der Halbjahres"
         "note ein Vermerk. Die Berechnung ändert sich dadurch nicht."),
        ("Gewichtung Praxis/Theorie verwenden?", "nein", None,
         "nein = alle Übungen zählen gleich (Mittel der Prozentwerte). "
         "ja = Praxis und Theorie werden getrennt gemittelt und mit den "
         "Gewichten unten zusammengezogen."),
        ("Gewicht Praxis", 0.7, "0%",
         "Nur wirksam, wenn oben „ja“ steht."),
        ("Gewicht Theorie", 0.3, "0%",
         "Nur wirksam, wenn oben „ja“ steht."),
        ("Standard-Wertung bei Wiederholung", "letzte", None,
         "Gilt, solange auf dem Wiederholungsblatt beim Azubi nichts anderes "
         "steht: letzte / beste / keine."),
        ("Warnschwelle (Note ab …)", 4, "0",
         "Ab dieser Halbjahresnote erscheint der Azubi in der Warnübersicht "
         "auf der Startseite."),
    ]
    for i, (name, wert, fmt, hinweis) in enumerate(grund):
        r = 16 + i
        setze(ws, f"B{r}", name, font=f(11, bold=True), align=LINKS,
              border=RAHMEN_ZART)
        setze(ws, f"C{r}", wert, font=f(12, bold=True), bg=EINGABE_BG,
              align=MITTE, border=RAHMEN_EINGABE, fmt=fmt)
        verbinde(ws, f"D{r}:F{r}", hinweis, font=f(9.5, color=TXT_HELL),
                 align=LINKS_UM, border=RAHMEN_ZART)
        hoehen(ws, {r: 30})
    dv_ja = DataValidation(type="list", formula1='"ja,nein"', allow_blank=False)
    ws.add_data_validation(dv_ja)
    dv_ja.add("C18")
    dv_w = DataValidation(type="list", formula1='"letzte,beste,keine"',
                          allow_blank=False)
    ws.add_data_validation(dv_w)
    dv_w.add("C21")
    hoehen(ws, {23: 10})

    # ---- Ausbildungsberufe --------------------------------------------------
    verbinde(ws, "B24:F24", "Ausbildungsberufe (Auswahl in den Stammdaten)",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {24: 26})
    berufe = ["Elektroniker/-in für Betriebstechnik",
              "Industriemechaniker/-in", "Mechatroniker/-in",
              "Fachkraft für Metalltechnik"]
    for i in range(10):
        r = 25 + i
        setze(ws, f"B{r}", berufe[i] if i < len(berufe) else None,
              font=f(11), bg=EINGABE_BG, align=LINKS, border=RAHMEN_EINGABE)
        hoehen(ws, {r: 20})
    verbinde(ws, "C25:F25",
             "Freie Zeilen bleiben leer – sie erscheinen dann als leerer "
             "Eintrag in der Auswahlliste.",
             font=f(9.5, color=TXT_HELL), align=LINKS_UM)

    # ---- Hinweis Farben -----------------------------------------------------
    verbinde(ws, "B36:F38",
             "Farben ändern: Die Prozentgrenzen oben wirken sofort auf alle "
             "Einfärbungen. Die Farbtöne selbst liegen in der bedingten "
             "Formatierung der Blätter (Start > Bedingte Formatierung > "
             "Regeln verwalten). Ohne Makros lässt sich ein Farbton nicht aus "
             "einer Zelle steuern – deshalb steht neben jeder Farbe immer "
             "auch die Note als Zahl mit Kurztext.",
             font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, "B36:F38", LINIE_STARK, "thin")
    hoehen(ws, {36: 22, 37: 22, 38: 22})
    druck(ws, "A1:F38", quer=False)
    ws.freeze_panes = "A3"


def einstellungen_namen(wb):
    """Benannte Bereiche – machen die Formeln überall lesbar."""
    from openpyxl.workbook.defined_name import DefinedName
    namen = {
        "Noten": "Einstellungen!$B$7:$B$12",
        "NGrenze": "Einstellungen!$C$7:$C$12",
        "NText": "Einstellungen!$D$7:$D$12",
        "PktStd": "Einstellungen!$C$16",
        "SchwelleDB": "Einstellungen!$C$17",
        "GewAn": "Einstellungen!$C$18",
        "GewP": "Einstellungen!$C$19",
        "GewT": "Einstellungen!$C$20",
        "WdhStd": "Einstellungen!$C$21",
        "WarnNote": "Einstellungen!$C$22",
        "Berufe": "Einstellungen!$B$25:$B$34",
    }
    for n, ziel in namen.items():
        wb.defined_names.add(DefinedName(n, attr_text=ziel))


# =============================================================== Stammdaten ==
def baue_stammdaten(ws):
    blattkopf(ws, "L", "Azubi-Stammdaten",
              "Eine Zeile je Azubi – hier werden keine Daten gelöscht, "
              "ausgeschiedene Azubis bekommen nur einen anderen Status")
    breiten(ws, {"A": 6, "B": 18, "C": 16, "D": 32, "E": 10, "F": 16,
                 "G": 15, "H": 10, "I": 10, "J": 26, "K": 30, "L": 3})
    legende_eingabe(ws, "A3:L3")
    hoehen(ws, {3: 24, 4: 10})

    kopf = [("A", "Nr."), ("B", "Name"), ("C", "Vorname"),
            ("D", "Ausbildungsberuf"), ("E", "Jahrgang"),
            ("F", "Ausbildungsstart"), ("G", "Status"), ("H", "Lehrjahr"),
            ("I", "akt. HJ"), ("J", "Anzeigename"), ("K", "Bemerkung")]
    for sp, t in kopf:
        setze(ws, f"{sp}5", t, font=f(10.5, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    hoehen(ws, {5: 34})

    for i in range(MAX_AZUBIS):
        r = SD0 + i
        setze(ws, f"A{r}", "=ROW()-5", font=f(10, color=TXT_HELL), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART)
        for sp in ("B", "C", "D", "F", "G", "K"):
            setze(ws, f"{sp}{r}", None, font=f(11), bg=EINGABE_BG,
                  align=LINKS, border=RAHMEN_EINGABE)
        ws[f"F{r}"].number_format = FMT_DATUM
        ws[f"F{r}"].alignment = MITTE
        ws[f"G{r}"].alignment = MITTE
        setze(ws, f"E{r}", f'=IF($F{r}="","",YEAR($F{r}))',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0")
        setze(ws, f"H{r}",
              f'=IF(OR($B{r}="",$F{r}=""),"",IF(TODAY()<$F{r},0,'
              f'INT(DATEDIF($F{r},TODAY(),"m")/12)+1))',
              font=f(11, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt=FMT_HJ)
        setze(ws, f"I{r}",
              f'=IF(OR($B{r}="",$F{r}=""),"",IF(TODAY()<$F{r},0,'
              f'INT(DATEDIF($F{r},TODAY(),"m")/6)+1))',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_HJ)
        setze(ws, f"J{r}", f'=IF($B{r}="","",$B{r}&", "&$C{r})',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        hoehen(ws, {r: 22})

    dv_beruf = DataValidation(type="list", formula1="Berufe", allow_blank=True,
                              showErrorMessage=True,
                              errorTitle="Beruf nicht bekannt",
                              error="Bitte einen Beruf aus der Liste wählen. "
                                    "Neue Berufe trägt man im Blatt "
                                    "„Einstellungen“ ein.")
    ws.add_data_validation(dv_beruf)
    dv_beruf.add(f"D{SD0}:D{SD1}")

    dv_status = DataValidation(
        type="list", formula1='"aktiv,ausgeschieden,fertig"', allow_blank=True,
        showErrorMessage=True, errorTitle="Status nicht bekannt",
        error="Bitte aktiv, ausgeschieden oder fertig wählen.",
        showInputMessage=True, promptTitle="Status",
        prompt="aktiv = wird in Auswertungen gezeigt. ausgeschieden/fertig = "
               "Daten bleiben erhalten, erscheinen aber nicht mehr in den "
               "Auswahllisten.")
    ws.add_data_validation(dv_status)
    dv_status.add(f"G{SD0}:G{SD1}")

    dv_start = DataValidation(
        type="date", operator="greaterThan", formula1="DATE(1990,1,1)",
        allow_blank=True, showErrorMessage=True,
        errorTitle="Datum nicht lesbar",
        error="Bitte ein Datum im Format TT.MM.JJJJ eingeben, z. B. "
              "01.09.2025.",
        showInputMessage=True, promptTitle="Ausbildungsstart",
        prompt="In der Regel der 01.09. des Einstellungsjahres. Daraus "
               "berechnet die Datei Jahrgang, Lehrjahr und Halbjahr.")
    ws.add_data_validation(dv_start)
    dv_start.add(f"F{SD0}:F{SD1}")

    # Fehlender Ausbildungsstart fällt sofort ins Auge
    ws.conditional_formatting.add(
        f"F{SD0}:F{SD1}",
        FormulaRule(formula=[f'AND($B{SD0}<>"",$F{SD0}="")'],
                    fill=fill("FDE3E1"), font=f(11, bold=True, color="C0392B")))
    ws.conditional_formatting.add(
        f"A{SD0}:K{SD1}",
        FormulaRule(formula=[f'$G{SD0}="ausgeschieden"'],
                    font=f(11, italic=True, color=TXT_HELL)))

    verbinde(ws, f"A{SD1 + 2}:K{SD1 + 3}",
             "Mehr als 25 Azubis? Dann müssen die Übungsblätter mitwachsen – "
             "siehe Blatt „Anleitung“, Abschnitt 5. Ausgeschiedene Azubis "
             "bitte nicht löschen, sondern den Status ändern: alte "
             "Bewertungen bleiben so erhalten.",
             font=f(10, color=TXT_HELL), bg=BG, align=LINKS_UM)
    druck(ws, f"A1:K{SD1 + 3}", quer=True, kopfzeilen="1:5")
    ws.freeze_panes = "B6"


# ============================================================= Übungsliste ===
def baue_uebungsliste(ws):
    blattkopf(ws, "P", "Übungen verwalten",
              "Ein Name in Spalte „Übungsname“ schaltet das zugehörige "
              "Übungsblatt frei – alles Weitere wird dort eingetragen")
    breiten(ws, {"A": 6, "B": 12, "C": 30, "D": 11, "E": 13, "F": 15,
                 "G": 12, "H": 9, "I": 22, "J": 11, "K": 11, "L": 11,
                 "M": 11, "N": 20, "O": 34, "P": 3})
    legende_eingabe(ws, "A3:P3")
    hoehen(ws, {3: 24, 4: 10})

    kopf = [("A", "Nr."), ("B", "Blatt"), ("C", "Übungsname"), ("D", "Art"),
            ("E", "Datum"), ("F", "Status"), ("G", "Bewertet von"),
            ("H", "Gewicht"), ("I", "Wiederholung von"), ("J", "Parameter"),
            ("K", "max. Pkt."), ("L", "bewertet"), ("M", "Ø Prozent"),
            ("N", "Ø Note"), ("O", "Hinweis")]
    for sp, t in kopf:
        setze(ws, f"{sp}5", t, font=f(10.5, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    hoehen(ws, {5: 34})

    for i in range(N_UEBUNGEN):
        r = UV0 + i
        blatt = UEB_BLATT.format(i + 1)
        q = f"'{blatt}'"
        setze(ws, f"A{r}", "=ROW()-5", font=f(10, color=TXT_HELL),
              bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART)
        link_zelle(ws, f"B{r}", f"'{blatt}'!A1", blatt,
                   font=f(10.5, bold=True, color=TEAL, underline="single"),
                   bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART)
        setze(ws, f"C{r}", None, font=f(11, bold=True), bg=EINGABE_BG,
              align=LINKS, border=RAHMEN_EINGABE)
        setze(ws, f"D{r}", f'=IF($C{r}="","",IF({q}!$J$4="","— fehlt —",'
                           f'{q}!$J$4))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"E{r}", f'=IF(OR($C{r}="",{q}!$N$4=""),"",{q}!$N$4)',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_DATUM)
        setze(ws, f"F{r}", f'=IF($C{r}="","",IF({q}!$C$5="","— fehlt —",'
                           f'{q}!$C$5))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"G{r}", f'=IF($C{r}="","",{q}!$J$5)',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"H{r}", f'=IF($C{r}="","",IF({q}!$N$5="",1,{q}!$N$5))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0.##")
        setze(ws, f"I{r}", f'=IF(OR($C{r}="",{q}!$C$6=""),"",{q}!$C$6)',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        setze(ws, f"J{r}", f'=IF($C{r}="","",COUNTIF({q}!$D$11:$K$11,">0"))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0")
        setze(ws, f"K{r}", f'=IF($C{r}="","",SUM({q}!$D$11:$K$11))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0.##")
        setze(ws, f"L{r}", f'=IF($C{r}="","",COUNT({q}!$N${R_DAT0}:$N${R_DAT1}))',
              font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt="0")
        setze(ws, f"M{r}",
              f'=IF(OR($C{r}="",$L{r}=0),"",'
              f'AVERAGE({q}!$N${R_DAT0}:$N${R_DAT1}))',
              font=f(11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"N{r}", f'=IF($M{r}="","",{note_text(f"$M{r}")})',
              font=f(10.5, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"O{r}", _hinweis_formel(r, q), font=f(9.5, color=TXT_HELL),
              bg=FORMEL_BG, align=LINKS_UM, border=RAHMEN_ZART)
        hoehen(ws, {r: 22})

    from stil import ampel_regeln
    ampel_regeln(ws, f"M{UV0}:N{UV1}", f"$M{UV0}")
    ws.conditional_formatting.add(
        f"A{UV0}:O{UV1}",
        FormulaRule(formula=[f'$C{UV0}=""'], fill=fill(GESPERRT_BG),
                    font=f(10.5, color="A0A8B4")))

    verbinde(ws, f"A{UV1 + 2}:O{UV1 + 4}",
             "So legen Sie eine neue Übung an: 1. Hier in einer freien Zeile "
             "den Übungsnamen eintragen.  2. Auf den Blattnamen links klicken. "
             " 3. Dort Art, Datum, Status, Kürzel und die Bewertungsparameter "
             "mit Höchstpunktzahl eintragen.  4. Punkte je Azubi eintragen.  "
             "Werden mehr als 20 Übungen gebraucht, das Blatt „Vorlage“ "
             "kopieren (Rechtsklick auf den Blattreiter > Verschieben oder "
             "kopieren > Kopie erstellen).",
             font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, f"A{UV1 + 2}:O{UV1 + 4}", LINIE_STARK, "thin")
    hoehen(ws, {UV1 + 2: 22, UV1 + 3: 22, UV1 + 4: 22})
    druck(ws, f"A1:O{UV1 + 4}", quer=True, kopfzeilen="1:5")
    ws.freeze_panes = "C6"


def _hinweis_formel(r, q):
    teile = [
        f'IF({q}!$J$4="","Art fehlt. ","")',
        f'IF({q}!$N$4="","Datum fehlt. ","")',
        f'IF({q}!$C$5="","Status fehlt. ","")',
        f'IF({q}!$J$5="","Kürzel fehlt. ","")',
        f'IF(COUNTIF({q}!$D$11:$K$11,">0")=0,"Parameter fehlen. ","")',
    ]
    inner = "&".join(teile)
    return (f'=IF($C{r}="","frei",IF(LEN({inner})=0,"vollständig",'
            f'"Bitte ergänzen: "&{inner}))')


# =========================================================== Übungsblätter ===
def baue_uebungsblatt(ws, nr):
    """nr = 1..20 für die vorbereiteten Blätter, None für die Vorlage."""
    vorlage = nr is None
    titel = "Vorlage für weitere Übungen" if vorlage \
        else f"Übung {nr:02d}"
    blattkopf(ws, "S", titel,
              "Kopfbereich ausfüllen, dann Punkte je Azubi eintragen – "
              "„n.b.“ für nicht bewertet",
              tabfarbe=NAVY_500 if vorlage else TEAL)
    breiten(ws, SPALTEN_UEB)
    hoehen(ws, {R_BANNER: 24, R_K1: 24, R_K2: 24, R_K3: 24, R_LEG: 26, 8: 8,
                R_PNAME: 34, R_PHOR: 44, R_PMAX: 22, R_THEAD: 34})

    vr = None if vorlage else UV0 + nr - 1

    # ---- Statusbanner -------------------------------------------------------
    if vorlage:
        banner = ('="VORLAGE – dieses Blatt wird in keiner Auswertung '
                  'mitgezählt. Zum Anlegen einer 21. Übung: Blattreiter '
                  'rechts anklicken > Verschieben oder kopieren > Kopie '
                  'erstellen."')
    else:
        banner = (
            f'=IF($C${R_K1}="",'
            f'"FREI – noch nicht belegt. Zum Freischalten im Blatt '
            f'›Übungen verwalten‹ in Zeile {vr} einen Übungsnamen eintragen.",'
            f'"Belegt · "&$C${R_K1}'
            f'&IF($J${R_K1}=""," · Art fehlt"," · "&$J${R_K1})'
            f'&IF($N${R_K1}=""," · Datum fehlt"," · "&'
            f'{datum_text(f"$N${R_K1}")})'
            f'&IF($C${R_K2}=""," · Status fehlt"," · "&$C${R_K2})'
            f'&IF(COUNTIF($D${R_PMAX}:$K${R_PMAX},">0")=0,'
            f'" · noch keine Bewertungsparameter",'
            f'" · "&COUNTIF($D${R_PMAX}:$K${R_PMAX},">0")&" Parameter, max. "'
            f'&SUM($D${R_PMAX}:$K${R_PMAX})&" Punkte"))')
    verbinde(ws, f"A{R_BANNER}:S{R_BANNER}", banner,
             font=f(10.5, bold=True, color=TXT_WEISS), bg=TEAL, align=LINKS_UM)
    ws[f"A{R_BANNER}"].alignment = Alignment(horizontal="left",
                                             vertical="center",
                                             wrap_text=True, indent=1)
    if not vorlage:
        ws.conditional_formatting.add(
            f"A{R_BANNER}:S{R_BANNER}",
            FormulaRule(formula=[f'$C${R_K1}=""'], fill=fill("E8A33D"),
                        font=f(10.5, bold=True, color="3A2A05"),
                        stopIfTrue=True))

    # ---- Kopffelder ---------------------------------------------------------
    def label(rng, text):
        verbinde(ws, rng, text, font=f(10.5, bold=True, color=NAVY_700),
                 align=LINKS, border=RAHMEN_ZART, bg=NAVY_100)

    def eingabe(rng, wert=None, fmt=None, align=LINKS):
        verbinde(ws, rng, wert, font=f(11, bold=True), bg=EINGABE_BG,
                 align=align, border=RAHMEN_EINGABE, fmt=fmt)

    label(f"A{R_K1}:B{R_K1}", " Übungsname")
    if vorlage:
        eingabe(f"C{R_K1}:G{R_K1}")
    else:
        verbinde(ws, f"C{R_K1}:G{R_K1}",
                 f"=IF('Übungen'!$C{vr}=\"\",\"\",'Übungen'!$C{vr})",
                 font=f(12, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
                 align=LINKS, border=RAHMEN_ZART)
    label(f"H{R_K1}:I{R_K1}", " Art")
    eingabe(f"J{R_K1}:K{R_K1}", align=MITTE)
    label(f"L{R_K1}:M{R_K1}", " Datum")
    eingabe(f"N{R_K1}:O{R_K1}", fmt=FMT_DATUM, align=MITTE)

    label(f"A{R_K2}:B{R_K2}", " Status")
    eingabe(f"C{R_K2}:G{R_K2}")
    label(f"H{R_K2}:I{R_K2}", " Bewertet von")
    eingabe(f"J{R_K2}:K{R_K2}", align=MITTE)
    label(f"L{R_K2}:M{R_K2}", " Gewicht")
    eingabe(f"N{R_K2}:O{R_K2}", 1, fmt="0.##", align=MITTE)

    label(f"A{R_K3}:B{R_K3}", " Wiederholung von")
    eingabe(f"C{R_K3}:G{R_K3}")
    verbinde(ws, f"H{R_K3}:O{R_K3}",
             "Nur ausfüllen, wenn dies der Nachhol- oder Wiederholtermin "
             "einer anderen Übung ist.",
             font=f(9.5, color=TXT_HELL), align=LINKS_UM)

    verbinde(ws, f"P{R_K1}:S{R_K3}",
             "Gewicht 1 = normal. Höhere Zahl = die Übung zählt im Halbjahr "
             "stärker.\nStatus „abgeschlossen“ schaltet die Übung für die "
             "Halbjahresauswertung scharf.",
             font=f(9.5, color=TXT_HELL), bg=BG, align=LINKS_UM,
             border=RAHMEN_ZART)

    legende_eingabe(ws, f"A{R_LEG}:S{R_LEG}")

    # ---- Parameterkopf ------------------------------------------------------
    verbinde(ws, f"A{R_PNAME}:C{R_PNAME}", " Bewertungsparameter",
             font=f(11, bold=True, color=TXT_WEISS), bg=NAVY_500, align=LINKS)
    verbinde(ws, f"A{R_PHOR}:C{R_PHOR}", " Bewertungshorizont",
             font=f(10.5, bold=True, color=TXT_WEISS), bg=NAVY_500,
             align=LINKS)
    verbinde(ws, f"A{R_PMAX}:C{R_PMAX}", " max. Punkte je Parameter",
             font=f(10.5, bold=True, color=TXT_WEISS), bg=NAVY_500,
             align=LINKS)
    for sp in PARAM_SPALTEN:
        setze(ws, f"{sp}{R_PNAME}", None, font=f(10.5, bold=True),
              bg=EINGABE_BG, align=MITTE_UM, border=RAHMEN_EINGABE)
        setze(ws, f"{sp}{R_PHOR}", None, font=f(9, color=TXT_HELL),
              bg=EINGABE_BG, align=MITTE_UM, border=RAHMEN_EINGABE)
        setze(ws, f"{sp}{R_PMAX}", f'=IF({sp}${R_PNAME}="",0,PktStd)',
              font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt='0.##;-0.##;""')
    verbinde(ws, f"L{R_PNAME}:S{R_PNAME}",
             "Die Parameter gelten für alle Azubis dieser Übung.",
             font=f(9.5, color=TXT_HELL), align=LINKS_UM)
    verbinde(ws, f"L{R_PHOR}:S{R_PHOR}",
             "Beispiel: „10 von 10 Bohrungen korrekt“ – kurz beschreiben, "
             "wofür es die volle Punktzahl gibt.",
             font=f(9.5, color=TXT_HELL), align=LINKS_UM)
    verbinde(ws, f"L{R_PMAX}:S{R_PMAX}",
             "Vorschlag aus den Einstellungen. Darf mit einer Zahl "
             "überschrieben werden.",
             font=f(9.5, color=TXT_HELL), align=LINKS_UM)

    # ---- Tabellenkopf -------------------------------------------------------
    kopf = [("A", "Nr."), ("B", "Name"), ("C", "Vorname")]
    for i, sp in enumerate(PARAM_SPALTEN):
        kopf.append((sp, f"=IF({sp}${R_PNAME}=\"\",\"P{i + 1}\","
                         f"{sp}${R_PNAME})"))
    kopf += [("L", "Summe"), ("M", "von max."), ("N", "Prozent"),
             ("O", "IHK-Note"), ("P", "Grund (n.b.)"), ("Q", "Bemerkung"),
             ("R", "Wertung Wdh."), ("S", "HJ")]
    for sp, t in kopf:
        setze(ws, f"{sp}{R_THEAD}", t,
              font=f(10, bold=True, color=TXT_WEISS), bg=NAVY_700,
              align=MITTE_UM, border=rahmen(PANEL))

    # ---- Datenzeilen --------------------------------------------------------
    for i in range(MAX_AZUBIS):
        r = R_DAT0 + i
        sd = SD0 + i
        setze(ws, f"A{r}", f'=IF(\'Stammdaten\'!$B{sd}="","",'
                           f'\'Stammdaten\'!$A{sd})',
              font=f(10, color=TXT_HELL), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"B{r}", f'=IF(\'Stammdaten\'!$B{sd}="","",'
                           f'\'Stammdaten\'!$B{sd})',
              font=f(11, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=LINKS, border=RAHMEN_ZART)
        setze(ws, f"C{r}", f'=IF(\'Stammdaten\'!$B{sd}="","",'
                           f'\'Stammdaten\'!$C{sd})',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        for sp in PARAM_SPALTEN:
            setze(ws, f"{sp}{r}", None, font=f(12), bg=EINGABE_BG,
                  align=MITTE, border=RAHMEN_EINGABE, fmt=FMT_PUNKT)
        setze(ws, f"L{r}",
              f'=IF(OR($B{r}="",COUNT($D{r}:$K{r})=0),"",SUM($D{r}:$K{r}))',
              font=f(11, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt=FMT_PUNKT)
        setze(ws, f"M{r}",
              f'=IF($L{r}="","",SUMPRODUCT(--ISNUMBER($D{r}:$K{r}),'
              f'$D${R_PMAX}:$K${R_PMAX}))',
              font=f(11, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PUNKT)
        setze(ws, f"N{r}",
              f'=IF(OR($L{r}="",$M{r}=""),"",IF($M{r}=0,"",$L{r}/$M{r}))',
              font=f(12, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"O{r}",
              f'=IF($B{r}="","",IF(COUNT($D{r}:$K{r})>0,{note_text(f"$N{r}")},'
              f'IF(COUNTIF($D{r}:$K{r},"n.b.")>0,"n.b."&'
              f'IF($P{r}=""," (Grund fehlt)"," ("&$P{r}&")"),"")))',
              font=f(11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"P{r}", None, font=f(10.5), bg=EINGABE_BG, align=MITTE,
              border=RAHMEN_EINGABE)
        setze(ws, f"Q{r}", None, font=f(10.5), bg=EINGABE_BG, align=LINKS,
              border=RAHMEN_EINGABE)
        setze(ws, f"R{r}", None, font=f(10.5), bg=EINGABE_BG, align=MITTE,
              border=RAHMEN_EINGABE)
        setze(ws, f"S{r}",
              f'=IF($B{r}="","",'
              f'IF(OR($N${R_K1}="",\'Stammdaten\'!$F{sd}=""),0,'
              f'IF($N${R_K1}<\'Stammdaten\'!$F{sd},0,'
              f'INT(DATEDIF(\'Stammdaten\'!$F{sd},$N${R_K1},"m")/6)+1)))',
              font=f(10.5, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_HJ)
        hoehen(ws, {r: 22})

    _uebung_pruefungen(ws, vorlage)
    _uebung_fuss(ws, vorlage)
    ws.freeze_panes = f"D{R_DAT0}"
    druck(ws, f"A1:S{R_FUSS + 3}", quer=True,
          kopfzeilen=f"1:{R_THEAD}")


def _uebung_pruefungen(ws, vorlage):
    """Eingabeprüfung und bedingte Formatierung eines Übungsblattes."""
    dv_art = DataValidation(
        type="list", formula1='"Praxis,Theorie"', allow_blank=True,
        showErrorMessage=True, errorTitle="Art nicht bekannt",
        error="Bitte Praxis oder Theorie wählen.",
        showInputMessage=True, promptTitle="Art der Übung",
        prompt="Praxis = praktische Übung, Theorie = schriftlicher Test.")
    ws.add_data_validation(dv_art)
    dv_art.add(f"J{R_K1}")

    dv_st = DataValidation(
        type="list", formula1='"laufend,abgeschlossen"', allow_blank=True,
        showErrorMessage=True, errorTitle="Status nicht bekannt",
        error="Bitte laufend oder abgeschlossen wählen.")
    ws.add_data_validation(dv_st)
    dv_st.add(f"C{R_K2}")

    dv_dat = DataValidation(
        type="date", operator="greaterThan", formula1="DATE(1990,1,1)",
        allow_blank=True, showErrorMessage=True,
        errorTitle="Datum nicht lesbar",
        error="Bitte ein Datum im Format TT.MM.JJJJ eingeben, z. B. "
              "12.03.2026.")
    ws.add_data_validation(dv_dat)
    dv_dat.add(f"N{R_K1}")

    dv_gew = DataValidation(
        type="decimal", operator="between", formula1="0.1", formula2="10",
        allow_blank=True, showErrorMessage=True,
        errorTitle="Gewicht außerhalb des Bereichs",
        error="Bitte eine Zahl zwischen 0,1 und 10 eingeben. 1 = normal.")
    ws.add_data_validation(dv_gew)
    dv_gew.add(f"N{R_K2}")

    if not vorlage:
        dv_wdh = DataValidation(
            type="list", formula1=f"'Übungen'!$C${UV0}:$C${UV1}",
            allow_blank=True, showErrorMessage=True,
            errorTitle="Übung nicht gefunden",
            error="Bitte eine Übung aus der Liste wählen oder das Feld leer "
                  "lassen.")
        ws.add_data_validation(dv_wdh)
        dv_wdh.add(f"C{R_K3}")

    dv_max = DataValidation(
        type="decimal", operator="between", formula1="0", formula2="1000",
        allow_blank=True, showErrorMessage=True,
        errorTitle="Höchstpunktzahl nicht gültig",
        error="Bitte eine Zahl zwischen 0 und 1000 eingeben.")
    ws.add_data_validation(dv_max)
    dv_max.add(f"D{R_PMAX}:K{R_PMAX}")

    dv_pkt = DataValidation(
        type="custom",
        formula1=f'OR(EXACT(D{R_DAT0},"n.b."),AND(ISNUMBER(D{R_DAT0}),'
                 f'D{R_DAT0}>=0,D{R_DAT0}<=D${R_PMAX}))',
        allow_blank=True, showErrorMessage=True,
        errorTitle="Eingabe nicht möglich",
        error="Erlaubt sind: eine Zahl von 0 bis zur Höchstpunktzahl in "
              "Zeile 11 – oder n.b. für „nicht bewertet“.\n"
              "Steht in Zeile 11 noch keine Punktzahl, bitte zuerst oben den "
              "Parameter eintragen.",
        showInputMessage=True, promptTitle="Punkte eintragen",
        prompt="Zahl eingeben – oder n.b., wenn der Azubi hier nicht bewertet "
               "wurde.")
    ws.add_data_validation(dv_pkt)
    dv_pkt.add(f"D{R_DAT0}:K{R_DAT1}")

    dv_grund = DataValidation(
        type="list", formula1='"krank,Urlaub,Berufsschule,sonstiges"',
        allow_blank=True, showErrorMessage=True,
        errorTitle="Grund nicht bekannt",
        error="Bitte krank, Urlaub, Berufsschule oder sonstiges wählen.",
        showInputMessage=True, promptTitle="Grund für n.b.",
        prompt="Nur ausfüllen, wenn der Azubi bei dieser Übung nicht bewertet "
               "wurde.")
    ws.add_data_validation(dv_grund)
    dv_grund.add(f"P{R_DAT0}:P{R_DAT1}")

    dv_wert = DataValidation(
        type="list", formula1='"letzte,beste,keine"', allow_blank=True,
        showErrorMessage=True, errorTitle="Wertung nicht bekannt",
        error="Bitte letzte, beste oder keine wählen.",
        showInputMessage=True, promptTitle="Wertung bei Wiederholung",
        prompt="Nur auf einem Wiederholungsblatt nötig. Leer = Standard aus "
               "den Einstellungen.")
    ws.add_data_validation(dv_wert)
    dv_wert.add(f"R{R_DAT0}:R{R_DAT1}")

    from stil import ampel_regeln
    # „frei“ legt sich als erste Regel über alles und stoppt die anderen
    if not vorlage:
        ws.conditional_formatting.add(
            f"A{R_PNAME}:S{R_DAT1}",
            FormulaRule(formula=[f'$C${R_K1}=""'], fill=fill(GESPERRT_BG),
                        font=f(10.5, color="A6ADB8"), stopIfTrue=True))
    ampel_regeln(ws, f"N{R_DAT0}:O{R_DAT1}", f"$N{R_DAT0}")
    # „n.b.“ sichtbar, aber ruhig
    ws.conditional_formatting.add(
        f"D{R_DAT0}:K{R_DAT1}",
        FormulaRule(formula=[f'EXACT(D{R_DAT0},"n.b.")'], fill=fill("E3E7ED"),
                    font=f(10.5, italic=True, color=TXT_HELL),
                    stopIfTrue=True))
    # Mehr Punkte als möglich – fällt rot auf
    ws.conditional_formatting.add(
        f"D{R_DAT0}:K{R_DAT1}",
        FormulaRule(formula=[f'AND(ISNUMBER(D{R_DAT0}),D{R_DAT0}>D${R_PMAX})'],
                    fill=fill("FDE3E1"), font=f(12, bold=True,
                                                color="C0392B")))
    # Zeile angefangen, aber nicht fertig
    ws.conditional_formatting.add(
        f"A{R_DAT0}:C{R_DAT1}",
        FormulaRule(
            formula=[f'AND($B{R_DAT0}<>"",COUNT($D{R_DAT0}:$K{R_DAT0})'
                     f'+COUNTIF($D{R_DAT0}:$K{R_DAT0},"n.b.")>0,'
                     f'COUNT($D{R_DAT0}:$K{R_DAT0})'
                     f'+COUNTIF($D{R_DAT0}:$K{R_DAT0},"n.b.")'
                     f'<COUNTIF($D${R_PMAX}:$K${R_PMAX},">0"))'],
            fill=fill("FFF1D6")))
    # Nicht mehr aktive Azubis zurückhaltend darstellen
    ws.conditional_formatting.add(
        f"A{R_DAT0}:C{R_DAT1}",
        FormulaRule(formula=[f"'Stammdaten'!$G{SD0}<>\"aktiv\""],
                    font=f(10.5, italic=True, color="98A1AE")))


def _uebung_fuss(ws, vorlage):
    r = R_FUSS
    verbinde(ws, f"A{r}:C{r}", " Farblegende", font=f(10.5, bold=True,
                                                      color=NAVY_700),
             align=LINKS)
    notenlegende(ws, f"D{r}")
    verbinde(ws, f"J{r}:S{r}",
             "Farbe und Zahl sagen dasselbe – der Ausdruck in Schwarz-Weiß "
             "bleibt lesbar.", font=f(9.5, color=TXT_HELL), align=LINKS_UM)
    hoehen(ws, {r: 24, r + 1: 10})
    verbinde(
        ws, f"A{r + 2}:S{r + 3}",
        "Nicht bewertet: Einzelne Felder mit „n.b.“ fallen aus Summe und "
        "Höchstpunktzahl heraus. Steht in einer Zeile nur „n.b.“, zählt die "
        "Übung für diesen Azubi nirgends mit – weder als 0 Punkte noch im "
        "Durchschnitt, in der Halbjahresnote oder in der Warnübersicht. Bitte "
        "zusätzlich den Grund in Spalte P wählen.",
        font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, f"A{r + 2}:S{r + 3}", LINIE_STARK, "thin")
    hoehen(ws, {r + 2: 22, r + 3: 22})
