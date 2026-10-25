# -*- coding: utf-8 -*-
"""Stufe 2: Rechenblatt „Daten“, Startseite, Azubi-Ansicht, Halbjahr.

Das Blatt „Daten“ ist der Rechenkern. Es spiegelt jede Übung spaltenweise und
jeden Azubi zeilenweise, damit alle Auswertungen mit einfachem SUMMENPRODUKT
auskommen — ohne neue Excel-Funktionen und ohne INDIREKT.
"""

from openpyxl.chart import LineChart, Reference
from openpyxl.chart.marker import Marker
from openpyxl.drawing.line import LineProperties
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

import blaetter_basis as bb
from stil import (AMPEL_GELB, AMPEL_GRUEN, AMPEL_ROT, BG, EINGABE_BG,
                  FMT_DATUM, FMT_HJ, FMT_PROZ, FMT_PUNKT, FORMEL_BG,
                  FORMEL_TXT, LINIE_STARK, LINKS, LINKS_UM, MAX_AZUBIS,
                  MAX_HJ, MITTE, MITTE_UM, N_UEBUNGEN, N_WARN, NAVY_100,
                  NAVY_500, NAVY_700, PANEL, RAHMEN_EINGABE, RAHMEN_ZART,
                  TEAL, TEAL_100, TXT, TXT_HELL, TXT_WEISS, UEB_BLATT,
                  ampel_regeln, aussenrahmen, blattkopf, breiten, f, fill,
                  hoehen, legende_eingabe, link_zelle, note_text, note_zahl,
                  notenlegende, notenlegende_bereiche, druck, rahmen,
                  setze, verbinde)

# ------------------------------------------------- Raster des Rechenblattes --
M_NR, M_NAME, M_BELEGT, M_ART, M_DATUM = 3, 4, 5, 6, 7
M_STATUS, M_GEW, M_WDHN, M_WDHI, M_HEAD = 8, 9, 10, 11, 12
M_NPARAM, M_LASTREP, M_GSIZE = 13, 14, 15
M_UNVOLL, M_OHNEGRUND, M_OHNEKUERZEL = 16, 17, 18

# Jedes Band ist so hoch wie die Azubi-Zahl. Die Zeilennummern werden
# daraus gerechnet, damit die Mappe mit MAX_AZUBIS mitwächst, ohne dass
# irgendwo eine Zahl von Hand nachgezogen werden muss.
_ABST = MAX_AZUBIS + 5
_B0 = 20
(B_PCT, B_EVAL, B_HJ, B_PKT, B_MAX, B_GRUND, B_RULEIN, B_ENTERED,
 B_GLAST, B_GBEST, B_GBESTNR, B_RULE, B_CNT, B_CNTA, B_BEM,
 B_CNTV) = [_B0 + k * _ABST for k in range(16)]

HJ_HEAD = _B0 + 16 * _ABST + 3
(HJ_ANZ, HJ_ANZP, HJ_ANZT,
 HJ_P, HJ_T, HJ_G) = [HJ_HEAD + 1 + k * _ABST for k in range(6)]

_NACH_HJ = HJ_HEAD + 1 + 6 * _ABST
R_KEYGES = _NACH_HJ + 1      # gewertete Übungen des Gesprächs-Halbjahres
R_KEYLAUF = _NACH_HJ + 2     # laufende Übungen (Schlüsselzeile)
R_KEYCHART = _NACH_HJ + 3    # bewertete Übungen des gewählten Azubis
R_SELJAHR = _NACH_HJ + 4     # Jahrgang des gewählten Azubis
R_SELNAME = _NACH_HJ + 5     # Azubi-Ansicht: gewählter Anzeigename
R_SELIDX = _NACH_HJ + 6      # Azubi-Ansicht: Nummer des Azubis
R_GNAME = _NACH_HJ + 7       # Gesprächsseite: gewählter Anzeigename
R_GIDX = _NACH_HJ + 8
R_GHJ = _NACH_HJ + 9
R_NFILTER = _NACH_HJ + 10    # Anzahl Azubis im Filter

AKT = _NACH_HJ + 13
LST_AZ = AKT + _ABST         # Azubis nach Filter
LST_AZA = LST_AZ + _ABST     # alle aktiven Azubis, ohne Filter
LST_JAHR = LST_AZA + _ABST
LST_BERUF = LST_JAHR + _ABST + 2

ERSTE_SP, LETZTE_SP = "C", "V"      # 20 Übungsspalten


def sp(j):
    """Spaltenbuchstabe der j-ten Übung (1-basiert)."""
    return get_column_letter(2 + j)


def blk(base):
    """2-D-Bereich eines Bandes: 25 Azubis x 20 Übungen."""
    return f"$C${base}:$V${base + MAX_AZUBIS - 1}"


def zeile(base, i):
    """Eine Azubi-Zeile quer über alle Übungen."""
    return f"$C${base + i}:$V${base + i}"


def meta(r):
    return f"$C${r}:$V${r}"


AKTIV_VEK = f"$A${B_PCT}:$A${B_PCT + MAX_AZUBIS - 1}"
JAHR_VEK = f"$B${B_PCT}:$B${B_PCT + MAX_AZUBIS - 1}"
D = "Daten!"
HJ_BLOCK = {
    "anz": HJ_ANZ, "anzP": HJ_ANZP, "anzT": HJ_ANZT,
    "P": HJ_P, "T": HJ_T, "G": HJ_G,
}


def hjb(key):
    b = HJ_BLOCK[key]
    return f"{D}$C${b}:$J${b + MAX_AZUBIS - 1}"


# ================================================================== Daten ====
def baue_daten(ws):
    ws.sheet_properties.tabColor = "8A94A6"
    ws.sheet_view.showGridLines = False
    breiten(ws, {"A": 7, "B": 9})
    for j in range(1, N_UEBUNGEN + 1):
        ws.column_dimensions[sp(j)].width = 11

    verbinde(ws, "A1:V1",
             "Technisches Rechenblatt – bitte nichts von Hand ändern. Alle "
             "Werte entstehen aus den Übungsblättern und den Stammdaten.",
             font=f(11, bold=True, color=TXT_WEISS), bg=NAVY_700, align=LINKS)
    hoehen(ws, {1: 26})

    beschriftung = {
        M_NR: "Nr.", M_NAME: "Übungsname", M_BELEGT: "belegt",
        M_ART: "Art", M_DATUM: "Datum", M_STATUS: "Status",
        M_GEW: "Gewicht", M_WDHN: "Wdh. von", M_WDHI: "Wdh.-Index",
        M_HEAD: "Gruppenkopf", M_NPARAM: "Parameter",
        M_LASTREP: "letzte Wdh.", M_GSIZE: "Gruppengröße",
        M_UNVOLL: "unvollständig", M_OHNEGRUND: "n.b. ohne Grund",
        M_OHNEKUERZEL: "ohne Kürzel",
    }
    for r, t in beschriftung.items():
        setze(ws, f"A{r}", t, font=f(9, color=TXT_HELL), align=LINKS)

    for j in range(1, N_UEBUNGEN + 1):
        c = sp(j)
        q = f"'{UEB_BLATT.format(j)}'"
        uv = bb.UV0 + j - 1
        setze(ws, f"{c}{M_NR}", j, font=f(9, bold=True), align=MITTE)
        setze(ws, f"{c}{M_NAME}",
              f'=IF(\'Übungen\'!$C{uv}="","",\'Übungen\'!$C{uv})',
              font=f(9), align=LINKS)
        setze(ws, f"{c}{M_BELEGT}", f'=IF({c}{M_NAME}="",0,1)', font=f(9),
              align=MITTE)
        setze(ws, f"{c}{M_ART}",
              f'=IF({c}{M_BELEGT}=0,"",{q}!{bb.Z_ART})', font=f(9),
              align=MITTE)
        setze(ws, f"{c}{M_DATUM}",
              f'=IF(OR({c}{M_BELEGT}=0,{q}!{bb.Z_DATUM}=""),0,'
              f'{q}!{bb.Z_DATUM})', font=f(9), align=MITTE, fmt=FMT_DATUM)
        setze(ws, f"{c}{M_STATUS}",
              f'=IF({c}{M_BELEGT}=0,"",{q}!{bb.Z_STATUS})', font=f(9),
              align=MITTE)
        setze(ws, f"{c}{M_GEW}",
              f'=IF({c}{M_BELEGT}=0,0,IF({q}!{bb.Z_GEWICHT}="",1,'
              f'{q}!{bb.Z_GEWICHT}))', font=f(9), align=MITTE)
        setze(ws, f"{c}{M_WDHN}",
              f'=IF({c}{M_BELEGT}=0,"",{q}!{bb.Z_WDH})', font=f(9),
              align=LINKS)
        setze(ws, f"{c}{M_WDHI}",
              f'=IF({c}{M_WDHN}="",0,IFERROR(MATCH({c}{M_WDHN},'
              f'{meta(M_NAME)},0),0))', font=f(9), align=MITTE)
        # Gruppenkopf: eine Wiederholung einer Wiederholung wird mit aufgelöst
        setze(ws, f"{c}{M_HEAD}",
              f'=IF({c}{M_WDHI}=0,{c}{M_NR},IF(INDEX({meta(M_WDHI)},'
              f'{c}{M_WDHI})=0,{c}{M_WDHI},INDEX({meta(M_WDHI)},'
              f'{c}{M_WDHI})))', font=f(9), align=MITTE)
        setze(ws, f"{c}{M_NPARAM}",
              f'=IF({c}{M_BELEGT}=0,0,COUNTIF({q}!{bb.Z_PMAX},">0"))',
              font=f(9), align=MITTE)
        setze(ws, f"{c}{M_LASTREP}",
              f'=SUMPRODUCT(MAX(({meta(M_HEAD)}={c}${M_HEAD})*'
              f'({meta(M_WDHI)}>0)*{meta(M_NR)}))', font=f(9), align=MITTE)
        setze(ws, f"{c}{M_GSIZE}",
              f'=SUMPRODUCT(({meta(M_HEAD)}={c}${M_HEAD})*'
              f'({meta(M_BELEGT)}=1))', font=f(9), align=MITTE)
        ent = f"${c}${B_ENTERED}:${c}${B_ENTERED + MAX_AZUBIS - 1}"
        ev = f"${c}${B_EVAL}:${c}${B_EVAL + MAX_AZUBIS - 1}"
        gr = f"${c}${B_GRUND}:${c}${B_GRUND + MAX_AZUBIS - 1}"
        setze(ws, f"{c}{M_UNVOLL}",
              f'=SUMPRODUCT(({ent}>0)*({ent}<{c}${M_NPARAM})*{AKTIV_VEK})',
              font=f(9), align=MITTE)
        setze(ws, f"{c}{M_OHNEGRUND}",
              f'=SUMPRODUCT(({c}${M_NPARAM}>0)*({ent}={c}${M_NPARAM})*'
              f'({ev}=0)*({gr}="")*{AKTIV_VEK})', font=f(9), align=MITTE)
        setze(ws, f"{c}{M_OHNEKUERZEL}",
              f'=IF({c}{M_BELEGT}=0,0,IF({q}!{bb.Z_WER}="",1,0))',
              font=f(9), align=MITTE)

    # ---- Hilfsvektoren je Azubi --------------------------------------------
    for i in range(MAX_AZUBIS):
        sd = bb.SD0 + i
        setze(ws, f"A{B_PCT + i}",
              f'=IF(\'Stammdaten\'!$G{sd}="aktiv",1,0)', font=f(9),
              align=MITTE)
        setze(ws, f"B{B_PCT + i}",
              f'=IF(\'Stammdaten\'!$E{sd}="",0,\'Stammdaten\'!$E{sd})',
              font=f(9), align=MITTE, fmt="0")

    # ---- Bänder -------------------------------------------------------------
    bands = {
        B_PCT: "Prozent", B_EVAL: "bewertet", B_HJ: "Halbjahr",
        B_PKT: "Punkte", B_MAX: "max. Punkte", B_GRUND: "Grund",
        B_RULEIN: "Wertung Wdh.", B_ENTERED: "Felder gefüllt",
        B_GLAST: "letzte bewertete der Gruppe",
        B_GBEST: "bester Prozentwert der Gruppe",
        B_GBESTNR: "Nr. des besten", B_RULE: "geltende Wertung",
        B_CNT: "zählt", B_CNTA: "zählt (nur aktive)",
        B_BEM: "Bemerkung",
        B_CNTV: "zählt fürs Halbjahr",
    }
    for base, titel in bands.items():
        setze(ws, f"A{base - 1}", titel, font=f(9, bold=True, color=NAVY_700),
              align=LINKS)

    for i in range(MAX_AZUBIS):
        ca = bb.az_sp(i)          # Spalte dieses Azubis im Übungsblatt
        for j in range(1, N_UEBUNGEN + 1):
            c = sp(j)
            q = f"'{UEB_BLATT.format(j)}'"
            put = lambda base, form: setze(      # noqa: E731
                ws, f"{c}{base + i}", form, font=f(9), align=MITTE)
            put(B_PCT, f'=IF(ISNUMBER({q}!{ca}${bb.U_PROZ}),'
                       f'{q}!{ca}${bb.U_PROZ},0)')
            ws[f"{c}{B_PCT + i}"].number_format = FMT_PROZ
            put(B_EVAL, f'=IF(ISNUMBER({q}!{ca}${bb.U_PROZ}),1,0)')
            put(B_HJ, f'=IF(ISNUMBER({q}!{ca}${bb.U_HJ}),'
                      f'{q}!{ca}${bb.U_HJ},0)')
            put(B_PKT, f'=IF(ISNUMBER({q}!{ca}${bb.U_SUMME}),'
                       f'{q}!{ca}${bb.U_SUMME},0)')
            put(B_MAX, f'=IF(ISNUMBER({q}!{ca}${bb.U_MAX}),'
                       f'{q}!{ca}${bb.U_MAX},0)')
            put(B_GRUND, f'=IF({q}!{ca}${bb.U_GRUND}="","",'
                         f'{q}!{ca}${bb.U_GRUND})')
            put(B_RULEIN, f'=IF({q}!{ca}${bb.U_WERT}="","",'
                          f'{q}!{ca}${bb.U_WERT})')
            put(B_ENTERED,
                f'=COUNT({q}!{ca}${bb.U_P0}:{ca}${bb.U_P1})'
                f'+COUNTIF({q}!{ca}${bb.U_P0}:{ca}${bb.U_P1},"n.b.")')
            put(B_GLAST,
                f'=IF({c}${M_GSIZE}<=1,0,'
                f'SUMPRODUCT(MAX(({meta(M_HEAD)}={c}${M_HEAD})*'
                f'({zeile(B_EVAL, i)})*{meta(M_NR)})))')
            put(B_GBEST,
                f'=IF({c}${M_GSIZE}<=1,0,'
                f'SUMPRODUCT(MAX(({meta(M_HEAD)}={c}${M_HEAD})*'
                f'({zeile(B_EVAL, i)})*({zeile(B_PCT, i)}))))')
            put(B_GBESTNR,
                f'=IF({c}${M_GSIZE}<=1,0,'
                f'SUMPRODUCT(MAX(({meta(M_HEAD)}={c}${M_HEAD})*'
                f'({zeile(B_EVAL, i)})*(({zeile(B_PCT, i)})='
                f'{c}{B_GBEST + i})*{meta(M_NR)})))')
            put(B_RULE,
                f'=IF({c}${M_LASTREP}=0,WdhStd,IF(INDEX({zeile(B_RULEIN, i)},'
                f'{c}${M_LASTREP})="",WdhStd,INDEX({zeile(B_RULEIN, i)},'
                f'{c}${M_LASTREP})))')
            put(B_CNT,
                f'=IF({c}{B_EVAL + i}=0,0,IF({c}${M_GSIZE}<=1,1,'
                f'IF(EXACT({c}{B_RULE + i},"keine"),'
                f'IF({c}${M_NR}={c}${M_HEAD},1,0),'
                f'IF(EXACT({c}{B_RULE + i},"beste"),'
                f'IF({c}${M_NR}={c}{B_GBESTNR + i},1,0),'
                f'IF({c}${M_NR}={c}{B_GLAST + i},1,0)))))')
            put(B_CNTA, f'={c}{B_CNT + i}*$A${B_PCT + i}')
            put(B_BEM, f'=IF({q}!{ca}${bb.U_BEM}="","",'
                       f'{q}!{ca}${bb.U_BEM})')
            # Eine laufende Übung ist ein Zwischenstand – sie darf
            # die Halbjahresnote nicht nach unten ziehen.
            put(B_CNTV,
                f'={c}{B_CNT + i}*IF(EXACT({c}${M_STATUS},'
                f'"abgeschlossen"),1,0)')

    # ---- Halbjahresmatrix ---------------------------------------------------
    setze(ws, f"A{HJ_HEAD}", "Halbjahr →", font=f(9, bold=True,
                                                  color=NAVY_700),
          align=LINKS)
    for h in range(1, MAX_HJ + 1):
        setze(ws, f"{get_column_letter(2 + h)}{HJ_HEAD}", h,
              font=f(9, bold=True), align=MITTE)
    for key, base in HJ_BLOCK.items():
        setze(ws, f"A{base - 1}", f"HJ {key}", font=f(9, bold=True,
                                                      color=NAVY_700),
              align=LINKS)

    for i in range(MAX_AZUBIS):
        cnt, hj, pct, gew = (zeile(B_CNTV, i), zeile(B_HJ, i),
                             zeile(B_PCT, i), meta(M_GEW))
        art = meta(M_ART)
        for h in range(1, MAX_HJ + 1):
            c = get_column_letter(2 + h)
            hsel = f"{c}${HJ_HEAD}"
            setze(ws, f"{c}{HJ_ANZ + i}",
                  f'=SUMPRODUCT({cnt},({hj}={hsel})*1)', font=f(9),
                  align=MITTE)
            setze(ws, f"{c}{HJ_ANZP + i}",
                  f'=SUMPRODUCT({cnt},({hj}={hsel})*1,({art}="Praxis")*1)',
                  font=f(9), align=MITTE)
            setze(ws, f"{c}{HJ_ANZT + i}",
                  f'=SUMPRODUCT({cnt},({hj}={hsel})*1,({art}="Theorie")*1)',
                  font=f(9), align=MITTE)
            for schl, base, kunst in (("P", HJ_P, "Praxis"),
                                      ("T", HJ_T, "Theorie")):
                anzb = HJ_ANZP if schl == "P" else HJ_ANZT
                setze(ws, f"{c}{base + i}",
                      f'=IF({c}{anzb + i}=0,"",'
                      f'SUMPRODUCT({cnt},({hj}={hsel})*1,({art}="{kunst}")*1,'
                      f'{gew},{pct})/'
                      f'SUMPRODUCT({cnt},({hj}={hsel})*1,({art}="{kunst}")*1,'
                      f'{gew}))', font=f(9), align=MITTE, fmt=FMT_PROZ)
            setze(ws, f"{c}{HJ_G + i}",
                  f'=IF({c}{HJ_ANZ + i}=0,"",IF(EXACT(GewAn,"ja"),'
                  f'IF(AND({c}{HJ_P + i}<>"",{c}{HJ_T + i}<>""),'
                  f'({c}{HJ_P + i}*GewP+{c}{HJ_T + i}*GewT)/(GewP+GewT),'
                  f'IF({c}{HJ_P + i}<>"",{c}{HJ_P + i},'
                  f'IF({c}{HJ_T + i}<>"",{c}{HJ_T + i},""))),'
                  f'SUMPRODUCT({cnt},({hj}={hsel})*1,{gew},{pct})/'
                  f'SUMPRODUCT({cnt},({hj}={hsel})*1,{gew})))',
                  font=f(9, bold=True), align=MITTE, fmt=FMT_PROZ)

    # ---- Schlüsselzeilen und Einzelwerte ------------------------------------
    setze(ws, f"A{R_KEYGES}", "Gespräch: Übungen des HJ",
          font=f(9, color=TXT_HELL))
    setze(ws, f"A{R_KEYLAUF}", "laufende Übungen", font=f(9, color=TXT_HELL))
    setze(ws, f"A{R_KEYCHART}", "bewertet (Diagramm)",
          font=f(9, color=TXT_HELL))
    for j in range(1, N_UEBUNGEN + 1):
        c = sp(j)
        setze(ws, f"{c}{R_KEYGES}",
              f'=IF(OR($B${R_GIDX}=0,$B${R_GHJ}<1,$B${R_GHJ}>{MAX_HJ}),"",'
              f'IF(AND(INDEX({blk(B_CNTV)},$B${R_GIDX},{j})=1,'
              f'INDEX({blk(B_HJ)},$B${R_GIDX},{j})=$B${R_GHJ}),{j},""))',
              font=f(9), align=MITTE)
        setze(ws, f"{c}{R_KEYLAUF}",
              f'=IF(AND({c}{M_BELEGT}=1,EXACT({c}{M_STATUS},"laufend")),'
              f'{c}{M_NR},"")', font=f(9), align=MITTE)
        setze(ws, f"{c}{R_KEYCHART}",
              f'=IF($B${R_SELIDX}=0,"",IF(INDEX({blk(B_CNT)},$B${R_SELIDX},'
              f'{j})=1,{j},""))', font=f(9), align=MITTE)

    skalare = [
        (R_SELJAHR, "Jahrgang gewählt",
         f'=IF($B${R_SELIDX}=0,0,INDEX(\'Stammdaten\'!$E${bb.SD0}:'
         f'$E${bb.SD1},$B${R_SELIDX}))'),
        (R_SELNAME, "Azubi gewählt", "='Azubi-Ansicht'!$C$5"),
        (R_SELIDX, "Azubi-Nr.",
         f'=IFERROR(MATCH($B${R_SELNAME},\'Stammdaten\'!$J${bb.SD0}:'
         f'$J${bb.SD1},0),0)'),
        (R_GNAME, "Gespräch Azubi", "='Gesprächsseite'!$C$6"),
        (R_GIDX, "Gespräch Nr.",
         f'=IFERROR(MATCH($B${R_GNAME},\'Stammdaten\'!$J${bb.SD0}:'
         f'$J${bb.SD1},0),0)'),
        (R_GHJ, "Gespräch HJ", "='Gesprächsseite'!$F$6"),
        (R_NFILTER, "Azubis im Filter",
         f'=COUNT($C${LST_AZ}:$C${LST_AZ + MAX_AZUBIS - 1})'),
    ]
    for r, t, form in skalare:
        setze(ws, f"A{r}", t, font=f(9, color=TXT_HELL), align=LINKS)
        setze(ws, f"B{r}", form, font=f(9), align=LINKS)

    # ---- Blöcke für Warnübersicht und Auswahllisten -------------------------
    setze(ws, f"A{AKT - 1}", "aktuelles Halbjahr je Azubi",
          font=f(9, bold=True, color=NAVY_700), align=LINKS)
    for i in range(MAX_AZUBIS):
        r = AKT + i
        sd = bb.SD0 + i
        setze(ws, f"B{r}", i + 1, font=f(9), align=MITTE)
        # Das zuletzt bewertete Halbjahr, nicht das Kalender-Halbjahr:
        # im frisch begonnenen Halbjahr ist sonst noch nichts abgeschlossen.
        setze(ws, f"C{r}",
              f'=IF(SUM($C${HJ_ANZ + i}:$J${HJ_ANZ + i})=0,"",'
              f'SUMPRODUCT(MAX(($C${HJ_ANZ + i}:$J${HJ_ANZ + i}>0)*'
              f'$C${HJ_HEAD}:$J${HJ_HEAD})))', font=f(9), align=MITTE)
        setze(ws, f"D{r}",
              f'=IF(OR(C{r}="",C{r}<1,C{r}>{MAX_HJ}),"",'
              f'INDEX($C${HJ_G + i}:$J${HJ_G + i},C{r}))', font=f(9),
              align=MITTE, fmt=FMT_PROZ)
        setze(ws, f"E{r}",
              f'=IF(OR(C{r}="",C{r}<1,C{r}>{MAX_HJ}),"",'
              f'INDEX($C${HJ_ANZ + i}:$J${HJ_ANZ + i},C{r}))', font=f(9),
              align=MITTE)
        setze(ws, f"F{r}", f'=IF(ISNUMBER(D{r}),{note_zahl(f"D{r}")},"")',
              font=f(9), align=MITTE)
        setze(ws, f"G{r}",
              f'=IF(AND(ISNUMBER(D{r}),\'Stammdaten\'!$G{sd}="aktiv",'
              f'F{r}>=WarnNote),1,0)', font=f(9), align=MITTE)
        setze(ws, f"H{r}", f'=IF(G{r}=1,B{r},"")', font=f(9), align=MITTE)

    setze(ws, f"A{LST_AZ - 1}", "Auswahlliste Azubis (gefiltert)",
          font=f(9, bold=True, color=NAVY_700), align=LINKS)
    for i in range(MAX_AZUBIS):
        r = LST_AZ + i
        sd = bb.SD0 + i
        setze(ws, f"C{r}",
              f'=IF(AND(\'Stammdaten\'!$B{sd}<>"",'
              f'\'Stammdaten\'!$G{sd}="aktiv",'
              f'OR(\'Azubi-Ansicht\'!$C$4="(alle)",'
              f'\'Azubi-Ansicht\'!$C$4="",'
              f'\'Stammdaten\'!$D{sd}=\'Azubi-Ansicht\'!$C$4),'
              f'OR(\'Azubi-Ansicht\'!$H$4="(alle)",'
              f'\'Azubi-Ansicht\'!$H$4="",'
              f'\'Stammdaten\'!$E{sd}=\'Azubi-Ansicht\'!$H$4)),{i + 1},"")',
              font=f(9), align=MITTE)
        setze(ws, f"D{r}",
              f'=IFERROR(INDEX(\'Stammdaten\'!$J${bb.SD0}:$J${bb.SD1},'
              f'SMALL($C${LST_AZ}:$C${LST_AZ + MAX_AZUBIS - 1},'
              f'ROW()-{LST_AZ - 1})),"")', font=f(9), align=LINKS)

    # Zweite Liste ohne Filter: die Gesprächsseite darf nicht davon abhängen,
    # was jemand anders gerade in der Azubi-Ansicht gefiltert hat.
    setze(ws, f"A{LST_AZA - 1}", "Auswahlliste Azubis (alle aktiven)",
          font=f(9, bold=True, color=NAVY_700), align=LINKS)
    setze(ws, f"B{LST_AZA - 1}",
          f'=COUNT($C${LST_AZA}:$C${LST_AZA + MAX_AZUBIS - 1})', font=f(9),
          align=MITTE)
    for i in range(MAX_AZUBIS):
        r = LST_AZA + i
        sd = bb.SD0 + i
        setze(ws, f"C{r}",
              f'=IF(AND(\'Stammdaten\'!$B{sd}<>"",'
              f'\'Stammdaten\'!$G{sd}="aktiv"),{i + 1},"")',
              font=f(9), align=MITTE)
        setze(ws, f"D{r}",
              f'=IFERROR(INDEX(\'Stammdaten\'!$J${bb.SD0}:$J${bb.SD1},'
              f'SMALL($C${LST_AZA}:$C${LST_AZA + MAX_AZUBIS - 1},'
              f'ROW()-{LST_AZA - 1})),"")', font=f(9), align=LINKS)

    setze(ws, f"A{LST_JAHR - 1}", "Auswahlliste Jahrgänge",
          font=f(9, bold=True, color=NAVY_700), align=LINKS)
    setze(ws, f"C{LST_JAHR}", "(alle)", font=f(9), align=MITTE)
    for i in range(MAX_AZUBIS):
        sd = bb.SD0 + i
        setze(ws, f"B{LST_JAHR + 1 + i}",
              f'=IF(OR(\'Stammdaten\'!$B{sd}="",\'Stammdaten\'!$E{sd}=""),"",'
              f'IF(COUNTIF(\'Stammdaten\'!$E${bb.SD0}:$E{sd},'
              f'\'Stammdaten\'!$E{sd})=1,\'Stammdaten\'!$E{sd},""))',
              font=f(9), align=MITTE, fmt="0")
        setze(ws, f"C{LST_JAHR + 1 + i}",
              f'=IFERROR(SMALL($B${LST_JAHR + 1}:'
              f'$B${LST_JAHR + MAX_AZUBIS},ROW()-{LST_JAHR}),"")',
              font=f(9), align=MITTE, fmt="0")

    setze(ws, f"A{LST_BERUF - 1}", "Auswahlliste Berufe",
          font=f(9, bold=True, color=NAVY_700), align=LINKS)
    setze(ws, f"C{LST_BERUF}", "(alle)", font=f(9), align=MITTE)
    for k in range(1, 11):
        setze(ws, f"C{LST_BERUF + k}",
              f'=IF(INDEX(Berufe,{k})="","",INDEX(Berufe,{k}))',
              font=f(9), align=LINKS)


def daten_namen(wb):
    """Dynamische Namen für die Auswahllisten – ohne leere Einträge."""
    from openpyxl.workbook.defined_name import DefinedName
    namen = {
        "AzubiAuswahl":
            f"OFFSET(Daten!$D${LST_AZ},0,0,MAX(1,Daten!$B${R_NFILTER}),1)",
        "AzubiAktiv":
            f"OFFSET(Daten!$D${LST_AZA},0,0,"
            f"MAX(1,Daten!$B${LST_AZA - 1}),1)",
        "JahrAuswahl":
            f"OFFSET(Daten!$C${LST_JAHR},0,0,1+COUNT(Daten!$B${LST_JAHR + 1}:"
            f"$B${LST_JAHR + MAX_AZUBIS}),1)",
        "BerufAuswahl":
            f'OFFSET(Daten!$C${LST_BERUF},0,0,1+COUNTIF(Berufe,"?*"),1)',
        "HJAuswahl": f"Daten!$C${HJ_HEAD}:$J${HJ_HEAD}",
    }
    for n, ziel in namen.items():
        wb.defined_names.add(DefinedName(n, attr_text=ziel))


def patch_uebungsliste(ws):
    """Spalten „bewertet“ und „Ø Prozent“ auf den Rechenkern umstellen.

    Erst jetzt steht fest, welche Wertung bei Wiederholungen zählt und wer
    noch aktiv ist – beides fließt über die Bänder CNTA und PCT ein.
    """
    for i in range(N_UEBUNGEN):
        r = bb.UV0 + i
        j = i + 1
        ws[f"L{r}"] = (f'=IF($C{r}="","",SUM(INDEX({D}{blk(B_CNTA)},0,{j})))')
        ws[f"M{r}"] = (f'=IF(OR($C{r}="",$L{r}=0),"",'
                       f'SUMPRODUCT(INDEX({D}{blk(B_CNTA)},0,{j}),'
                       f'INDEX({D}{blk(B_PCT)},0,{j}))/$L{r})')


# =============================================================== Startseite ==
# Breiten so gewählt, dass die Seite in das SharePoint-Webpart passt:
# je Spalte rund 7*Breite+5 px, dazu ~30 px Zeilenkopf -> zusammen 1199 px.
DOPPELT = (f"=SUMPRODUCT(('Stammdaten'!$J${bb.SD0}:$J${bb.SD1}<>\"\")*"
           f"(COUNTIF('Stammdaten'!$J${bb.SD0}:$J${bb.SD1},"
           f"'Stammdaten'!$J${bb.SD0}:$J${bb.SD1}&\"\")>1))")

SP_START = {"A": 5, "B": 26, "C": 10, "D": 11, "E": 14, "F": 10, "G": 10,
            "H": 16, "I": 2, "J": 16, "K": 9, "L": 9, "M": 17, "N": 2}


def baue_start(ws):
    blattkopf(ws, "N", "Azubi-Leistungen",
              "Überblick über Übungen, Tests und den Leistungsstand – "
              "Startseite und Inhaltsverzeichnis", zurueck=False,
              tabfarbe=NAVY_700)
    breiten(ws, SP_START)
    legende_eingabe(ws, "A3:H3")
    link_zelle(ws, "J3", "Anleitung!A1", "Kurzanleitung öffnen »",
               bg=BG, align=MITTE, border=RAHMEN_ZART)
    ws.merge_cells("J3:N3")
    hoehen(ws, {3: 24, 4: 30, 5: 8})

    nav = [("A4:B4", "Azubi-Ansicht", "'Azubi-Ansicht'!A1"),
           ("C4:D4", "Gesprächsseite", "'Gesprächsseite'!A1"),
           ("E4:F4", "Halbjahr", "Halbjahr!A1"),
           ("G4:H4", "Übungen verwalten", "'Übungen'!A1"),
           ("J4:K4", "Stammdaten", "Stammdaten!A1"),
           ("L4:M4", "Einstellungen", "Einstellungen!A1")]
    for rng, text, ziel in nav:
        ws.merge_cells(rng)
        link_zelle(ws, rng.split(":")[0], ziel, text,
                   font=f(11, bold=True, color=TXT_WEISS, underline=None),
                   bg=NAVY_500, align=MITTE, border=rahmen(PANEL))

    # ---- Kennzahlen ---------------------------------------------------------
    kpi = [
        ("A", "B", f'=COUNTIF(\'Stammdaten\'!$G${bb.SD0}:$G${bb.SD1},'
                   f'"aktiv")', "aktive Azubis", "0"),
        ("C", "D", f'=SUM({D}{meta(M_BELEGT)})', "belegte Übungen", "0"),
        ("E", "F", f'=IF(SUM({D}{blk(B_CNTA)})=0,"",'
                   f'SUMPRODUCT({D}{blk(B_CNTA)},{D}{blk(B_PCT)})/'
                   f'SUM({D}{blk(B_CNTA)}))', "Ø aller Bewertungen",
         FMT_PROZ),
        ("G", "H", f'=SUM({D}$G${AKT}:$G${AKT + MAX_AZUBIS - 1})',
         "Azubis in der Warnübersicht", "0"),
    ]
    for sp1, sp2, form, label, fmt in kpi:
        verbinde(ws, f"{sp1}6:{sp2}6", form, font=f(22, bold=True,
                                                    color=NAVY_700),
                 bg=PANEL, align=MITTE, fmt=fmt)
        verbinde(ws, f"{sp1}7:{sp2}7", label, font=f(9.5, color=TXT_HELL),
                 bg=PANEL, align=MITTE)
        aussenrahmen(ws, f"{sp1}6:{sp2}7", LINIE_STARK, "thin")
    hoehen(ws, {6: 34, 7: 18, 8: 10})

    hart = (f'SUM({D}$C${M_UNVOLL}:$V${M_UNVOLL})+'
            f'SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_DATUM)}=0))+'
            f'SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_ART)}=""))+'
            f'SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_NPARAM)}=0))+'
            f'SUMPRODUCT((\'Stammdaten\'!$B${bb.SD0}:$B${bb.SD1}<>"")*'
            f'(\'Stammdaten\'!$F${bb.SD0}:$F${bb.SD1}=""))'
            f'+{DOPPELT[1:]}')
    weich = (f'SUM({D}$C${M_OHNEGRUND}:$V${M_OHNEGRUND})+'
             f'SUM({D}$C${M_OHNEKUERZEL}:$V${M_OHNEKUERZEL})+'
             f'SUMPRODUCT((\'Stammdaten\'!$B${bb.SD0}:$B${bb.SD1}<>"")*'
             f'(\'Stammdaten\'!$G${bb.SD0}:$G${bb.SD1}=""))')
    ampel = (f'=IF({hart}>0,"ROT - bitte die Punkte rechts unten klären",'
             f'IF({weich}>0,"GELB - Kleinigkeiten fehlen noch",'
             f'"GRÜN - alle Angaben vollständig"))')
    verbinde(ws, "J6:N7", ampel, font=f(13, bold=True, color=TXT_WEISS),
             bg=AMPEL_GRUEN, align=MITTE_UM)
    for text, farbe, schrift in (("ROT", AMPEL_ROT, TXT_WEISS),
                                 ("GELB", AMPEL_GELB, "3A2A05")):
        ws.conditional_formatting.add(
            "J6:N7",
            FormulaRule(formula=[f'LEFT($J$6,{len(text)})="{text}"'],
                        fill=fill(farbe),
                        font=f(13, bold=True, color=schrift),
                        stopIfTrue=True))

    # ---- Übungsübersicht ----------------------------------------------------
    verbinde(ws, "A9:H9", " Übungen – Kennzahlen und Sprung zum Blatt",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    verbinde(ws, "J9:N9", " Datenprüfung", font=f(13, bold=True,
                                                  color=NAVY_700),
             align=LINKS)
    hoehen(ws, {9: 28, 10: 30})
    kopf = [("A", "Nr."), ("B", "Übung (anklicken)"), ("C", "Art"),
            ("D", "Datum"), ("E", "Status"), ("F", "bewertet"),
            ("G", "Ø Prozent"), ("H", "Ø IHK-Note")]
    for s, t in kopf:
        setze(ws, f"{s}10", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))

    for i in range(N_UEBUNGEN):
        r = 11 + i
        uv = bb.UV0 + i
        blatt = UEB_BLATT.format(i + 1)
        setze(ws, f"A{r}", i + 1, font=f(10, color=TXT_HELL), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART)
        link_zelle(ws, f"B{r}", f"'{blatt}'!A1", f"=IF('Übungen'!$C{uv}=\"\","
                                                 f"\"(frei – {blatt})\","
                                                 f"'Übungen'!$C{uv})",
                   font=f(10.5, bold=True, color=TEAL, underline="single"),
                   bg=FORMEL_BG, align=LINKS, border=RAHMEN_ZART)
        for s, quelle, fmt in (("C", f"{D}{sp(i + 1)}${M_ART}", None),
                               ("D", f"{D}{sp(i + 1)}${M_DATUM}", FMT_DATUM),
                               ("E", f"{D}{sp(i + 1)}${M_STATUS}", None)):
            setze(ws, f"{s}{r}",
                  f'=IF(\'Übungen\'!$C{uv}="","",IF({quelle}=0,"",{quelle}))'
                  if fmt else
                  f'=IF(\'Übungen\'!$C{uv}="","",{quelle})',
                  font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
                  border=RAHMEN_ZART, fmt=fmt)
        setze(ws, f"F{r}", f"='Übungen'!$L{uv}", font=f(10, bold=True,
                                                        color=FORMEL_TXT),
              bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART, fmt="0")
        setze(ws, f"G{r}", f"='Übungen'!$M{uv}", font=f(11, bold=True),
              bg=PANEL, align=MITTE, border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"H{r}", f"='Übungen'!$N{uv}", font=f(10, bold=True),
              bg=PANEL, align=MITTE, border=RAHMEN_ZART)
        hoehen(ws, {r: 20})
    ampel_regeln(ws, "G11:H30", "$G11")
    ws.conditional_formatting.add(
        "A11:H30",
        FormulaRule(formula=[f'\'Übungen\'!$C{bb.UV0}=""'],
                    font=f(10, italic=True, color="A6ADB8")))

    # ---- Datenprüfung -------------------------------------------------------
    pruef = [
        ("Azubis ohne Ausbildungsstart",
         f'=SUMPRODUCT((\'Stammdaten\'!$B${bb.SD0}:$B${bb.SD1}<>"")*'
         f'(\'Stammdaten\'!$F${bb.SD0}:$F${bb.SD1}=""))', True),
        ("Azubis ohne Status",
         f'=SUMPRODUCT((\'Stammdaten\'!$B${bb.SD0}:$B${bb.SD1}<>"")*'
         f'(\'Stammdaten\'!$G${bb.SD0}:$G${bb.SD1}=""))', False),
        ("Übungen ohne Datum",
         f'=SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_DATUM)}=0))', True),
        ("Übungen ohne Art (Praxis/Theorie)",
         f'=SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_ART)}=""))', True),
        ("Übungen ohne Bewertungsparameter",
         f'=SUMPRODUCT(({D}{meta(M_BELEGT)}=1)*({D}{meta(M_NPARAM)}=0))',
         True),
        ("angefangene, unvollständige Zeilen",
         f'=SUM({D}$C${M_UNVOLL}:$V${M_UNVOLL})', True),
        ("ganze Zeile „n.b.“ ohne Grund",
         f'=SUM({D}$C${M_OHNEGRUND}:$V${M_OHNEGRUND})', False),
        ("Übungen ohne Kürzel „Bewertet von“",
         f'=SUM({D}$C${M_OHNEKUERZEL}:$V${M_OHNEKUERZEL})', False),
        # Zwei gleiche Anzeigenamen wären gefährlich: die Auswahl greift dann
        # immer den ersten – auf der Gesprächsseite stünde der falsche Name.
        ("Azubis mit gleichem Namen", DOPPELT, True),
    ]
    for i, (text, form, hart) in enumerate(pruef):
        r = 10 + i
        verbinde(ws, f"J{r}:L{r}", text, font=f(10), bg=PANEL, align=LINKS_UM,
                 border=RAHMEN_ZART)
        setze(ws, f"M{r}", form, font=f(10, bold=True), bg=PANEL,
              align=MITTE, border=RAHMEN_ZART,
              fmt='[=1]"1 Fall";[=0]"in Ordnung";0" Fälle"')
        ws.conditional_formatting.add(
            f"M{r}", FormulaRule(formula=[f"$M{r}>0"],
                                 fill=fill(AMPEL_ROT if hart else AMPEL_GELB),
                                 font=f(10, bold=True,
                                        color=TXT_WEISS if hart
                                        else "3A2A05")))
        ws.conditional_formatting.add(
            f"M{r}", FormulaRule(formula=[f"$M{r}=0"], fill=fill("E3F1E6"),
                                 font=f(10, color=AMPEL_GRUEN)))

    # ---- Warnübersicht ------------------------------------------------------
    verbinde(ws, "J19:N19",
             '=" Warnübersicht – zuletzt Note "&WarnNote&" oder schlechter"',
             font=f(11, bold=True, color=NAVY_700), align=LINKS)
    for s, t in (("J", "Azubi"), ("K", "LJ / HJ"), ("L", "Prozent"),
                 ("M", "IHK-Note")):
        setze(ws, f"{s}20", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    hw = f"{D}$H${AKT}:$H${AKT + MAX_AZUBIS - 1}"
    for k in range(1, N_WARN + 1):
        r = 20 + k
        nr = f'IFERROR(SMALL({hw},{k}),"")'
        setze(ws, f"J{r}",
              f'=IF({nr}="","",INDEX(\'Stammdaten\'!$J${bb.SD0}:$J${bb.SD1},'
              f'{nr}))', font=f(10.5, bold=True), bg=PANEL, align=LINKS,
              border=RAHMEN_ZART)
        setze(ws, f"K{r}",
              f'=IF({nr}="","",INDEX(\'Stammdaten\'!$H${bb.SD0}:$H${bb.SD1},'
              f'{nr})&" / "&INDEX({D}$C${AKT}:$C${AKT + MAX_AZUBIS - 1},'
              f'{nr}))', font=f(10, color=FORMEL_TXT), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART)
        setze(ws, f"L{r}",
              f'=IF({nr}="","",INDEX({D}$D${AKT}:$D${AKT + MAX_AZUBIS - 1},'
              f'{nr}))', font=f(11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"M{r}", f'=IF($L{r}="","",{note_text(f"$L{r}")})',
              font=f(10, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART)
        hoehen(ws, {r: 20})
    ampel_regeln(ws, "L21:M30", "$L21")
    # Bei 100 Azubis können mehr Fälle auftreten, als hier Zeilen stehen.
    verbinde(ws, "J31:N31",
             f'=IF(SUM({D}$G${AKT}:$G${AKT + MAX_AZUBIS - 1})>{N_WARN},'
             f'"… und "&(SUM({D}$G${AKT}:$G${AKT + MAX_AZUBIS - 1})-{N_WARN})'
             f'&" weitere – vollständige Liste im Blatt „Halbjahr“","")',
             font=f(9.5, italic=True, color=TXT_HELL), align=LINKS)
    for r in range(10, 32):
        hoehen(ws, {r: 20})

    # ---- Legende und Fuß ----------------------------------------------------
    verbinde(ws, "A32:B32", " Farblegende", font=f(11, bold=True,
                                                   color=NAVY_700),
             align=LINKS)
    notenlegende_bereiche(ws, ["C32:D32", "E32:F32", "G32:H32", "I32:J32",
                               "K32:L32", "M32:N32"])
    hoehen(ws, {32: 26, 33: 8})
    verbinde(ws, "A34:N35",
             "Farbe und Zahl sagen immer dasselbe – die Datei bleibt in "
             "Schwarz-Weiß und für Farbenblinde lesbar. Die Prozentgrenzen "
             "stehen im Blatt „Einstellungen“; wer sie dort ändert, ändert "
             "die Einfärbung überall mit. Die Datei liegt auf SharePoint: "
             "frühere Stände holt man über Datei > Informationen > "
             "Versionsverlauf zurück. Die Warnübersicht rechts bezieht sich "
             "auf das zuletzt bewertete Halbjahr des jeweiligen Azubis.",
             font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, "A34:N35", LINIE_STARK, "thin")
    hoehen(ws, {34: 22, 35: 22})
    druck(ws, "A1:N35", quer=True)
    ws.freeze_panes = "A5"
    ws.sheet_view.zoomScale = 100


# ============================================================ Azubi-Ansicht ==
SP_AZUBI = {"A": 5, "B": 28, "C": 12, "D": 13, "E": 16, "F": 13, "G": 16,
            "H": 13, "I": 18, "J": 19, "K": 13, "L": 24, "M": 2}


def baue_azubi(ws):
    blattkopf(ws, "M", "Azubi-Ansicht",
              "Alles zu einem Azubi: laufende Projekte, bewertete Übungen, "
              "Halbjahre und Verlauf")
    breiten(ws, SP_AZUBI)
    legende_eingabe(ws, "A3:M3")
    hoehen(ws, {3: 24, 4: 26, 5: 26, 6: 8})

    def lab(rng, t):
        verbinde(ws, rng, t, font=f(10.5, bold=True, color=NAVY_700),
                 bg=NAVY_100, align=LINKS, border=RAHMEN_ZART)

    lab("A4:B4", " Filter Ausbildungsberuf")
    verbinde(ws, "C4:E4", "(alle)", font=f(11, bold=True), bg=EINGABE_BG,
             align=LINKS, border=RAHMEN_EINGABE)
    lab("F4:G4", " Filter Jahrgang")
    verbinde(ws, "H4:I4", "(alle)", font=f(11, bold=True), bg=EINGABE_BG,
             align=MITTE, border=RAHMEN_EINGABE)
    lab("A5:B5", " Azubi auswählen")
    verbinde(ws, "C5:E5", None, font=f(12, bold=True), bg=EINGABE_BG,
             align=LINKS, border=RAHMEN_EINGABE)
    verbinde(ws, "F5:M5",
             f'=IF(Daten!$B${R_SELIDX}=0,"Bitte oben einen Azubi auswählen – '
             f'die Liste zeigt nur aktive Azubis, die zum Filter passen.",'
             f'"Ausgewählt: "&Daten!$B${R_SELNAME})',
             font=f(10, color=TXT_HELL), align=LINKS_UM)
    verbinde(ws, "J4:M4",
             f'="Azubis im Filter: "&Daten!$B${R_NFILTER}',
             font=f(10, color=TXT_HELL), align=LINKS)

    dv_b = DataValidation(type="list", formula1="BerufAuswahl",
                          allow_blank=True, showErrorMessage=True,
                          errorTitle="Beruf unbekannt",
                          error="Bitte einen Beruf aus der Liste oder "
                                "„(alle)“ wählen.")
    ws.add_data_validation(dv_b)
    dv_b.add("C4")
    dv_j = DataValidation(type="list", formula1="JahrAuswahl",
                          allow_blank=True, showErrorMessage=True,
                          errorTitle="Jahrgang unbekannt",
                          error="Bitte einen Jahrgang aus der Liste oder "
                                "„(alle)“ wählen.")
    ws.add_data_validation(dv_j)
    dv_j.add("H4")
    dv_a = DataValidation(type="list", formula1="AzubiAuswahl",
                          allow_blank=True, showErrorMessage=True,
                          errorTitle="Azubi nicht in der Liste",
                          error="Bitte einen Azubi aus der Liste wählen. "
                                "Steht er nicht darin, Filter oben "
                                "zurücksetzen oder den Status in den "
                                "Stammdaten auf „aktiv“ stellen.")
    ws.add_data_validation(dv_a)
    dv_a.add("C5")

    # ---- Steckbrief ---------------------------------------------------------
    AZ = f"Daten!$B${R_SELIDX}"
    def sd(spalte):
        return (f'=IF({AZ}=0,"–",INDEX(\'Stammdaten\'!${spalte}${bb.SD0}:'
                f'${spalte}${bb.SD1},{AZ}))')

    felder = [("A", "B", "Name, Vorname", sd("J"), None),
              ("C", "E", "Ausbildungsberuf", sd("D"), None),
              ("F", "G", "Jahrgang", sd("E"), "0"),
              ("H", "I", "Ausbildungsstart", sd("F"), FMT_DATUM),
              ("J", "K", "Lehrjahr", sd("H"), None),
              ("L", "M", "aktuelles Halbjahr", sd("I"), None)]
    for s1, s2, label, form, fmt in felder:
        verbinde(ws, f"{s1}7:{s2}7", label, font=f(9.5, color=TXT_HELL),
                 bg=PANEL, align=MITTE_UM)
        verbinde(ws, f"{s1}8:{s2}8", form, font=f(13, bold=True,
                                                  color=NAVY_700),
                 bg=PANEL, align=MITTE, fmt=fmt)
        aussenrahmen(ws, f"{s1}7:{s2}8", LINIE_STARK, "thin")
    hoehen(ws, {7: 18, 8: 30, 9: 10})

    # ---- Laufende Projekte --------------------------------------------------
    verbinde(ws, "A10:M10", " Aktuell laufende Projekte",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {10: 28, 11: 28})
    for s, t in (("A", "Nr."), ("B", "Übung"), ("C", "Art"), ("D", "Datum"),
                 ("E", "Stand Punkte"), ("F", "von max."), ("G", "Prozent"),
                 ("H", "Halbjahr")):
        setze(ws, f"{s}11", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    verbinde(ws, "I11:M11", "Hinweis", font=f(10, bold=True,
                                              color=TXT_WEISS),
             bg=NAVY_500, align=MITTE, border=rahmen(PANEL))
    for k in range(1, 7):
        r = 11 + k
        nr = f'IFERROR(SMALL(Daten!{meta(R_KEYLAUF)},{k}),"")'
        setze(ws, f"A{r}", f'={nr}', font=f(10, color=TXT_HELL),
              bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART, fmt="0")
        _azubi_zeile(ws, r, AZ, laufend=True)
        hoehen(ws, {r: 20})
    hoehen(ws, {18: 10})

    # ---- Alle Übungen -------------------------------------------------------
    verbinde(ws, "A19:M19", " Übungen und Leistungen",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {19: 28, 20: 30})
    for s, t in (("A", "Nr."), ("B", "Übung"), ("C", "Art"), ("D", "Datum"),
                 ("E", "Status"), ("F", "Punkte"), ("G", "von max."),
                 ("H", "Prozent"), ("I", "IHK-Note"), ("J", "zählt?"),
                 ("K", "Grund"), ("L", "Bemerkung")):
        setze(ws, f"{s}20", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    for i in range(N_UEBUNGEN):
        r = 21 + i
        j = i + 1
        setze(ws, f"A{r}", j, font=f(10, color=TXT_HELL), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART)
        _azubi_zeile(ws, r, AZ, laufend=False)
        hoehen(ws, {r: 20})
    ampel_regeln(ws, "H21:I40", "$H21")
    ws.conditional_formatting.add(
        "A21:L40", FormulaRule(formula=[f'INDEX(Daten!{meta(M_BELEGT)},$A21)'
                                        f'=0'],
                               font=f(10, italic=True, color="A6ADB8")))

    _azubi_halbjahr(ws, AZ)
    _azubi_chart(ws, AZ)
    druck(ws, "A1:M75", quer=True)
    ws.freeze_panes = "A6"


def _azubi_zeile(ws, r, AZ, laufend):
    """Eine Übungszeile der Azubi-Ansicht; Nr. steht in Spalte A."""
    nr = f"$A{r}"
    leer = f'IF({nr}="","",'
    g = lambda form: f'={leer}{form})'            # noqa: E731
    setze(ws, f"B{r}", g(f'INDEX(Daten!{meta(M_NAME)},{nr})'),
          font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
          align=LINKS, border=RAHMEN_ZART)
    setze(ws, f"C{r}", g(f'INDEX(Daten!{meta(M_ART)},{nr})'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART)
    setze(ws, f"D{r}",
          g(f'IF(INDEX(Daten!{meta(M_DATUM)},{nr})=0,"",'
            f'INDEX(Daten!{meta(M_DATUM)},{nr}))'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART, fmt=FMT_DATUM)
    if laufend:
        setze(ws, f"E{r}", g(f'INDEX(Daten!{blk(B_PKT)},{AZ},{nr})'),
              font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt=FMT_PUNKT)
        setze(ws, f"F{r}", g(f'INDEX(Daten!{blk(B_MAX)},{AZ},{nr})'),
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PUNKT)
        setze(ws, f"G{r}",
              g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=0,"",'
                f'INDEX(Daten!{blk(B_PCT)},{AZ},{nr}))'),
              font=f(11, bold=True), bg=PANEL, align=MITTE,
              border=RAHMEN_ZART, fmt=FMT_PROZ)
        setze(ws, f"H{r}",
              g(f'IF(INDEX(Daten!{blk(B_HJ)},{AZ},{nr})=0,"–",'
                f'INDEX(Daten!{blk(B_HJ)},{AZ},{nr}))'),
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART)
        ws.merge_cells(f"I{r}:M{r}")
        setze(ws, f"I{r}",
              g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=1,'
                f'"Zwischenstand – Übung läuft noch",'
                f'IF(INDEX(Daten!{blk(B_ENTERED)},{AZ},{nr})=0,'
                f'"noch nichts eingetragen",'
                f'"nicht bewertet"&IF(INDEX(Daten!{blk(B_GRUND)},{AZ},{nr})'
                f'="",""," ("&INDEX(Daten!{blk(B_GRUND)},{AZ},{nr})&")")))'),
              font=f(10, color=TXT_HELL), bg=FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        return

    setze(ws, f"E{r}", g(f'INDEX(Daten!{meta(M_STATUS)},{nr})'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART)
    setze(ws, f"F{r}",
          g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=0,"",'
            f'INDEX(Daten!{blk(B_PKT)},{AZ},{nr}))'),
          font=f(10.5, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
          align=MITTE, border=RAHMEN_ZART, fmt=FMT_PUNKT)
    setze(ws, f"G{r}",
          g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=0,"",'
            f'INDEX(Daten!{blk(B_MAX)},{AZ},{nr}))'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART, fmt=FMT_PUNKT)
    setze(ws, f"H{r}",
          g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=0,"",'
            f'INDEX(Daten!{blk(B_PCT)},{AZ},{nr}))'),
          font=f(11, bold=True), bg=PANEL, align=MITTE, border=RAHMEN_ZART,
          fmt=FMT_PROZ)
    setze(ws, f"I{r}",
          g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=1,{note_text(f"$H{r}")},'
            f'IF(INDEX(Daten!{blk(B_ENTERED)},{AZ},{nr})=0,"",'
            f'"nicht bewertet"&IF(INDEX(Daten!{blk(B_GRUND)},{AZ},{nr})="",'
            f'""," ("&INDEX(Daten!{blk(B_GRUND)},{AZ},{nr})&")")))'),
          font=f(10, bold=True), bg=PANEL, align=MITTE, border=RAHMEN_ZART)
    setze(ws, f"J{r}",
          g(f'IF(INDEX(Daten!{blk(B_EVAL)},{AZ},{nr})=0,"–",'
            f'IF(INDEX(Daten!{blk(B_CNTV)},{AZ},{nr})=1,"ja",'
            f'IF(INDEX(Daten!{blk(B_CNT)},{AZ},{nr})=0,"nein (Wdh.)",'
            f'"noch nicht (läuft)")))'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART)
    setze(ws, f"K{r}", g(f'INDEX(Daten!{blk(B_GRUND)},{AZ},{nr})'),
          font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
          border=RAHMEN_ZART)
    setze(ws, f"L{r}", g(f'INDEX(Daten!{blk(B_BEM)},{AZ},{nr})'),
          font=f(9.5, color=TXT_HELL), bg=FORMEL_BG, align=LINKS,
          border=RAHMEN_ZART)


def _azubi_halbjahr(ws, AZ):
    verbinde(ws, "A42:M42", " Halbjahresauswertung für das Gespräch",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {41: 10, 42: 28, 43: 30})
    for s, t in (("A", "HJ"), ("B", "Zeitraum ab Ausbildungsstart"),
                 ("C", "Übungen"), ("D", "Praxis %"), ("E", "Praxis Note"),
                 ("F", "Theorie %"), ("G", "Theorie Note"),
                 ("H", "Gesamt %"), ("I", "Gesamt Note")):
        setze(ws, f"{s}43", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    verbinde(ws, "J43:M43", "Hinweis", font=f(10, bold=True, color=TXT_WEISS),
             bg=NAVY_500, align=MITTE, border=rahmen(PANEL))
    for h in range(1, MAX_HJ + 1):
        r = 43 + h
        setze(ws, f"A{r}", h, font=f(11, bold=True, color=NAVY_700),
              bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART)
        setze(ws, f"B{r}",
              f'="Monat "&({h}-1)*6+1&" bis "&{h}*6',
              font=f(9.5, color=TXT_HELL), bg=FORMEL_BG, align=LINKS,
              border=RAHMEN_ZART)
        setze(ws, f"C{r}", f'=IF({AZ}=0,"",INDEX({hjb("anz")},{AZ},{h}))',
              font=f(10, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt="0")
        for s, key in (("D", "P"), ("F", "T"), ("H", "G")):
            setze(ws, f"{s}{r}",
                  f'=IF({AZ}=0,"",INDEX({hjb(key)},{AZ},{h}))',
                  font=f(11, bold=True), bg=PANEL, align=MITTE,
                  border=RAHMEN_ZART, fmt=FMT_PROZ)
        for s_pct, s_note in (("D", "E"), ("F", "G"), ("H", "I")):
            setze(ws, f"{s_note}{r}",
                  f'=IF(NOT(ISNUMBER({s_pct}{r})),"",'
                  f'{note_text(f"{s_pct}{r}")})',
                  font=f(10, bold=True), bg=PANEL, align=MITTE,
                  border=RAHMEN_ZART)
        ws.merge_cells(f"J{r}:M{r}")
        setze(ws, f"J{r}",
              f'=IF(OR({AZ}=0,C{r}=""),"",IF(C{r}=0,"keine Bewertung in '
              f'diesem Halbjahr",IF(C{r}<SchwelleDB,"wenig Datenbasis ("&'
              f'C{r}&" Übung"&IF(C{r}=1,"","en")&")","")))',
              font=f(10, italic=True, color=TXT_HELL), bg=FORMEL_BG,
              align=LINKS, border=RAHMEN_ZART)
        hoehen(ws, {r: 22})
    for s_pct, s_note in (("D", "E"), ("F", "G"), ("H", "I")):
        ampel_regeln(ws, f"{s_pct}44:{s_note}51", f"${s_pct}44")
    verbinde(ws, "A53:M54",
             "Das Halbjahr zählt ab dem Ausbildungsstart des Azubis, nicht ab "
             "Kalenderjahr. Übungen, bei denen der Azubi nicht bewertet "
             "wurde, fehlen hier bewusst – sie werden weder als 0 Punkte noch "
             "im Durchschnitt mitgerechnet. Wiederholungen zählen nach der "
             "Regel im Übungsblatt (Standard: die letzte Wertung). Übungen "
             "mit Status „laufend“ sind Zwischenstände und zählen erst, "
             "wenn der Status auf „abgeschlossen“ steht.",
             font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, "A53:M54", LINIE_STARK, "thin")
    hoehen(ws, {52: 10, 53: 22, 54: 22})


CHART0 = 80


def _azubi_chart(ws, AZ):
    verbinde(ws, "A56:M56", " Verlauf der Prozentwerte",
             font=f(13, bold=True, color=NAVY_700), align=LINKS)
    hoehen(ws, {55: 10, 56: 28})

    verbinde(ws, f"A{CHART0 - 2}:F{CHART0 - 2}",
             "Datenquelle für das Diagramm – bitte stehen lassen.",
             font=f(9.5, color=TXT_HELL), bg=BG, align=LINKS)
    for s, t in (("A", "Nr."), ("B", "Übung"), ("C", "Azubi"),
                 ("D", "Jahrgangsdurchschnitt")):
        setze(ws, f"{s}{CHART0}", t, font=f(9.5, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE)
    jahr = f"Daten!$B${R_SELJAHR}"
    for k in range(1, N_UEBUNGEN + 1):
        r = CHART0 + k
        setze(ws, f"A{r}", f'=IFERROR(SMALL(Daten!{meta(R_KEYCHART)},{k}),"")',
              font=f(9), align=MITTE)
        setze(ws, f"B{r}",
              f'=IF($A{r}="","",INDEX(Daten!{meta(M_NAME)},$A{r}))',
              font=f(9), align=LINKS)
        setze(ws, f"C{r}",
              f'=IF($A{r}="",NA(),INDEX(Daten!{blk(B_PCT)},{AZ},$A{r}))',
              font=f(9), align=MITTE, fmt=FMT_PROZ)
        setze(ws, f"D{r}",
              f'=IF($A{r}="",NA(),IF(SUMPRODUCT('
              f'INDEX(Daten!{blk(B_CNTA)},0,$A{r}),'
              f'(Daten!{JAHR_VEK}={jahr})*1)=0,NA(),'
              f'SUMPRODUCT(INDEX(Daten!{blk(B_CNTA)},0,$A{r}),'
              f'INDEX(Daten!{blk(B_PCT)},0,$A{r}),'
              f'(Daten!{JAHR_VEK}={jahr})*1)/'
              f'SUMPRODUCT(INDEX(Daten!{blk(B_CNTA)},0,$A{r}),'
              f'(Daten!{JAHR_VEK}={jahr})*1)))',
              font=f(9), align=MITTE, fmt=FMT_PROZ)

    ch = LineChart()
    ch.title = "Prozentwerte im Verlauf"
    ch.style = 2
    ch.height = 8.5
    ch.width = 24
    ch.y_axis.numFmt = "0%"
    ch.y_axis.title = "Prozent"
    ch.y_axis.scaling.min = 0
    ch.y_axis.scaling.max = 1
    daten = Reference(ws, min_col=3, max_col=4, min_row=CHART0,
                      max_row=CHART0 + N_UEBUNGEN)
    kat = Reference(ws, min_col=2, min_row=CHART0 + 1,
                    max_row=CHART0 + N_UEBUNGEN)
    ch.add_data(daten, titles_from_data=True)
    ch.set_categories(kat)
    farben = ["0E7C86", "9AA7B8"]
    for s, farbe in zip(ch.series, farben):
        s.graphicalProperties.line = LineProperties(solidFill=farbe, w=28000)
        s.smooth = False
        s.marker = Marker(symbol="circle", size=6)
    ws.add_chart(ch, "A57")


# ================================================================ Halbjahr ===
SP_HJ = {"A": 5, "B": 18, "C": 15, "D": 28, "E": 10, "F": 8, "G": 9,
         "H": 10, "I": 18, "J": 9, "K": 10, "L": 18, "M": 10, "N": 18,
         "O": 22, "P": 2}


def baue_halbjahr(ws):
    blattkopf(ws, "P", "Halbjahresauswertung",
              "Stand aller Azubis für ein Halbjahr – Grundlage für die "
              "Beurteilungsgespräche")
    breiten(ws, SP_HJ)
    legende_eingabe(ws, "A3:P3")
    hoehen(ws, {3: 24, 4: 28, 5: 10})

    verbinde(ws, "A4:B4", " Halbjahr auswählen",
             font=f(10.5, bold=True, color=NAVY_700), bg=NAVY_100,
             align=LINKS, border=RAHMEN_ZART)
    setze(ws, "C4", 4, font=f(13, bold=True), bg=EINGABE_BG, align=MITTE,
          border=RAHMEN_EINGABE)
    dv = DataValidation(type="whole", operator="between", formula1="1",
                        formula2=str(MAX_HJ), allow_blank=False,
                        showErrorMessage=True,
                        errorTitle="Halbjahr außerhalb des Bereichs",
                        error=f"Bitte eine ganze Zahl von 1 bis {MAX_HJ} "
                              f"eingeben.",
                        showInputMessage=True, promptTitle="Halbjahr",
                        prompt="1 = die ersten sechs Monate nach "
                               "Ausbildungsstart, 2 = Monat 7 bis 12 usw.")
    ws.add_data_validation(dv)
    dv.add("C4")
    verbinde(ws, "D4:P4",
             '="Halbjahr "&$C$4&" = Monat "&($C$4-1)*6+1&" bis "&$C$4*6&" '
             'nach dem jeweiligen Ausbildungsstart. Leere Zeilen bedeuten: '
             'in diesem Halbjahr wurde noch nichts bewertet."',
             font=f(10, color=TXT_HELL), align=LINKS_UM)

    kopf = [("A", "Nr."), ("B", "Name"), ("C", "Vorname"),
            ("D", "Ausbildungsberuf"), ("E", "Jahrgang"), ("F", "LJ"),
            ("G", "Übungen"), ("H", "Praxis %"), ("I", "Praxis Note"),
            ("J", "Theorie"), ("K", "Theorie %"), ("L", "Theorie Note"),
            ("M", "Gesamt %"), ("N", "Gesamt Note"), ("O", "Hinweis")]
    for s, t in kopf:
        setze(ws, f"{s}6", t, font=f(10, bold=True, color=TXT_WEISS),
              bg=NAVY_500, align=MITTE_UM, border=rahmen(PANEL))
    hoehen(ws, {6: 34})

    for i in range(MAX_AZUBIS):
        r = 7 + i
        sd = bb.SD0 + i
        az = i + 1
        leer = f'IF(\'Stammdaten\'!$B{sd}="","",'
        setze(ws, f"A{r}", f'={leer}{az})', font=f(10, color=TXT_HELL),
              bg=FORMEL_BG, align=MITTE, border=RAHMEN_ZART)
        for s, quelle, fmt in (("B", f"'Stammdaten'!$B{sd}", None),
                               ("C", f"'Stammdaten'!$C{sd}", None),
                               ("D", f"'Stammdaten'!$D{sd}", None),
                               ("E", f"'Stammdaten'!$E{sd}", "0"),
                               ("F", f"'Stammdaten'!$H{sd}", None)):
            setze(ws, f"{s}{r}", f'={leer}{quelle})',
                  font=f(10.5 if s == "B" else 10,
                         bold=(s == "B"), color=FORMEL_TXT), bg=FORMEL_BG,
                  align=LINKS if s in "BCD" else MITTE,
                  border=RAHMEN_ZART, fmt=fmt)
        setze(ws, f"G{r}", f'={leer}INDEX({hjb("anz")},{az},$C$4))',
              font=f(10, bold=True, color=FORMEL_TXT), bg=FORMEL_BG,
              align=MITTE, border=RAHMEN_ZART, fmt="0")
        setze(ws, f"J{r}", f'={leer}INDEX({hjb("anzT")},{az},$C$4))',
              font=f(10, color=FORMEL_TXT), bg=FORMEL_BG, align=MITTE,
              border=RAHMEN_ZART, fmt="0")
        for s_pct, s_note, key in (("H", "I", "P"), ("K", "L", "T"),
                                   ("M", "N", "G")):
            setze(ws, f"{s_pct}{r}",
                  f'={leer}INDEX({hjb(key)},{az},$C$4))',
                  font=f(11, bold=True), bg=PANEL, align=MITTE,
                  border=RAHMEN_ZART, fmt=FMT_PROZ)
            setze(ws, f"{s_note}{r}",
                  f'=IF(NOT(ISNUMBER({s_pct}{r})),"",'
                  f'{note_text(f"{s_pct}{r}")})',
                  font=f(10, bold=True), bg=PANEL, align=MITTE,
                  border=RAHMEN_ZART)
        setze(ws, f"O{r}",
              f'=IF($A{r}="","",IF($G{r}=0,"keine Bewertung",'
              f'IF($G{r}<SchwelleDB,"wenig Datenbasis","")))'
              f'&IF(AND($A{r}<>"",\'Stammdaten\'!$G{sd}<>"aktiv"),'
              f'" · "&\'Stammdaten\'!$G{sd},"")',
              font=f(9.5, italic=True, color=TXT_HELL), bg=FORMEL_BG,
              align=LINKS, border=RAHMEN_ZART)
        hoehen(ws, {r: 22})

    letzte = 6 + MAX_AZUBIS
    for s_pct, s_note in (("H", "I"), ("K", "L"), ("M", "N")):
        ampel_regeln(ws, f"{s_pct}7:{s_note}{letzte}", f"${s_pct}7")
    ws.conditional_formatting.add(
        f"A7:G{letzte}",
        FormulaRule(formula=[f"'Stammdaten'!$G{bb.SD0}<>\"aktiv\""],
                    font=f(10, italic=True, color="A6ADB8")))

    rl, rn = letzte + 2, letzte + 4
    verbinde(ws, f"A{rl}:G{rl}", " Farblegende",
             font=f(11, bold=True, color=NAVY_700), align=LINKS)
    notenlegende(ws, f"H{rl}")
    hoehen(ws, {letzte + 1: 10, rl: 24})
    verbinde(ws, f"A{rn}:P{rn + 1}",
             "Gesamt = Mittel der Prozentwerte aller gewerteten Übungen des "
             "Halbjahres, jede Übung mit ihrem Gewicht. Steht in den "
             "Einstellungen „Gewichtung Praxis/Theorie verwenden = ja“, "
             "werden stattdessen Praxis und Theorie getrennt gemittelt und "
             "mit den dort hinterlegten Gewichten zusammengezogen. Für das "
             "Gespräch: Blatt „Gesprächsseite“ öffnen, Azubi und Halbjahr "
             "wählen, ausdrucken.",
             font=f(10, color=TXT), bg=BG, align=LINKS_UM)
    aussenrahmen(ws, f"A{rn}:P{rn + 1}", LINIE_STARK, "thin")
    hoehen(ws, {rn: 22, rn + 1: 22})
    druck(ws, f"A1:P{rn + 1}", quer=True, kopfzeilen="1:6")
    ws.freeze_panes = "D7"
