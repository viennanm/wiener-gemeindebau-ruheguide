#!/usr/bin/env python3
"""
tests/test_statistical_area_assignment.py

Automatisierte Tests für die räumliche Point-in-Polygon-Zuordnung (Phase 3).
Prüft Datenintegrität, Schlüsselformate, führende Nullen, Bezirkskonsistenz,
QA-Berichte und die Unverändertheit des XML-Originals.
"""

import os
import csv
import json
import hashlib
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
STAGING_CSV_PATH = BASE_DIR / "data" / "staging" / "gemeindebau_statistische_zuordnung.csv"
QA_CSV_PATH = BASE_DIR / "reports" / "statistische_zuordnung_qa.csv"
SUMMARY_JSON_PATH = BASE_DIR / "reports" / "statistische_zuordnung_summary.json"

EXPECTED_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"
TOTAL_RECORDS = 1776


class TestStatisticalAreaAssignment(unittest.TestCase):
    """Testsuite für die räumliche Zuordnung der Wiener Gemeindebauten."""

    @classmethod
    def setUpClass(cls):
        # Lade Staging-CSV
        if not STAGING_CSV_PATH.exists():
            raise FileNotFoundError(f"Staging CSV fehlt: {STAGING_CSV_PATH}")
        with open(STAGING_CSV_PATH, "r", encoding="utf-8") as f:
            cls.staging_rows = list(csv.DictReader(f))

    def test_01_xml_original_unmodified(self):
        """Das XML-Original darf nicht verändert worden sein (SHA-256 Prüfsumme)."""
        self.assertTrue(XML_PATH.exists(), "XML-Datei existiert nicht.")
        hasher = hashlib.sha256()
        with open(XML_PATH, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        self.assertEqual(
            hasher.hexdigest(),
            EXPECTED_SHA256,
            "XML-Originaldatei wurde verändert!"
        )

    def test_02_staging_row_count(self):
        """Die Staging-CSV muss exakt 1.776 Datensätze enthalten."""
        self.assertEqual(
            len(self.staging_rows),
            TOTAL_RECORDS,
            f"Erwartet wurden {TOTAL_RECORDS} Zeilen, gefunden: {len(self.staging_rows)}"
        )

    def test_03_all_objekt_ids_unique_and_match_xml(self):
        """Alle 1.776 objekt_ids müssen eindeutig sein und exakt mit dem XML übereinstimmen."""
        staging_ids = [row["objekt_id"] for row in self.staging_rows]
        self.assertEqual(len(staging_ids), len(set(staging_ids)), "Doppelte objekt_id in Staging CSV gefunden!")

        # Abgleich mit XML
        tree = ET.parse(XML_PATH)
        xml_ids = set()
        for elem in tree.findall(".//gemeindebau"):
            oid = elem.attrib.get("objekt_id")
            if oid:
                xml_ids.add(oid.strip())
        self.assertEqual(len(xml_ids), TOTAL_RECORDS, f"XML enthält {len(xml_ids)} Objekte statt {TOTAL_RECORDS}")
        self.assertEqual(set(staging_ids), xml_ids, "Menge der objekt_ids stimmt nicht mit XML überein!")

    def test_04_key_formats_and_leading_zeros(self):
        """Prüft strikte String-Formate und führende Nullen für alle Gebietsschlüssel."""
        for row in self.staging_rows:
            oid = row["objekt_id"]
            zgeb = row["zaehlgebiet_code"]
            zbez = row["zaehlbezirk_code"]
            sub_dist = row["sub_district_code"]
            bez_code = row["gemeindebezirk_code"]
            prg = row["prognoseregion_code"]
            gtyp_code = row["gebietstyp_code"]

            # ZGEB: 5 Ziffern als String
            self.assertEqual(len(zgeb), 5, f"Objekt {oid}: ZGEB '{zgeb}' ist nicht 5 Zeichen lang")
            self.assertTrue(zgeb.isdigit(), f"Objekt {oid}: ZGEB '{zgeb}' ist nicht numerisch")

            # ZBEZ: 4 Ziffern als String
            self.assertEqual(len(zbez), 4, f"Objekt {oid}: ZBEZ '{zbez}' ist nicht 4 Zeichen lang")
            self.assertTrue(zbez.isdigit(), f"Objekt {oid}: ZBEZ '{zbez}' ist nicht numerisch")

            # Hierarchische Konsistenz: ZGEB beginnt mit ZBEZ
            self.assertEqual(zgeb[:4], zbez, f"Objekt {oid}: ZGEB '{zgeb}' passt nicht zu ZBEZ '{zbez}'")

            # SUB_DISTRICT_CODE: '9' + ZBEZ (5 Zeichen)
            self.assertEqual(sub_dist, f"9{zbez}", f"Objekt {oid}: sub_district_code '{sub_dist}' != '9{zbez}'")

            # Gemeindebezirk
            self.assertTrue(bez_code.isdigit(), f"Objekt {oid}: bezirk_code '{bez_code}' nicht numerisch")
            bez_int = int(bez_code)
            self.assertTrue(1 <= bez_int <= 23, f"Objekt {oid}: Ungültiger Bezirk '{bez_code}'")

            # Prognoseregion
            self.assertTrue(len(prg) >= 2, f"Objekt {oid}: Ungültige Prognoseregion '{prg}'")

            # Gebietstyp
            self.assertTrue(len(gtyp_code) >= 1, f"Objekt {oid}: Leerer gebietstyp_code")

    def test_05_spatial_consistency_and_quality(self):
        """Alle Datensätze müssen bezirks- und zählbezirkskonsistent sowie eindeutig sein."""
        for row in self.staging_rows:
            oid = row["objekt_id"]
            self.assertEqual(row["bezirk_konsistent"], "1", f"Objekt {oid}: Bezirkswiderspruch!")
            self.assertEqual(row["zaehlbezirk_konsistent"], "1", f"Objekt {oid}: Zählbezirkswiderspruch!")
            self.assertEqual(row["qualitaetsstatus"], "eindeutig_zugeordnet", f"Objekt {oid}: Status '{row['qualitaetsstatus']}'")
            self.assertEqual(row["grenzfall"], "0", f"Objekt {oid}: Ist unerwartet als Grenzfall markiert")
            self.assertEqual(row["anzahl_polygon_treffer"], "1", f"Objekt {oid}: Nicht genau 1 Treffer")

    def test_06_qa_reports(self):
        """QA-CSV darf keine Auffälligkeiten enthalten, Summary-JSON muss 100% Erfolgsquote belegen."""
        self.assertTrue(QA_CSV_PATH.exists(), "QA CSV existiert nicht")
        with open(QA_CSV_PATH, "r", encoding="utf-8") as f:
            qa_rows = list(csv.DictReader(f))
        self.assertEqual(len(qa_rows), 0, f"QA CSV enthält {len(qa_rows)} Auffälligkeiten (erwartet: 0)")

        self.assertTrue(SUMMARY_JSON_PATH.exists(), "Summary JSON existiert nicht")
        with open(SUMMARY_JSON_PATH, "r", encoding="utf-8") as f:
            summary = json.load(f)

        self.assertEqual(summary["gesamt_objekte"], TOTAL_RECORDS)
        self.assertEqual(summary["eindeutig_zugeordnet"], TOTAL_RECORDS)
        self.assertEqual(summary["grenzfaelle"], 0)
        self.assertEqual(summary["grenznahe_punkte_unter_1m"], 0)
        self.assertGreater(summary["mindestdistanz_grenze_meter"], 1.0)
        self.assertEqual(summary["mehrfachtreffer"], 0)
        self.assertEqual(summary["nicht_zugeordnet"], 0)
        self.assertEqual(summary["bezirkswidersprueche"], 0)
        self.assertEqual(summary["zaehlbezirkswidersprueche"], 0)
        self.assertEqual(summary["fehlende_prognoseregionen"], 0)
        self.assertEqual(summary["fehlende_gebietstypen"], 0)
        self.assertEqual(summary["ungueltige_koordinaten"], 0)

        # Amtliche Prognoseregionen-Validierung (exakt 94 Gesamt, 92 mit Gemeindebau)
        self.assertEqual(summary["gesamtzahl_prognoseregionen"], 94)
        self.assertEqual(summary["anzahl_prognoseregionen_mit_gemeindebau"], 92)
        self.assertEqual(summary["prognoseregionen_ohne_gemeindebau"], ["10A", "22C"])
        self.assertEqual(summary["prognoseregionen_abdeckungsquote_prozent"], 97.87)

        # Plausible Anzahlen statistischer Zonen
        self.assertEqual(summary["anzahl_zaehlgebiete_mit_gemeindebau"], 744)
        self.assertEqual(summary["anzahl_zaehlbezirke_mit_gemeindebau"], 208)

    def test_07_reproducibility_and_boundary_distances(self):
        """Prüft Reproduzierbarkeit, deterministische Sortierung und Grenzdistanzen >= 1.0 Meter."""
        min_distance = float("inf")
        for row in self.staging_rows:
            oid = row["objekt_id"]
            self.assertEqual(row["grenznah_unter_1m"], "0", f"Objekt {oid} liegt unerwartet < 1m an der Grenze")
            dist = float(row["grenzdistanz_meter"])
            self.assertGreaterEqual(dist, 1.0, f"Objekt {oid} hat Grenzdistanz {dist}m < 1.0m")
            if dist < min_distance:
                min_distance = dist

        # Das am nächsten an einer Grenze gelegene Gebäude (Objekt 18367 in Zählgebiet 03093) liegt in EPSG:31256 exakt 1.589 m entfernt
        self.assertAlmostEqual(min_distance, 1.589, places=2)


if __name__ == "__main__":
    unittest.main()

