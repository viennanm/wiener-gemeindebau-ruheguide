#!/usr/bin/env python3
"""
tests/test_population_frontend_export.py

Automatisierte Unittests für Phase 6:
- Prüfung des unveränderten XML-Originals (SHA-256)
- Prüfung der exportierten Datei public/data/gemeindebauten.json
- Verifizierung der 1.776 Datensätze mit umfeldstatistik
- Bitgenaue Erhaltung aller bisherigen Kriterien (Ruhe-Score, Grünlage, Lärm, Fotos)
- Prüfung, dass der fehlerhafte Indikator anteil_einpersonenwohnungen_prozent NICHT exportiert wird
- Prüfung der mathematischen Wertebereiche (Anteile in [0, 100])
- Prüfung der Metadatendatei public/data/bevoelkerungsstatistik_metadaten.json
- Prüfung von Idempotenz und Filterlogik
"""

import os
import json
import hashlib
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
EXPORT_JSON_PATH = BASE_DIR / "public" / "data" / "gemeindebauten.json"
BACKUP_JSON_PATH = BASE_DIR / "data" / "backups" / "phase6_pre" / "gemeindebauten.json"
METADATA_JSON_PATH = BASE_DIR / "public" / "data" / "bevoelkerungsstatistik_metadaten.json"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"


class TestPopulationFrontendExport(unittest.TestCase):
    """Testsuite für Phase 6: Frontend-Export der Bevölkerungsdaten."""

    def test_01_xml_original_unmodified(self):
        """Das XML-Original darf zu keinem Zeitpunkt verändert werden."""
        self.assertTrue(XML_PATH.exists(), f"XML fehlt: {XML_PATH}")
        hasher = hashlib.sha256()
        with open(XML_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        self.assertEqual(hasher.hexdigest(), EXPECTED_XML_SHA256)

    def test_02_export_json_exists_and_has_1776_entries(self):
        """public/data/gemeindebauten.json muss existieren und genau 1.776 Datensätze enthalten."""
        self.assertTrue(EXPORT_JSON_PATH.exists())
        with open(EXPORT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1776)

    def test_03_ruhe_score_and_existing_fields_completely_unchanged(self):
        """Bestehende Bewertungen (Ruhe-Score, Grünlage, Lärm, Fotos) müssen 100% identisch zum Backup sein."""
        self.assertTrue(BACKUP_JSON_PATH.exists(), "Backup-JSON vor Phase 6 fehlt!")
        with open(BACKUP_JSON_PATH, "r", encoding="utf-8") as f:
            backup_data = json.load(f)
        with open(EXPORT_JSON_PATH, "r", encoding="utf-8") as f:
            current_data = json.load(f)

        backup_map = {b["id"]: b for b in backup_data}
        self.assertEqual(len(backup_map), 1776)

        critical_fields = [
            "id", "name", "adresse", "bezirk", "plz", "ruheScore", "gruenlageScore",
            "laermTag", "laermNacht", "verkehrsLage", "fotoUrl", "isStufenlos",
            "bimBusDistanzMeter", "gelaendeTyp", "bauEpoche", "denkmalschutz", "isWiseg"
        ]

        for cur in current_data:
            b_id = cur["id"]
            self.assertIn(b_id, backup_map)
            prev = backup_map[b_id]
            for field in critical_fields:
                self.assertEqual(
                    cur.get(field),
                    prev.get(field),
                    f"Feld '{field}' für Gemeindebau ID {b_id} wurde verändert!"
                )

    def test_04_umfeldstatistik_structure_and_types(self):
        """Jeder Gemeindebau muss das Objekt 'umfeldstatistik' mit gültigen Zählbezirksdaten besitzen."""
        with open(EXPORT_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        required_keys = {
            "raeumlicheEbene",
            "zaehlbezirkCode",
            "zaehlgebietCode",
            "prognoseregionCode",
            "gemeindebezirkCode",
            "datenstand",
            "einwohner",
            "hauptwohnsitzwohnungen",
            "bevoelkerungsdichtePersonenJeHektar",
            "anteilUnter15Prozent",
            "anteilPensionsbezugProzent",
            "bevoelkerungsentwicklung2011Bis2023Prozent",
            "bevoelkerungsentwicklung2021Bis2023Prozent",
        }

        for bau in data:
            self.assertIn("umfeldstatistik", bau)
            umfeld = bau["umfeldstatistik"]
            self.assertIsInstance(umfeld, dict)

            # Prüfe Schlüssel
            for rk in required_keys:
                self.assertIn(rk, umfeld, f"Fehlender Schlüssel {rk} bei Bau {bau['id']}")

            # Format Zählbezirk 4-stellig
            zbez = umfeld["zaehlbezirkCode"]
            self.assertIsInstance(zbez, str)
            self.assertEqual(len(zbez), 4)

            # Stichtag / Datenstand
            self.assertEqual(umfeld["datenstand"], "2023-10-31")

            # Wertebereiche
            pop = umfeld["einwohner"]
            if pop is not None:
                self.assertGreater(pop, 0)

            dichte = umfeld["bevoelkerungsdichtePersonenJeHektar"]
            if dichte is not None:
                self.assertGreaterEqual(dichte, 0.0)

            u15 = umfeld["anteilUnter15Prozent"]
            if u15 is not None:
                self.assertGreaterEqual(u15, 0.0)
                self.assertLessEqual(u15, 100.0)

            pension = umfeld["anteilPensionsbezugProzent"]
            if pension is not None:
                self.assertGreaterEqual(pension, 0.0)
                self.assertLessEqual(pension, 100.0)

    def test_05_prohibited_indicators_not_in_json(self):
        """Der fehlerhafte Indikator (Einpersonenwohnungen) darf keinesfalls exportiert werden."""
        with open(EXPORT_JSON_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertNotIn("anteil_einpersonenwohnungen_prozent", content)
        self.assertNotIn("anteilEinpersonenwohnungenProzent", content)
        self.assertNotIn("einpersonenwohnungen", content.lower())

    def test_06_metadata_file_valid_and_complete(self):
        """public/data/bevoelkerungsstatistik_metadaten.json muss alle Erläuterungen und Referenzwerte enthalten."""
        self.assertTrue(METADATA_JSON_PATH.exists())
        with open(METADATA_JSON_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertEqual(meta.get("schema_version"), "1.0")
        self.assertEqual(meta.get("datenstand"), "2023-10-31")
        self.assertIn("indikatordefinitionen", meta)
        self.assertIn("gewichtete_wien_gesamtwerte", meta)
        self.assertIn("amtliche_quellen", meta)

        ref = meta["gewichtete_wien_gesamtwerte"]
        self.assertAlmostEqual(ref["anteilUnter15Prozent"], 14.46, places=1)
        self.assertAlmostEqual(ref["anteilPensionsbezugProzent"], 17.66, places=1)
        self.assertAlmostEqual(ref["bevoelkerungsdichtePersonenJeHektar"], 48.16, places=1)
        self.assertAlmostEqual(ref["bevoelkerungsentwicklung2011Bis2023Prozent"], 16.55, places=1)

        # Fachliche Bezeichnung der Pensionsquote
        pension_def = next((i for i in meta["indikatordefinitionen"] if i["feld"] == "anteilPensionsbezugProzent"), None)
        self.assertIsNotNone(pension_def)
        self.assertIn("Pensionsbezug", pension_def.get("bezeichnung", ""))
        self.assertIn("nicht mit der altersgruppe", pension_def.get("beschreibung", "").lower())

    def test_07_export_script_idempotency(self):
        """Wiederholtes Ausführen des Export-Skripts erzeugt identische Dateiinhalte."""
        from scripts.export_db_to_json import export_database

        # Aktueller Hash
        hasher1 = hashlib.sha256()
        with open(EXPORT_JSON_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher1.update(chunk)
        h1 = hasher1.hexdigest()

        # Re-Export
        export_database()

        hasher2 = hashlib.sha256()
        with open(EXPORT_JSON_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher2.update(chunk)
        h2 = hasher2.hexdigest()

        self.assertEqual(h1, h2)

    def test_08_filter_matching_logic(self):
        """Simulation der exakten Filterlogik auf Indikatorebene für das Frontend."""
        # Dichte: LOW (< 50), MEDIUM (50 bis < 100), HIGH (100 bis < 200), VERY_HIGH (>= 200)
        def match_dichte(d, f):
            if f == 'ALL': return True
            if d is None: return False
            if f == 'LOW': return d < 50.0
            if f == 'MEDIUM': return 50.0 <= d < 100.0
            if f == 'HIGH': return 100.0 <= d < 200.0
            if f == 'VERY_HIGH': return d >= 200.0
            return False

        # Entwicklung: RUECKLAEUFIG (< 0), STABIL (0 bis < 5), WACHSEND (5 bis < 20), STARK_WACHSEND (>= 20)
        def match_entwicklung(e, f):
            if f == 'ALL': return True
            if e is None: return False
            if f == 'RUECKLAEUFIG': return e < 0.0
            if f == 'STABIL': return 0.0 <= e < 5.0
            if f == 'WACHSEND': return 5.0 <= e < 20.0
            if f == 'STARK_WACHSEND': return e >= 20.0
            return False

        # Pensionsbezug: UNDER_15 (< 15), 15_TO_20 (15 bis < 20), 20_TO_25 (20 bis < 25), OVER_25 (>= 25)
        def match_pensionsbezug(p, f):
            if f == 'ALL': return True
            if p is None: return False
            if f == 'UNDER_15': return p < 15.0
            if f == '15_TO_20': return 15.0 <= p < 20.0
            if f == '20_TO_25': return 20.0 <= p < 25.0
            if f == 'OVER_25': return p >= 25.0
            return False

        # 1. Grenzwerttests Dichte
        dichte_cats = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']
        dichte_tests = [
            (49.999, 'LOW'),
            (50.0, 'MEDIUM'),
            (99.999, 'MEDIUM'),
            (100.0, 'HIGH'),
            (199.999, 'HIGH'),
            (200.0, 'VERY_HIGH'),
            (None, None),
        ]
        for val, expected_cat in dichte_tests:
            matched = [c for c in dichte_cats if match_dichte(val, c)]
            if expected_cat is None:
                self.assertEqual(matched, [], f"NULL bei Dichte darf keine konkrete Kategorie matchen: {matched}")
                self.assertTrue(match_dichte(val, 'ALL'), "NULL bei Dichte muss bei ALL sichtbar bleiben")
            else:
                self.assertEqual(matched, [expected_cat], f"Dichte {val} muss exakt [{expected_cat}] matchen, matchte aber {matched}")
                self.assertTrue(match_dichte(val, 'ALL'))

        # 2. Grenzwerttests Entwicklung
        entwicklung_cats = ['RUECKLAEUFIG', 'STABIL', 'WACHSEND', 'STARK_WACHSEND']
        entwicklung_tests = [
            (-0.001, 'RUECKLAEUFIG'),
            (0.0, 'STABIL'),
            (4.999, 'STABIL'),
            (5.0, 'WACHSEND'),
            (19.999, 'WACHSEND'),
            (20.0, 'STARK_WACHSEND'),
            (None, None),
        ]
        for val, expected_cat in entwicklung_tests:
            matched = [c for c in entwicklung_cats if match_entwicklung(val, c)]
            if expected_cat is None:
                self.assertEqual(matched, [], f"NULL bei Entwicklung darf keine konkrete Kategorie matchen: {matched}")
                self.assertTrue(match_entwicklung(val, 'ALL'), "NULL bei Entwicklung muss bei ALL sichtbar bleiben")
            else:
                self.assertEqual(matched, [expected_cat], f"Entwicklung {val} muss exakt [{expected_cat}] matchen, matchte aber {matched}")
                self.assertTrue(match_entwicklung(val, 'ALL'))

        # 3. Grenzwerttests Pensionsbezug
        pension_cats = ['UNDER_15', '15_TO_20', '20_TO_25', 'OVER_25']
        pension_tests = [
            (14.999, 'UNDER_15'),
            (15.0, '15_TO_20'),
            (19.999, '15_TO_20'),
            (20.0, '20_TO_25'),
            (24.999, '20_TO_25'),
            (25.0, 'OVER_25'),
            (None, None),
        ]
        for val, expected_cat in pension_tests:
            matched = [c for c in pension_cats if match_pensionsbezug(val, c)]
            if expected_cat is None:
                self.assertEqual(matched, [], f"NULL bei Pensionsbezug darf keine konkrete Kategorie matchen: {matched}")
                self.assertTrue(match_pensionsbezug(val, 'ALL'), "NULL bei Pensionsbezug muss bei ALL sichtbar bleiben")
            else:
                self.assertEqual(matched, [expected_cat], f"Pensionsbezug {val} muss exakt [{expected_cat}] matchen, matchte aber {matched}")
                self.assertTrue(match_pensionsbezug(val, 'ALL'))


if __name__ == "__main__":
    unittest.main()

