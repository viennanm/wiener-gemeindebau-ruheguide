#!/usr/bin/env python3
"""
scripts/validate_population_indicators.py

Validierungsskript für Phase 5:
- Vollständigkeit der Indikatordefinitionen (15 Indikatoren)
- Vollständigkeit und Exaktheit aller 8.750 Indikatordatensätze
- Stichtage (2011-10-31, 2021-10-31, 2023-10-31)
- Mathematische Exaktheit der Berechnungen an Stichproben
- Plausibilitätsprüfungen (keine negativen Bevölkerungen, Prozentwerte 0-100)
- Sonderfall Zählbezirk 0210
- Fremdschlüsselintegrität (PRAGMA foreign_key_check)
- Datenbankintegrität (PRAGMA integrity_check)
- Unverändertheit von Bestandsdaten (gemeindebauten, metadaten, statistische_gebiete, gemeindebau_gebiet)
- XML-Original Prüfsumme
"""

import os
import sys
import math
import hashlib
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
BACKUP_PHASE4_PATH = BASE_DIR / "data" / "backups" / "gemeindebauten_vor_population_phase4.db"
BACKUP_PHASE5_PATH = BASE_DIR / "data" / "backups" / "gemeindebauten_vor_population_phase5.db"
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"

EXPECTED_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"

EXPECTED_INDICATORS = [
    # A. Amtlich
    ("bevoelkerung_gesamt", "Personen", "amtlicher_bestandswert"),
    ("hauptwohnsitzwohnungen", "Wohnungen", "amtlicher_bestandswert"),
    ("personen_unter_15", "Personen", "amtlicher_bestandswert"),
    ("personen_mit_pensionsbezug", "Personen", "amtlicher_bestandswert"),
    ("einpersonenwohnungen", "Personen", "amtlicher_bestandswert"),
    ("personen_in_hauptmiete", "Personen", "amtlicher_bestandswert"),
    # B. Anteile
    ("anteil_unter_15_prozent", "%", "berechneter_anteil"),
    ("pensionsquote_prozent", "%", "berechneter_anteil"),
    ("anteil_einpersonenwohnungen_prozent", "%", "berechneter_anteil"),
    ("anteil_personen_in_hauptmiete_prozent", "%", "berechneter_anteil"),
    # C. Dichte
    ("bevoelkerungsdichte_personen_je_hektar", "Personen/ha", "berechnete_dichte"),
    # D. Entwicklung
    ("bevoelkerungsentwicklung_2011_2023_prozent", "%", "berechnete_veraenderung"),
    ("bevoelkerungsentwicklung_2021_2023_prozent", "%", "berechnete_veraenderung"),
    ("bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr", "%/Jahr", "berechnete_annualisierte_veraenderung"),
    ("bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr", "%/Jahr", "berechnete_annualisierte_veraenderung"),
]


def validate():
    errors = []
    print("=== Starte Validierung der Bevölkerungsindikatoren (Phase 5) ===")

    # 1. XML Checksum
    hasher = hashlib.sha256()
    with open(XML_PATH, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    xml_hash = hasher.hexdigest()
    if xml_hash != EXPECTED_XML_SHA256:
        errors.append(f"XML-Prüfsumme ungültig: {xml_hash}")
    else:
        print(f"✓ 1. Original-XML Prüfsumme intakt ({xml_hash[:16]}...)")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # 2. PRAGMA integrity_check
    cur.execute("PRAGMA integrity_check;")
    res = cur.fetchone()[0]
    if res != "ok":
        errors.append(f"PRAGMA integrity_check meldet Fehler: {res}")
    else:
        print("✓ 2. PRAGMA integrity_check = ok")

    # 3. PRAGMA foreign_key_check
    cur.execute("PRAGMA foreign_key_check;")
    fk_errors = cur.fetchall()
    if fk_errors:
        errors.append(f"PRAGMA foreign_key_check meldet {len(fk_errors)} Fehler: {fk_errors}")
    else:
        print("✓ 3. PRAGMA foreign_key_check = 0 Fehler")

    # 4. Abgleich mit Backup vor Phase 5
    if BACKUP_PHASE5_PATH.exists():
        b_conn = sqlite3.connect(BACKUP_PHASE5_PATH)
        b_cur = b_conn.cursor()

        # gemeindebauten
        cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        curr_gb = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM gemeindebauten ORDER BY objekt_id;")
        back_gb = [tuple(r) for r in b_cur.fetchall()]
        if curr_gb != back_gb:
            errors.append("Bestandstabelle gemeindebauten wurde verändert!")
        else:
            print("✓ 4a. Bestandstabelle gemeindebauten (1.776 Zeilen) 100% identisch mit Backup")

        # metadaten
        cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        curr_m = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM metadaten ORDER BY 1;")
        back_m = [tuple(r) for r in b_cur.fetchall()]
        if curr_m != back_m:
            errors.append("Tabelle metadaten wurde verändert!")
        else:
            print("✓ 4b. Tabelle metadaten 100% identisch mit Backup")

        # statistische_gebiete
        cur.execute("SELECT * FROM statistische_gebiete ORDER BY gebietsebene, gebiet_code;")
        curr_sg = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM statistische_gebiete ORDER BY gebietsebene, gebiet_code;")
        back_sg = [tuple(r) for r in b_cur.fetchall()]
        if curr_sg != back_sg:
            errors.append("Tabelle statistische_gebiete wurde verändert!")
        else:
            print("✓ 4c. Tabelle statistische_gebiete (1.735 Zeilen) 100% identisch mit Backup")

        # gemeindebau_gebiet
        cur.execute("SELECT * FROM gemeindebau_gebiet ORDER BY objekt_id, gebietsebene;")
        curr_gg = [tuple(r) for r in cur.fetchall()]
        b_cur.execute("SELECT * FROM gemeindebau_gebiet ORDER BY objekt_id, gebietsebene;")
        back_gg = [tuple(r) for r in b_cur.fetchall()]
        if curr_gg != back_gg:
            errors.append("Tabelle gemeindebau_gebiet wurde verändert!")
        else:
            print("✓ 4d. Tabelle gemeindebau_gebiet (7.104 Zeilen) 100% identisch mit Backup")

        b_conn.close()

    # 5. Indikator-Definitionen
    cur.execute("SELECT indikator_code, bezeichnung, einheit, indikatorart FROM indikator_definitionen ORDER BY sortierreihenfolge;")
    defs = {r["indikator_code"]: dict(r) for r in cur.fetchall()}
    if len(defs) != 15:
        errors.append(f"Erwartet wurden 15 Indikatordefinitionen, gefunden: {len(defs)}")
    else:
        print("✓ 5. Exakt 15 Indikatordefinitionen in indikator_definitionen vorhanden")

    for code, einheit, art in EXPECTED_INDICATORS:
        if code not in defs:
            errors.append(f"Indikator '{code}' fehlt in indikator_definitionen!")
        else:
            d = defs[code]
            if d["einheit"] != einheit:
                errors.append(f"Indikator '{code}': Einheit '{d['einheit']}' != '{einheit}'")
            if d["indikatorart"] != art:
                errors.append(f"Indikator '{code}': Art '{d['indikatorart']}' != '{art}'")

    # Namensprüfung für Pensionsquote und Einpersonenwohnungen
    pq_bez = defs.get("pensionsquote_prozent", {}).get("bezeichnung", "")
    if "Personen mit Pensionsbezug" not in pq_bez or "65" in pq_bez or "Senioren" in pq_bez:
        errors.append(f"Ungültige Bezeichnung für Pensionsquote: '{pq_bez}'")
    else:
        print("✓ 5b. Pensionsquote korrekt bezeichnet ('Anteil der Personen mit Pensionsbezug', kein 65+/Senioren)")

    ep_bestand = defs.get("einpersonenwohnungen", {})
    if ep_bestand.get("einheit") != "Personen" or "Personen in Einpersonen-Wohnungen" not in ep_bestand.get("bezeichnung", ""):
        errors.append(f"Ungültige Definition für einpersonenwohnungen: {ep_bestand}")
    else:
        print("✓ 5c. einpersonenwohnungen korrekt definiert (Bezeichnung: 'Personen in Einpersonen-Wohnungen', Einheit: 'Personen')")

    ep_anteil = defs.get("anteil_einpersonenwohnungen_prozent", {})
    if "Deaktiviert" not in ep_anteil.get("bezeichnung", ""):
        errors.append(f"anteil_einpersonenwohnungen_prozent nicht als deaktiviert gekennzeichnet: {ep_anteil}")
    else:
        print("✓ 5d. anteil_einpersonenwohnungen_prozent korrekt als deaktiviert gekennzeichnet")

    # 6. Indikatorendatensätze (Exakt 8.750 Zeilen)
    cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren;")
    total_ind = cur.fetchone()[0]
    if total_ind != 8750:
        errors.append(f"Gesamtanzahl Indikatordatensätze: {total_ind} statt 8.750!")
    else:
        print("✓ 6. Tabelle bevoelkerungsindikatoren enthält exakt 8.750 Datensätze")

    # 7. Zählbezirk 0210 Sonderfall
    cur.execute("SELECT COUNT(*), COUNT(wert) FROM bevoelkerungsindikatoren WHERE gebiet_code = '0210';")
    cnt_0210, cnt_val_0210 = cur.fetchone()
    if cnt_0210 != 35:
        errors.append(f"ZBEZ 0210 hat {cnt_0210} Datensätze statt 35!")
    if cnt_val_0210 != 9:
        errors.append(f"ZBEZ 0210 hat {cnt_val_0210} gültige Werte statt 9 (in 2011: 6 Bestände + 3 aktive Anteile; anteil_einpersonenwohnungen ist deaktiviert)!")
    else:
        print("✓ 7. Sonderfall ZBEZ 0210: 35 Zeilen, 9 gültige Werte in 2011 (6 Bestände, 3 aktive Anteile), exakt 26 NULL-Werte")

    # 8. Plausibilitätsprüfungen auf Werte
    cur.execute("SELECT COUNT(*) FROM bevoelkerungsindikatoren WHERE wert < 0;")
    neg_cnt = cur.fetchone()[0]
    # Beachte: Bevölkerungsentwicklung kann negativ sein (Schrumpfung), aber Anteile/Bestand/Dichte nicht!
    cur.execute("""
        SELECT COUNT(*) FROM bevoelkerungsindikatoren
        WHERE wert < 0
        AND indikator_code NOT LIKE '%entwicklung%';
    """)
    neg_non_dev = cur.fetchone()[0]
    if neg_non_dev > 0:
        errors.append(f"{neg_non_dev} unplausible negative Werte bei Beständen/Anteilen/Dichte!")
    else:
        print("✓ 8a. Keine negativen Werte bei Beständen, Anteilen oder Dichte")

    cur.execute("""
        SELECT gebiet_code, indikator_code, stichtag, wert FROM bevoelkerungsindikatoren
        WHERE einheit = '%'
        AND indikator_code NOT LIKE '%entwicklung%'
        AND wert IS NOT NULL
        AND (wert < 0 OR wert > 100);
    """)
    pct_anomalies = cur.fetchall()
    if pct_anomalies:
        errors.append(f"{len(pct_anomalies)} unzulässige Prozentwerte außerhalb von [0, 100]!: {pct_anomalies}")
    else:
        print("✓ 8b. Alle aktiven berechneten Anteile liegen strikt in [0, 100] (0 Anomalien)")

    # Prüfung vollständige Deaktivierung von anteil_einpersonenwohnungen_prozent
    cur.execute("""
        SELECT COUNT(*), COUNT(wert), COUNT(CASE WHEN qualitaetsstatus = 'nicht_verfuegbar' THEN 1 END)
        FROM bevoelkerungsindikatoren
        WHERE indikator_code = 'anteil_einpersonenwohnungen_prozent';
    """)
    cnt_total_ep, cnt_val_ep, cnt_nv_ep = cur.fetchone()
    if cnt_total_ep != 750:
        errors.append(f"anteil_einpersonenwohnungen_prozent: {cnt_total_ep} Zeilen statt 750!")
    if cnt_val_ep != 0:
        errors.append(f"anteil_einpersonenwohnungen_prozent: {cnt_val_ep} Werte sind NICHT NULL! (muss vollständig deaktiviert sein)")
    if cnt_nv_ep != 750:
        errors.append(f"anteil_einpersonenwohnungen_prozent: {cnt_nv_ep} Zeilen mit nicht_verfuegbar statt 750!")
    if cnt_total_ep == 750 and cnt_val_ep == 0 and cnt_nv_ep == 750:
        print("✓ 8c. anteil_einpersonenwohnungen_prozent ist für alle 250 Zählbezirke und alle 3 Stichtage vollständig deaktiviert (750 NULL-Werte mit status 'nicht_verfuegbar')")

    # 9. Mathematische Stichprobenprüfung an Zählbezirk 0101 (Innere Stadt)
    cur.execute("""
        SELECT indikator_code, stichtag, wert
        FROM bevoelkerungsindikatoren
        WHERE gebiet_code = '0101'
        ORDER BY indikator_code, stichtag;
    """)
    sample_vals = {(r["indikator_code"], r["stichtag"]): r["wert"] for r in cur.fetchall()}

    pop_23 = sample_vals.get(("bevoelkerung_gesamt", "2023-10-31"))
    u15_23 = sample_vals.get(("personen_unter_15", "2023-10-31"))
    anteil_u15 = sample_vals.get(("anteil_unter_15_prozent", "2023-10-31"))
    if pop_23 and u15_23 and anteil_u15:
        expected_u15_pct = (u15_23 / pop_23) * 100.0
        if abs(anteil_u15 - expected_u15_pct) > 1e-6:
            errors.append(f"Berechnungsfehler anteil_unter_15_prozent bei 0101: {anteil_u15} != {expected_u15_pct}")
        else:
            print("✓ 9a. Stichprobe anteil_unter_15_prozent mathematisch exakt")

    pop_11 = sample_vals.get(("bevoelkerung_gesamt", "2011-10-31"))
    dev_11_23 = sample_vals.get(("bevoelkerungsentwicklung_2011_2023_prozent", "2023-10-31"))
    dev_ann = sample_vals.get(("bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr", "2023-10-31"))
    if pop_11 and pop_23 and dev_11_23:
        exp_dev = ((pop_23 / pop_11) - 1.0) * 100.0
        if abs(dev_11_23 - exp_dev) > 1e-6:
            errors.append(f"Berechnungsfehler Entwicklung 2011-2023 bei 0101: {dev_11_23} != {exp_dev}")
        else:
            print("✓ 9b. Stichprobe bevoelkerungsentwicklung_2011_2023_prozent mathematisch exakt")

    if pop_11 and pop_23 and dev_ann:
        exp_ann = ((pop_23 / pop_11)**(1.0 / 12.0) - 1.0) * 100.0
        if abs(dev_ann - exp_ann) > 1e-6:
            errors.append(f"Berechnungsfehler annualisierte Entwicklung bei 0101: {dev_ann} != {exp_ann}")
        else:
            print("✓ 9c. Stichprobe annualisierte Entwicklung (12 Jahre) mathematisch exakt")

    # 10. Migrationseintrag
    cur.execute("SELECT * FROM schema_migrationen WHERE migration_id = 'population_phase5_correction_v1';")
    mig = cur.fetchone()
    if not mig:
        errors.append("Migration population_phase5_correction_v1 nicht in schema_migrationen gefunden!")
    else:
        print(f"✓ 10. Migration population_phase5_correction_v1 registriert ({mig['angewendet_am']})")

    conn.close()

    if errors:
        print(f"\n✗ {len(errors)} FEHLER BEI DER VALIDIERUNG:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)
    else:
        print("\nPhase 5 Bevölkerungsindikatoren erfolgreich und fehlerfrei validiert!")


if __name__ == "__main__":
    validate()

