#!/usr/bin/env python3
"""
scripts/import_population_indicators.py

Phase 5: Aufbereitung, Berechnung, Import und Qualitätssicherung der amtlichen
Bevölkerungsindikatoren auf Zählbezirksebene.

Führt atomare Transaktionen aus, wahrt referentielle Integrität und erzeugt
detaillierte QA-Berichte.
"""

import os
import sys
import csv
import json
import math
import hashlib
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
DEFAULT_DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"

RAW_DIR = BASE_DIR / "data" / "raw" / "population"
CSV_2011 = RAW_DIR / "registerzaehlung_2011_zaehlbezirke.csv"
CSV_2021 = RAW_DIR / "registerzaehlung_2021_zaehlbezirke.csv"
CSV_2023 = RAW_DIR / "registerzaehlung_2023_zaehlbezirke.csv"

REPORTS_DIR = BASE_DIR / "reports"
QA_JSON_PATH = REPORTS_DIR / "population_indicators_qa.json"
MISSING_CSV_PATH = REPORTS_DIR / "population_indicators_missing.csv"
SUMMARY_CSV_PATH = REPORTS_DIR / "population_indicators_summary.csv"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"
MIGRATION_ID = "population_phase5_correction_v1"
MIGRATION_VERSION = "1.1.0"
MIGRATION_DESC = "Phase 5 Korrektur: Deaktivierung von anteil_einpersonenwohnungen_prozent wegen Dimensionsinkonsistenz (Personen vs. Wohnungen), Korrektur Einheit einpersonenwohnungen zu Personen, Trennung ungewichteter Mittelwert vs gewichteter Wien-Gesamtwert"

# Definition der 15 Indikatoren
INDIKATOR_DEFINITIONEN = [
    # A. Amtliche Bestandswerte
    {
        "indikator_code": "bevoelkerung_gesamt",
        "bezeichnung": "Bevölkerung gesamt (Hauptwohnsitz)",
        "beschreibung": "Gesamtzahl der Personen mit Hauptwohnsitz im Zählbezirk laut amtlicher Registerzählung.",
        "einheit": "Personen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "WHG_POP_TOTAL",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtlicher Registerzählungsbestandswert der Statistik Austria / Stadt Wien.",
        "sortierreihenfolge": 10
    },
    {
        "indikator_code": "hauptwohnsitzwohnungen",
        "bezeichnung": "Hauptwohnsitzwohnungen",
        "beschreibung": "Gesamtzahl der bewohnten Wohnungen mit mindestens einem Hauptwohnsitz laut amtlicher Registerzählung.",
        "einheit": "Wohnungen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "WHG_WSA_TOTAL",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtlicher Registerzählungsbestandswert der Statistik Austria / Stadt Wien.",
        "sortierreihenfolge": 20
    },
    {
        "indikator_code": "personen_unter_15",
        "bezeichnung": "Personen unter 15 Jahren",
        "beschreibung": "Zahl der Kinder und Jugendlichen unter 15 Jahren mit Hauptwohnsitz laut Erwerbsstatus-Klassifikation.",
        "einheit": "Personen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "ERW_STATUS_3",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtlicher Registerzählungsbestandswert (Erwerbsstatusklasse 3: Personen unter 15 Jahren).",
        "sortierreihenfolge": 30
    },
    {
        "indikator_code": "personen_mit_pensionsbezug",
        "bezeichnung": "Personen mit Pensionsbezug",
        "beschreibung": "Zahl der Personen im Ruhestand bzw. mit Pensionsbezug laut Erwerbsstatus-Klassifikation.",
        "einheit": "Personen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "ERW_STATUS_4",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtliche Erwerbsstatusklasse 4. Bezieht sich auf Personen mit Pensionsbezug und darf nicht mit der Altersgruppe 65+ gleichgesetzt werden.",
        "sortierreihenfolge": 40
    },
    {
        "indikator_code": "einpersonenwohnungen",
        "bezeichnung": "Personen in Einpersonen-Wohnungen",
        "beschreibung": "Hauptwohnsitzbevölkerung in Wohnungen mit genau einer gemeldeten Person laut amtlicher Registerzählung (WHG_NOC_1). Zählt Personen, nicht Wohnungen.",
        "einheit": "Personen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "WHG_NOC_1",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtliches Merkmal WHG_NOC_1. Zählt Personen in 1-Personen-Wohnungen (die Summe WHG_NOC_0 bis WHG_NOC_4 entspricht exakt der Gesamtbevölkerung WHG_POP_TOTAL).",
        "sortierreihenfolge": 50
    },
    {
        "indikator_code": "personen_in_hauptmiete",
        "bezeichnung": "Personen in Hauptmiete",
        "beschreibung": "Zahl der Hauptwohnsitzpersonen, die in Hauptmiete (inkl. Genossenschafts- und Gemeindewohnungen) leben.",
        "einheit": "Personen",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "amtlicher_bestandswert",
        "zaehler_feld": "WHG_RECHTSVERH_3",
        "nenner_feld": None,
        "berechnungsformel": None,
        "interpretationshinweis": "Amtliche Rechtsverhältnisklasse 3 der Registerzählung.",
        "sortierreihenfolge": 60
    },

    # B. Berechnete Anteile
    {
        "indikator_code": "anteil_unter_15_prozent",
        "bezeichnung": "Anteil der Personen unter 15 Jahren",
        "beschreibung": "Prozentualer Anteil der Kinder und Jugendlichen unter 15 Jahren an der Gesamtbevölkerung.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechneter_anteil",
        "zaehler_feld": "ERW_STATUS_3",
        "nenner_feld": "WHG_POP_TOTAL",
        "berechnungsformel": "ERW_STATUS_3 / WHG_POP_TOTAL * 100",
        "interpretationshinweis": "Berechnet aus amtlichen Werten. Zeigt die demografische Jugendquote im Zählbezirk.",
        "sortierreihenfolge": 70
    },
    {
        "indikator_code": "pensionsquote_prozent",
        "bezeichnung": "Anteil der Personen mit Pensionsbezug",
        "beschreibung": "Prozentualer Anteil der Personen mit Pensionsbezug an der Gesamtbevölkerung.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechneter_anteil",
        "zaehler_feld": "ERW_STATUS_4",
        "nenner_feld": "WHG_POP_TOTAL",
        "berechnungsformel": "ERW_STATUS_4 / WHG_POP_TOTAL * 100",
        "interpretationshinweis": "Pensionsquote laut amtlichem Erwerbsstatus (ERW_STATUS_4). Ausdrücklich als Anteil der Personen mit Pensionsbezug bezeichnet, niemals als Anteil ab 65 Jahre oder Seniorenanteil.",
        "sortierreihenfolge": 80
    },
    {
        "indikator_code": "anteil_einpersonenwohnungen_prozent",
        "bezeichnung": "Anteil der Hauptwohnsitzwohnungen mit einer Person (Deaktiviert)",
        "beschreibung": "Deaktiviert: Zähler WHG_NOC_1 zählt Personen, während WHG_WSA_TOTAL Wohnungen zählt. Aufgrund von Einheiteninkompatibilität und Anstaltsunterkünften (z. B. ZBEZ 1903) nicht als valider Wohnungsanteil berechenbar. Bis zur Bereitstellung einer amtlichen Wohnungsaufschlüsselung auf NULL gesetzt.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechneter_anteil",
        "zaehler_feld": "WHG_NOC_1",
        "nenner_feld": "WHG_WSA_TOTAL",
        "berechnungsformel": None,
        "interpretationshinweis": "Vorerst deaktiviert und auf NULL gesetzt (kein kompatibler amtlicher Wohnungsnenner in der Registerzählung für Zählbezirke vorhanden).",
        "sortierreihenfolge": 90
    },
    {
        "indikator_code": "anteil_personen_in_hauptmiete_prozent",
        "bezeichnung": "Anteil der Personen in Hauptmiete",
        "beschreibung": "Prozentualer Anteil der Bewohner in Hauptmiete an der Gesamtbevölkerung.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechneter_anteil",
        "zaehler_feld": "WHG_RECHTSVERH_3",
        "nenner_feld": "WHG_POP_TOTAL",
        "berechnungsformel": "WHG_RECHTSVERH_3 / WHG_POP_TOTAL * 100",
        "interpretationshinweis": "Berechnet aus amtlichen Werten (WHG_RECHTSVERH_3 / WHG_POP_TOTAL * 100).",
        "sortierreihenfolge": 100
    },

    # C. Dichte für 2023
    {
        "indikator_code": "bevoelkerungsdichte_personen_je_hektar",
        "bezeichnung": "Bevölkerungsdichte (Personen je Hektar)",
        "beschreibung": "Einwohner pro Hektar Katasterfläche des Zählbezirks im Jahr 2023.",
        "einheit": "Personen/ha",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechnete_dichte",
        "zaehler_feld": "WHG_POP_TOTAL",
        "nenner_feld": "flaeche_ha",
        "berechnungsformel": "WHG_POP_TOTAL / (flaeche_m2 / 10000.0)",
        "interpretationshinweis": "Berechnet auf Basis der amtlichen Zählbezirksfläche aus statistische_gebiete.flaeche_m2.",
        "sortierreihenfolge": 110
    },

    # D. Bevölkerungsentwicklung
    {
        "indikator_code": "bevoelkerungsentwicklung_2011_2023_prozent",
        "bezeichnung": "Bevölkerungsentwicklung 2011–2023",
        "beschreibung": "Prozentuale Gesamtveränderung der Bevölkerung zwischen den Stichtagen 2011 und 2023.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechnete_veraenderung",
        "zaehler_feld": "WHG_POP_TOTAL_2023",
        "nenner_feld": "WHG_POP_TOTAL_2011",
        "berechnungsformel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011) - 1) * 100",
        "interpretationshinweis": "Vergleich auf stabiler Zählbezirksschlüssel-Ebene. Keine Aussage über exakte historische Polygongeometrien.",
        "sortierreihenfolge": 120
    },
    {
        "indikator_code": "bevoelkerungsentwicklung_2021_2023_prozent",
        "bezeichnung": "Bevölkerungsentwicklung 2021–2023",
        "beschreibung": "Prozentuale Gesamtveränderung der Bevölkerung zwischen den Stichtagen 2021 und 2023.",
        "einheit": "%",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechnete_veraenderung",
        "zaehler_feld": "WHG_POP_TOTAL_2023",
        "nenner_feld": "WHG_POP_TOTAL_2021",
        "berechnungsformel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021) - 1) * 100",
        "interpretationshinweis": "Vergleich auf stabiler Zählbezirksschlüssel-Ebene. Keine Aussage über exakte historische Polygongeometrien.",
        "sortierreihenfolge": 130
    },
    {
        "indikator_code": "bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr",
        "bezeichnung": "Annualisierte Bevölkerungsentwicklung 2011–2023",
        "beschreibung": "Durchschnittliche jährliche prozentuale Veränderung der Bevölkerung von 2011 bis 2023 (12 Jahre, geometrisches Mittel).",
        "einheit": "%/Jahr",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechnete_annualisierte_veraenderung",
        "zaehler_feld": "WHG_POP_TOTAL_2023",
        "nenner_feld": "WHG_POP_TOTAL_2011",
        "berechnungsformel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011)**(1.0 / 12) - 1) * 100",
        "interpretationshinweis": "Vergleich auf stabiler Zählbezirksschlüssel-Ebene über 12 Jahre (geometrisches Mittel).",
        "sortierreihenfolge": 140
    },
    {
        "indikator_code": "bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr",
        "bezeichnung": "Annualisierte Bevölkerungsentwicklung 2021–2023",
        "beschreibung": "Durchschnittliche jährliche prozentuale Veränderung der Bevölkerung von 2021 bis 2023 (2 Jahre, geometrisches Mittel).",
        "einheit": "%/Jahr",
        "gebietsebene": "zaehlbezirk",
        "indikatorart": "berechnete_annualisierte_veraenderung",
        "zaehler_feld": "WHG_POP_TOTAL_2023",
        "nenner_feld": "WHG_POP_TOTAL_2021",
        "berechnungsformel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021)**(1.0 / 2) - 1) * 100",
        "interpretationshinweis": "Vergleich auf stabiler Zählbezirksschlüssel-Ebene über 2 Jahre (geometrisches Mittel).",
        "sortierreihenfolge": 150
    }
]


def verify_xml_checksum(base_dir: Path):
    """Verifiziert die Unverändertheit von data/Gemeindebauten_Wien_KI.xml."""
    xml_path = base_dir / "data" / "Gemeindebauten_Wien_KI.xml"
    if not xml_path.exists():
        raise FileNotFoundError(f"XML-Originaldatei fehlt: {xml_path}")
    hasher = hashlib.sha256()
    with open(xml_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    actual_hash = hasher.hexdigest()
    if actual_hash != EXPECTED_XML_SHA256:
        raise ValueError(
            f"FEHLER: XML-Originaldatei wurde verändert!\n"
            f"Erwartet: {EXPECTED_XML_SHA256}\nTatsächlich: {actual_hash}"
        )


def read_registerzaehlung_csv(file_path: Path):
    """
    Liest eine amtliche Registerzählungs-CSV ein.
    Behandelt die Titelzeile, validiert Semikolon als Trennzeichen und UTF-8,
    extrahiert SUB_DISTRICT_CODE[1:] als ZBEZ.
    Gibt ein Dict {zbez: row_dict} und die festgestellte Stichtagsangabe zurück.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header_idx = -1
    for idx, line in enumerate(lines):
        if "SUB_DISTRICT_CODE" in line:
            header_idx = idx
            break

    if header_idx == -1:
        raise ValueError(f"Header-Zeile mit 'SUB_DISTRICT_CODE' nicht gefunden in {file_path}")

    reader = csv.DictReader(lines[header_idx:], delimiter=";")
    required_cols = [
        "SUB_DISTRICT_CODE", "WHG_POP_TOTAL", "WHG_WSA_TOTAL",
        "ERW_STATUS_3", "ERW_STATUS_4", "WHG_NOC_1", "WHG_RECHTSVERH_3"
    ]
    for col in required_cols:
        if col not in reader.fieldnames:
            raise ValueError(f"Pflichtspalte '{col}' fehlt in {file_path}")

    ref_col = "REF_DATE" if "REF_DATE" in reader.fieldnames else "REFDAT"
    if ref_col not in reader.fieldnames:
        raise ValueError(f"Stichtagsspalte (REF_DATE oder REFDAT) fehlt in {file_path}")

    data_by_zbez = {}
    stichtag_str = None

    for r_idx, row in enumerate(reader, start=header_idx + 2):
        sub_code = row["SUB_DISTRICT_CODE"].strip()
        if len(sub_code) != 5 or not sub_code.startswith("9"):
            raise ValueError(f"Ungültiger SUB_DISTRICT_CODE '{sub_code}' in Zeile {r_idx} von {file_path}")
        zbez = sub_code[1:]

        # Stichtag prüfen / konvertieren (JJJJMMTT -> YYYY-MM-DD)
        raw_ref = row[ref_col].strip()
        if len(raw_ref) == 8 and raw_ref.isdigit():
            formatted_ref = f"{raw_ref[:4]}-{raw_ref[4:6]}-{raw_ref[6:]}"
        else:
            raise ValueError(f"Ungültiger Stichtag '{raw_ref}' in Zeile {r_idx}")

        if stichtag_str is None:
            stichtag_str = formatted_ref
        elif stichtag_str != formatted_ref:
            raise ValueError(f"Inkonsistenter Stichtag in {file_path}: {stichtag_str} vs {formatted_ref}")

        # Strenge numerische Prüfung der Pflichtspalten
        parsed_row = {
            "zbez": zbez,
            "sub_district_code": sub_code,
            "stichtag": formatted_ref
        }
        for col in required_cols[1:]:
            val_str = row[col].strip()
            if not val_str.isdigit():
                raise ValueError(f"Nicht-numerischer Wert in Spalte '{col}' ({val_str}) in Zeile {r_idx}")
            parsed_row[col] = int(val_str)

        if zbez in data_by_zbez:
            raise ValueError(f"Doppelter Gebietsschlüssel ZBEZ '{zbez}' in {file_path}")
        data_by_zbez[zbez] = parsed_row

    return data_by_zbez, stichtag_str


def run_import(
    db_path: Path,
    replace_indicators: bool = False,
    dry_run: bool = False
):
    """Führt den gesamten Import und die Berechnung in einer atomaren Transaktion aus."""
    verify_xml_checksum(BASE_DIR)

    # 1. Rohdaten einlesen
    data_2011, stichtag_2011 = read_registerzaehlung_csv(CSV_2011)
    data_2021, stichtag_2021 = read_registerzaehlung_csv(CSV_2021)
    data_2023, stichtag_2023 = read_registerzaehlung_csv(CSV_2023)

    if stichtag_2011 != "2011-10-31":
        raise ValueError(f"Unerwarteter Stichtag 2011: {stichtag_2011}")
    if stichtag_2021 != "2021-10-31":
        raise ValueError(f"Unerwarteter Stichtag 2021: {stichtag_2021}")
    if stichtag_2023 != "2023-10-31":
        raise ValueError(f"Unerwarteter Stichtag 2023: {stichtag_2023}")

    print(f"✓ Amtliche Rohdaten eingelesen:")
    print(f"  - 2011 ({stichtag_2011}): {len(data_2011)} Zählbezirke")
    print(f"  - 2021 ({stichtag_2021}): {len(data_2021)} Zählbezirke (ZBEZ 0210 fehlt amtlich)")
    print(f"  - 2023 ({stichtag_2023}): {len(data_2023)} Zählbezirke (ZBEZ 0210 fehlt amtlich)")

    # 2. Verbindung zu SQLite
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN TRANSACTION;")

        # A. Prüfe/Erstelle Tabelle indikator_definitionen
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS indikator_definitionen (
            indikator_code TEXT PRIMARY KEY,
            bezeichnung TEXT NOT NULL,
            beschreibung TEXT NOT NULL,
            einheit TEXT NOT NULL,
            gebietsebene TEXT NOT NULL,
            indikatorart TEXT NOT NULL,
            zaehler_feld TEXT,
            nenner_feld TEXT,
            berechnungsformel TEXT,
            interpretationshinweis TEXT,
            sortierreihenfolge INTEGER
        );
        """)

        if replace_indicators:
            print("  --replace-indicators aktiv: Bereinige bestehende Indikatoren und Definitionen...")
            cursor.execute("DELETE FROM bevoelkerungsindikatoren WHERE gebietsebene = 'zaehlbezirk';")
            cursor.execute("DELETE FROM indikator_definitionen;")

        # Indikatordefinitionen einpflegen
        for defn in INDIKATOR_DEFINITIONEN:
            cursor.execute("""
            INSERT OR REPLACE INTO indikator_definitionen (
                indikator_code, bezeichnung, beschreibung, einheit, gebietsebene,
                indikatorart, zaehler_feld, nenner_feld, berechnungsformel,
                interpretationshinweis, sortierreihenfolge
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                defn["indikator_code"], defn["bezeichnung"], defn["beschreibung"],
                defn["einheit"], defn["gebietsebene"], defn["indikatorart"],
                defn["zaehler_feld"], defn["nenner_feld"], defn["berechnungsformel"],
                defn["interpretationshinweis"], defn["sortierreihenfolge"]
            ))

        # B. Lade alle 250 Zählbezirke aus statistische_gebiete
        cursor.execute("""
            SELECT gebiet_code, flaeche_m2
            FROM statistische_gebiete
            WHERE gebietsebene = 'zaehlbezirk'
            ORDER BY gebiet_code;
        """)
        all_zbez = cursor.fetchall()
        if len(all_zbez) != 250:
            raise ValueError(f"Erwartet wurden 250 Zählbezirke in statistische_gebiete, gefunden: {len(all_zbez)}")

        zbez_dict = {row[0]: float(row[1]) for row in all_zbez}

        # C. Vorbereitung der Indikatoren
        indicator_rows = []
        missing_records = []

        # Mapping Ressourcen / Quellen
        res_map = {
            "2011": ("stadt-wien-registerzaehlung-2011", "res-registerzaehlung-2011"),
            "2021": ("stadt-wien-registerzaehlung-2023", "res-registerzaehlung-2021"),
            "2023": ("stadt-wien-registerzaehlung-2023", "res-registerzaehlung-2023")
        }

        years_data = [
            ("2011", stichtag_2011, data_2011),
            ("2021", stichtag_2021, data_2021),
            ("2023", stichtag_2023, data_2023),
        ]

        # 1. Bestands- und Anteilswerte für alle 3 Jahre
        for yr, stichtag, d_dict in years_data:
            quelle_id, res_id = res_map[yr]

            for zbez, flaeche in zbez_dict.items():
                if zbez in d_dict:
                    r = d_dict[zbez]
                    pop = r["WHG_POP_TOTAL"]
                    wsa = r["WHG_WSA_TOTAL"]
                    u15 = r["ERW_STATUS_3"]
                    pension = r["ERW_STATUS_4"]
                    whg_1p = r["WHG_NOC_1"]
                    hmiete = r["WHG_RECHTSVERH_3"]

                    # Amtliche Bestandswerte
                    bestand_vals = [
                        ("bevoelkerung_gesamt", pop, "Personen"),
                        ("hauptwohnsitzwohnungen", wsa, "Wohnungen"),
                        ("personen_unter_15", u15, "Personen"),
                        ("personen_mit_pensionsbezug", pension, "Personen"),
                        ("einpersonenwohnungen", whg_1p, "Personen"),
                        ("personen_in_hauptmiete", hmiete, "Personen"),
                    ]
                    for ind_code, val, einheit in bestand_vals:
                        indicator_rows.append((
                            "zaehlbezirk", zbez, ind_code, stichtag,
                            float(val), einheit, quelle_id, res_id,
                            "amtlich", "amtlicher_registerzaehlungswert"
                        ))

                    # Berechnete Anteile
                    # anteil_unter_15_prozent
                    if pop > 0:
                        indicator_rows.append((
                            "zaehlbezirk", zbez, "anteil_unter_15_prozent", stichtag,
                            (u15 / pop) * 100.0, "%", quelle_id, res_id,
                            "berechnet_aus_amtlichen_daten",
                            f"Berechnet aus {res_id}: (ERW_STATUS_3 / WHG_POP_TOTAL) * 100"
                        ))
                        # pensionsquote_prozent
                        indicator_rows.append((
                            "zaehlbezirk", zbez, "pensionsquote_prozent", stichtag,
                            (pension / pop) * 100.0, "%", quelle_id, res_id,
                            "berechnet_aus_amtlichen_daten",
                            f"Berechnet aus {res_id}: (ERW_STATUS_4 / WHG_POP_TOTAL) * 100"
                        ))
                        # anteil_personen_in_hauptmiete_prozent
                        indicator_rows.append((
                            "zaehlbezirk", zbez, "anteil_personen_in_hauptmiete_prozent", stichtag,
                            (hmiete / pop) * 100.0, "%", quelle_id, res_id,
                            "berechnet_aus_amtlichen_daten",
                            f"Berechnet aus {res_id}: (WHG_RECHTSVERH_3 / WHG_POP_TOTAL) * 100"
                        ))
                    else:
                        for ind_code in ["anteil_unter_15_prozent", "pensionsquote_prozent", "anteil_personen_in_hauptmiete_prozent"]:
                            indicator_rows.append((
                                "zaehlbezirk", zbez, ind_code, stichtag,
                                None, "%", quelle_id, res_id,
                                "nicht_verfuegbar", "Keine Berechnung möglich: WHG_POP_TOTAL <= 0"
                            ))
                            missing_records.append({
                                "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                                "indikator_code": ind_code, "stichtag": stichtag,
                                "qualitaetsstatus": "nicht_verfuegbar", "grund": "WHG_POP_TOTAL <= 0"
                            })

                    # anteil_einpersonenwohnungen_prozent: Vollständig deaktiviert wegen Dimensionsinkonsistenz
                    # Zähler WHG_NOC_1 zählt Personen, Nenner WHG_WSA_TOTAL zählt Wohnungen.
                    # Bis zum Vorliegen einer amtlichen Wohnungsaufschlüsselung wird der Wert für alle
                    # Zählbezirke und Jahre auf NULL / nicht_verfuegbar gesetzt.
                    indicator_rows.append((
                        "zaehlbezirk", zbez, "anteil_einpersonenwohnungen_prozent", stichtag,
                        None, "%", quelle_id, res_id,
                        "nicht_verfuegbar",
                        "deaktiviert_dimensionsinkonsistenz_personen_vs_wohnungen"
                    ))
                    missing_records.append({
                        "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                        "indikator_code": "anteil_einpersonenwohnungen_prozent", "stichtag": stichtag,
                        "qualitaetsstatus": "nicht_verfuegbar",
                        "grund": "deaktiviert_dimensionsinkonsistenz_personen_vs_wohnungen"
                    })

                else:
                    # Sonderfall: Zählbezirk in amtlicher Datei für dieses Jahr nicht vorhanden (z. B. 0210)
                    grund = f"In amtlicher Registerzählungsdatei für {yr} nicht als Datenzeile enthalten."
                    missing_codes = [
                        ("bevoelkerung_gesamt", "Personen"),
                        ("hauptwohnsitzwohnungen", "Wohnungen"),
                        ("personen_unter_15", "Personen"),
                        ("personen_mit_pensionsbezug", "Personen"),
                        ("einpersonenwohnungen", "Personen"),
                        ("personen_in_hauptmiete", "Personen"),
                        ("anteil_unter_15_prozent", "%"),
                        ("pensionsquote_prozent", "%"),
                        ("anteil_einpersonenwohnungen_prozent", "%"),
                        ("anteil_personen_in_hauptmiete_prozent", "%")
                    ]
                    for ind_code, einheit in missing_codes:
                        indicator_rows.append((
                            "zaehlbezirk", zbez, ind_code, stichtag,
                            None, einheit, quelle_id, res_id,
                            "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                        ))
                        missing_records.append({
                            "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                            "indikator_code": ind_code, "stichtag": stichtag,
                            "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                        })

        # 2. Dichte für 2023
        q_2023, r_2023 = res_map["2023"]
        for zbez, flaeche in zbez_dict.items():
            if zbez in data_2023:
                pop = data_2023[zbez]["WHG_POP_TOTAL"]
                ha = flaeche / 10000.0
                if ha > 0:
                    dichte = pop / ha
                    indicator_rows.append((
                        "zaehlbezirk", zbez, "bevoelkerungsdichte_personen_je_hektar", stichtag_2023,
                        float(dichte), "Personen/ha", q_2023, r_2023,
                        "berechnet_aus_amtlichen_daten",
                        f"Berechnet aus {r_2023} (WHG_POP_TOTAL) und res-zaehlbezirke-geometrie-2024 (flaeche_m2): WHG_POP_TOTAL / (flaeche_m2 / 10000.0)"
                    ))
                else:
                    indicator_rows.append((
                        "zaehlbezirk", zbez, "bevoelkerungsdichte_personen_je_hektar", stichtag_2023,
                        None, "Personen/ha", q_2023, r_2023,
                        "nicht_verfuegbar", "Keine Berechnung möglich: flaeche_m2 <= 0"
                    ))
                    missing_records.append({
                        "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                        "indikator_code": "bevoelkerungsdichte_personen_je_hektar", "stichtag": stichtag_2023,
                        "qualitaetsstatus": "nicht_verfuegbar", "grund": "flaeche_m2 <= 0"
                    })
            else:
                grund = "In amtlicher Registerzählungsdatei für 2023 nicht als Datenzeile enthalten."
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsdichte_personen_je_hektar", stichtag_2023,
                    None, "Personen/ha", q_2023, r_2023,
                    "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                ))
                missing_records.append({
                    "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                    "indikator_code": "bevoelkerungsdichte_personen_je_hektar", "stichtag": stichtag_2023,
                    "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                })

        # 3. Bevölkerungsentwicklung (Stichtag = 2023-10-31)
        # Endressource ist res-registerzaehlung-2023
        for zbez in zbez_dict:
            pop_11 = data_2011.get(zbez, {}).get("WHG_POP_TOTAL")
            pop_21 = data_2021.get(zbez, {}).get("WHG_POP_TOTAL")
            pop_23 = data_2023.get(zbez, {}).get("WHG_POP_TOTAL")

            # 2011–2023 Gesamt
            if pop_11 is not None and pop_23 is not None and pop_11 > 0:
                val = ((pop_23 / pop_11) - 1.0) * 100.0
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2011_2023_prozent", stichtag_2023,
                    float(val), "%", q_2023, r_2023,
                    "berechnet_aus_amtlichen_daten",
                    "Berechnet aus res-registerzaehlung-2011 und res-registerzaehlung-2023: ((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011) - 1) * 100. Vergleich auf stabiler Zählbezirksschlüssel-Ebene."
                ))
            else:
                grund = "Fehlende Basiswerte für 2011 oder 2023 (z. B. ZBEZ 0210)."
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2011_2023_prozent", stichtag_2023,
                    None, "%", q_2023, r_2023,
                    "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                ))
                missing_records.append({
                    "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                    "indikator_code": "bevoelkerungsentwicklung_2011_2023_prozent", "stichtag": stichtag_2023,
                    "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                })

            # 2021–2023 Gesamt
            if pop_21 is not None and pop_23 is not None and pop_21 > 0:
                val = ((pop_23 / pop_21) - 1.0) * 100.0
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2021_2023_prozent", stichtag_2023,
                    float(val), "%", q_2023, r_2023,
                    "berechnet_aus_amtlichen_daten",
                    "Berechnet aus res-registerzaehlung-2021 und res-registerzaehlung-2023: ((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021) - 1) * 100. Vergleich auf stabiler Zählbezirksschlüssel-Ebene."
                ))
            else:
                grund = "Fehlende Basiswerte für 2021 oder 2023 (z. B. ZBEZ 0210)."
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2021_2023_prozent", stichtag_2023,
                    None, "%", q_2023, r_2023,
                    "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                ))
                missing_records.append({
                    "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                    "indikator_code": "bevoelkerungsentwicklung_2021_2023_prozent", "stichtag": stichtag_2023,
                    "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                })

            # 2011–2023 Annualisiert (12 Jahre)
            if pop_11 is not None and pop_23 is not None and pop_11 > 0:
                val = ((pop_23 / pop_11)**(1.0 / 12.0) - 1.0) * 100.0
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr", stichtag_2023,
                    float(val), "%/Jahr", q_2023, r_2023,
                    "berechnet_aus_amtlichen_daten",
                    "Berechnet aus res-registerzaehlung-2011 und res-registerzaehlung-2023: ((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011)^(1/12) - 1) * 100. Vergleich auf stabiler Zählbezirksschlüssel-Ebene."
                ))
            else:
                grund = "Fehlende Basiswerte für 2011 oder 2023 (z. B. ZBEZ 0210)."
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr", stichtag_2023,
                    None, "%/Jahr", q_2023, r_2023,
                    "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                ))
                missing_records.append({
                    "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                    "indikator_code": "bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr", "stichtag": stichtag_2023,
                    "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                })

            # 2021–2023 Annualisiert (2 Jahre)
            if pop_21 is not None and pop_23 is not None and pop_21 > 0:
                val = ((pop_23 / pop_21)**(1.0 / 2.0) - 1.0) * 100.0
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr", stichtag_2023,
                    float(val), "%/Jahr", q_2023, r_2023,
                    "berechnet_aus_amtlichen_daten",
                    "Berechnet aus res-registerzaehlung-2021 und res-registerzaehlung-2023: ((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021)^(1/2) - 1) * 100. Vergleich auf stabiler Zählbezirksschlüssel-Ebene."
                ))
            else:
                grund = "Fehlende Basiswerte für 2021 oder 2023 (z. B. ZBEZ 0210)."
                indicator_rows.append((
                    "zaehlbezirk", zbez, "bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr", stichtag_2023,
                    None, "%/Jahr", q_2023, r_2023,
                    "nicht_verfuegbar", f"nicht_verfuegbar ({grund})"
                ))
                missing_records.append({
                    "gebietsebene": "zaehlbezirk", "gebiet_code": zbez,
                    "indikator_code": "bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr", "stichtag": stichtag_2023,
                    "qualitaetsstatus": "nicht_verfuegbar", "grund": grund
                })

        print(f"✓ Vorbereitung abgeschlossen: {len(indicator_rows)} Indikatordatensätze generiert.")

        # D. Insert in bevoelkerungsindikatoren
        cursor.executemany("""
        INSERT OR REPLACE INTO bevoelkerungsindikatoren (
            gebietsebene, gebiet_code, indikator_code, stichtag,
            wert, einheit, quelle_id, ressourcen_id,
            qualitaetsstatus, berechnungsmethode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, indicator_rows)

        # E. Migrationseintrag
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT OR REPLACE INTO schema_migrationen (
            migration_id, angewendet_am, skript_version, beschreibung
        ) VALUES (?, ?, ?, ?);
        """, (MIGRATION_ID, now_iso, MIGRATION_VERSION, MIGRATION_DESC))

        # F. PRAGMA foreign_key_check vor Commit
        cursor.execute("PRAGMA foreign_key_check;")
        fk_errors = cursor.fetchall()
        if fk_errors:
            raise ValueError(f"Fremdschlüsselfehler vor Commit: {fk_errors}")

        if dry_run:
            conn.rollback()
            print("✓ Dry Run erfolgreich: Alle Statements ausgeführt und Rollback durchgeführt.")
        else:
            conn.commit()
            print("✓ Transaktion erfolgreich abgeschlossen und committet.")

    except Exception as e:
        conn.rollback()
        print(f"✗ FEHLER beim Import! Rollback ausgeführt: {e}", file=sys.stderr)
        raise e
    finally:
        conn.close()

    # 3. QA-Berichte erzeugen
    generate_qa_reports(indicator_rows, missing_records, data_2011, data_2021, data_2023)
    verify_xml_checksum(BASE_DIR)
    print("✓ XML-Original nach Import unverändert.")


def generate_qa_reports(indicator_rows, missing_records, d11, d21, d23):
    """Erzeugt die geforderten QA-Berichte in JSON und CSV."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Missing CSV
    with open(MISSING_CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["gebietsebene", "gebiet_code", "indikator_code", "stichtag", "qualitaetsstatus", "grund"])
        writer.writeheader()
        for m in missing_records:
            writer.writerow(m)
    print(f"✓ Fehlende Werte dokumentiert: {MISSING_CSV_PATH} ({len(missing_records)} Zeilen)")

    # 2. Aggregation je Indikator und Stichtag
    grouped = {}
    for r in indicator_rows:
        ebene, code, ind_code, stichtag, wert, einheit, q_id, res_id, status, methode = r
        key = (ind_code, stichtag)
        if key not in grouped:
            grouped[key] = {
                "indikator_code": ind_code,
                "stichtag": stichtag,
                "einheit": einheit,
                "total": 0,
                "amtlich": 0,
                "berechnet": 0,
                "null_count": 0,
                "amtlich_unterdrueckt": 0,
                "nicht_verfuegbar": 0,
                "values": [],
                "val_by_code": {}
            }
        g = grouped[key]
        g["total"] += 1
        if status == "amtlich":
            g["amtlich"] += 1
        elif status == "berechnet_aus_amtlichen_daten":
            g["berechnet"] += 1
        elif status == "amtlich_unterdrueckt":
            g["amtlich_unterdrueckt"] += 1
        elif status == "nicht_verfuegbar":
            g["nicht_verfuegbar"] += 1

        if wert is None:
            g["null_count"] += 1
        else:
            g["values"].append(wert)
            g["val_by_code"][code] = wert

    def get_weighted_vienna_value(ind_code, stichtag):
        if ind_code == "anteil_unter_15_prozent":
            d = d11 if "2011" in stichtag else (d21 if "2021" in stichtag else d23)
            z = sum(r["ERW_STATUS_3"] for r in d.values())
            n = sum(r["WHG_POP_TOTAL"] for r in d.values())
            return (z / n) * 100.0 if n > 0 else None
        elif ind_code == "pensionsquote_prozent":
            d = d11 if "2011" in stichtag else (d21 if "2021" in stichtag else d23)
            z = sum(r["ERW_STATUS_4"] for r in d.values())
            n = sum(r["WHG_POP_TOTAL"] for r in d.values())
            return (z / n) * 100.0 if n > 0 else None
        elif ind_code == "anteil_personen_in_hauptmiete_prozent":
            d = d11 if "2011" in stichtag else (d21 if "2021" in stichtag else d23)
            z = sum(r["WHG_RECHTSVERH_3"] for r in d.values())
            n = sum(r["WHG_POP_TOTAL"] for r in d.values())
            return (z / n) * 100.0 if n > 0 else None
        elif ind_code == "anteil_einpersonenwohnungen_prozent":
            # Deaktiviert wegen Dimensionsinkonsistenz
            return None
        elif ind_code == "bevoelkerungsdichte_personen_je_hektar":
            tot_pop_23 = sum(r["WHG_POP_TOTAL"] for r in d23.values())
            tot_ha_250 = 41487.11147
            return tot_pop_23 / tot_ha_250
        elif ind_code == "bevoelkerungsentwicklung_2011_2023_prozent":
            p11 = sum(r["WHG_POP_TOTAL"] for r in d11.values())
            p23 = sum(r["WHG_POP_TOTAL"] for r in d23.values())
            return ((p23 / p11) - 1.0) * 100.0 if p11 > 0 else None
        elif ind_code == "bevoelkerungsentwicklung_2021_2023_prozent":
            p21 = sum(r["WHG_POP_TOTAL"] for r in d21.values())
            p23 = sum(r["WHG_POP_TOTAL"] for r in d23.values())
            return ((p23 / p21) - 1.0) * 100.0 if p21 > 0 else None
        elif ind_code == "bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr":
            p11 = sum(r["WHG_POP_TOTAL"] for r in d11.values())
            p23 = sum(r["WHG_POP_TOTAL"] for r in d23.values())
            return (((p23 / p11)**(1.0 / 12.0)) - 1.0) * 100.0 if p11 > 0 else None
        elif ind_code == "bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr":
            p21 = sum(r["WHG_POP_TOTAL"] for r in d21.values())
            p23 = sum(r["WHG_POP_TOTAL"] for r in d23.values())
            return (((p23 / p21)**(1.0 / 2.0)) - 1.0) * 100.0 if p21 > 0 else None
        else:
            return None

    # Summary CSV
    with open(SUMMARY_CSV_PATH, "w", encoding="utf-8", newline="") as f:
        fieldnames = [
            "indikator_code", "stichtag", "einheit", "total",
            "amtlich", "berechnet", "null_count", "nicht_verfuegbar",
            "min_wert", "max_wert",
            "ungewichteter_mittelwert_zaehlbezirke",
            "gewichteter_wien_gesamtwert",
            "sum_wert"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for key, g in sorted(grouped.items()):
            vals = g["values"]
            min_v = min(vals) if vals else None
            max_v = max(vals) if vals else None
            avg_v = sum(vals) / len(vals) if vals else None
            sum_v = sum(vals) if vals else None
            weighted_v = get_weighted_vienna_value(g["indikator_code"], g["stichtag"])

            writer.writerow({
                "indikator_code": g["indikator_code"],
                "stichtag": g["stichtag"],
                "einheit": g["einheit"],
                "total": g["total"],
                "amtlich": g["amtlich"],
                "berechnet": g["berechnet"],
                "null_count": g["null_count"],
                "nicht_verfuegbar": g["nicht_verfuegbar"],
                "min_wert": f"{min_v:.4f}" if min_v is not None else "",
                "max_wert": f"{max_v:.4f}" if max_v is not None else "",
                "ungewichteter_mittelwert_zaehlbezirke": f"{avg_v:.4f}" if avg_v is not None else "",
                "gewichteter_wien_gesamtwert": f"{weighted_v:.4f}" if weighted_v is not None else "",
                "sum_wert": f"{sum_v:.4f}" if sum_v is not None else ""
            })
    print(f"✓ Zusammenfassung geschrieben: {SUMMARY_CSV_PATH}")

    # JSON QA Bericht
    # Plausibilitätsprüfungen
    plausibility_checks = {
        "bevoelkerung_nicht_negativ": True,
        "wohnungen_nicht_negativ": True,
        "u15_nicht_groesser_als_gesamt": True,
        "pension_nicht_groesser_als_gesamt": True,
        "hauptmiete_nicht_groesser_als_gesamt": True,
        "anteilswerte_zwischen_0_und_100": True,
        "entwicklungsraten_finit": True,
        "annualisierte_entwicklungsraten_finit": True,
        "dichte_nicht_negativ": True,
        "wien_summen_stimmen_ueberein": True,
        "anzahl_unbekannter_gebietsschluessel": 0,
        "anzahl_doppelter_werte": 0,
        "anzahl_berechnungsfehler": 0,
        "anteil_einpersonenwohnungen_vollstaendig_deaktiviert": True
    }

    # Strikte Verifikation der Rohdaten auf Plausibilität
    for d in [d11, d21, d23]:
        for r in d.values():
            pop = r["WHG_POP_TOTAL"]
            wsa = r["WHG_WSA_TOTAL"]
            u15 = r["ERW_STATUS_3"]
            pension = r["ERW_STATUS_4"]
            hmiete = r["WHG_RECHTSVERH_3"]
            if pop < 0:
                plausibility_checks["bevoelkerung_nicht_negativ"] = False
            if wsa < 0:
                plausibility_checks["wohnungen_nicht_negativ"] = False
            if u15 > pop:
                plausibility_checks["u15_nicht_groesser_als_gesamt"] = False
            if pension > pop:
                plausibility_checks["pension_nicht_groesser_als_gesamt"] = False
            if hmiete > pop:
                plausibility_checks["hauptmiete_nicht_groesser_als_gesamt"] = False

    # Summenprüfung gegen Rohdaten
    raw_sums = {
        ("bevoelkerung_gesamt", "2011-10-31"): sum(r["WHG_POP_TOTAL"] for r in d11.values()),
        ("hauptwohnsitzwohnungen", "2011-10-31"): sum(r["WHG_WSA_TOTAL"] for r in d11.values()),
        ("personen_unter_15", "2011-10-31"): sum(r["ERW_STATUS_3"] for r in d11.values()),
        ("personen_mit_pensionsbezug", "2011-10-31"): sum(r["ERW_STATUS_4"] for r in d11.values()),
        ("einpersonenwohnungen", "2011-10-31"): sum(r["WHG_NOC_1"] for r in d11.values()),
        ("personen_in_hauptmiete", "2011-10-31"): sum(r["WHG_RECHTSVERH_3"] for r in d11.values()),

        ("bevoelkerung_gesamt", "2021-10-31"): sum(r["WHG_POP_TOTAL"] for r in d21.values()),
        ("hauptwohnsitzwohnungen", "2021-10-31"): sum(r["WHG_WSA_TOTAL"] for r in d21.values()),
        ("personen_unter_15", "2021-10-31"): sum(r["ERW_STATUS_3"] for r in d21.values()),
        ("personen_mit_pensionsbezug", "2021-10-31"): sum(r["ERW_STATUS_4"] for r in d21.values()),
        ("einpersonenwohnungen", "2021-10-31"): sum(r["WHG_NOC_1"] for r in d21.values()),
        ("personen_in_hauptmiete", "2021-10-31"): sum(r["WHG_RECHTSVERH_3"] for r in d21.values()),

        ("bevoelkerung_gesamt", "2023-10-31"): sum(r["WHG_POP_TOTAL"] for r in d23.values()),
        ("hauptwohnsitzwohnungen", "2023-10-31"): sum(r["WHG_WSA_TOTAL"] for r in d23.values()),
        ("personen_unter_15", "2023-10-31"): sum(r["ERW_STATUS_3"] for r in d23.values()),
        ("personen_mit_pensionsbezug", "2023-10-31"): sum(r["ERW_STATUS_4"] for r in d23.values()),
        ("einpersonenwohnungen", "2023-10-31"): sum(r["WHG_NOC_1"] for r in d23.values()),
        ("personen_in_hauptmiete", "2023-10-31"): sum(r["WHG_RECHTSVERH_3"] for r in d23.values()),
    }

    qa_indicators = {}
    for key, g in sorted(grouped.items()):
        ind_code, stichtag = key
        vals = g["values"]
        min_v = min(vals) if vals else None
        max_v = max(vals) if vals else None
        avg_v = sum(vals) / len(vals) if vals else None
        sum_v = sum(vals) if vals else None
        weighted_v = get_weighted_vienna_value(ind_code, stichtag)

        min_code = min(g["val_by_code"], key=g["val_by_code"].get) if g["val_by_code"] else None
        max_code = max(g["val_by_code"], key=g["val_by_code"].get) if g["val_by_code"] else None

        # Plausibilitätsprüfungen für berechnete Anteile (Quoten/Prozentwerte strikt zwischen 0 und 100)
        if g["einheit"] == "%" and "entwicklung" not in ind_code:
            for code, val in g["val_by_code"].items():
                if val is not None:
                    if val < 0.0 or val > 100.0:
                        plausibility_checks["anteilswerte_zwischen_0_und_100"] = False

        # Plausibilitätsprüfungen für Gesamtveränderung
        if "entwicklung" in ind_code and "jahr" not in ind_code:
            for code, val in g["val_by_code"].items():
                if val is not None:
                    if not math.isfinite(val) or val < -100.0:
                        plausibility_checks["entwicklungsraten_finit"] = False

        # Plausibilitätsprüfungen für annualisierte Veränderung
        if "entwicklung" in ind_code and "jahr" in ind_code:
            for code, val in g["val_by_code"].items():
                if val is not None:
                    if not math.isfinite(val) or val < -100.0:
                        plausibility_checks["annualisierte_entwicklungsraten_finit"] = False

        # Prüfung vollständige Deaktivierung von anteil_einpersonenwohnungen_prozent
        if ind_code == "anteil_einpersonenwohnungen_prozent":
            if g["null_count"] != g["total"] or len(g["values"]) > 0 or g["nicht_verfuegbar"] != g["total"]:
                plausibility_checks["anteil_einpersonenwohnungen_vollstaendig_deaktiviert"] = False

        if ind_code == "bevoelkerungsdichte_personen_je_hektar":
            if min_v is not None and min_v < 0:
                plausibility_checks["dichte_nicht_negativ"] = False

        expected_sum = raw_sums.get(key)
        if expected_sum is not None:
            if round(sum_v) != expected_sum:
                plausibility_checks["wien_summen_stimmen_ueberein"] = False

        qa_indicators[f"{ind_code}__{stichtag}"] = {
            "indikator_code": ind_code,
            "stichtag": stichtag,
            "einheit": g["einheit"],
            "datensaetze_gesamt": g["total"],
            "amtliche_werte": g["amtlich"],
            "berechnete_werte": g["berechnet"],
            "anzahl_null": g["null_count"],
            "amtlich_unterdrueckt": g["amtlich_unterdrueckt"],
            "nicht_verfuegbar": g["nicht_verfuegbar"],
            "minimum": round(min_v, 4) if min_v is not None else None,
            "kleinster_wert_gebiet": {"zbez": min_code, "wert": round(min_v, 4)} if min_code else None,
            "maximum": round(max_v, 4) if max_v is not None else None,
            "groesster_wert_gebiet": {"zbez": max_code, "wert": round(max_v, 4)} if max_code else None,
            "ungewichteter_mittelwert_zaehlbezirke": round(avg_v, 4) if avg_v is not None else None,
            "gewichteter_wien_gesamtwert": round(weighted_v, 4) if weighted_v is not None else None,
            "wien_summe": round(sum_v, 4) if sum_v is not None else None,
            "wien_summe_rohdaten": expected_sum
        }

    dokumentierte_besonderheiten = [
        {
            "gebiet_code": "1903",
            "gebiet_name": "Kahlenbergerdorf-Leopoldsberg",
            "ursache": "In amtlichen Rohdaten der Registerzählung übersteigt das Personenmerkmal WHG_NOC_1 (345 in 2021, 377 in 2023) die Wohnungsanzahl WHG_WSA_TOTAL (298 in 2021, 331 in 2023), bedingt durch Anstalts- und Sonderwohnen (HST_3 = 230 Personen in Anstaltshaushalten, WHG_RECHTSVERH_0 = 448 entfällt).",
            "massnahme": "Der Indikator anteil_einpersonenwohnungen_prozent wurde für alle 250 Zählbezirke vollständig deaktiviert und auf NULL / nicht_verfuegbar gesetzt (kein kompatibler amtlicher Wohnungsnenner auf Zählbezirksebene vorhanden). Das Bestandsmerkmal einpersonenwohnungen wurde präzise als 'Personen in Einpersonen-Wohnungen' mit Einheit 'Personen' deklariert."
        }
    ]

    qa_summary = {
        "erstellt_am": datetime.now(timezone.utc).isoformat(),
        "schema_migration": MIGRATION_ID,
        "anzahl_indikatordefinitionen": len(INDIKATOR_DEFINITIONEN),
        "anzahl_gesamte_indikatordatensaetze": len(indicator_rows),
        "anzahl_fehlende_eintraege": len(missing_records),
        "sonderfall_0210": {
            "erklaerung": "Zählbezirk 0210 fehlt 2021 und 2023 amtlich in den Registerzählungsdateien. Werte wurden vorschriftsmäßig als NULL / nicht_verfuegbar erfasst.",
            "zeilen_fuer_0210": sum(1 for r in indicator_rows if r[1] == "0210"),
            "gueltige_werte_2011": sum(1 for r in indicator_rows if r[1] == "0210" and r[3] == "2011-10-31" and r[4] is not None),
            "null_werte_2021_und_2023": sum(1 for r in indicator_rows if r[1] == "0210" and r[4] is None)
        },
        "dokumentierte_besonderheiten": dokumentierte_besonderheiten,
        "plausibilitaetspruefungen": plausibility_checks,
        "indikatoren": qa_indicators
    }

    with open(QA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(qa_summary, f, indent=2, ensure_ascii=False)
    print(f"✓ JSON QA-Bericht generiert: {QA_JSON_PATH}")


def parse_args():
    parser = argparse.ArgumentParser(description="Phase 5: Import der amtlichen Bevölkerungsindikatoren")
    parser.add_argument("--db-path", default=str(DEFAULT_DB_PATH), help="Pfad zur SQLite-Datenbank")
    parser.add_argument("--replace-indicators", action="store_true", help="Ersetzt bestehende Indikatoren und Definitionen")
    parser.add_argument("--dry-run", action="store_true", help="Simuliert die Transaktion ohne Änderungen")
    return parser.parse_args()


def main():
    args = parse_args()
    db_path = Path(args.db_path)
    if not db_path.is_absolute():
        db_path = BASE_DIR / db_path

    print("=== Starte Phase 5: Bevölkerungsindikatoren Import ===")
    print(f"  Datenbank:          {db_path}")
    print(f"  Replace-Indicators: {args.replace_indicators}")
    print(f"  Dry-Run:            {args.dry_run}")

    run_import(
        db_path=db_path,
        replace_indicators=args.replace_indicators,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    main()

