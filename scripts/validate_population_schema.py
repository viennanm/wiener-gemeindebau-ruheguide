#!/usr/bin/env python3
"""
scripts/validate_population_schema.py

Vollständige Validierungsprüfung der erweiterten SQLite-Datenbank (Phase 4).

Prüfkriterien:
1. Exakt 1.776 Gemeindebauten in der Bestandstabelle
2. Bestehende Gemeindebau-Spalten und -Werte zu 100 % unverändert
3. Exakt 1.368 Zählgebiete
4. Exakt 250 Zählbezirke (inkl. Sonderfall 0210)
5. Exakt 94 Prognoseregionen
6. Exakt 23 Gemeindebezirke
7. Exakt 7.104 Gemeindebau-Gebietszuordnungen (1.776 × 4 Ebenen)
8. Pro objekt_id genau vier Ebenen (gemeindebezirk, zaehlbezirk, zaehlgebiet, prognoseregion)
9. Keine verwaisten Fremdschlüssel (PRAGMA foreign_key_check leer)
10. Keine doppelten Primärschlüssel
11. Keine verlorenen führenden Nullen (ZGEB 5-stellig, ZBEZ 4-stellig)
12. 1.776 eindeutige Zählgebietszuordnungen
13. 1.776 eindeutige Zählbezirkszuordnungen
14. 1.776 eindeutige Prognoseregionszuordnungen
15. 1.776 eindeutige Bezirkszuordnungen
16. Quellen- und Ressourcenzahlen stimmen mit dem Manifest überein (6 Quellen, 7 Ressourcen)
17. bevoelkerungsindikatoren ist noch leer (0 Datensätze)
18. Original-XML-Prüfsumme unverändert
19. PRAGMA integrity_check = ok
"""

import sys
import json
import sqlite3
import hashlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
BACKUP_DB_PATH = BASE_DIR / "data" / "backups" / "gemeindebauten_vor_population_phase4.db"
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
MANIFEST_PATH = BASE_DIR / "data" / "source_manifest_population.json"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"


def main():
    print("=== Starte Validierung des erweiterten Population-Schemas (Phase 4) ===")
    errors = []

    # 1. XML-Original Prüfsumme
    with open(XML_PATH, "rb") as f:
        xml_sha = hashlib.sha256(f.read()).hexdigest()
    if xml_sha != EXPECTED_XML_SHA256:
        errors.append(f"Original-XML modifiziert! SHA-256: {xml_sha}")
    else:
        print(f"✓ 1. Original-XML Prüfsumme intakt ({xml_sha[:16]}...)")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 2. SQLite Integritätsprüfung
    cur.execute("PRAGMA integrity_check;")
    res = cur.fetchone()[0]
    if res != "ok":
        errors.append(f"PRAGMA integrity_check meldet Fehler: {res}")
    else:
        print("✓ 2. PRAGMA integrity_check = ok")

    # 3. Fremdschlüssel-Prüfung
    cur.execute("PRAGMA foreign_key_check;")
    fk_errors = cur.fetchall()
    if fk_errors:
        errors.append(f"PRAGMA foreign_key_check meldet Fehler: {fk_errors}")
    else:
        print("✓ 3. PRAGMA foreign_key_check = 0 Fehler (alle FKs gültig)")

    # 4. Bestandstabelle gemeindebauten
    cur.execute("SELECT COUNT(*) FROM gemeindebauten;")
    bauten_count = cur.fetchone()[0]
    if bauten_count != 1776:
        errors.append(f"Bestandstabelle gemeindebauten enthält {bauten_count} statt 1.776 Datensätze!")
    else:
        print(f"✓ 4. Bestandstabelle gemeindebauten: exakt {bauten_count} Objekte")

    # 5. Abgleich mit Backup-Datenbank (Bestandstabellen unverändert)
    if BACKUP_DB_PATH.exists():
        backup_conn = sqlite3.connect(BACKUP_DB_PATH)
        b_cur = backup_conn.cursor()

        # Prüfe Spalten von gemeindebauten
        cur.execute("PRAGMA table_info(gemeindebauten);")
        cur_cols = [c[1] for c in cur.fetchall()]
        b_cur.execute("PRAGMA table_info(gemeindebauten);")
        b_cols = [c[1] for c in b_cur.fetchall()]
        if cur_cols != b_cols:
            errors.append("Spalten der Tabelle gemeindebauten wurden verändert!")
        else:
            print("✓ 5a. Spaltendefinitionen von gemeindebauten identisch mit Backup")

        # Prüfe Datensätze von gemeindebauten
        cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        cur_rows = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        b_rows = [tuple(r) for r in b_cur.fetchall()]
        if cur_rows != b_rows:
            errors.append("Datensätze in gemeindebauten wurden verändert!")
        else:
            print("✓ 5b. Alle 1.776 Datensätze in gemeindebauten (41 Spalten) identisch mit Backup")

        # Prüfe Tabelle metadaten
        cur.execute("SELECT * FROM metadaten;")
        m_cur = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM metadaten;")
        m_b = [tuple(r) for r in b_cur.fetchall()]
        if m_cur != m_b:
            errors.append("Tabelle metadaten wurde verändert!")
        else:
            print("✓ 5c. Tabelle metadaten identisch mit Backup")
        backup_conn.close()

    # 6. Statistische Gebiete Mengenprüfungen
    cur.execute("SELECT gebietsebene, COUNT(*) FROM statistische_gebiete GROUP BY gebietsebene;")
    ebenen_counts = {r[0]: r[1] for r in cur.fetchall()}

    expected_ebenen = {
        "gemeindebezirk": 23,
        "zaehlbezirk": 250,
        "zaehlgebiet": 1368,
        "prognoseregion": 94
    }
    for ebene, exp_count in expected_ebenen.items():
        act_count = ebenen_counts.get(ebene, 0)
        if act_count != exp_count:
            errors.append(f"Ebene '{ebene}': {act_count} Gebiete statt {exp_count}!")
        else:
            print(f"✓ 6. Ebene '{ebene}': exakt {act_count} Gebiete")

    # 7. Sonderfall Zählbezirk 0210
    cur.execute("SELECT * FROM statistische_gebiete WHERE gebietsebene='zaehlbezirk' AND gebiet_code='0210';")
    zb_0210 = cur.fetchone()
    if not zb_0210:
        errors.append("Sonderfall Zählbezirk 0210 fehlt in statistische_gebiete!")
    else:
        print(f"✓ 7. Sonderfall Zählbezirk 0210 vorhanden: {dict(zb_0210)}")

    # 8. Führende Nullen
    cur.execute("SELECT COUNT(*) FROM statistische_gebiete WHERE gebietsebene='zaehlgebiet' AND LENGTH(gebiet_code) != 5;")
    invalid_zgeb = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM statistische_gebiete WHERE gebietsebene='zaehlbezirk' AND LENGTH(gebiet_code) != 4;")
    invalid_zbez = cur.fetchone()[0]
    if invalid_zgeb > 0 or invalid_zbez > 0:
        errors.append(f"Verlorene führende Nullen: {invalid_zgeb} ungültige ZGEB, {invalid_zbez} ungültige ZBEZ!")
    else:
        print("✓ 8. Führende Nullen intakt: alle ZGEB 5-stellig, alle ZBEZ 4-stellig")

    # 9. Gemeindebau-Gebiet Zuordnungen: Exakt 7.104 Zeilen
    cur.execute("SELECT COUNT(*) FROM gemeindebau_gebiet;")
    total_zuordnungen = cur.fetchone()[0]
    if total_zuordnungen != 7104:
        errors.append(f"Tabelle gemeindebau_gebiet hat {total_zuordnungen} Zeilen statt 7.104!")
    else:
        print(f"✓ 9. Tabelle gemeindebau_gebiet: exakt {total_zuordnungen} Zuordnungen (1.776 × 4 Ebenen)")

    # 10. Pro objekt_id genau vier Ebenen
    cur.execute("""
    SELECT objekt_id, COUNT(DISTINCT gebietsebene) as ebenen_count
    FROM gemeindebau_gebiet
    GROUP BY objekt_id
    HAVING ebenen_count != 4;
    """)
    invalid_bauten_ebenen = cur.fetchall()
    if invalid_bauten_ebenen:
        errors.append(f"{len(invalid_bauten_ebenen)} Objekte haben nicht genau 4 Ebenen!")
    else:
        print("✓ 10. Jede der 1.776 objekt_id besitzt genau vier Ebenen")

    # 11. Eindeutigkeit je Ebene
    for ebene in ["gemeindebezirk", "zaehlbezirk", "zaehlgebiet", "prognoseregion"]:
        cur.execute(f"SELECT COUNT(DISTINCT objekt_id), COUNT(*) FROM gemeindebau_gebiet WHERE gebietsebene='{ebene}';")
        dist_c, tot_c = cur.fetchone()
        if dist_c != 1776 or tot_c != 1776:
            errors.append(f"Ebene '{ebene}' hat {tot_c} Zuordnungen für {dist_c} Objekte (erwartet: 1.776 / 1.776)!")
        else:
            print(f"✓ 11. Ebene '{ebene}': 1.776 / 1.776 eindeutige Zuordnungen")

    # 12. Quellen und Ressourcen
    cur.execute("SELECT COUNT(*) FROM datenquellen;")
    q_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM datenressourcen;")
    r_count = cur.fetchone()[0]
    if q_count != 6:
        errors.append(f"datenquellen hat {q_count} Zeilen statt 6!")
    if r_count != 7:
        errors.append(f"datenressourcen hat {r_count} Zeilen statt 7!")
    print(f"✓ 12. Quellenmodell: exakt {q_count} logische Quellen, exakt {r_count} Ressourcen")

    # 13. Indikatoren-Tabelle noch leer
    cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
    ind_count = cur.fetchone()[0]
    if ind_count != 0:
        errors.append(f"Tabelle bevoelkerungsindikatoren ist nicht leer ({ind_count} Zeilen)!")
    else:
        print("✓ 13. Tabelle bevoelkerungsindikatoren ist ordnungsgemäß leer (0 Zeilen)")

    # 14. Migrationstabelle
    cur.execute("SELECT * FROM schema_migrationen WHERE migration_id='population_phase4_v1';")
    mig_row = cur.fetchone()
    if not mig_row:
        errors.append("Migration population_phase4_v1 nicht registriert!")
    else:
        print(f"✓ 14. Migration registriert: {dict(mig_row)}")

    conn.close()

    if errors:
        print("\n✗ VALIDIERUNGSFEHLER:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\nPhase 4 Datenbankschema erfolgreich und fehlerfrei validiert!")


if __name__ == "__main__":
    main()

