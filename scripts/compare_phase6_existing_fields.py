#!/usr/bin/env python3
"""
scripts/compare_phase6_existing_fields.py

Vollständiger Feld-für-Feld-Vergleich der 1.776 Gemeindebauten zwischen:
- data/backups/phase6_pre/gemeindebauten.json (Vor-Phase-6-Stand)
- public/data/gemeindebauten.json (Aktueller Phase-6-Stand)

Erzeugt:
reports/phase6_existing_fields_comparison.json
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_PATH = BASE_DIR / "data" / "backups" / "phase6_pre" / "gemeindebauten.json"
CURRENT_PATH = BASE_DIR / "public" / "data" / "gemeindebauten.json"
OUTPUT_REPORT_PATH = BASE_DIR / "reports" / "phase6_existing_fields_comparison.json"


def compare_datasets():
    print(f"Lese Vor-Phase-6-Backup: {BACKUP_PATH}")
    with open(BACKUP_PATH, "r", encoding="utf-8") as f:
        backup_data = json.load(f)

    print(f"Lese aktuelles Frontend-JSON: {CURRENT_PATH}")
    with open(CURRENT_PATH, "r", encoding="utf-8") as f:
        current_data = json.load(f)

    backup_map = {b["id"]: b for b in backup_data}
    current_map = {b["id"]: b for b in current_data}

    total_objects = len(backup_data)
    identical_without_umfeld = 0
    deviating_objects = 0
    deviating_fields_set = set()

    ruhe_score_diffs = 0
    foto_url_diffs = 0
    foto_lizenz_diffs = 0
    laermwert_diffs = 0
    gruenwert_diffs = 0
    oeffi_diffs = 0
    hoehenwert_diffs = 0

    detailed_diffs = []

    for obj_id, b_obj in backup_map.items():
        if obj_id not in current_map:
            deviating_objects += 1
            deviating_fields_set.add("__missing_in_current__")
            detailed_diffs.append({"id": obj_id, "error": "Fehlt im aktuellen JSON"})
            continue

        c_obj = current_map[obj_id]

        # Alle Schlüssel aus b_obj prüfen
        b_keys = set(b_obj.keys())
        # Aus c_obj alle Schlüssel außer umfeldstatistik
        c_keys = {k for k in c_obj.keys() if k != "umfeldstatistik"}

        obj_has_diff = False

        if b_keys != c_keys:
            obj_has_diff = True
            diff_keys = b_keys.symmetric_difference(c_keys)
            for dk in diff_keys:
                deviating_fields_set.add(dk)
                detailed_diffs.append({"id": obj_id, "field": dk, "error": "Schlüssel-Inkonsistenz"})

        for k in b_keys:
            b_val = b_obj.get(k)
            c_val = c_obj.get(k)
            if b_val != c_val:
                obj_has_diff = True
                deviating_fields_set.add(k)
                detailed_diffs.append({
                    "id": obj_id,
                    "field": k,
                    "backup": b_val,
                    "current": c_val
                })

                # Kategorisierung
                if k == "ruheScore":
                    ruhe_score_diffs += 1
                if k in ("bildUrl", "fotoUrl"):
                    foto_url_diffs += 1
                if k in ("bildLizenz", "fotoLizenz"):
                    foto_lizenz_diffs += 1
                if k in ("laermPegelTag", "laermPegelNacht", "akustikDbInnenhof", "akustikDbStrasse"):
                    laermwert_diffs += 1
                if k == "gruenraumBeschreibung":
                    gruenwert_diffs += 1
                if k in ("bimBusDistanzMeter", "naechsteStation", "linien"):
                    oeffi_diffs += 1
                if k in ("hoehenmeter", "hoehenmeterMin", "hoehenmeterMax", "hoehenmeterSpanne", "gelaendeTyp", "topographieHinweis"):
                    hoehenwert_diffs += 1

        if not obj_has_diff:
            identical_without_umfeld += 1
        else:
            deviating_objects += 1

    report = {
        "gesamt_objekte": total_objects,
        "identische_objekte_ohne_umfeldstatistik": identical_without_umfeld,
        "abweichende_objekte": deviating_objects,
        "abweichende_felder": sorted(list(deviating_fields_set)),
        "ruhe_score_abweichungen": ruhe_score_diffs,
        "foto_url_abweichungen": foto_url_diffs,
        "foto_lizenz_abweichungen": foto_lizenz_diffs,
        "laermwert_abweichungen": laermwert_diffs,
        "gruenwert_abweichungen": gruenwert_diffs,
        "oeffi_abweichungen": oeffi_diffs,
        "hoehenwert_abweichungen": hoehenwert_diffs,
        "details": detailed_diffs
    }

    OUTPUT_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\nVergleichsergebnis geschrieben nach: {OUTPUT_REPORT_PATH}")
    print(f"  Gesamt-Objekte: {report['gesamt_objekte']}")
    print(f"  Identisch (ohne umfeldstatistik): {report['identische_objekte_ohne_umfeldstatistik']}")
    print(f"  Abweichende Objekte: {report['abweichende_objekte']}")
    print(f"  Abweichende Felder: {len(report['abweichende_felder'])}")
    print(f"  Ruhe-Score-Abweichungen: {report['ruhe_score_abweichungen']}")
    print(f"  Foto-URL-Abweichungen: {report['foto_url_abweichungen']}")
    print(f"  Lärmwert-Abweichungen: {report['laermwert_abweichungen']}")
    print(f"  Grünwert-Abweichungen: {report['gruenwert_abweichungen']}")
    print(f"  Öffi-Abweichungen: {report['oeffi_abweichungen']}")
    print(f"  Höhenwert-Abweichungen: {report['hoehenwert_abweichungen']}")

    return report


if __name__ == "__main__":
    compare_datasets()

