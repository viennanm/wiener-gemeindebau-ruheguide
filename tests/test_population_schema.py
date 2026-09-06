#!/usr/bin/env python3
"""
tests/test_population_schema.py

Automatisierte Unittests für Phase 4:
- Prüfung von PRAGMA integrity_check und PRAGMA foreign_key_check
- Unveränderte Bestandsdaten (gemeindebauten, metadaten, XML-Prüfsumme)
- Schema-Tabellen: datenquellen (6), datenressourcen (7), statistische_gebiete (1.735),
  gemeindebau_gebiet (7.104), bevoelkerungsindikatoren (0)
- Führende Nullen (z. B. ZBEZ '0210', ZGEB '02100')
- Idempotenz der Migration
- Rollback-Sicherheit bei Fehlern
- Dry-Run Funktionalität
"""

import os
import shutil
import sqlite3
import hashlib
import tempfile
import unittest
from pathlib import Path

from scripts.migrate_population_schema import migrate_database

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
BACKUP_PATH = BASE_DIR / "data" / "backups" / "gemeindebauten_vor_population_phase4.db"
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
STAGING_CSV = BASE_DIR / "data" / "staging" / "gemeindebau_statistische_zuordnung.csv"
MANIFEST_JSON = BASE_DIR / "data" / "source_manifest_population.json"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"


class TestPopulationSchema(unittest.TestCase):
    """Testsuite für die Validierung des migrierten Datenbankschemas."""

    @classmethod
    def setUpClass(cls):
        if not DB_PATH.exists():
            raise FileNotFoundError(f"Datenbank existiert nicht: {DB_PATH}")
        cls.conn = sqlite3.connect(DB_PATH)
        cls.conn.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_01_xml_original_unmodified(self):
        """Das XML-Original darf nicht verändert worden sein."""
        self.assertTrue(XML_PATH.exists())
        hasher = hashlib.sha256()
        with open(XML_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        self.assertEqual(hasher.hexdigest(), EXPECTED_XML_SHA256)

    def test_02_sqlite_integrity_and_foreign_keys(self):
        """PRAGMA integrity_check muss 'ok' sein und foreign_key_check muss 0 Fehler melden."""
        cur = self.conn.cursor()
        cur.execute("PRAGMA integrity_check;")
        self.assertEqual(cur.fetchone()[0], "ok")

        cur.execute("PRAGMA foreign_key_check;")
        fk_errors = cur.fetchall()
        self.assertEqual(len(fk_errors), 0, f"Fremdschlüsselfehler gefunden: {fk_errors}")

    def test_03_existing_tables_unmodified(self):
        """Tabellen gemeindebauten und metadaten müssen exakt dem Backup entsprechen."""
        self.assertTrue(BACKUP_PATH.exists(), f"Backup existiert nicht: {BACKUP_PATH}")
        b_conn = sqlite3.connect(BACKUP_PATH)

        cur = self.conn.cursor()
        b_cur = b_conn.cursor()

        # gemeindebauten
        cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        curr_gb = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        back_gb = [tuple(r) for r in b_cur.fetchall()]
        self.assertEqual(len(curr_gb), 1776)
        self.assertEqual(curr_gb, back_gb, "gemeindebauten stimmt nicht mit Backup überein!")

        # metadaten
        cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        curr_meta = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        back_meta = [tuple(r) for r in b_cur.fetchall()]
        self.assertEqual(curr_meta, back_meta, "metadaten stimmt nicht mit Backup überein!")
        b_conn.close()

    def test_04_migration_entry(self):
        """Die Tabelle schema_migrationen muss den Phase-4-Eintrag enthalten."""
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM schema_migrationen WHERE migration_id = 'population_phase4_v1';")
        row = cur.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["skript_version"], "1.0.0")

    def test_05_sources_and_resources_count(self):
        """Exakt 6 Quellen und 7 Ressourcen müssen vorhanden sein."""
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM datenquellen;")
        self.assertEqual(cur.fetchone()[0], 6)

        cur.execute("SELECT COUNT(*) FROM datenressourcen;")
        self.assertEqual(cur.fetchone()[0], 7)

    def test_06_statistical_areas_counts(self):
        """Prüft die Anzahl der Gebiete je Ebene: 23 Bezirke, 250 ZB, 1.368 ZG, 94 PR, Summe 1.735."""
        cur = self.conn.cursor()
        cur.execute("SELECT gebietsebene, COUNT(*) FROM statistische_gebiete GROUP BY gebietsebene;")
        counts = {r[0]: r[1] for r in cur.fetchall()}
        self.assertEqual(counts.get("gemeindebezirk"), 23)
        self.assertEqual(counts.get("zaehlbezirk"), 250)
        self.assertEqual(counts.get("zaehlgebiet"), 1368)
        self.assertEqual(counts.get("prognoseregion"), 94)

        cur.execute("SELECT COUNT(*) FROM statistische_gebiete;")
        self.assertEqual(cur.fetchone()[0], 1735)

    def test_07_special_case_0210_and_leading_zeros(self):
        """Zählbezirk 0210 und Zählgebiet 02100 müssen existieren und führende Nullen intakt sein."""
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM statistische_gebiete WHERE gebietsebene='zaehlbezirk' AND gebiet_code='0210';")
        zb = cur.fetchone()
        self.assertIsNotNone(zb)
        self.assertEqual(zb["gemeindebezirk_code"], "2")

        cur.execute("SELECT * FROM statistische_gebiete WHERE gebietsebene='zaehlgebiet' AND gebiet_code='02100';")
        zg = cur.fetchone()
        self.assertIsNotNone(zg)
        self.assertEqual(zg["uebergeordneter_code"], "0210")

        # Alle 250 Zählbezirke müssen 4-stellig sein
        cur.execute("SELECT gebiet_code FROM statistische_gebiete WHERE gebietsebene='zaehlbezirk';")
        for (code,) in cur.fetchall():
            self.assertEqual(len(code), 4)
            self.assertTrue(code.isdigit())

        # Alle 1.368 Zählgebiete müssen 5-stellig sein
        cur.execute("SELECT gebiet_code FROM statistische_gebiete WHERE gebietsebene='zaehlgebiet';")
        for (code,) in cur.fetchall():
            self.assertEqual(len(code), 5)
            self.assertTrue(code.isdigit())

    def test_08_building_assignments_count_and_completeness(self):
        """Jedes der 1.776 Gebäude muss exakt 4 Zuordnungen besitzen (insgesamt 7.104)."""
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM gemeindebau_gebiet;")
        self.assertEqual(cur.fetchone()[0], 7104)

        cur.execute("SELECT COUNT(DISTINCT objekt_id) FROM gemeindebau_gebiet;")
        self.assertEqual(cur.fetchone()[0], 1776)

        cur.execute("""
            SELECT objekt_id, COUNT(*) as eb_count
            FROM gemeindebau_gebiet
            GROUP BY objekt_id
            HAVING eb_count != 4;
        """)
        mismatches = cur.fetchall()
        self.assertEqual(len(mismatches), 0, f"Objekte mit != 4 Zuordnungen: {mismatches}")

        # Jedes Objekt muss genau je eine Zuordnung zu allen 4 Ebenen haben
        cur.execute("SELECT DISTINCT gebietsebene FROM gemeindebau_gebiet;")
        ebenen = sorted([r[0] for r in cur.fetchall()])
        self.assertEqual(ebenen, ["gemeindebezirk", "prognoseregion", "zaehlbezirk", "zaehlgebiet"])

        cur.execute("""
            SELECT gebietsebene, COUNT(*)
            FROM gemeindebau_gebiet
            GROUP BY gebietsebene;
        """)
        counts_per_ebene = dict(cur.fetchall())
        for eb in ["gemeindebezirk", "prognoseregion", "zaehlbezirk", "zaehlgebiet"]:
            self.assertEqual(counts_per_ebene.get(eb), 1776)

    def test_09_indicators_table_exists(self):
        """bevoelkerungsindikatoren muss existieren und gültige Zeilenzahlen haben (0 vor Phase 5 bzw. 8.750 nach Phase 5)."""
        cur = self.conn.cursor()
        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        count = cur.fetchone()[0]
        self.assertIn(count, (0, 8750))


class TestMigrationMechanics(unittest.TestCase):
    """Testsuite für Idempotenz, Rollback und Dry-Run."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.test_db = Path(self.temp_dir) / "test_gemeindebauten.db"
        # Kopiere Ausgangs-Backup als Ausgangszustand
        shutil.copy2(BACKUP_PATH, self.test_db)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_10_migration_idempotency(self):
        """Wiederholtes Ausführen der Migration auf einer migrierten DB muss ohne Fehler und idempotent sein."""
        # 1. Migration ausführen
        migrate_database(
            db_path=self.test_db,
            staging_csv_path=STAGING_CSV,
            manifest_json_path=MANIFEST_JSON,
            dry_run=False
        )

        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM statistische_gebiete;")
        count_1 = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM gemeindebau_gebiet;")
        assignments_1 = cur.fetchone()[0]
        conn.close()

        self.assertEqual(count_1, 1735)
        self.assertEqual(assignments_1, 7104)

        # 2. Zweite Migration ausführen (muss idempotent durchlaufen)
        migrate_database(
            db_path=self.test_db,
            staging_csv_path=STAGING_CSV,
            manifest_json_path=MANIFEST_JSON,
            dry_run=False
        )

        conn2 = sqlite3.connect(self.test_db)
        cur2 = conn2.cursor()
        cur2.execute("SELECT COUNT(*) FROM statistische_gebiete;")
        count_2 = cur2.fetchone()[0]
        cur2.execute("SELECT COUNT(*) FROM gemeindebau_gebiet;")
        assignments_2 = cur2.fetchone()[0]
        conn2.close()

        self.assertEqual(count_2, 1735)
        self.assertEqual(assignments_2, 7104)

    def test_11_dry_run_does_not_modify_db(self):
        """Ein Dry-Run darf keine Änderungen an der Datenbankdatei persistieren."""
        # Hash vor Dry-Run
        hasher_before = hashlib.sha256()
        with open(self.test_db, "rb") as f:
            while chunk := f.read(65536):
                hasher_before.update(chunk)
        hash_before = hasher_before.hexdigest()

        migrate_database(
            db_path=self.test_db,
            staging_csv_path=STAGING_CSV,
            manifest_json_path=MANIFEST_JSON,
            dry_run=True
        )

        hasher_after = hashlib.sha256()
        with open(self.test_db, "rb") as f:
            while chunk := f.read(65536):
                hasher_after.update(chunk)
        hash_after = hasher_after.hexdigest()

        self.assertEqual(hash_before, hash_after, "Dry-Run hat die Datenbankdatei modifiziert!")

    def test_12_transaction_rollback_on_failure(self):
        """Wenn während der Migration ein Fehler auftritt, muss ein vollständiges Rollback stattfinden."""
        # Erstelle eine fehlerhafte Staging-CSV (z. B. unvollständige Spalten)
        corrupt_csv = Path(self.temp_dir) / "corrupt_staging.csv"
        with open(corrupt_csv, "w", encoding="utf-8") as f:
            f.write("objekt_id,gemeindebezirk_code\n")
            f.write("1,1\n")

        # Migration mit fehlerhafter CSV muss Exception werfen
        with self.assertRaises(Exception):
            migrate_database(
                db_path=self.test_db,
                staging_csv_path=corrupt_csv,
                manifest_json_path=MANIFEST_JSON,
                dry_run=False
            )

        # Überprüfe, dass keine der Tabellen angelegt bzw. persistiert wurde
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='statistische_gebiete';")
        self.assertIsNone(cur.fetchone(), "Tabelle statistische_gebiete existiert trotz Rollback!")
        conn.close()


if __name__ == "__main__":
    unittest.main()

