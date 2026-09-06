#!/usr/bin/env python3
"""
scripts/migrate_population_schema.py

Transaktionale Erweiterung der SQLite-Datenbank um statistische Gebiete,
Quellen, Ressourcen und Gemeindebau-Gebietszuordnungen (Phase 4).

Idempotent: Mehrfache Ausführung erzeugt keine Duplikate und keinen Datenverlust.
Transaktional: Alle DDL- und DML-Operationen laufen in einer atomaren Transaktion.
"""

import os
import sys
import csv
import json
import sqlite3
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB_PATH = "data/gemeindebauten.db"
DEFAULT_STAGING_PATH = "data/staging/gemeindebau_statistische_zuordnung.csv"
DEFAULT_MANIFEST_PATH = "data/source_manifest_population.json"
XML_PATH = "data/Gemeindebauten_Wien_KI.xml"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"
MIGRATION_ID = "population_phase4_v1"
MIGRATION_VERSION = "1.0.0"
MIGRATION_DESC = "Phase 4: Statistische Gebiete, Quellenmodell und Gemeindebau-Zuordnungen"

BEZIRK_NAMEN = {
    "1": "Innere Stadt",
    "2": "Leopoldstadt",
    "3": "Landstraße",
    "4": "Wieden",
    "5": "Margareten",
    "6": "Mariahilf",
    "7": "Neubau",
    "8": "Josefstadt",
    "9": "Alsergrund",
    "10": "Favoriten",
    "11": "Simmering",
    "12": "Meidling",
    "13": "Hietzing",
    "14": "Penzing",
    "15": "Rudolfsheim-Fünfhaus",
    "16": "Ottakring",
    "17": "Hernals",
    "18": "Währing",
    "19": "Döbling",
    "20": "Brigittenau",
    "21": "Floridsdorf",
    "22": "Donaustadt",
    "23": "Liesing"
}


def verify_xml_checksum(base_dir: Path):
    xml_file = base_dir / XML_PATH
    if not xml_file.exists():
        raise FileNotFoundError(f"Original-XML nicht gefunden: {xml_file}")
    with open(xml_file, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    if sha != EXPECTED_XML_SHA256:
        raise ValueError(f"SICHERHEITSFEHLER: Original-XML wurde unerlaubt verändert! ({sha})")


def parse_args():
    parser = argparse.ArgumentParser(description="Migration Population Schema (Phase 4)")
    parser.add_argument("--db-path", default=DEFAULT_DB_PATH, help="Pfad zur SQLite-Datenbank")
    parser.add_argument("--staging-path", default=DEFAULT_STAGING_PATH, help="Pfad zur Staging-Zuordnungs-CSV")
    parser.add_argument("--manifest-path", default=DEFAULT_MANIFEST_PATH, help="Pfad zum Quellenmanifest")
    parser.add_argument("--dry-run", action="store_true", help="Simuliert die Migration ohne Änderungen")
    return parser.parse_args()


def load_staging_data(staging_path: Path):
    if not staging_path.exists():
        raise FileNotFoundError(f"Staging-Datei fehlt: {staging_path}")
    with open(staging_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if len(rows) != 1776:
        raise ValueError(f"Staging-Datei enthält {len(rows)} Zeilen statt 1.776!")
    return rows


def load_manifest_data(manifest_path: Path):
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest-Datei fehlt: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 6 logische Quellen
    sources_dict = {
        "stadt-wien-zaehlgebiete-geometrie": {
            "quelle_id": "stadt-wien-zaehlgebiete-geometrie",
            "titel": "Zählgebietsgrenzen Wien (WFS GeoJSON)",
            "herausgeber": "Stadt Wien",
            "katalog_url": "https://www.data.gv.at/datasets/0adc90c9-ac6b-47ef-aa83-b7780594720c",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählgebiet",
            "beschreibung": "1.368 Zählgebiete der Stadt Wien als WGS84 Geometrien."
        },
        "stadt-wien-gebietstypen-2021": {
            "quelle_id": "stadt-wien-gebietstypen-2021",
            "titel": "Gebietstypen 2021 Wien (WFS GeoJSON)",
            "herausgeber": "Stadt Wien",
            "katalog_url": "https://www.data.gv.at/datasets/b7755371-63ca-4d33-94c4-61e0a02afc2d",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählgebiet",
            "beschreibung": "16 städtebauliche und 7 aggregierte Gebietstypen je Zählgebiet (Stand 2021)."
        },
        "stadt-wien-zaehlbezirke-geometrie": {
            "quelle_id": "stadt-wien-zaehlbezirke-geometrie",
            "titel": "Zählbezirksgrenzen Wien (WFS GeoJSON)",
            "herausgeber": "Stadt Wien",
            "katalog_url": "https://www.data.gv.at/datasets/f3338a3f-af13-37a2-9d45-06138081bdb3",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählbezirk",
            "beschreibung": "250 Zählbezirke der Stadt Wien als WGS84 Geometrien."
        },
        "stadt-wien-registerzaehlung-2023": {
            "quelle_id": "stadt-wien-registerzaehlung-2023",
            "titel": "Registerzählung - Bevölkerung nach Zählbezirken Wien",
            "herausgeber": "Stadt Wien / Statistik Austria",
            "katalog_url": "https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählbezirk",
            "beschreibung": "Amtliche Registerzählungsdaten der Stadt Wien (Stichtage 2023 und 2021)."
        },
        "stadt-wien-registerzaehlung-2011": {
            "quelle_id": "stadt-wien-registerzaehlung-2011",
            "titel": "Registerzählung 2011 - Bevölkerung nach Zählbezirken Wien",
            "herausgeber": "Stadt Wien / Statistik Austria",
            "katalog_url": "https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählbezirk",
            "beschreibung": "Amtliche Registerzählung 2011 als stabiler Referenzstand für den 12-Jahres-Vergleich."
        },
        "stadt-wien-prognoseregionen-zuordnung": {
            "quelle_id": "stadt-wien-prognoseregionen-zuordnung",
            "titel": "Zuordnung der Wiener Zählbezirke in Prognoseregionen - Wien",
            "herausgeber": "Stadt Wien (MA 23)",
            "katalog_url": "https://www.data.gv.at/datasets/b228a28e-a779-42e9-8f18-f6b3fbe8bbb0",
            "lizenz": "CC BY 4.0",
            "raeumliche_ebene": "Zählbezirk -> Prognoseregion",
            "beschreibung": "Eindeutige Zuordnung der 250 Zählbezirke zu den 94 Wiener Prognoseregionen."
        }
    }

    # 7 konkrete Ressourcen
    resources_list = []
    for item in manifest.get("sources", []):
        src_id = item["source_id"]
        # Nachvollziehbare Ressourcen-ID Regel
        if src_id == "stadt-wien-registerzaehlung-2021":
            res_id = "res-registerzaehlung-2021"
            q_id = "stadt-wien-registerzaehlung-2023" # logisch zugeordnet zur Registerzählung
        elif src_id == "stadt-wien-registerzaehlung-2023":
            res_id = "res-registerzaehlung-2023"
            q_id = "stadt-wien-registerzaehlung-2023"
        elif src_id == "stadt-wien-registerzaehlung-2011":
            res_id = "res-registerzaehlung-2011"
            q_id = "stadt-wien-registerzaehlung-2011"
        elif src_id == "stadt-wien-zaehlgebiete-geometrie":
            res_id = "res-zaehlgebiete-geometrie-2024"
            q_id = "stadt-wien-zaehlgebiete-geometrie"
        elif src_id == "stadt-wien-gebietstypen-2021":
            res_id = "res-gebietstypen-2021"
            q_id = "stadt-wien-gebietstypen-2021"
        elif src_id == "stadt-wien-zaehlbezirke-geometrie":
            res_id = "res-zaehlbezirke-geometrie-2024"
            q_id = "stadt-wien-zaehlbezirke-geometrie"
        elif src_id == "stadt-wien-prognoseregionen-zuordnung":
            res_id = "res-prognoseregionen-zuordnung-2023"
            q_id = "stadt-wien-prognoseregionen-zuordnung"
        else:
            res_id = f"res-{src_id}"
            q_id = src_id

        resources_list.append({
            "ressourcen_id": res_id,
            "quelle_id": q_id,
            "ressourcen_url": item.get("resource_url", ""),
            "finale_ressourcen_url": item.get("final_resource_url", ""),
            "lokaler_pfad": item.get("download_target", ""),
            "format": item.get("format", ""),
            "encoding": item.get("encoding", ""),
            "delimiter": item.get("delimiter"),
            "referenzdatum": item.get("reference_date"),
            "referenzzeitraum": item.get("reference_period"),
            "abgerufen_am": item.get("retrieved_at"),
            "dateigroesse_bytes": item.get("file_size_bytes"),
            "sha256": item.get("sha256", ""),
            "verification_status": item.get("verification_status", "")
        })

    return list(sources_dict.values()), resources_list


def load_statistical_areas(base_dir: Path):
    zg_file = base_dir / "data" / "raw" / "population" / "zaehlgebiete_wien.geojson"
    zb_file = base_dir / "data" / "raw" / "population" / "zaehlbezirke_wien.geojson"
    gt_file = base_dir / "data" / "raw" / "population" / "gebietstypen_2021_wien.geojson"
    prg_file = base_dir / "data" / "raw" / "population" / "prognoseregionen_zuordnung_2023.csv"

    # 1. Gebietstypen-Map
    gt_map = {}
    if gt_file.exists():
        with open(gt_file, "r", encoding="utf-8") as f:
            for feat in json.load(f).get("features", []):
                p = feat.get("properties", {})
                zgeb = str(p.get("ZGEB", "")).strip()
                if zgeb:
                    gt_map[zgeb] = p

    areas = []

    # 2. 23 Gemeindebezirke
    for b_num, b_name in sorted(BEZIRK_NAMEN.items(), key=lambda x: int(x[0])):
        areas.append({
            "gebietsebene": "gemeindebezirk",
            "gebiet_code": b_num,
            "gebiet_name": f"{b_num}. Bezirk ({b_name})",
            "uebergeordnete_ebene": None,
            "uebergeordneter_code": None,
            "gemeindebezirk_code": b_num,
            "flaeche_m2": None,
            "gebietstyp_code": None,
            "gebietstyp": None,
            "aggregierter_gebietstyp_code": None,
            "aggregierter_gebietstyp": None,
            "geometrie_datenstand": "2026-09-03",
            "quelle_id": "stadt-wien-zaehlgebiete-geometrie"
        })

    # 3. 94 Prognoseregionen
    prg_seen = set()
    if prg_file.exists():
        with open(prg_file, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
            reader = csv.DictReader(lines[1:], delimiter=";")
            for r in reader:
                prg = r.get("PRG_CODE", "").strip()
                sub = r.get("SUB_DISTRICT_CODE", "").strip()
                if prg and prg not in prg_seen:
                    prg_seen.add(prg)
                    bez_num = str(int(sub[1:3]))
                    areas.append({
                        "gebietsebene": "prognoseregion",
                        "gebiet_code": prg,
                        "gebiet_name": f"Prognoseregion {prg}",
                        "uebergeordnete_ebene": "gemeindebezirk",
                        "uebergeordneter_code": bez_num,
                        "gemeindebezirk_code": bez_num,
                        "flaeche_m2": None,
                        "gebietstyp_code": None,
                        "gebietstyp": None,
                        "aggregierter_gebietstyp_code": None,
                        "aggregierter_gebietstyp": None,
                        "geometrie_datenstand": "2023-01-01",
                        "quelle_id": "stadt-wien-prognoseregionen-zuordnung"
                    })

    # 4. 250 Zählbezirke (inklusive 0210!)
    if zb_file.exists():
        with open(zb_file, "r", encoding="utf-8") as f:
            for feat in json.load(f).get("features", []):
                p = feat.get("properties", {})
                zbez = str(p.get("ZBEZ", "")).strip()
                bez_num = str(int(p.get("BEZ", zbez[:2])))
                flaeche = float(p.get("FLAECHE")) if p.get("FLAECHE") is not None else None
                areas.append({
                    "gebietsebene": "zaehlbezirk",
                    "gebiet_code": zbez,
                    "gebiet_name": f"Zählbezirk {zbez}",
                    "uebergeordnete_ebene": "gemeindebezirk",
                    "uebergeordneter_code": bez_num,
                    "gemeindebezirk_code": bez_num,
                    "flaeche_m2": flaeche,
                    "gebietstyp_code": None,
                    "gebietstyp": None,
                    "aggregierter_gebietstyp_code": None,
                    "aggregierter_gebietstyp": None,
                    "geometrie_datenstand": str(p.get("AKT_TIMESTAMP", "2026-09-03"))[:10],
                    "quelle_id": "stadt-wien-zaehlbezirke-geometrie"
                })

    # 5. 1.368 Zählgebiete
    if zg_file.exists():
        with open(zg_file, "r", encoding="utf-8") as f:
            for feat in json.load(f).get("features", []):
                p = feat.get("properties", {})
                zgeb = str(p.get("ZGEB", "")).strip()
                zbez = str(p.get("ZBEZ", zgeb[:4])).strip()
                bez_num = str(int(p.get("BEZ", zgeb[:2])))
                flaeche = float(p.get("FLAECHE")) if p.get("FLAECHE") is not None else None

                gt_p = gt_map.get(zgeb, {})
                gt_code = str(gt_p.get("GEBIETSTYP_CODE", "")).strip() or None
                gt_name = str(gt_p.get("GEBIETSTYP", "")).strip() or None
                agg_gt_code = str(gt_p.get("AGGREGIERTER_GEBIETSTYP_CODE", "")).strip() or None
                agg_gt_name = str(gt_p.get("AGGREGIERTER_GEBIETSTYP", "")).strip() or None

                areas.append({
                    "gebietsebene": "zaehlgebiet",
                    "gebiet_code": zgeb,
                    "gebiet_name": f"Zählgebiet {zgeb}",
                    "uebergeordnete_ebene": "zaehlbezirk",
                    "uebergeordneter_code": zbez,
                    "gemeindebezirk_code": bez_num,
                    "flaeche_m2": flaeche,
                    "gebietstyp_code": gt_code,
                    "gebietstyp": gt_name,
                    "aggregierter_gebietstyp_code": agg_gt_code,
                    "aggregierter_gebietstyp": agg_gt_name,
                    "geometrie_datenstand": str(p.get("AKT_TIMESTAMP", "2026-09-03"))[:10],
                    "quelle_id": "stadt-wien-zaehlgebiete-geometrie"
                })

    return areas


def run_migration(db_path: Path, staging_rows: list, sources: list, resources: list, areas: list, dry_run: bool = False):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    assigned_timestamp = datetime.now(timezone.utc).isoformat()

    try:
        # 1. DDL Statements
        ddl_migration = """
        CREATE TABLE IF NOT EXISTS schema_migrationen (
            migration_id TEXT PRIMARY KEY,
            angewendet_am TEXT NOT NULL,
            skript_version TEXT NOT NULL,
            beschreibung TEXT NOT NULL
        );
        """

        ddl_quellen = """
        CREATE TABLE IF NOT EXISTS datenquellen (
            quelle_id TEXT PRIMARY KEY,
            titel TEXT NOT NULL,
            herausgeber TEXT NOT NULL,
            katalog_url TEXT,
            lizenz TEXT,
            raeumliche_ebene TEXT,
            beschreibung TEXT
        );
        """

        ddl_ressourcen = """
        CREATE TABLE IF NOT EXISTS datenressourcen (
            ressourcen_id TEXT PRIMARY KEY,
            quelle_id TEXT NOT NULL,
            ressourcen_url TEXT NOT NULL,
            finale_ressourcen_url TEXT,
            lokaler_pfad TEXT NOT NULL,
            format TEXT NOT NULL,
            encoding TEXT,
            delimiter TEXT,
            referenzdatum TEXT,
            referenzzeitraum TEXT,
            abgerufen_am TEXT,
            dateigroesse_bytes INTEGER,
            sha256 TEXT NOT NULL,
            verification_status TEXT NOT NULL,
            FOREIGN KEY (quelle_id)
                REFERENCES datenquellen(quelle_id)
        );
        """

        ddl_gebiete = """
        CREATE TABLE IF NOT EXISTS statistische_gebiete (
            gebietsebene TEXT NOT NULL,
            gebiet_code TEXT NOT NULL,
            gebiet_name TEXT,
            uebergeordnete_ebene TEXT,
            uebergeordneter_code TEXT,
            gemeindebezirk_code TEXT,
            flaeche_m2 REAL,
            gebietstyp_code TEXT,
            gebietstyp TEXT,
            aggregierter_gebietstyp_code TEXT,
            aggregierter_gebietstyp TEXT,
            geometrie_datenstand TEXT,
            quelle_id TEXT,
            PRIMARY KEY (gebietsebene, gebiet_code)
        );
        """

        ddl_zuordnung = """
        CREATE TABLE IF NOT EXISTS gemeindebau_gebiet (
            objekt_id INTEGER NOT NULL,
            gebietsebene TEXT NOT NULL,
            gebiet_code TEXT NOT NULL,
            zuordnungsmethode TEXT NOT NULL,
            qualitaetsstatus TEXT NOT NULL,
            grenzfall INTEGER NOT NULL DEFAULT 0,
            grenznah_unter_1m INTEGER NOT NULL DEFAULT 0,
            grenzdistanz_meter REAL,
            zugeordnet_am TEXT NOT NULL,
            geometrie_datenstand TEXT,
            PRIMARY KEY (objekt_id, gebietsebene),
            FOREIGN KEY (objekt_id)
                REFERENCES gemeindebauten(objekt_id),
            FOREIGN KEY (gebietsebene, gebiet_code)
                REFERENCES statistische_gebiete(gebietsebene, gebiet_code)
        );
        """

        ddl_indikatoren = """
        CREATE TABLE IF NOT EXISTS bevoelkerungsindikatoren (
            gebietsebene TEXT NOT NULL,
            gebiet_code TEXT NOT NULL,
            indikator_code TEXT NOT NULL,
            stichtag TEXT NOT NULL,
            wert REAL,
            einheit TEXT NOT NULL,
            quelle_id TEXT NOT NULL,
            ressourcen_id TEXT,
            qualitaetsstatus TEXT NOT NULL,
            berechnungsmethode TEXT,
            PRIMARY KEY (
                gebietsebene,
                gebiet_code,
                indikator_code,
                stichtag
            ),
            FOREIGN KEY (gebietsebene, gebiet_code)
                REFERENCES statistische_gebiete(gebietsebene, gebiet_code),
            FOREIGN KEY (quelle_id)
                REFERENCES datenquellen(quelle_id),
            FOREIGN KEY (ressourcen_id)
                REFERENCES datenressourcen(ressourcen_id)
        );
        """

        indices = [
            "CREATE INDEX IF NOT EXISTS idx_statistische_gebiete_ebene ON statistische_gebiete(gebietsebene);",
            "CREATE INDEX IF NOT EXISTS idx_statistische_gebiete_bezirk ON statistische_gebiete(gemeindebezirk_code);",
            "CREATE INDEX IF NOT EXISTS idx_gemeindebau_gebiet_objekt ON gemeindebau_gebiet(objekt_id);",
            "CREATE INDEX IF NOT EXISTS idx_gemeindebau_gebiet_code ON gemeindebau_gebiet(gebietsebene, gebiet_code);",
            "CREATE INDEX IF NOT EXISTS idx_datenressourcen_quelle ON datenressourcen(quelle_id);",
            "CREATE INDEX IF NOT EXISTS idx_bevoelkerungsindikatoren_code_stichtag ON bevoelkerungsindikatoren(indikator_code, stichtag);",
            "CREATE INDEX IF NOT EXISTS idx_bevoelkerungsindikatoren_gebiet ON bevoelkerungsindikatoren(gebietsebene, gebiet_code);"
        ]

        # Führe DDL aus
        cursor.execute(ddl_migration)
        cursor.execute(ddl_quellen)
        cursor.execute(ddl_ressourcen)
        cursor.execute(ddl_gebiete)
        cursor.execute(ddl_zuordnung)
        cursor.execute(ddl_indikatoren)
        for idx_stmt in indices:
            cursor.execute(idx_stmt)

        # 2. DML Datenquellen einfügen
        cursor.executemany("""
        INSERT OR REPLACE INTO datenquellen (
            quelle_id, titel, herausgeber, katalog_url, lizenz, raeumliche_ebene, beschreibung
        ) VALUES (:quelle_id, :titel, :herausgeber, :katalog_url, :lizenz, :raeumliche_ebene, :beschreibung);
        """, sources)

        # 3. DML Datenressourcen einfügen
        cursor.executemany("""
        INSERT OR REPLACE INTO datenressourcen (
            ressourcen_id, quelle_id, ressourcen_url, finale_ressourcen_url, lokaler_pfad,
            format, encoding, delimiter, referenzdatum, referenzzeitraum, abgerufen_am,
            dateigroesse_bytes, sha256, verification_status
        ) VALUES (
            :ressourcen_id, :quelle_id, :ressourcen_url, :finale_ressourcen_url, :lokaler_pfad,
            :format, :encoding, :delimiter, :referenzdatum, :referenzzeitraum, :abgerufen_am,
            :dateigroesse_bytes, :sha256, :verification_status
        );
        """, resources)

        # 4. DML Statistische Gebiete einfügen
        cursor.executemany("""
        INSERT OR REPLACE INTO statistische_gebiete (
            gebietsebene, gebiet_code, gebiet_name, uebergeordnete_ebene, uebergeordneter_code,
            gemeindebezirk_code, flaeche_m2, gebietstyp_code, gebietstyp,
            aggregierter_gebietstyp_code, aggregierter_gebietstyp, geometrie_datenstand, quelle_id
        ) VALUES (
            :gebietsebene, :gebiet_code, :gebiet_name, :uebergeordnete_ebene, :uebergeordneter_code,
            :gemeindebezirk_code, :flaeche_m2, :gebietstyp_code, :gebietstyp,
            :aggregierter_gebietstyp_code, :aggregierter_gebietstyp, :geometrie_datenstand, :quelle_id
        );
        """, areas)

        # 5. DML Gemeindebau-Gebiet Zuordnungen (1.776 * 4 = 7.104 Zuordnungen)
        zuordnungen = []
        for r in staging_rows:
            oid = int(r["objekt_id"])
            methode = r.get("zuordnungsmethode", "point_in_polygon_ray_casting")
            status = r.get("qualitaetsstatus", "eindeutig_zugeordnet")
            grenz = int(r.get("grenzfall", 0))
            grenznah = int(r.get("grenznah_unter_1m", 0))
            dist = float(r["grenzdistanz_meter"]) if r.get("grenzdistanz_meter") else None
            stand = r.get("geometrie_datenstand", "2026-09-03")

            # 4 Ebenen pro Objekt
            # 1. Gemeindebezirk
            zuordnungen.append((oid, "gemeindebezirk", str(r["gemeindebezirk_code"]), methode, status, grenz, grenznah, dist, assigned_timestamp, stand))
            # 2. Zählbezirk
            zuordnungen.append((oid, "zaehlbezirk", str(r["zaehlbezirk_code"]), methode, status, grenz, grenznah, dist, assigned_timestamp, stand))
            # 3. Zählgebiet
            zuordnungen.append((oid, "zaehlgebiet", str(r["zaehlgebiet_code"]), methode, status, grenz, grenznah, dist, assigned_timestamp, stand))
            # 4. Prognoseregion
            zuordnungen.append((oid, "prognoseregion", str(r["prognoseregion_code"]), methode, status, grenz, grenznah, dist, assigned_timestamp, stand))

        cursor.executemany("""
        INSERT OR REPLACE INTO gemeindebau_gebiet (
            objekt_id, gebietsebene, gebiet_code, zuordnungsmethode, qualitaetsstatus,
            grenzfall, grenznah_unter_1m, grenzdistanz_meter, zugeordnet_am, geometrie_datenstand
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, zuordnungen)

        # 6. DML Migrationseintrag
        cursor.execute("""
        INSERT OR REPLACE INTO schema_migrationen (
            migration_id, angewendet_am, skript_version, beschreibung
        ) VALUES (?, ?, ?, ?);
        """, (MIGRATION_ID, assigned_timestamp, MIGRATION_VERSION, MIGRATION_DESC))

        # 7. Integritätsprüfung vor Commit
        cursor.execute("PRAGMA foreign_key_check;")
        fk_errors = cursor.fetchall()
        if fk_errors:
            raise ValueError(f"Fremdschlüsselfehler bei Migration: {fk_errors}")

        if dry_run:
            conn.rollback()
            print("✓ Dry Run erfolgreich: Alle Statements simuliert und Rollback durchgeführt.")
        else:
            conn.commit()
            print("✓ Migration erfolgreich committet.")

    except Exception as e:
        conn.rollback()
        print(f"✗ FEHLER bei Migration! Rollback ausgeführt: {e}", file=sys.stderr)
        raise e
    finally:
        conn.close()


def migrate_database(
    db_path: Path,
    staging_csv_path: Path = None,
    manifest_json_path: Path = None,
    dry_run: bool = False
):
    base_dir = Path(__file__).resolve().parent.parent
    if staging_csv_path is None:
        staging_csv_path = base_dir / "data" / "staging" / "gemeindebau_statistische_zuordnung.csv"
    if manifest_json_path is None:
        manifest_json_path = base_dir / "data" / "source_manifest_population.json"

    verify_xml_checksum(base_dir)
    staging_rows = load_staging_data(Path(staging_csv_path))
    sources, resources = load_manifest_data(Path(manifest_json_path))
    areas = load_statistical_areas(base_dir)

    if dry_run:
        import tempfile
        import shutil
        sha_before = hashlib.sha256(Path(db_path).read_bytes()).hexdigest()
        with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
            shutil.copyfile(db_path, tmp.name)
            run_migration(Path(tmp.name), staging_rows, sources, resources, areas, dry_run=True)
        sha_after = hashlib.sha256(Path(db_path).read_bytes()).hexdigest()
        if sha_before != sha_after:
            raise RuntimeError("FEHLER: Dry Run hat die Original-Datenbank verändert!")
        print("✓ Dry Run erfolgreich: Original-Datenbank blieb absolut unverändert (SHA-256 identisch).")
    else:
        run_migration(Path(db_path), staging_rows, sources, resources, areas, dry_run=False)

    verify_xml_checksum(base_dir)


def main():
    args = parse_args()
    base_dir = Path(__file__).resolve().parent.parent

    db_path = Path(args.db_path)
    if not db_path.is_absolute():
        db_path = base_dir / db_path

    staging_path = Path(args.staging_path)
    if not staging_path.is_absolute():
        staging_path = base_dir / staging_path

    manifest_path = Path(args.manifest_path)
    if not manifest_path.is_absolute():
        manifest_path = base_dir / manifest_path

    print(f"=== Starte Schema-Migration Population (Phase 4) ===")
    print(f"  Datenbank: {db_path}")
    print(f"  Staging:   {staging_path}")
    print(f"  Manifest:  {manifest_path}")
    print(f"  Modus:     {'DRY RUN (keine Schreibvorgänge)' if args.dry_run else 'PRODUKTIV'}")

    migrate_database(
        db_path=db_path,
        staging_csv_path=staging_path,
        manifest_json_path=manifest_path,
        dry_run=args.dry_run
    )
    print("✓ Migration erfolgreich abgeschlossen.")


if __name__ == "__main__":
    main()

