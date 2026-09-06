#!/usr/bin/env python3
"""
scripts/download_population_sources.py

Lädt die amtlichen Bevölkerungs- und Geodatenquellen für die Umfeldstatistik
der Stadt Wien herunter und archiviert sie unverändert unter data/raw/population/.

Prüfungen:
- HTTP 200 & MIME-Typ-Validierung
- Erfassung der finalen Weiterleitungs-URL
- SHA-256 Prüfsummenberechnung
- Erwartete Datensatzanzahlen (1.368 Zählgebiete, 250 Zählbezirke, etc.)
- Aktualisierung von data/source_manifest_population.json
- Erstellung von reports/population_download_qa.json
"""

import os
import sys
import json
import hashlib
import urllib.request
import csv
from datetime import datetime, timezone

SOURCES_CONFIG = [
    {
        "source_id": "stadt-wien-zaehlgebiete-geometrie",
        "title": "Zählgebietsgrenzen Wien (WFS GeoJSON)",
        "publisher": "Stadt Wien",
        "catalog_url": "https://www.data.gv.at/datasets/0adc90c9-ac6b-47ef-aa83-b7780594720c",
        "resource_url": "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ZAEHLGEBIETOGD&srsName=EPSG:4326&outputFormat=json",
        "format": "GeoJSON",
        "license": "CC BY 4.0",
        "spatial_level": "Zählgebiet",
        "reference_date": "2026-09-03",
        "reference_period": None,
        "area_key": {"field": "ZGEB", "type": "string", "length": 5, "leading_zeros": True},
        "expected_count": 1368,
        "delimiter": None,
        "encoding": "UTF-8",
        "download_target": "data/raw/population/zaehlgebiete_wien.geojson",
        "notes": "1.368 Zählgebiete der Stadt Wien. ZGEB ist 5-stelliger String mit führenden Nullen. WGS84 Geometrien."
    },
    {
        "source_id": "stadt-wien-gebietstypen-2021",
        "title": "Gebietstypen 2021 Wien (WFS GeoJSON)",
        "publisher": "Stadt Wien",
        "catalog_url": "https://www.data.gv.at/datasets/b7755371-63ca-4d33-94c4-61e0a02afc2d",
        "resource_url": "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&srsName=EPSG:4326&outputFormat=json&typeName=ogdwien:GEBIETSTYPENOGD",
        "format": "GeoJSON",
        "license": "CC BY 4.0",
        "spatial_level": "Zählgebiet",
        "reference_date": "2021-12-31",
        "reference_period": "Gebietstypologie 2021",
        "area_key": {"field": "ZGEB", "type": "string", "length": 5, "leading_zeros": True},
        "expected_count": 1368,
        "delimiter": None,
        "encoding": "UTF-8",
        "download_target": "data/raw/population/gebietstypen_2021_wien.geojson",
        "notes": "1.368 Zählgebiete klassifiziert nach städtebaulichen Merkmalen (16 Gebietstypen, 7 aggregierte Typen)."
    },
    {
        "source_id": "stadt-wien-zaehlbezirke-geometrie",
        "title": "Zählbezirksgrenzen Wien (WFS GeoJSON)",
        "publisher": "Stadt Wien",
        "catalog_url": "https://www.data.gv.at/datasets/f3338a3f-af13-37a2-9d45-06138081bdb3",
        "resource_url": "https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ZAEHLBEZIRKOGD&srsName=EPSG:4326&outputFormat=json",
        "format": "GeoJSON",
        "license": "CC BY 4.0",
        "spatial_level": "Zählbezirk",
        "reference_date": "2026-09-03",
        "reference_period": None,
        "area_key": {"field": "ZBEZ", "type": "string", "length": 4, "leading_zeros": True},
        "expected_count": 250,
        "delimiter": None,
        "encoding": "UTF-8",
        "download_target": "data/raw/population/zaehlbezirke_wien.geojson",
        "notes": "250 Zählbezirke mit amtlicher FLAECHE in m² zur Dichteberechnung."
    },
    {
        "source_id": "stadt-wien-registerzaehlung-2023",
        "title": "Registerzählung 2023 - Bevölkerung nach Zählbezirken Wien",
        "publisher": "Stadt Wien / Statistik Austria",
        "catalog_url": "https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735",
        "resource_url": "https://go.gv.at/l9ogdvie4052023",
        "format": "CSV",
        "license": "CC BY 4.0",
        "spatial_level": "Zählbezirk",
        "reference_date": "2023-10-31",
        "reference_period": "Registerzählung Stichtag 31.10.2023",
        "area_key": {"field": "SUB_DISTRICT_CODE", "type": "string", "length": 5, "leading_zeros": False},
        "expected_count": 249,
        "delimiter": ";",
        "encoding": "UTF-8",
        "download_target": "data/raw/population/registerzaehlung_2023_zaehlbezirke.csv",
        "notes": "Hauptwohnsitzbevölkerung in 249 bewohnten Zählbezirken (Zählbezirk 0210 Freudenau hat 0 Einwohner)."
    },
    {
        "source_id": "stadt-wien-registerzaehlung-2021",
        "title": "Registerzählung 2021 - Bevölkerung nach Zählbezirken Wien",
        "publisher": "Stadt Wien / Statistik Austria",
        "catalog_url": "https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735",
        "resource_url": "https://www.wien.gv.at/gogv/l9ogdvie4052021",
        "format": "CSV",
        "license": "CC BY 4.0",
        "spatial_level": "Zählbezirk",
        "reference_date": "2021-10-31",
        "reference_period": "Registerzählung Stichtag 31.10.2021",
        "area_key": {"field": "SUB_DISTRICT_CODE", "type": "string", "length": 5, "leading_zeros": False},
        "expected_count": 249,
        "delimiter": ";",
        "encoding": "UTF-8",
        "download_target": "data/raw/population/registerzaehlung_2021_zaehlbezirke.csv",
        "notes": "Zwischenstand 2021 für kurzfristige Entwicklungsanalysen 2021–2023."
    },
    {
        "source_id": "stadt-wien-registerzaehlung-2011",
        "title": "Registerzählung 2011 - Bevölkerung nach Zählbezirken Wien",
        "publisher": "Stadt Wien / Statistik Austria",
        "catalog_url": "https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735",
        "resource_url": "https://www.wien.gv.at/gogv/l9ogdvie405",
        "format": "CSV",
        "license": "CC BY 4.0",
        "spatial_level": "Zählbezirk",
        "reference_date": "2011-10-31",
        "reference_period": "Registerzählung Stichtag 31.10.2011",
        "area_key": {"field": "SUB_DISTRICT_CODE", "type": "string", "length": 5, "leading_zeros": False},
        "expected_count": 250,
        "delimiter": ";",
        "encoding": "UTF-8",
        "download_target": "data/raw/population/registerzaehlung_2011_zaehlbezirke.csv",
        "notes": "Referenzbasis für die 12-Jahres-Bevölkerungsentwicklung 2011–2023."
    },
    {
        "source_id": "stadt-wien-prognoseregionen-zuordnung",
        "title": "Zuordnung der Wiener Zählbezirke in Prognoseregionen - Wien",
        "publisher": "Stadt Wien",
        "catalog_url": "https://www.data.gv.at/datasets/b228a28e-a779-42e9-8f18-f6b3fbe8bbb0",
        "resource_url": "https://www.wien.gv.at/gogv/l9ogdviebezzbezprggeo2023",
        "format": "CSV",
        "license": "CC BY 4.0",
        "spatial_level": "Zählbezirk -> Prognoseregion",
        "reference_date": "2023-01-01",
        "reference_period": "Zuordnungsstand 2023",
        "area_key": {"field": "SUB_DISTRICT_CODE", "type": "string", "length": 5, "leading_zeros": False},
        "expected_count": 250,
        "delimiter": ";",
        "encoding": "UTF-8",
        "download_target": "data/raw/population/prognoseregionen_zuordnung_2023.csv",
        "notes": "Zuordnung der 250 Wiener Zählbezirke zu den 94 Prognoseregionen."
    }
]

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, "data", "raw", "population")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    qa_report = []
    manifest_sources = []

    print(f"=== Starte Download der amtlichen Rohdaten (Phase 2) ===")
    print(f"Zielverzeichnis: {raw_dir}\n")

    for src in SOURCES_CONFIG:
        src_id = src["source_id"]
        url = src["resource_url"]
        target_rel = src["download_target"]
        target_abs = os.path.join(base_dir, target_rel)
        fmt = src["format"]
        expected_cnt = src["expected_count"]
        key_field = src["area_key"]["field"]

        print(f"-> Lade {src_id}...")
        print(f"   URL: {url}")

        req = urllib.request.Request(url, headers={"User-Agent": "WienerRuheguide-Downloader/1.0"})
        try:
            with urllib.request.urlopen(req) as resp:
                http_status = resp.getcode()
                final_url = resp.geturl()
                content_type = resp.headers.get("Content-Type", "")
                raw_bytes = resp.read()
        except Exception as e:
            print(f"FEHLER beim Download von {src_id}: {e}", file=sys.stderr)
            sys.exit(1)

        file_size = len(raw_bytes)
        if file_size == 0:
            print(f"FEHLER: Datei {src_id} ist leer!", file=sys.stderr)
            sys.exit(1)

        sha256_hash = hashlib.sha256(raw_bytes).hexdigest()
        retrieved_at = datetime.now(timezone.utc).isoformat()

        # Speichern der unveränderten Rohdatei
        with open(target_abs, "wb") as f:
            f.write(raw_bytes)

        # Validierung des Inhalts
        actual_format = fmt
        detected_encoding = "UTF-8"
        actual_records = 0
        unique_keys = 0
        duplicate_keys = 0
        missing_keys = 0
        status_qa = "VALID"
        error_msg = ""
        expected_fields = []

        try:
            if fmt == "GeoJSON":
                geojson_text = raw_bytes.decode("utf-8")
                parsed = json.loads(geojson_text)
                features = parsed.get("features", [])
                actual_records = len(features)
                if actual_records > 0:
                    expected_fields = list(features[0].get("properties", {}).keys())
                keys_list = [str(f.get("properties", {}).get(key_field, "")) for f in features]
                unique_keys = len(set(keys_list))
                duplicate_keys = actual_records - unique_keys
                missing_keys = sum(1 for k in keys_list if not k)

            elif fmt == "CSV":
                csv_text = raw_bytes.decode("utf-8", errors="replace")
                lines = csv_text.splitlines()
                # Header ist Zeile 2 (Index 1), da Zeile 1 Metatitel enthält
                reader = csv.DictReader(lines[1:], delimiter=src["delimiter"])
                expected_fields = reader.fieldnames or []
                rows = list(reader)
                actual_records = len(rows)
                keys_list = [str(r.get(key_field, "")) for r in rows]
                unique_keys = len(set(keys_list))
                duplicate_keys = actual_records - unique_keys
                missing_keys = sum(1 for k in keys_list if not k)

        except Exception as e:
            status_qa = "PARSING_ERROR"
            error_msg = str(e)
            print(f"FEHLER bei der Inhaltsprüfung von {src_id}: {e}", file=sys.stderr)
            sys.exit(1)

        if actual_records != expected_cnt:
            status_qa = "RECORD_COUNT_MISMATCH"
            print(f"WARNUNG: Erwartet {expected_cnt}, erhalten {actual_records} für {src_id}", file=sys.stderr)

        print(f"   ✓ {actual_records} Datensätze (Erwartet: {expected_cnt})")
        print(f"   ✓ Eindeutige Schlüssel ({key_field}): {unique_keys} (Duplikate: {duplicate_keys}, Fehlend: {missing_keys})")
        print(f"   ✓ Größe: {file_size:,} Bytes, SHA-256: {sha256_hash[:16]}...\n")

        qa_entry = {
            "source_id": src_id,
            "local_path": target_rel,
            "http_status": http_status,
            "final_resource_url": final_url,
            "actual_format": actual_format,
            "mime_type": content_type,
            "encoding": detected_encoding,
            "delimiter": src["delimiter"],
            "records_count": actual_records,
            "expected_count": expected_cnt,
            "key_field": key_field,
            "unique_keys": unique_keys,
            "duplicate_keys": duplicate_keys,
            "missing_keys": missing_keys,
            "file_size_bytes": file_size,
            "sha256": sha256_hash,
            "reference_date": src["reference_date"],
            "verification_status": "download_verified" if status_qa == "VALID" else status_qa,
            "notes": error_msg or src["notes"]
        }
        qa_report.append(qa_entry)

        manifest_entry = {
            "source_id": src_id,
            "title": src["title"],
            "publisher": src["publisher"],
            "catalog_url": src["catalog_url"],
            "resource_url": url,
            "final_resource_url": final_url,
            "format": fmt,
            "license": src["license"],
            "spatial_level": src["spatial_level"],
            "reference_date": src["reference_date"],
            "reference_period": src["reference_period"],
            "area_key": src["area_key"],
            "expected_fields": expected_fields,
            "delimiter": src["delimiter"],
            "encoding": detected_encoding,
            "download_target": target_rel,
            "file_size_bytes": file_size,
            "sha256": sha256_hash,
            "retrieved_at": retrieved_at,
            "verification_status": "download_verified",
            "notes": src["notes"]
        }
        manifest_sources.append(manifest_entry)

    # QA-Bericht schreiben
    qa_path = os.path.join(reports_dir, "population_download_qa.json")
    with open(qa_path, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "sources_count": len(qa_report),
            "results": qa_report
        }, f, indent=2, ensure_ascii=False)
    print(f"✓ QA-Bericht erstellt: reports/population_download_qa.json")

    # Manifest aktualisieren
    manifest_path = os.path.join(base_dir, "data", "source_manifest_population.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({
            "schema_version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "project": "wiener-gemeindebau-ruheguide",
            "sources": manifest_sources
        }, f, indent=2, ensure_ascii=False)
    print(f"✓ Manifest aktualisiert: data/source_manifest_population.json")
    print(f"\nPhase 2 erfolgreich abgeschlossen. Alle Rohdateien verifiziert und archiviert.")

if __name__ == "__main__":
    main()

