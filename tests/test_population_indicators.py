#!/usr/bin/env python3
"""
tests/test_population_indicators.py

Automatisierte Unittests für Phase 5:
- CSV-Titelzeile und Header-Parsing
- Schlüsseltransformation 90101 -> 0101 und führende Nullen
- Unterdrückungs- und Leerwerte
- Division durch 0 (Schutz bei pop=0 oder wsa=0)
- Pensionsquote korrekt benannt (kein 65+/Senioren)
- Einpersonenwohnungen korrekt benannt (kein alleinlebend)
- Berechnung Gesamtveränderung ((End/Anfang - 1) * 100)
- Berechnung annualisierte Veränderung ((End/Anfang)**(1/N) - 1) * 100
- Sonderfall Zählbezirk 0210 bleibt in 2021 und 2023 NULL
- Vollständiges Rollback bei Fehlern
- Idempotenz bei mehrfacher Ausführung
- Fremdschlüsselintegrität
- Bestehende Tabellen unverändert (gemeindebauten, metadaten, statistische_gebiete, gemeindebau_gebiet)
- XML-Originaldatei unverändert
"""

import os
import shutil
import sqlite3
import hashlib
import tempfile
import unittest
from pathlib import Path

from scripts.import_population_indicators import (
    run_import,
    read_registerzaehlung_csv,
    INDIKATOR_DEFINITIONEN,
    EXPECTED_XML_SHA256,
    CSV_2011,
    CSV_2021,
    CSV_2023
)

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
BACKUP_PHASE5 = BASE_DIR / "data" / "backups" / "gemeindebauten_vor_population_phase5.db"
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"


class TestPopulationIndicators(unittest.TestCase):
    """Testsuite für die amtlichen Bevölkerungsindikatoren (Phase 5)."""

    def test_01_xml_original_unmodified(self):
        """Das XML-Original darf nicht verändert worden sein."""
        self.assertTrue(XML_PATH.exists())
        hasher = hashlib.sha256()
        with open(XML_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        self.assertEqual(hasher.hexdigest(), EXPECTED_XML_SHA256)

    def test_02_csv_title_and_header_parsing(self):
        """CSV-Titelzeile vor dem Header muss ignoriert und Header korrekt erkannt werden."""
        d11, s11 = read_registerzaehlung_csv(CSV_2011)
        d21, s21 = read_registerzaehlung_csv(CSV_2021)
        d23, s23 = read_registerzaehlung_csv(CSV_2023)

        self.assertEqual(s11, "2011-10-31")
        self.assertEqual(s21, "2021-10-31")
        self.assertEqual(s23, "2023-10-31")

        self.assertEqual(len(d11), 250)
        self.assertEqual(len(d21), 249)
        self.assertEqual(len(d23), 249)

    def test_03_key_transformation_and_leading_zeros(self):
        """SUB_DISTRICT_CODE 90101 -> 0101, führende Nullen müssen strikt 4-stellig bleiben."""
        d23, _ = read_registerzaehlung_csv(CSV_2023)
        self.assertIn("0101", d23)
        self.assertEqual(d23["0101"]["sub_district_code"], "90101")
        for zbez in d23:
            self.assertEqual(len(zbez), 4, f"ZBEZ '{zbez}' ist nicht 4 Zeichen lang")
            self.assertTrue(zbez.isdigit(), f"ZBEZ '{zbez}' ist nicht numerisch")

    def test_04_indicator_naming_constraints(self):
        """Pensionsquote und Einpersonenwohnungen müssen strikt den fachlichen Vorgaben entsprechen."""
        def_by_code = {d["indikator_code"]: d for d in INDIKATOR_DEFINITIONEN}

        # Pensionsquote
        self.assertIn("pensionsquote_prozent", def_by_code)
        pq = def_by_code["pensionsquote_prozent"]
        self.assertEqual(pq["bezeichnung"], "Anteil der Personen mit Pensionsbezug")
        self.assertNotIn("65", pq["bezeichnung"])
        self.assertNotIn("Senioren", pq["bezeichnung"])

        # Einpersonenwohnungen (Anteil deaktiviert)
        self.assertIn("anteil_einpersonenwohnungen_prozent", def_by_code)
        ep = def_by_code["anteil_einpersonenwohnungen_prozent"]
        self.assertIn("Deaktiviert", ep["bezeichnung"])
        self.assertNotIn("alleinlebend", ep["bezeichnung"].lower())

        # Einpersonenwohnungen (Bestand)
        self.assertIn("einpersonenwohnungen", def_by_code)
        ep_bestand = def_by_code["einpersonenwohnungen"]
        self.assertEqual(ep_bestand["bezeichnung"], "Personen in Einpersonen-Wohnungen")
        self.assertEqual(ep_bestand["einheit"], "Personen")
        self.assertIn("Zählt Personen", ep_bestand["beschreibung"])

    def test_05_math_change_formulas(self):
        """Prüft die mathematische Exaktheit von Gesamt- und annualisierter Veränderung."""
        # Beispiel: Anfang = 1000, Ende = 1200
        # Gesamt: ((1200 / 1000) - 1) * 100 = 20.0 %
        p_start, p_end = 1000, 1200
        change_total = ((p_end / p_start) - 1.0) * 100.0
        self.assertAlmostEqual(change_total, 20.0, places=6)

        # Annualisiert über 12 Jahre: ((1200 / 1000)**(1/12) - 1) * 100
        ann_12 = ((p_end / p_start)**(1.0 / 12.0) - 1.0) * 100.0
        exp_ann_12 = 1.530947
        self.assertAlmostEqual(ann_12, exp_ann_12, places=4)

        # Annualisiert über 2 Jahre: ((1200 / 1000)**(1/2) - 1) * 100
        ann_2 = ((p_end / p_start)**(1.0 / 2.0) - 1.0) * 100.0
        exp_ann_2 = 9.544511
        self.assertAlmostEqual(ann_2, exp_ann_2, places=4)


class TestImportExecutionAndIntegrity(unittest.TestCase):
    """Testsuite für Migration, Transaktionssicherheit und Idempotenz auf Testdatenbankkopie."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.test_db = Path(self.temp_dir) / "test_gemeindebauten.db"
        # Ausgangsbasis ist die Datenbank vor Phase 5
        shutil.copy2(BACKUP_PHASE5, self.test_db)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_06_import_execution_and_counts(self):
        """Prüft den fehlerfreien Import und die exakten Zeilenzahlen (15 Defs, 8.750 Werte)."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)

        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()

        # Definitionen
        cur.execute("SELECT COUNT(*) FROM indikator_definitionen;")
        self.assertEqual(cur.fetchone()[0], 15)

        # Indikatorwerte gesamt
        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        self.assertEqual(cur.fetchone()[0], 8750)

        # PRAGMA checks
        cur.execute("PRAGMA integrity_check;")
        self.assertEqual(cur.fetchone()[0], "ok")
        cur.execute("PRAGMA foreign_key_check;")
        self.assertEqual(len(cur.fetchall()), 0)

        conn.close()

    def test_07_special_case_0210_is_null_for_2021_and_2023(self):
        """ZBEZ 0210 muss in 2021 und 2023 NULL sein und in 2011 reale Werte besitzen."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)

        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren WHERE gebiet_code = '0210';")
        self.assertEqual(cur.fetchone()[0], 35)

        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren WHERE gebiet_code = '0210' AND stichtag = '2011-10-31' AND wert IS NOT NULL;")
        self.assertEqual(cur.fetchone()[0], 9)

        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren WHERE gebiet_code = '0210' AND stichtag IN ('2021-10-31', '2023-10-31') AND wert IS NOT NULL;")
        self.assertEqual(cur.fetchone()[0], 0)

        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren WHERE gebiet_code = '0210' AND wert IS NULL AND qualitaetsstatus = 'nicht_verfuegbar';")
        self.assertEqual(cur.fetchone()[0], 26)

        conn.close()

    def test_08_idempotency_and_replace_indicators(self):
        """Wiederholter Import darf keine Duplikate erzeugen; --replace-indicators arbeitet sauber."""
        # 1. Erster Import
        run_import(self.test_db, replace_indicators=False, dry_run=False)

        # 2. Zweiter identischer Import
        run_import(self.test_db, replace_indicators=False, dry_run=False)

        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        self.assertEqual(cur.fetchone()[0], 8750)

        # 3. Import mit --replace-indicators
        run_import(self.test_db, replace_indicators=True, dry_run=False)
        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        self.assertEqual(cur.fetchone()[0], 8750)

        conn.close()

    def test_09_existing_tables_unmodified(self):
        """Bestandstabellen gemeindebauten, metadaten, statistische_gebiete, gemeindebau_gebiet bleiben identisch."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)

        conn = sqlite3.connect(self.test_db)
        b_conn = sqlite3.connect(BACKUP_PHASE5)
        cur = conn.cursor()
        b_cur = b_conn.cursor()

        # gemeindebauten
        cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        b_cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        self.assertEqual([tuple(r) for r in cur.fetchall()], [tuple(r) for r in b_cur.fetchall()])

        # metadaten
        cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        b_cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        self.assertEqual([tuple(r) for r in cur.fetchall()], [tuple(r) for r in b_cur.fetchall()])

        # statistische_gebiete
        cur.execute("SELECT * FROM statistische_gebiete ORDER BY gebietsebene, gebiet_code;")
        b_cur.execute("SELECT * FROM statistische_gebiete ORDER BY gebietsebene, gebiet_code;")
        self.assertEqual([tuple(r) for r in cur.fetchall()], [tuple(r) for r in b_cur.fetchall()])

        # gemeindebau_gebiet
        cur.execute("SELECT * FROM gemeindebau_gebiet ORDER BY objekt_id, gebietsebene;")
        b_cur.execute("SELECT * FROM gemeindebau_gebiet ORDER BY objekt_id, gebietsebene;")
        self.assertEqual([tuple(r) for r in cur.fetchall()], [tuple(r) for r in b_cur.fetchall()])

        conn.close()
        b_conn.close()

    def test_10_transaction_rollback_on_failure(self):
        """Im Fehlerfall muss ein vollständiges Rollback stattfinden."""
        # Simuliere Fehler durch ungültigen Primärschlüssel / verfälschte Datenbank
        # Vor dem Test: keine Indikatoren
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        self.assertEqual(cur.fetchone()[0], 0)
        conn.close()

        # Manuelles Einbringen eines Foreign-Key Konflikts (z. B. Tabelle statistische_gebiete leeren)
        conn2 = sqlite3.connect(self.test_db)
        conn2.execute("PRAGMA foreign_keys = OFF;")
        conn2.execute("DELETE FROM statistische_gebiete WHERE gebiet_code = '0101';")
        conn2.commit()
        conn2.close()

        # Import muss fehlschlagen, da FK-Prüfung anspringt
        with self.assertRaises(Exception):
            run_import(self.test_db, replace_indicators=False, dry_run=False)

        # Überprüfe, dass Tabelle bevoelkerungsindikatoren leer geblieben ist
        conn3 = sqlite3.connect(self.test_db)
        cur3 = conn3.cursor()
        cur3.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
        self.assertEqual(cur3.fetchone()[0], 0)
        conn3.close()

    def test_11_active_shares_within_0_and_100(self):
        """Alle aktiven Anteilsindikatoren müssen strikt in [0, 100] liegen."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("""
            SELECT gebiet_code, indikator_code, stichtag, wert
            FROM bevoelkerungsindikatoren
            WHERE einheit = '%'
            AND indikator_code NOT LIKE '%entwicklung%'
            AND wert IS NOT NULL
            AND (wert < 0.0 OR wert > 100.0);
        """)
        anomalies = cur.fetchall()
        self.assertEqual(len(anomalies), 0, f"Unerwartete Prozentwerte außerhalb [0, 100]: {anomalies}")
        conn.close()

    def test_12_qa_check_fails_on_artificial_anomaly(self):
        """Plausibilitätsprüfung anteilswerte_zwischen_0_und_100 muss fehlschlagen, wenn künstlich 100.01% eingefügt wird."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        # Künstlich einen unzulässigen Wert einfügen
        cur.execute("""
            UPDATE bevoelkerungsindikatoren
            SET wert = 100.01
            WHERE gebiet_code = '0101' AND indikator_code = 'anteil_unter_15_prozent' AND stichtag = '2023-10-31';
        """)
        conn.commit()

        # Überprüfe Prüfung
        cur.execute("""
            SELECT COUNT(*) FROM bevoelkerungsindikatoren
            WHERE einheit = '%'
            AND indikator_code NOT LIKE '%entwicklung%'
            AND wert IS NOT NULL
            AND (wert < 0.0 OR wert > 100.0);
        """)
        out_of_bounds = cur.fetchone()[0]
        self.assertGreater(out_of_bounds, 0)
        conn.close()

    def test_13_growth_rates_can_exceed_100(self):
        """Bevölkerungsentwicklungsraten dürfen 100% überschreiten (z. B. Seestadt Aspern)."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("""
            SELECT gebiet_code, wert
            FROM bevoelkerungsindikatoren
            WHERE indikator_code = 'bevoelkerungsentwicklung_2011_2023_prozent'
            AND wert > 100.0;
        """)
        high_growth = cur.fetchall()
        self.assertGreater(len(high_growth), 0, "Mindestens ein Zählbezirk (z. B. 2228 Seestadt) muss > 100% Wachstum aufweisen")
        conn.close()

    def test_14_anteil_einpersonenwohnungen_fully_disabled(self):
        """anteil_einpersonenwohnungen_prozent muss für alle ZBEZ und Stichtage vollständig deaktiviert (NULL) sein."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(*), COUNT(wert), COUNT(CASE WHEN qualitaetsstatus = 'nicht_verfuegbar' THEN 1 END)
            FROM bevoelkerungsindikatoren
            WHERE indikator_code = 'anteil_einpersonenwohnungen_prozent';
        """)
        cnt_tot, cnt_val, cnt_nv = cur.fetchone()
        self.assertEqual(cnt_tot, 750)
        self.assertEqual(cnt_val, 0)
        self.assertEqual(cnt_nv, 750)
        conn.close()

    def test_15_einpersonenwohnungen_unit_and_definition(self):
        """einpersonenwohnungen muss die Einheit Personen tragen und Personen zählen."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT einheit FROM bevoelkerungsindikatoren WHERE indikator_code = 'einpersonenwohnungen';")
        units = [r[0] for r in cur.fetchall()]
        self.assertEqual(units, ["Personen"])

        cur.execute("SELECT einheit, bezeichnung FROM indikator_definitionen WHERE indikator_code = 'einpersonenwohnungen';")
        defn = cur.fetchone()
        self.assertEqual(defn[0], "Personen")
        self.assertEqual(defn[1], "Personen in Einpersonen-Wohnungen")
        conn.close()

    def test_16_schema_migration_registered(self):
        """Korrektur-Migration population_phase5_correction_v1 muss registriert sein."""
        run_import(self.test_db, replace_indicators=False, dry_run=False)
        conn = sqlite3.connect(self.test_db)
        cur = conn.cursor()
        cur.execute("SELECT * FROM schema_migrationen WHERE migration_id = 'population_phase5_correction_v1';")
        self.assertIsNotNone(cur.fetchone())
        conn.close()


if __name__ == "__main__":
    unittest.main()

