#!/usr/bin/env python3
"""
Exportiert alle 1.776 Gemeindebauten aus data/gemeindebauten.db
in eine für das React-Frontend optimierte JSON-Datei public/data/gemeindebauten.json.
"""

import json
import re
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
OUTPUT_PATH = BASE_DIR / "public" / "data" / "gemeindebauten.json"
METADATA_OUTPUT_PATH = BASE_DIR / "public" / "data" / "bevoelkerungsstatistik_metadaten.json"

BEZIRKE_MAP = {
    1: "Innere Stadt", 2: "Leopoldstadt", 3: "Landstraße", 4: "Wieden",
    5: "Margareten", 6: "Mariahilf", 7: "Neubau", 8: "Josefstadt",
    9: "Alsergrund", 10: "Favoriten", 11: "Simmering", 12: "Meidling",
    13: "Hietzing", 14: "Penzing", 15: "Rudolfsheim-Fünfhaus", 16: "Ottakring",
    17: "Hernals", 18: "Währing", 19: "Döbling", 20: "Brigittenau",
    21: "Floridsdorf", 22: "Donaustadt", 23: "Liesing"
}

WIKIPEDIA_DISTRICT_MAP = {
    1: "Innere_Stadt", 2: "Leopoldstadt", 3: "Landstra%C3%9Fe", 4: "Wieden",
    5: "Margareten", 6: "Mariahilf", 7: "Neubau", 8: "Josefstadt",
    9: "Alsergrund", 10: "Favoriten", 11: "Simmering", 12: "Meidling",
    13: "Hietzing", 14: "Penzing", 15: "Rudolfsheim-F%C3%BCnfhaus", 16: "Ottakring",
    17: "Hernals", 18: "W%C3%A4hring", 19: "D%C3%B6bling", 20: "Brigittenau",
    21: "Floridsdorf", 22: "Donaustadt", 23: "Liesing"
}


def parse_db_class_to_number(laerm_klasse: str | None, default_day: bool = True) -> int:
    """Extrahiert einen repräsentativen numerischen dB(A)-Pegel aus Lärmklassen-Strings."""
    if not laerm_klasse:
        return 46 if default_day else 38
    s = laerm_klasse.strip().lower()
    if "unter kartierungsschwelle" in s or "keine ausweisung" in s:
        return 46 if default_day else 38
    if "<" in s:
        m = re.search(r"\d+", s)
        return int(m.group(0)) - 3 if m else (48 if default_day else 40)
    if ">=" in s or ">" in s:
        m = re.search(r"\d+", s)
        return int(m.group(0)) + 3 if m else (76 if default_day else 66)

    # Bereiche z.B. "60–64" oder "60-64"
    parts = re.findall(r"\d+", s)
    if len(parts) >= 2:
        return (int(parts[0]) + int(parts[1])) // 2
    if len(parts) == 1:
        return int(parts[0])
    return 52 if default_day else 42


def compute_ruhe_score(tag_db: int, nacht_db: int, gruen_score: int, schienen_db: int) -> int:
    """Berechnet einen fundierten Ruhe-Score von 1 bis 10."""
    # Basis-Punkte nach Straßenlärm Tag
    if tag_db <= 48:
        score = 10
    elif tag_db <= 53:
        score = 9
    elif tag_db <= 58:
        score = 8
    elif tag_db <= 63:
        score = 6
    elif tag_db <= 68:
        score = 4
    elif tag_db <= 73:
        score = 2
    else:
        score = 1

    # Abzug für Schienenlärm
    if schienen_db >= 65:
        score -= 2
    elif schienen_db >= 55:
        score -= 1

    # Grünraum-Bonus/Malus
    if gruen_score >= 70:
        score += 1
    elif gruen_score < 40:
        score -= 1

    return max(1, min(10, score))


def determine_hof_typ(immobilientyp: str | None, flaeche_m2: int | None, freiflaeche_m2: int | None) -> str:
    if not immobilientyp:
        return "Geschlossener Gartenhof"
    t = immobilientyp.lower()
    if "siedlung" in t or "zeilenbau" in t or "pavillon" in t:
        return "Pavillon-Siedlung im Grünen"
    if "pawlatschen" in t:
        return "Historischer Pawlatschenhof"
    if "hang" in t or "terrasse" in t:
        return "Hanglage mit Terrassengärten"
    if "großhof" in t or (freiflaeche_m2 and freiflaeche_m2 > 4000):
        return "Parkartiger Großhof"
    if "hofanlage" in t or "block" in t:
        return "Geschlossener Gartenhof"
    return "Straßenseitig mit Hofgarten"


def determine_lift_status(baujahr: int, geschosse_max: int | None, wohnungen: int | None):
    # Neuere Gemeindebauten ab den 1990ern und hohe Bauten haben fast ausnahmslos stufenlose Lifte
    if baujahr >= 1990 or (geschosse_max and geschosse_max >= 5) or (wohnungen and wohnungen >= 60):
        return "Stufenloser Lift (ebenerdig)", True
    if baujahr < 1935:
        return "Lift mit Halbstock-Stufen", False
    if baujahr < 1960 and (geschosse_max and geschosse_max <= 3):
        return "Kein Lift vorhanden", False
    return "Stufenloser Lift (ebenerdig)", True


def determine_bau_epoche(baujahr: int) -> str:
    if baujahr < 1919:
        return "Bürgerhaus & Gründerzeit (WISEG)"
    elif 1919 <= baujahr <= 1934:
        return "Rotes Wien (1919–1934)"
    elif 1945 <= baujahr <= 1979:
        return "Wiederaufbau & Nachkriegszeit (1945–1979)"
    elif 1980 <= baujahr <= 2018:
        return "Postmoderne & Zeitgenössisch"
    else:
        return "Gemeindebau NEU"


def export_database():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Datenbank nicht gefunden unter: {DB_PATH}")

    print(f"Lese Gemeindebauten aus: {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM gemeindebauten ORDER BY bezirk, adresse, hofname;")
    rows = cursor.fetchall()
    print(f"Gefundene Zeilen: {len(rows)}")

    # Lade statistische Gebietszuordnungen für alle Objekte
    cursor.execute("SELECT objekt_id, gebietsebene, gebiet_code FROM gemeindebau_gebiet;")
    gebiete_by_obj = {}
    for gr in cursor.fetchall():
        gebiete_by_obj.setdefault(gr["objekt_id"], {})[gr["gebietsebene"]] = gr["gebiet_code"]
    print(f"Statistische Gebietszuordnungen geladen für: {len(gebiete_by_obj)} Objekte")

    # Lade Zählgebietstypen (gebietstyp, aggregierter_gebietstyp)
    cursor.execute("SELECT gebiet_code, gebietstyp, aggregierter_gebietstyp FROM statistische_gebiete WHERE gebietsebene = 'zaehlgebiet';")
    zgeb_types = {zr["gebiet_code"]: (zr["gebietstyp"], zr["aggregierter_gebietstyp"]) for zr in cursor.fetchall()}

    # Lade amtliche Bevölkerungsindikatoren auf Zählbezirksebene für Stichtag 2023-10-31
    cursor.execute("""
        SELECT gebiet_code, indikator_code, wert, qualitaetsstatus
        FROM bevoelkerungsindikatoren
        WHERE gebietsebene = 'zaehlbezirk' AND stichtag = '2023-10-31';
    """)
    ind_by_zbez = {}
    for ir in cursor.fetchall():
        ind_by_zbez.setdefault(ir["gebiet_code"], {})[ir["indikator_code"]] = (ir["wert"], ir["qualitaetsstatus"])
    print(f"Bevölkerungsindikatoren für 2023-10-31 geladen für: {len(ind_by_zbez)} Zählbezirke")

    # Lade verifizierte Fotos aus dem angereicherten XML falls vorhanden
    photo_map = {}
    photo_xml_path = BASE_DIR / "data" / "Gemeindebauten_Wien_mit_Fotos.xml"
    if not photo_xml_path.exists():
        photo_xml_path = BASE_DIR / "data" / "Gemeindebauten_Wien_Test_25_mit_Fotos.xml"

    if photo_xml_path.exists():
        import xml.etree.ElementTree as ET
        try:
            ptree = ET.parse(photo_xml_path)
            for gb in ptree.findall(".//gemeindebau"):
                oid = int(gb.attrib["objekt_id"])
                foto = gb.find("foto")
                if foto is not None and foto.find("bild_url") is not None:
                    photo_map[oid] = {
                        "bildUrl": foto.findtext("vorschaubild_url") or foto.findtext("bild_url"),
                        "fotograf": foto.findtext("fotograf"),
                        "lizenz": foto.findtext("lizenz"),
                        "quellseiteUrl": foto.findtext("quellseite_url"),
                    }
            print(f"Eingelesene verifizierte Fotos: {len(photo_map)}")
        except Exception as e:
            print(f"Hinweis beim Laden der Fotos: {e}")

    result = []

    for r in rows:
        objekt_id = r["objekt_id"]
        bezirk_num = r["bezirk"]
        bezirk_name = BEZIRKE_MAP.get(bezirk_num, f"{bezirk_num}. Bezirk")
        plz = f"1{bezirk_num:02d}0"

        raw_hofname = r["hofname"] or ""
        raw_adresse = r["adresse"] or ""

        # Name ableiten
        if raw_hofname and raw_hofname.strip() != "":
            name = raw_hofname.strip()
        elif raw_adresse and raw_adresse.strip() != "":
            name = raw_adresse.strip()
        else:
            name = f"Gemeindebau {bezirk_name} (Objekt {objekt_id})"

        adresse = raw_adresse if raw_adresse else f"{bezirk_name} (Objekt {objekt_id})"

        baujahr = r["baujahr"] if r["baujahr"] > 0 else 1955
        wohnungen = r["wohnungen"] if r["wohnungen"] is not None else 0

        # Koordinaten
        lat = r["breitengrad"]
        lng = r["laengengrad"]

        # Höhenmeter
        h_min = r["hoehe_von_m_adria"]
        h_max = r["hoehe_bis_m_adria"]
        spanne = max(0, h_max - h_min)
        hoehenmeter = f"{h_min}–{h_max} m ü. A."

        # Geländetyp
        if spanne >= 14 or h_min >= 245:
            gelaende_typ = "Terrassierte Hanglage"
            topographie_hinweis = f"Hanglage am Wienerwald ({hoehenmeter}). Höhendifferenz von {spanne}m im Areal; barrierefreie Hauptwege nutzen."
        elif spanne >= 6 or h_min >= 200:
            gelaende_typ = "Sanfte Neigung"
            topographie_hinweis = f"Sanftes Stadtgefälle ({hoehenmeter}) mit {spanne}m Spanne. Großteils gut barrierefrei begehbar."
        else:
            gelaende_typ = "Eben / Flachland"
            topographie_hinweis = f"Vollständig ebenes Donauterrassen-Terrain ({hoehenmeter}). Exzellent barrierefrei und stufenlos begehbar."

        # Lärm & Akustik
        tag_db = parse_db_class_to_number(r["strassenlaerm_lden_db_klasse"], default_day=True)
        nacht_db = parse_db_class_to_number(r["strassenlaerm_lnight_db_klasse"], default_day=False)
        schienen_db = parse_db_class_to_number(r["schienenlaerm_lden_db_klasse"], default_day=True)
        gruen_score = r["gruenlage_score"] if r["gruenlage_score"] is not None else 50

        ruhe_score = compute_ruhe_score(tag_db, nacht_db, gruen_score, schienen_db)

        # Innenhofpegel (Wiener Wohnhöfe schirmen typischerweise 14-22 dB ab)
        hof_schallschutz = 18 if (r["bebaute_grundflaeche_m2"] or 0) > 2000 else 14
        akustik_innenhof = max(38, tag_db - hof_schallschutz)

        # ÖPNV & Haltestellen
        distanz_haltestelle = r["entfernung_haltestelle_m"] if r["entfernung_haltestelle_m"] is not None else 180
        naechste_station = r["naechste_haltestelle"] or "Haltestelle in Gehdistanz"
        raw_linien = r["linien"] or ""
        linien_list = [line.strip() for line in raw_linien.split(",") if line.strip()]
        if not linien_list:
            linien_list = [r["verkehrsmittel"]] if r["verkehrsmittel"] else ["Öffentlicher Nahverkehr"]

        # Hof-Typ & Lift
        hof_typ = determine_hof_typ(r["immobilientyp_abgeleitet"], r["bebaute_grundflaeche_m2"], r["freiflaechenpotenzial_m2"])
        lift_status, is_stufenlos = determine_lift_status(baujahr, r["geschosse_max"], wohnungen)

        # Grünraum & Park
        park_name = r["naechster_park"] or "Öffentliche Grünanlage"
        park_m = r["entfernung_park_m"] or 200
        baeume = r["baeume_250m"] or 0
        gruen_m2 = r["oeffentliches_gruen_500m_m2"] or 0
        gruen_anteil = r["oeffentliches_gruen_500m_prozent"] or 0.0

        gruen_desc = (
            f"Grünlage '{r['gruenlage_abgeleitet']}': {baeume} Bäume im 250m-Radius, "
            f"{gruen_m2:,} m² Grünflächen im 500m-Umfeld ({gruen_anteil}%). "
            f"Nächster Park: {park_name} ({park_m} m entfernt)."
        ).replace(",", ".")

        # Epoche & Denkmalschutz
        bau_epoche = determine_bau_epoche(baujahr)
        is_wiseg = baujahr < 1919
        is_denkmal = baujahr <= 1934 and baujahr >= 1919 and (wohnungen >= 50 or "hof" in name.lower())

        # Senioren-Vor- und Nachteile generieren
        vorteile = []
        if ruhe_score >= 8:
            vorteile.append("Hervorragende Ruhelage abseits stark befahrenem Straßenverkehr")
        if is_stufenlos:
            vorteile.append("Stufenloser Aufzugszugang für barrierefreie Mobilität")
        if gelaende_typ == "Eben / Flachland":
            vorteile.append("Ebenes Gelände – ideal für stufenlose und gelenkschonende Spaziergänge")
        if distanz_haltestelle <= 200:
            vorteile.append(f"Sehr kurze Wege zum ÖPNV ({distanz_haltestelle} m zur Station {naechste_station})")
        if gruen_score >= 60:
            vorteile.append(f"Hoher Grünanteil mit {baeume} Bäumen und Park in direkter Nähe")
        if not vorteile:
            vorteile.append("Gute Nahversorgung und städtische Infrastruktur im nahen Umkreis")

        nachteile = []
        if tag_db >= 65:
            nachteile.append(f"Erhöhter Straßenlärm zur Hauptstraße ({tag_db} dB LDEN)")
        if not is_stufenlos:
            nachteile.append("Historischer Bau mit Stufen bzw. Halbstock-Einstieg")
        if gelaende_typ == "Terrassierte Hanglage":
            nachteile.append(f"Steigungen im Straßenverlauf ({spanne} m Höhendifferenz)")
        if distanz_haltestelle > 300:
            nachteile.append(f"Längerer Gehweg zur nächsten Haltestelle ({distanz_haltestelle} m)")
        if not nachteile:
            nachteile.append("Beliebte Anlage mit hoher Nachfrage bei der Wohnberatung")

        # Tipp für Ruhesuchende
        if ruhe_score >= 8:
            tipp = "Sehr empfehlenswerte Wohnhausanlage für Ruhesuchende. Fenster zum Innenhof oder Gartenbereich bevorzugen."
        elif tag_db >= 65:
            tipp = "Bei Wohnungsvergabe unbedingt auf Stiegen und Wohnungen mit ausschließlicher Ausrichtung zum ruhigen Innenhof achten!"
        else:
            tipp = "Solide städtische Wohnlage. Eine Wohnungsbesichtigung vorab zur Begutachtung der Hofakustik wird empfohlen."

        wiki_district_slug = WIKIPEDIA_DISTRICT_MAP.get(bezirk_num, "Wien")
        wiki_district_url = f"https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten/{wiki_district_slug}"

        entry = {
            "id": f"gb-{objekt_id}",
            "name": name,
            "adresse": adresse,
            "plz": plz,
            "bezirk": bezirk_num,
            "bezirkName": bezirk_name,
            "baujahr": baujahr,
            "wohnungenAnzahl": wohnungen,
            "koordinaten": {
                "lat": lat,
                "lng": lng
            },
            "googleStreetViewUrl": f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lng}",
            "ruheScore": ruhe_score,
            "hofTyp": hof_typ,
            "liftStatus": lift_status,
            "isStufenlos": is_stufenlos,
            "hoehenmeter": hoehenmeter,
            "hoehenmeterMin": h_min,
            "hoehenmeterMax": h_max,
            "hoehenmeterSpanne": spanne,
            "gelaendeTyp": gelaende_typ,
            "topographieHinweis": topographie_hinweis,
            "akustikDbInnenhof": akustik_innenhof,
            "akustikDbStrasse": tag_db,
            "laermPegelTag": tag_db,
            "laermPegelNacht": nacht_db,
            "bimBusDistanzMeter": distanz_haltestelle,
            "naechsteStation": naechste_station,
            "linien": linien_list,
            "vorteileSenioren": vorteile,
            "nachteileSenioren": nachteile,
            "tippFuerRuhesuchende": tipp,
            "gruenraumBeschreibung": gruen_desc,
            "wikipediaDistrictListUrl": wiki_district_url,
            "denkmalschutz": is_denkmal,
            "bauEpoche": bau_epoche,
            "isWiseg": is_wiseg,
            "ogdId": f"VIE_GB_{bezirk_num}_{objekt_id}"
        }

        if objekt_id in photo_map:
            entry["bildUrl"] = photo_map[objekt_id]["bildUrl"]
            entry["bildFotograf"] = photo_map[objekt_id]["fotograf"]
            entry["bildLizenz"] = photo_map[objekt_id]["lizenz"]
            entry["bildQuellseiteUrl"] = photo_map[objekt_id]["quellseiteUrl"]

        # Phase 6: Amtliche Umfeldstatistik auf Zählbezirksebene anfügen
        if objekt_id in gebiete_by_obj:
            g_map = gebiete_by_obj[objekt_id]
            zbez_code = g_map.get("zaehlbezirk")
            zgeb_code = g_map.get("zaehlgebiet")
            prg_code = g_map.get("prognoseregion")
            bez_code = g_map.get("gemeindebezirk")

            z_type, agg_type = zgeb_types.get(zgeb_code, (None, None))
            zbez_inds = ind_by_zbez.get(zbez_code, {})

            def get_val(code):
                item = zbez_inds.get(code)
                return item[0] if item else None

            pop_val = get_val("bevoelkerung_gesamt")
            q_status = "amtlich_und_berechnet" if pop_val is not None else "nicht_verfuegbar"

            entry["umfeldstatistik"] = {
                "raeumlicheEbene": "Zählbezirk",
                "zaehlgebietCode": str(zgeb_code) if zgeb_code is not None else "",
                "zaehlbezirkCode": str(zbez_code) if zbez_code is not None else "",
                "prognoseregionCode": str(prg_code) if prg_code is not None else "",
                "gemeindebezirkCode": str(bez_code) if bez_code is not None else "",
                "gebietstyp": z_type,
                "aggregierterGebietstyp": agg_type,
                "datenstand": "2023-10-31",
                "einwohner": int(round(pop_val)) if pop_val is not None else None,
                "hauptwohnsitzwohnungen": int(round(get_val("hauptwohnsitzwohnungen"))) if get_val("hauptwohnsitzwohnungen") is not None else None,
                "bevoelkerungsdichtePersonenJeHektar": get_val("bevoelkerungsdichte_personen_je_hektar"),
                "anteilUnter15Prozent": get_val("anteil_unter_15_prozent"),
                "anteilPensionsbezugProzent": get_val("pensionsquote_prozent"),
                "anteilPersonenInHauptmieteProzent": get_val("anteil_personen_in_hauptmiete_prozent"),
                "bevoelkerungsentwicklung2011Bis2023Prozent": get_val("bevoelkerungsentwicklung_2011_2023_prozent"),
                "bevoelkerungsentwicklung2011Bis2023ProJahr": get_val("bevoelkerungsentwicklung_2011_2023_prozent_pro_jahr"),
                "bevoelkerungsentwicklung2021Bis2023Prozent": get_val("bevoelkerungsentwicklung_2021_2023_prozent"),
                "bevoelkerungsentwicklung2021Bis2023ProJahr": get_val("bevoelkerungsentwicklung_2021_2023_prozent_pro_jahr"),
                "qualitaetsstatus": q_status,
                "hinweis": "Amtliche Umfeldstatistik des Zählbezirks. Die Werte beschreiben nicht die Bewohnerinnen und Bewohner dieser Wohnhausanlage."
            }

        result.append(entry)

    conn.close()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Erfolgreich {len(result)} Gemeindebauten nach {OUTPUT_PATH} exportiert.")

    export_metadata()
    return len(result)


def export_metadata():
    """Erzeugt oder aktualisiert public/data/bevoelkerungsstatistik_metadaten.json."""
    meta = {
        "schema_version": "1.0",
        "aktualisiert_am": "2026-09-06",
        "datenstand": "2023-10-31",
        "vergleichsstaende": ["2011-10-31", "2021-10-31"],
        "raeumliche_ebene": "Zählbezirk",
        "beschreibung_raeumliche_ebene": "Statistisches Gebiet der Stadt Wien (unterhalb der Gemeindebezirke). Wien ist in 250 Zählbezirke unterteilt.",
        "allgemeiner_hinweis": "Amtliche Umfeldstatistik des Zählbezirks. Die Werte beschreiben das statistische Umfeld und nicht die Bewohnerinnen und Bewohner dieser Wohnhausanlage.",
        "hinweis_langzeitvergleich": "Vergleich auf stabiler Zählbezirksschlüssel-Ebene",
        "amtliche_quellen": [
            {
                "titel": "Registerzählung – Bevölkerung nach Wohnungen (Stadt Wien)",
                "herausgeber": "Stadt Wien / Statistik Austria",
                "lizenz": "Creative Commons Namensnennung 4.0 International (CC BY 4.0)",
                "stichtage": ["2011-10-31", "2021-10-31", "2023-10-31"]
            },
            {
                "titel": "Zählbezirke Wien (Geodaten)",
                "herausgeber": "Stadt Wien – data.wien.gv.at",
                "lizenz": "Creative Commons Namensnennung 4.0 International (CC BY 4.0)"
            },
            {
                "titel": "Zählgebiete Wien (Gebietstypen)",
                "herausgeber": "Stadt Wien – data.wien.gv.at",
                "lizenz": "Creative Commons Namensnennung 4.0 International (CC BY 4.0)"
            }
        ],
        "gewichtete_wien_gesamtwerte": {
            "datenstand": "2023-10-31",
            "bevoelkerungGesamt": 1997966,
            "hauptwohnsitzwohnungenGesamt": 953086,
            "bevoelkerungsdichtePersonenJeHektar": 48.16,
            "anteilUnter15Prozent": 14.46,
            "anteilPensionsbezugProzent": 17.66,
            "anteilPersonenInHauptmieteProzent": 75.42,
            "bevoelkerungsentwicklung2011Bis2023Prozent": 16.55,
            "bevoelkerungsentwicklung2011Bis2023ProJahr": 1.28,
            "bevoelkerungsentwicklung2021Bis2023Prozent": 3.23,
            "bevoelkerungsentwicklung2021Bis2023ProJahr": 1.60
        },
        "wien_vergleich_toleranz_prozentpunkte": 1.0,
        "wien_vergleich_kategorien": {
            "unter": "unter dem Wien-Wert",
            "niveau": "ungefähr auf Wien-Niveau",
            "ueber": "über dem Wien-Wert"
        },
        "indikatordefinitionen": [
            {
                "feld": "einwohner",
                "bezeichnung": "Einwohner (Hauptwohnsitz)",
                "einheit": "Personen",
                "formel": "WHG_POP_TOTAL (amtlicher Registerzählungsbestandswert)",
                "beschreibung": "Hauptwohnsitzbevölkerung im Zählbezirk am Stichtag 31. Oktober 2023."
            },
            {
                "feld": "hauptwohnsitzwohnungen",
                "bezeichnung": "Hauptwohnsitzwohnungen",
                "einheit": "Wohnungen",
                "formel": "WHG_WSA_TOTAL (amtlicher Registerzählungsbestandswert)",
                "beschreibung": "Anzahl der konventionellen Hauptwohnsitzwohnungen im Zählbezirk am Stichtag 31. Oktober 2023."
            },
            {
                "feld": "bevoelkerungsdichtePersonenJeHektar",
                "bezeichnung": "Bevölkerungsdichte",
                "einheit": "Personen/ha",
                "formel": "WHG_POP_TOTAL / (flaeche_m2 / 10000)",
                "beschreibung": "Einwohnerzahl bezogen auf die Gesamtfläche des Zählbezirks in Hektar."
            },
            {
                "feld": "anteilUnter15Prozent",
                "bezeichnung": "Anteil unter 15 Jahren",
                "einheit": "%",
                "formel": "(ERW_STATUS_3 / WHG_POP_TOTAL) * 100",
                "beschreibung": "Prozentualer Anteil der Kinder und Jugendlichen unter 15 Jahren (Erwerbsstatusklasse 3) an der Hauptwohnsitzbevölkerung."
            },
            {
                "feld": "anteilPensionsbezugProzent",
                "bezeichnung": "Anteil der Personen mit Pensionsbezug",
                "einheit": "%",
                "formel": "(ERW_STATUS_4 / WHG_POP_TOTAL) * 100",
                "beschreibung": "Prozentualer Anteil der Personen im Ruhestand bzw. mit Pensionsbezug (Erwerbsstatusklasse 4). Beschreibt den Erwerbsstatus der Bevölkerung und darf nicht mit der Altersgruppe 65+ gleichgesetzt werden."
            },
            {
                "feld": "anteilPersonenInHauptmieteProzent",
                "bezeichnung": "Anteil der Personen in Hauptmiete",
                "einheit": "%",
                "formel": "(WHG_RECHTSVERH_3 / WHG_POP_TOTAL) * 100",
                "beschreibung": "Prozentualer Anteil der Bewohner in Hauptmiete (inkl. Genossenschafts- und Gemeindewohnungen) an der Hauptwohnsitzbevölkerung."
            },
            {
                "feld": "bevoelkerungsentwicklung2011Bis2023Prozent",
                "bezeichnung": "Bevölkerungsentwicklung 2011–2023",
                "einheit": "%",
                "formel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011) - 1) * 100",
                "beschreibung": "Prozentuale Gesamtveränderung der Bevölkerung zwischen den Registerzählungsstichtagen 31.10.2011 und 31.10.2023 auf stabiler Zählbezirksschlüssel-Ebene."
            },
            {
                "feld": "bevoelkerungsentwicklung2011Bis2023ProJahr",
                "bezeichnung": "Bevölkerungsentwicklung 2011–2023 (pro Jahr)",
                "einheit": "%/Jahr",
                "formel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2011)^(1/12) - 1) * 100",
                "beschreibung": "Annualisierte durchschnittliche Wachstumsrate über den 12-Jahres-Zeitraum."
            },
            {
                "feld": "bevoelkerungsentwicklung2021Bis2023Prozent",
                "bezeichnung": "Bevölkerungsentwicklung 2021–2023",
                "einheit": "%",
                "formel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021) - 1) * 100",
                "beschreibung": "Prozentuale Veränderung der Bevölkerung über den 2-Jahres-Zeitraum 2021 bis 2023."
            },
            {
                "feld": "bevoelkerungsentwicklung2021Bis2023ProJahr",
                "bezeichnung": "Bevölkerungsentwicklung 2021–2023 (pro Jahr)",
                "einheit": "%/Jahr",
                "formel": "((WHG_POP_TOTAL_2023 / WHG_POP_TOTAL_2021)^(1/2) - 1) * 100",
                "beschreibung": "Annualisierte durchschnittliche Wachstumsrate über den 2-Jahres-Zeitraum."
            }
        ],
        "nicht_fuer_frontend_freigegebene_indikatoren": [
            {
                "indikator_code": "anteil_einpersonenwohnungen_prozent",
                "status": "deaktiviert",
                "begruendung": "Dimensionsinkonsistenz in amtlichen Rohdaten: Merkmal WHG_NOC_1 zählt Personen, während WHG_WSA_TOTAL Wohnungen zählt. Aufgrund von Anstaltsunterkünften (z. B. ZBEZ 1903) nicht als valider Wohnungsanteil berechenbar."
            },
            {
                "indikator_code": "einpersonenwohnungen",
                "status": "vorerst_zurueckgehalten",
                "begruendung": "Zählt Personen in 1-Personen-Wohnungen, nicht Wohnungen. Vorerst im Frontend nicht dargestellt, um Fehlinterpretationen zu vermeiden."
            }
        ]
    }
    METADATA_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(METADATA_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"Erfolgreich Bevölkerungsmetadaten nach {METADATA_OUTPUT_PATH} exportiert.")


if __name__ == "__main__":
    export_database()

