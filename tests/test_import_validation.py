#!/usr/bin/env python3
"""
Automatische Validierungstests für den Gemeindebauten Wien SQLite-Import.
Prüft Datenintegrität, Datentypen, Indizes und die Unverändertheit der XML-Quelle.
"""

import hashlib
import sqlite3
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
EXPECTED_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"


class TestGemeindebautenImport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DB_PATH.exists():
            raise FileNotFoundError(f"Datenbank nicht gefunden: {DB_PATH}. Bitte zuerst Import ausführen.")
        cls.conn = sqlite3.connect(DB_PATH)
        cls.conn.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_01_xml_original_unmodified(self):
        """Das XML-Original darf nicht verändert worden sein (SHA256 Prüfsumme)."""
        self.assertTrue(XML_PATH.exists(), "XML-Datei existiert nicht.")
        hasher = hashlib.sha256()
        with open(XML_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        actual_sha256 = hasher.hexdigest()
        self.assertEqual(
            actual_sha256,
            EXPECTED_SHA256,
            "XML-Originaldatei wurde verändert! Die Prüfsumme stimmt nicht überein."
        )

    def test_02_record_count_is_1776(self):
        """Es müssen exakt 1.776 Gemeindebauten in der Tabelle vorhanden sein."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM gemeindebauten;")
        count = cursor.fetchone()[0]
        self.assertEqual(count, 1776, f"Erwartet wurden 1.776 Datensätze, gefunden: {count}")

    def test_03_unique_objekt_id(self):
        """Alle 1.776 Datensätze müssen eine eindeutige, nicht-leere objekt_id besitzen."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(DISTINCT objekt_id), COUNT(objekt_id) FROM gemeindebauten;")
        distinct_count, total_count = cursor.fetchone()
        self.assertEqual(distinct_count, 1776, "objekt_ids sind nicht alle eindeutig!")
        self.assertEqual(total_count, 1776, "Es gibt fehlende objekt_ids!")

        cursor.execute("SELECT COUNT(*) FROM gemeindebauten WHERE objekt_id IS NULL OR objekt_id <= 0;")
        invalid_ids = cursor.fetchone()[0]
        self.assertEqual(invalid_ids, 0, "Ungültige oder negative objekt_ids gefunden.")

    def test_04_nil_handling_and_no_estimations(self):
        """
        xsi:nil="true" muss strikt als NULL gespeichert werden.
        Fehlende Werte dürfen nicht geschätzt werden.
        """
        cursor = self.conn.cursor()

        # 17 Datensätze haben im Quell-XML xsi:nil="true" bei adresse
        cursor.execute("SELECT COUNT(*) FROM gemeindebauten WHERE adresse IS NULL;")
        null_adressen = cursor.fetchone()[0]
        self.assertEqual(null_adressen, 17, f"Erwartet: 17 NULL-Adressen, gefunden: {null_adressen}")

        # 20 Datensätze haben im Quell-XML xsi:nil="true" bei wohnungen
        cursor.execute("SELECT COUNT(*) FROM gemeindebauten WHERE wohnungen IS NULL;")
        null_wohnungen = cursor.fetchone()[0]
        self.assertEqual(null_wohnungen, 20, f"Erwartet: 20 NULL-Wohnungen, gefunden: {null_wohnungen}")

        # 283 Datensätze haben im Quell-XML xsi:nil="true" bei geschosse_max
        cursor.execute("SELECT COUNT(*) FROM gemeindebauten WHERE geschosse_max IS NULL;")
        null_geschosse = cursor.fetchone()[0]
        self.assertEqual(null_geschosse, 283, f"Erwartet: 283 NULL-Geschosse, gefunden: {null_geschosse}")

        # 174 Datensätze haben im Quell-XML xsi:nil="true" bei amtliche_bautypen
        cursor.execute("SELECT COUNT(*) FROM gemeindebauten WHERE amtliche_bautypen IS NULL;")
        null_bautypen = cursor.fetchone()[0]
        self.assertEqual(null_bautypen, 174, f"Erwartet: 174 NULL-Bautypen, gefunden: {null_bautypen}")

        # Stichproben-Objekte mit bekannten nil-Feldern
        cursor.execute("SELECT adresse, wohnungen, geschosse_max FROM gemeindebauten WHERE objekt_id = 17921;")
        row_17921 = cursor.fetchone()
        self.assertIsNotNone(row_17921["adresse"])
        self.assertIsNone(row_17921["wohnungen"], "Objekt 17921 wohnungen muss NULL sein!")

        cursor.execute("SELECT adresse, geschosse_max FROM gemeindebauten WHERE objekt_id = 19045;")
        row_19045 = cursor.fetchone()
        self.assertIsNone(row_19045["geschosse_max"], "Objekt 19045 geschosse_max muss NULL sein!")

        cursor.execute("SELECT adresse FROM gemeindebauten WHERE objekt_id = 19166;")
        row_19166 = cursor.fetchone()
        self.assertIsNone(row_19166["adresse"], "Objekt 19166 adresse muss NULL sein!")

    def test_05_datatypes_and_ranges(self):
        """Prüft passende Datentypen und plausible Wertebereiche."""
        cursor = self.conn.cursor()

        # Höhenmeter: int, plausible Werte für Wien (150m bis 450m über Adria)
        cursor.execute("SELECT MIN(hoehe_von_m_adria), MAX(hoehe_bis_m_adria) FROM gemeindebauten;")
        min_h, max_h = cursor.fetchone()
        self.assertIsInstance(min_h, int)
        self.assertIsInstance(max_h, int)
        self.assertGreaterEqual(min_h, 140)
        self.assertLessEqual(max_h, 450)

        # Geokoordinaten: WGS84 Bereich für Wien (Lat ~48.1 bis ~48.35, Lon ~16.15 bis ~16.6)
        cursor.execute("SELECT MIN(breitengrad), MAX(breitengrad), MIN(laengengrad), MAX(laengengrad) FROM gemeindebauten;")
        min_lat, max_lat, min_lon, max_lon = cursor.fetchone()
        self.assertIsInstance(min_lat, float)
        self.assertIsInstance(min_lon, float)
        self.assertTrue(48.10 <= min_lat <= max_lat <= 48.35, f"Breitengrad außerhalb Wiens: {min_lat}, {max_lat}")
        self.assertTrue(16.15 <= min_lon <= max_lon <= 16.60, f"Längengrad außerhalb Wiens: {min_lon}, {max_lon}")

        # Wohnungen: int > 0, wenn nicht NULL (Großsiedlungen wie Großfeldsiedlung haben bis zu 5.533)
        cursor.execute("SELECT MIN(wohnungen), MAX(wohnungen) FROM gemeindebauten WHERE wohnungen IS NOT NULL;")
        min_w, max_w = cursor.fetchone()
        self.assertIsInstance(min_w, int)
        self.assertGreater(min_w, 0)
        self.assertLessEqual(max_w, 10000)

        # Baujahr: int zwischen 0 (Sonderfall 0000 im Original bei Objekt 19134) und 2030 (historische Zinshäuser ab 1743)
        cursor.execute("SELECT MIN(baujahr), MAX(baujahr) FROM gemeindebauten;")
        min_bj, max_bj = cursor.fetchone()
        self.assertIsInstance(min_bj, int)
        self.assertGreaterEqual(min_bj, 0)
        self.assertLessEqual(max_bj, 2030)

        # Grünflächen & Scores:
        cursor.execute("SELECT MIN(gruenlage_score), MAX(gruenlage_score), MIN(freiflaechenpotenzial_prozent) FROM gemeindebauten;")
        min_score, max_score, min_proz = cursor.fetchone()
        self.assertIsInstance(min_score, int)
        self.assertGreaterEqual(min_score, 0)
        self.assertLessEqual(max_score, 100)
        self.assertIsInstance(min_proz, float)

        # Lärmklassen: TEXT
        cursor.execute("SELECT DISTINCT strassenlaerm_lden_db_klasse FROM gemeindebauten;")
        laerm_klassen = [row[0] for row in cursor.fetchall()]
        self.assertTrue(any("–" in k or "<" in k or ">" in k or "Schwelle" in k for k in laerm_klassen))

    def test_06_indices_exist(self):
        """Prüft, ob alle geforderten Indizes in der SQLite-Datenbank existieren."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='gemeindebauten';")
        indices = {row[0] for row in cursor.fetchall()}

        required_indices = {
            "idx_gemeindebauten_bezirk",
            "idx_gemeindebauten_adresse",
            "idx_gemeindebauten_baujahr",
            "idx_gemeindebauten_laerm_strassen",
            "idx_gemeindebauten_laerm_schienen",
            "idx_gemeindebauten_gruenlage",
            "idx_gemeindebauten_koordinaten",
        }

        missing = required_indices - indices
        self.assertEqual(len(missing), 0, f"Fehlende Indizes: {missing}")

    def test_07_metadaten_table_populated(self):
        """Prüft, ob die Metadaten-Tabelle korrekt befüllt wurde."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM metadaten;")
        count = cursor.fetchone()[0]
        self.assertGreater(count, 0, "Metadaten-Tabelle ist leer.")
        
        cursor.execute("SELECT wert FROM metadaten WHERE schluessel = 'anzahl_objekte';")
        val = cursor.fetchone()
        self.assertIsNotNone(val)
        self.assertEqual(val[0], "1776")

    def test_08_exported_json_valid(self):
        """Prüft, ob public/data/gemeindebauten.json 1.776 vollständige Frontend-Objekte enthält."""
        import json
        json_path = BASE_DIR / "public" / "data" / "gemeindebauten.json"
        self.assertTrue(json_path.exists(), "public/data/gemeindebauten.json existiert nicht.")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data), 1776, f"Erwartet: 1.776 JSON-Objekte, gefunden: {len(data)}")
        
        # Stichprobe auf erforderliche Frontend-Attribute
        sample = data[0]
        required_keys = {
            "id", "name", "adresse", "bezirk", "bezirkName", "baujahr",
            "koordinaten", "ruheScore", "hoehenmeter", "gelaendeTyp",
            "akustikDbInnenhof", "akustikDbStrasse", "naechsteStation"
        }
        missing_keys = required_keys - set(sample.keys())
        self.assertEqual(len(missing_keys), 0, f"Fehlende Attribute im Frontend-JSON: {missing_keys}")
        self.assertTrue(1 <= sample["ruheScore"] <= 10)
        self.assertTrue(1 <= sample["bezirk"] <= 23)


if __name__ == "__main__":
    unittest.main()
