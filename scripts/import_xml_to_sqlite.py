#!/usr/bin/env python3
"""
Reproduzierbarer XML-Importer für Gemeindebauten Wien
Liest data/Gemeindebauten_Wien_KI.xml und schreibt data/gemeindebauten.db.

Regeln:
- XML-Original wird rein lesend geöffnet und keinesfalls verändert.
- xsi:nil="true" sowie leere Tags werden als NULL gespeichert.
- Fehlende Werte werden nicht geschätzt.
- Validiert exakt 1.776 Objekte mit eindeutiger objekt_id.
"""

import argparse
import os
import sqlite3
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

XSI_NIL = "{http://www.w3.org/2001/XMLSchema-instance}nil"

# Spaltendefinitionen für SQLite mit passenden Datentypen
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS metadaten (
    schluessel TEXT PRIMARY KEY,
    wert TEXT
);

CREATE TABLE IF NOT EXISTS gemeindebauten (
    -- Identifikation
    objekt_id INTEGER PRIMARY KEY,
    bezirk INTEGER NOT NULL,
    hofname TEXT,
    adresse TEXT,
    
    -- Bau- und Kenndaten
    baujahr INTEGER NOT NULL,
    wohnungen INTEGER,
    baukoerper_anzahl INTEGER,
    bebaute_grundflaeche_m2 INTEGER,
    anlagenhuelle_m2 INTEGER,
    geschosse_max INTEGER,
    groessenklasse TEXT,
    amtliche_bautypen TEXT,
    immobilientyp_abgeleitet TEXT,
    
    -- Geokoordinaten
    breitengrad REAL NOT NULL,
    laengengrad REAL NOT NULL,
    
    -- Höhenmeter (Adria)
    hoehe_von_m_adria INTEGER,
    hoehe_bis_m_adria INTEGER,
    hoehenmethode TEXT,
    
    -- Haltestellen & ÖPNV
    naechste_haltestelle TEXT,
    entfernung_haltestelle_m INTEGER,
    verkehrsmittel TEXT,
    linien TEXT,
    weitere_haltestellen TEXT,
    
    -- Grünflächen & Freiraum
    freiflaechenpotenzial_m2 INTEGER,
    freiflaechenpotenzial_prozent REAL,
    naechster_park TEXT,
    entfernung_park_m INTEGER,
    oeffentliches_gruen_500m_m2 INTEGER,
    oeffentliches_gruen_500m_prozent REAL,
    baeume_250m INTEGER,
    gruenlage_abgeleitet TEXT,
    gruenlage_score INTEGER,
    
    -- Lärmklassen & Akustik
    strassenlaerm_lden_db_klasse TEXT,
    strassenlaerm_lnight_db_klasse TEXT,
    schienenlaerm_lden_db_klasse TEXT,
    schienenlaerm_lnight_db_klasse TEXT,
    fluglaerm_lden_db_klasse TEXT,
    fluglaerm_lnight_db_klasse TEXT,
    laermhinweis TEXT,
    laermkarte_url TEXT,
    
    -- Quellen
    gemeindebau_quelle_url TEXT
);

-- Indizes für schnelle Abfragen und Filterung
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_bezirk ON gemeindebauten(bezirk);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_adresse ON gemeindebauten(adresse);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_baujahr ON gemeindebauten(baujahr);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_laerm_strassen ON gemeindebauten(strassenlaerm_lden_db_klasse, strassenlaerm_lnight_db_klasse);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_laerm_schienen ON gemeindebauten(schienenlaerm_lden_db_klasse, schienenlaerm_lnight_db_klasse);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_gruenlage ON gemeindebauten(gruenlage_abgeleitet, gruenlage_score);
CREATE INDEX IF NOT EXISTS idx_gemeindebauten_koordinaten ON gemeindebauten(breitengrad, laengengrad);
"""

# Typdeklarationen für sichere Konvertierung
INT_FIELDS = {
    "objekt_id", "bezirk", "baujahr", "wohnungen", "baukoerper_anzahl",
    "bebaute_grundflaeche_m2", "anlagenhuelle_m2", "geschosse_max",
    "hoehe_von_m_adria", "hoehe_bis_m_adria", "entfernung_haltestelle_m",
    "entfernung_park_m", "freiflaechenpotenzial_m2", "oeffentliches_gruen_500m_m2",
    "baeume_250m", "gruenlage_score"
}

FLOAT_FIELDS = {
    "breitengrad", "laengengrad", "freiflaechenpotenzial_prozent",
    "oeffentliches_gruen_500m_prozent"
}

TEXT_FIELDS = {
    "hofname", "adresse", "groessenklasse", "amtliche_bautypen",
    "immobilientyp_abgeleitet", "hoehenmethode", "naechste_haltestelle",
    "verkehrsmittel", "linien", "weitere_haltestellen", "naechster_park",
    "gruenlage_abgeleitet", "strassenlaerm_lden_db_klasse",
    "strassenlaerm_lnight_db_klasse", "schienenlaerm_lden_db_klasse",
    "schienenlaerm_lnight_db_klasse", "fluglaerm_lden_db_klasse",
    "fluglaerm_lnight_db_klasse", "laermhinweis", "laermkarte_url",
    "gemeindebau_quelle_url"
}


def parse_value(element, field_name):
    """
    Parst ein XML-Element unter strikter Einhaltung der Vorgabe:
    - xsi:nil="true" oder leerer Text -> None (NULL in SQLite)
    - Keine Schätzwerte
    - Passende Typkonvertierung
    """
    if element is None:
        return None

    # Prüfung auf xsi:nil="true"
    is_nil = (
        element.attrib.get(XSI_NIL, "").strip().lower() == "true"
        or element.attrib.get("nil", "").strip().lower() == "true"
    )
    if is_nil or element.text is None:
        return None

    text_val = element.text.strip()
    if text_val == "":
        return None

    if field_name in INT_FIELDS:
        try:
            return int(text_val)
        except ValueError:
            raise ValueError(f"Feld '{field_name}' hat ungültigen Integer-Wert: '{text_val}'")

    if field_name in FLOAT_FIELDS:
        try:
            return float(text_val)
        except ValueError:
            raise ValueError(f"Feld '{field_name}' hat ungültigen Float-Wert: '{text_val}'")

    return text_val


def import_xml(xml_path: Path, db_path: Path, drop_existing: bool = True) -> int:
    """
    Führt den Import von XML nach SQLite durch.
    Validiert die Datenintegrität und bricht bei Abweichungen ab.
    """
    if not xml_path.exists():
        raise FileNotFoundError(f"XML-Datei nicht gefunden: {xml_path}")

    print(f"[1/4] Parse XML: {xml_path} (rein lesender Zugriff)")
    # XML rein lesend öffnen
    with open(xml_path, "rb") as f:
        tree = ET.parse(f)
    root = tree.getroot()

    # Metadaten auslesen
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    if drop_existing:
        cursor.execute("DROP TABLE IF EXISTS metadaten;")
        cursor.execute("DROP TABLE IF EXISTS gemeindebauten;")

    # Schema und Indizes anlegen
    cursor.executescript(SCHEMA_SQL)

    print("[2/4] Speichere Metadaten...")
    metadaten_entries = [
        ("datenstand", root.attrib.get("datenstand", "")),
        ("anzahl_objekte", root.attrib.get("anzahl_objekte", "")),
        ("sprache", root.attrib.get("sprache", "")),
        ("koordinatensystem", root.attrib.get("koordinatensystem", "")),
    ]

    meta_elem = root.find("metadaten")
    if meta_elem is not None:
        for child in meta_elem:
            if len(child) == 0:
                metadaten_entries.append((child.tag, (child.text or "").strip()))
            else:
                for sub in child:
                    metadaten_entries.append((f"{child.tag}.{sub.tag}", (sub.text or "").strip()))

    cursor.executemany(
        "INSERT OR REPLACE INTO metadaten (schluessel, wert) VALUES (?, ?);",
        metadaten_entries
    )

    print("[3/4] Extrahiere und validiere Gemeindebauten...")
    gemeindebau_nodes = root.findall(".//gemeindebau")
    total_nodes = len(gemeindebau_nodes)
    
    # Validierung: Exakt 1.776 Gemeindebauten
    if total_nodes != 1776:
        raise ValueError(
            f"FEHLER: Erwartet wurden genau 1.776 Gemeindebauten, gefunden wurden {total_nodes}!"
        )

    all_field_names = ["objekt_id"] + sorted(list(INT_FIELDS | FLOAT_FIELDS | TEXT_FIELDS - {"objekt_id"}))
    insert_sql = f"""
        INSERT INTO gemeindebauten ({', '.join(all_field_names)})
        VALUES ({', '.join(['?'] * len(all_field_names))});
    """

    rows_to_insert = []
    seen_objekt_ids = set()

    for idx, node in enumerate(gemeindebau_nodes, start=1):
        objekt_id_raw = node.attrib.get("objekt_id")
        if not objekt_id_raw or not objekt_id_raw.isdigit():
            raise ValueError(f"Ungültige oder fehlende objekt_id in Knoten {idx}: '{objekt_id_raw}'")

        objekt_id = int(objekt_id_raw)
        if objekt_id in seen_objekt_ids:
            raise ValueError(f"Doppelte objekt_id gefunden: {objekt_id}")
        seen_objekt_ids.add(objekt_id)

        # Kind-Elemente sammeln
        child_map = {child.tag: child for child in node}

        row = []
        for field in all_field_names:
            if field == "objekt_id":
                row.append(objekt_id)
            else:
                elem = child_map.get(field)
                val = parse_value(elem, field)
                row.append(val)

        rows_to_insert.append(tuple(row))

    # Eindeutigkeitsvalidierung
    if len(seen_objekt_ids) != 1776:
        raise ValueError(
            f"FEHLER: Erwartet wurden 1.776 eindeutige objekt_ids, gefunden wurden {len(seen_objekt_ids)}!"
        )

    print(f"[4/4] Schreibe {len(rows_to_insert)} Datensätze in SQLite-Datenbank: {db_path}...")
    cursor.executemany(insert_sql, rows_to_insert)
    conn.commit()
    conn.close()

    print(f"Import erfolgreich abgeschlossen: 1.776 Datensätze in {db_path} importiert.")
    return total_nodes


def main():
    parser = argparse.ArgumentParser(description="Gemeindebauten Wien XML zu SQLite Importer")
    parser.add_argument(
        "--xml-path",
        type=Path,
        default=Path("data/Gemeindebauten_Wien_KI.xml"),
        help="Pfad zur XML-Quelldatei (Standard: data/Gemeindebauten_Wien_KI.xml)"
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=Path("data/gemeindebauten.db"),
        help="Pfad zur SQLite-Zieldatei (Standard: data/gemeindebauten.db)"
    )
    parser.add_argument(
        "--no-drop",
        action="store_true",
        help="Tabellen nicht vor dem Import löschen"
    )

    args = parser.parse_args()
    try:
        import_xml(args.xml_path, args.db_path, drop_existing=not args.no_drop)
    except Exception as e:
        print(f"FEHLER: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
