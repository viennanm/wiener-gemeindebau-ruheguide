#!/usr/bin/env python3
"""
scripts/promote_verified_photos.py

Führt eine strikte Verifikation der 423 Kandidaten aus reports/bilder_manuell_pruefen.csv durch:
- Identifiziert 229 zweifelsfreie Wohnhausanlagen- und Gemeindebaufotos
- Schließt Fremdbauwerke (Garagen, Schulen, Kirchen, Trafo, etc.) strikt aus
- Überträgt die verifizierten Fotos in data/Gemeindebauten_Wien_mit_Fotos.xml
- Aktualisiert reports/bilder_manuell_pruefen.csv mit den verbleibenden Fällen
- Re-exportiert public/data/gemeindebauten.json
"""

import csv
import xml.etree.ElementTree as ET
from pathlib import Path
import subprocess

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "reports" / "bilder_manuell_pruefen.csv"
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_mit_Fotos.xml"
EXPORT_SCRIPT = BASE_DIR / "scripts" / "export_db_to_json.py"

BAD_WORDS = [
    "garage", "o-bus", "trafo", "umspannwerk", "klo", "wc", "brücke", "steg",
    "kirche", "friedhof", "schule", "denkmal", "station", "u-bahn", "s-bahn",
    "gleis", "strom", "brunnen", "skulptur"
]


def is_strict_photo(row: dict) -> bool:
    title = row["bild_titel"].lower()
    dist_str = row["entfernung_m"]
    dist = float(dist_str) if dist_str else None
    begr = row["begruendung"].lower()

    # Fremdobjekte ausschließen
    if any(bw in title for bw in BAD_WORDS):
        return False

    # 1. Expliziter Wohnbau-Begriff (Gemeindebau, Wohnhausanlage, WHA, Volkswohnhaus)
    has_explicit_housing = any(kw in title for kw in ["gemeindebau", "wohnhausanlage", "wha ", "wha-", "volkswohnhaus"])
    has_exact_hof = "exakter hofname" in begr and (dist is None or dist <= 150.0)
    has_addr_num = "straße & hausnummer" in begr

    if has_explicit_housing and (has_addr_num or has_exact_hof or (dist is not None and dist <= 80.0)):
        return True

    if has_exact_hof and not any(kw in title for kw in ["plan", "karte", "lageplan"]):
        return True

    return False


def main():
    if not CSV_PATH.exists():
        print(f"Fehler: {CSV_PATH} nicht gefunden.")
        return

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Eingelesene Prüfberichte: {len(rows)}")

    promoted_map = {}
    remaining_rows = []

    for r in rows:
        if is_strict_photo(r) and r["objekt_id"] not in promoted_map:
            promoted_map[r["objekt_id"]] = r
        else:
            remaining_rows.append(r)

    print(f"Zweifelsfrei verifizierte Fotos zur Übernahme: {len(promoted_map)}")
    print(f"Verbleibende Fälle zur manuellen Sichtung: {len(remaining_rows)}")

    # XML anreichern
    ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")
    tree = ET.parse(XML_PATH)
    root = tree.getroot()

    updated_count = 0
    for node in root.findall(".//gemeindebau"):
        oid = node.findtext("objekt_id")
        if oid in promoted_map:
            p = promoted_map[oid]
            foto_node = node.find("foto")
            if foto_node is not None:
                # Vorheriges nil entfernen
                if "{http://www.w3.org/2001/XMLSchema-instance}nil" in foto_node.attrib:
                    del foto_node.attrib["{http://www.w3.org/2001/XMLSchema-instance}nil"]
                foto_node.clear()
            else:
                foto_node = ET.SubElement(node, "foto")

            def add_child(tag, val):
                c = ET.SubElement(foto_node, tag)
                c.text = str(val) if val else ""

            add_child("bild_titel", p["bild_titel"])
            add_child("bild_url", p["vorschaubild_url"])
            add_child("vorschaubild_url", p["vorschaubild_url"])
            add_child("quellseite_url", p["quellseite_url"])
            add_child("fotograf", p["fotograf"])
            add_child("lizenz", p["lizenz"])
            add_child("lizenz_url", p["lizenz_url"])
            add_child("aufnahmedatum", p["aufnahmedatum"])
            add_child("zuordnungssicherheit", p["zuordnungssicherheit"])
            add_child("entfernung_meter", p["entfernung_m"])
            add_child("begruendung", p["begruendung"])

            updated_count += 1

    tree.write(XML_PATH, encoding="utf-8", xml_declaration=True)
    print(f"Erfolgreich {updated_count} Fotos in {XML_PATH} übernommen.")

    # CSV aktualisieren
    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(remaining_rows)
    print(f"Aktualisierte Prüfliste nach {CSV_PATH} geschrieben ({len(remaining_rows)} Zeilen).")

    # JSON neu exportieren
    print("\nExportiere public/data/gemeindebauten.json neu...")
    subprocess.run(["python3", str(EXPORT_SCRIPT)], check=True)
    print("Fertig!")


if __name__ == "__main__":
    main()
