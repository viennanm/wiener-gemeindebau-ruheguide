#!/usr/bin/env python3
"""
Foto-Anreicherung für Wiener Gemeindebauten via Wikimedia Commons API.

Regeln:
- Das ursprüngliche XML (data/Gemeindebauten_Wien_KI.xml) wird NIEMALS überschrieben.
- Suche nach Gebäudename, Adresse, Bezirk und Koordinaten.
- Geografische Entfernung wird per Haversine-Formel exakt berechnet.
- Bild-URL, Vorschaubild, Quellseite, Fotograf, Lizenz, Lizenz-URL, Beschreibung und Aufnahmedatum.
- Zuordnungssicherheit (Score) zwischen 0.00 und 1.00.
- Treffer ab 0.90: Automatische Übernahme in das neue XML.
- Treffer zwischen 0.60 und 0.89: Ausgabe in reports/bilder_manuell_pruefen.csv.
- Treffer unter 0.60: Verworfen.
- Keine Daten erfinden (Fotograf, Lizenz, Quelle werden 1:1 aus Commons übernommen).
- xsi:nil="true" bleibt bei fehlenden Bildern erhalten.
"""

import argparse
import csv
import html
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_XML = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
DEFAULT_OUTPUT_XML = BASE_DIR / "data" / "Gemeindebauten_Wien_Test_25_mit_Fotos.xml"
REPORT_CSV = BASE_DIR / "reports" / "bilder_manuell_pruefen.csv"

USER_AGENT = "WienerGemeindebauRuheguideBot/1.0 (https://github.com/Wiener-Gemeindebau-Ruheguide; mailto:info@example.at)"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# 25 repräsentative Test-Objekte (Quer durch Wien, historische Höfe, Nachkriegsbauten, Großsiedlungen, Außenbezirke)
TEST_SAMPLE_OBJECT_IDS = [
    17968,  # Karl-Marx-Hof (19.)
    18341,  # Reumannhof (5.)
    18768,  # Rabenhof (3.)
    18896,  # George-Washington-Hof (10.)
    19013,  # Goethehof (22.)
    17669,  # Karl-Seitz-Hof (21.)
    18138,  # Hugo-Breitner-Hof (14.)
    19260,  # Fuchsenfeldhof (12.)
    18703,  # Lindenhof (18.)
    19019,  # Metzleinstalerhof (5.)
    18457,  # Hanuschhof (3.)
    19025,  # Vogelweidhof (15.)
    19056,  # Bebelhof (12.)
    15627,  # Lassallehof (2.)
    15567,  # Klosehof (19.)
    15677,  # Franz-Weber-Hof / Weinberggasse (19.)
    15632,  # Oskar-Werner-Hof / Lenaugasse 19 (8. hist.)
    18609,  # Großfeldsiedlung / St.-Michael-Gasse 11 (21.)
    17911,  # Per-Albin-Hansson-Siedlung / Wendstattgasse (10.)
    17710,  # Rennbahnweg 27 (22.)
    17910,  # Sandleitengasse 55 (16.)
    15565,  # Wasagasse 28 (9.)
    15566,  # Hagengasse 21 (15.)
    19045,  # Höpflergasse 6 (23.)
    19092,  # Maurer Hauptplatz 10 (23. hist. 1743)
]


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Berechnet die Großkreisentfernung (Luftlinie) in Metern."""
    R = 6371000.0  # Erdradius in Metern
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def clean_html(raw_html: str | None) -> str:
    """Entfernt HTML-Tags und bereinigt Sonderzeichen."""
    if not raw_html:
        return ""
    # Tags entfernen
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = html.unescape(text)
    # Mehrfache Leerzeichen zusammenfassen
    text = re.sub(r"\s+", " ", text).strip()
    return text


def api_request(params: dict) -> dict:
    """Führt eine API-Anfrage an Wikimedia Commons durch."""
    params["format"] = "json"
    url = f"{COMMONS_API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            if attempt == 2:
                print(f"  [API Warning] Request failed: {e}", file=sys.stderr)
                return {}
            time.sleep(1.0 + attempt)
    return {}


METADATA_CACHE: dict[str, dict] = {}
GEO_CACHE: dict[tuple[float, float], list[dict]] = {}


def get_image_metadata(titles: list[str]) -> dict[str, dict]:
    """Holt detaillierte Metadaten für eine Liste von Bilddateinamen mit In-Memory-Cache."""
    if not titles:
        return {}

    needed = [t for t in titles if t not in METADATA_CACHE]
    for i in range(0, len(needed), 30):
        chunk = needed[i:i + 30]
        params = {
            "action": "query",
            "titles": "|".join(chunk),
            "prop": "imageinfo|coordinates",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1200",
            "colimit": "max"
        }
        data = api_request(params)
        pages = data.get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            title = page_data.get("title", "")
            imageinfo = page_data.get("imageinfo", [])
            coords = page_data.get("coordinates", [])

            if not imageinfo:
                continue

            info = imageinfo[0]
            ext = info.get("extmetadata", {})

            lat = None
            lon = None
            if coords:
                lat = coords[0].get("lat")
                lon = coords[0].get("lon")
            elif "GPSLatitude" in ext and "GPSLongitude" in ext:
                try:
                    lat = float(ext["GPSLatitude"]["value"])
                    lon = float(ext["GPSLongitude"]["value"])
                except Exception:
                    pass

            METADATA_CACHE[title] = {
                "title": title,
                "url": info.get("url"),
                "thumburl": info.get("thumburl") or info.get("url"),
                "descriptionurl": info.get("descriptionurl"),
                "artist": clean_html(ext.get("Artist", {}).get("value")),
                "license": ext.get("LicenseShortName", {}).get("value") or ext.get("License", {}).get("value") or "Unbekannt",
                "license_url": ext.get("LicenseUrl", {}).get("value"),
                "description": clean_html(ext.get("ImageDescription", {}).get("value")),
                "datetime": ext.get("DateTimeOriginal", {}).get("value") or ext.get("DateTime", {}).get("value"),
                "lat": lat,
                "lon": lon
            }
        time.sleep(0.12)  # Höfliches Rate limiting

    return {t: METADATA_CACHE[t] for t in titles if t in METADATA_CACHE}


def search_commons(obj: dict) -> list[dict]:
    """
    Sucht auf Wikimedia Commons nach Bildern zu einem Gemeindebau:
    1. Geosearch um Koordinaten (Radius 250 m)
    2. Volltextsuche nach Gebäudename
    3. Volltextsuche nach Adresse
    """
    candidates = {}

    lat = obj["breitengrad"]
    lng = obj["laengengrad"]
    hofname = obj.get("hofname") or ""
    adresse = obj.get("adresse") or ""

    # 1. Geosearch (mit Koord-Raster-Caching)
    if lat and lng:
        geo_key = (round(lat, 3), round(lng, 3))
        if geo_key in GEO_CACHE:
            geo_items = GEO_CACHE[geo_key]
        else:
            geo_params = {
                "action": "query",
                "list": "geosearch",
                "gscoord": f"{lat}|{lng}",
                "gsradius": "250",
                "gsnamespace": "6",
                "gslimit": "25"
            }
            geo_data = api_request(geo_params)
            geo_items = geo_data.get("query", {}).get("geosearch", [])
            GEO_CACHE[geo_key] = geo_items

        for item in geo_items:
            title = item.get("title")
            if title and title.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                i_lat = item.get("lat")
                i_lon = item.get("lon")
                actual_dist = round(haversine_distance_m(lat, lng, i_lat, i_lon), 1) if (i_lat and i_lon) else item.get("dist")
                candidates[title] = {
                    "title": title,
                    "dist": actual_dist,
                    "lat": i_lat,
                    "lon": i_lon,
                    "source": "geosearch"
                }

    # 2. Textsuche nach Hofname
    if hofname and len(hofname) > 3 and not re.match(r"^[A-ZÄÖÜ\s\-\.]+\s+\d+", hofname):
        search_query = f'"{hofname}" Wien'
        text_params = {
            "action": "query",
            "list": "search",
            "srsearch": search_query,
            "srnamespace": "6",
            "srlimit": "15"
        }
        search_data = api_request(text_params)
        for item in search_data.get("query", {}).get("search", []):
            title = item.get("title")
            if title and title.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                if title not in candidates:
                    candidates[title] = {"title": title, "source": "text_name"}

    # 3. Textsuche nach Adresse (falls Hofname nicht spezifisch)
    if adresse and len(adresse) > 5 and len(candidates) < 5:
        addr_clean = re.sub(r"/\s*\d+.*", "", adresse).strip()
        search_query = f'"{addr_clean}" Wien'
        text_params = {
            "action": "query",
            "list": "search",
            "srsearch": search_query,
            "srnamespace": "6",
            "srlimit": "10"
        }
        search_data = api_request(text_params)
        for item in search_data.get("query", {}).get("search", []):
            title = item.get("title")
            if title and title.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                if title not in candidates:
                    candidates[title] = {"title": title, "source": "text_address"}

    if not candidates:
        return []

    # Metadaten für alle Kandidaten abrufen
    titles = list(candidates.keys())
    metadata_map = get_image_metadata(titles)

    result_list = []
    for title, cand in candidates.items():
        meta = metadata_map.get(title)
        if not meta or not meta.get("url"):
            continue

        # Distanz ermitteln
        dist = cand.get("dist")
        if dist is None and meta.get("lat") and meta.get("lon") and lat and lng:
            dist = round(haversine_distance_m(lat, lng, meta["lat"], meta["lon"]), 1)

        meta["dist"] = dist
        meta["search_source"] = cand["source"]
        result_list.append(meta)

    return result_list


def calculate_match_confidence(obj: dict, image: dict) -> tuple[float, list[str]]:
    """
    Berechnet die Zuordnungssicherheit (0.00 bis 1.00) zwischen einem Gemeindebau und einem Bild.
    Liefert (Score, Liste der Begründungen).
    """
    score = 0.0
    reasons = []

    hofname = (obj.get("hofname") or "").strip().lower()
    adresse = (obj.get("adresse") or "").strip().lower()
    bezirk = obj.get("bezirk")
    obj_lat = obj["breitengrad"]
    obj_lon = obj["laengengrad"]

    title = image.get("title", "").lower()
    desc = (image.get("description") or "").lower()
    combined_text = f"{title} {desc}"

    # Extrahiere Straßennamen aus Adresse
    street_match = re.match(r"^([a-zäöüß\s\.\-]+?)\s+(\d+)", adresse)
    street_name = street_match.group(1).strip() if street_match else adresse
    house_num = street_match.group(2).strip() if street_match else ""

    # Extrahiere Kern-Hofnamen (z.B. "karl-marx" aus "karl-marx-hof")
    core_hofname = re.sub(r"\b(hof|wohnhäuser|wohnhausanlage|siedlung)\b", "", hofname).strip()

    # 1. Hofname-Übereinstimmung
    if hofname and len(hofname) > 3:
        if hofname in combined_text:
            score += 0.50
            reasons.append(f"Exakter Hofname '{obj['hofname']}' im Bildtext (+0.50)")
        elif core_hofname and len(core_hofname) > 3 and core_hofname in combined_text:
            score += 0.40
            reasons.append(f"Kern-Hofname '{core_hofname}' im Bildtext (+0.40)")

    # 2. Adress-Übereinstimmung
    if street_name and len(street_name) > 4:
        if street_name in combined_text:
            if house_num and house_num in combined_text:
                score += 0.35
                reasons.append(f"Straße & Hausnummer '{street_name} {house_num}' im Bildtext (+0.35)")
            else:
                score += 0.20
                reasons.append(f"Straße '{street_name}' im Bildtext (+0.20)")

    # 3. Geografische Nähe
    dist = image.get("dist")
    if dist is not None:
        if dist <= 40:
            score += 0.30
            reasons.append(f"Hervorragende Geodistanz ({dist:.0f}m <= 40m) (+0.30)")
        elif dist <= 90:
            score += 0.25
            reasons.append(f"Sehr gute Geodistanz ({dist:.0f}m <= 90m) (+0.25)")
        elif dist <= 160:
            score += 0.15
            reasons.append(f"Gute Geodistanz ({dist:.0f}m <= 160m) (+0.15)")
        elif dist <= 250:
            score += 0.05
            reasons.append(f"Moderate Geodistanz ({dist:.0f}m <= 250m) (+0.05)")
        elif dist > 400:
            score -= 0.20
            reasons.append(f"Große Geodistanz ({dist:.0f}m > 400m) (-0.20)")

    # 4. Wiener Wohnen / Gemeindebau Schlüsselwörter
    if any(kw in combined_text for kw in ["gemeindebau", "wiener wohnen", "kommunaler wohnbau", "denkmalschutz wien"]):
        score += 0.10
        reasons.append("Gemeindebau/Kommunalbau-Kontext im Bildtext (+0.10)")

    # 5. Bezirksangabe
    if bezirk and (f"{bezirk}. bezirk" in combined_text or f"wien-{bezirk:02d}" in combined_text or f"1{bezirk:02d}0" in combined_text):
        score += 0.05
        reasons.append(f"Bezirksbezug ({bezirk}. Bezirk) im Bildtext (+0.05)")

    # 6. Negativfilter: Fremdobjekte in unmittelbarer Nähe (Bahnhöfe, Kirchen, etc.)
    negatives = ["u-bahn", "bahnhof", "pfarrkirche", "kirche", "friedhof", "schulgebäude", "volksschule", "haltepunkt"]
    # Nur strafen, wenn der Hofname NICHT explizit genannt wird
    if any(neg in combined_text for neg in negatives) and hofname not in combined_text:
        score -= 0.40
        reasons.append("Hinweis auf Fremdobjekt (z.B. Bahnhof/Kirche/Schule) ohne Hofnennung (-0.40)")

    # Plausibilitätsgrenzen
    final_score = max(0.0, min(1.0, round(score, 2)))
    return final_score, reasons


def run_enrichment(input_xml_path: Path, output_xml_path: Path, sample_ids: list[int] | None = None):
    print(f"=== Foto-Anreicherung via Wikimedia Commons API ===")
    print(f"Eingabe (rein lesend): {input_xml_path}")
    print(f"Ausgabe:               {output_xml_path}")
    print(f"Report (0.60 - 0.89):  {REPORT_CSV}")

    if not input_xml_path.exists():
        raise FileNotFoundError(f"Eingabedatei nicht gefunden: {input_xml_path}")

    # XML parsen
    with open(input_xml_path, "rb") as f:
        tree = ET.parse(f)
    root = tree.getroot()

    all_gemeindebauten = root.findall(".//gemeindebau")
    print(f"Anzahl Gemeindebauten im XML: {len(all_gemeindebauten)}")

    # Filtere auf Stichprobe, falls vorgegeben
    target_nodes = []
    for gb in all_gemeindebauten:
        oid = int(gb.attrib["objekt_id"])
        if sample_ids is None or oid in sample_ids:
            target_nodes.append(gb)

    print(f"Zu verarbeitende Objekte im Durchlauf: {len(target_nodes)}")

    REPORT_CSV.parent.mkdir(parents=True, exist_ok=True)
    csv_file = open(REPORT_CSV, "w", newline="", encoding="utf-8")
    csv_writer = csv.writer(csv_file)
    csv_writer.writerow([
        "objekt_id", "hofname", "adresse", "bezirk", "bild_titel",
        "zuordnungssicherheit", "entfernung_m", "quellseite_url",
        "vorschaubild_url", "fotograf", "lizenz", "lizenz_url",
        "aufnahmedatum", "begruendung"
    ])

    stats = {
        "total": len(target_nodes),
        "auto_accepted": 0,  # >= 0.90
        "manual_review": 0,  # 0.60 - 0.89
        "rejected": 0,       # < 0.60
        "no_candidates": 0,
        "licenses": {},
        "failures": []
    }

    start_time = time.time()

    for idx, node in enumerate(target_nodes, start=1):
        oid = int(node.attrib["objekt_id"])
        hofname = (node.findtext("hofname") or "").strip()
        adresse = (node.findtext("adresse") or "").strip()
        bezirk = int(node.findtext("bezirk") or "0")
        lat = float(node.findtext("breitengrad") or "0")
        lng = float(node.findtext("laengengrad") or "0")

        obj_data = {
            "objekt_id": oid,
            "hofname": hofname,
            "adresse": adresse,
            "bezirk": bezirk,
            "breitengrad": lat,
            "laengengrad": lng
        }

        verbose = len(target_nodes) <= 30
        if verbose:
            print(f"\n[{idx}/{len(target_nodes)}] Prüfe Objekt {oid}: '{hofname or adresse}' ({bezirk}. Bezirk)...")
        elif idx % 50 == 0 or idx == 1 or idx == len(target_nodes):
            pct = idx / len(target_nodes) * 100
            elapsed = time.time() - start_time
            rate = idx / elapsed if elapsed > 0 else 1
            eta_sec = (len(target_nodes) - idx) / rate if rate > 0 else 0
            print(f"[{idx:4d}/{len(target_nodes)}] ({pct:5.1f}%) | Übernommen: {stats['auto_accepted']} | Zur Prüfung: {stats['manual_review']} | Ohne: {stats['rejected']} | ETA: {eta_sec/60:.1f} min")

        candidates = search_commons(obj_data)
        if not candidates:
            if verbose:
                print("  -> Keine Bildkandidaten im Umkreis oder Volltext gefunden.")
            stats["no_candidates"] += 1
            stats["rejected"] += 1
            # Foto-Element mit xsi:nil="true" einhängen
            foto_elem = ET.SubElement(node, "foto")
            foto_elem.set("{http://www.w3.org/2001/XMLSchema-instance}nil", "true")
            continue

        # Bewerte alle Kandidaten
        scored_candidates = []
        for cand in candidates:
            c_score, c_reasons = calculate_match_confidence(obj_data, cand)
            scored_candidates.append((c_score, c_reasons, cand))

        # Nach Score sortieren (absteigend)
        scored_candidates.sort(key=lambda x: (x[0], -(x[2].get("dist") or 9999)), reverse=True)
        best_score, best_reasons, best_img = scored_candidates[0]

        if verbose:
            print(f"  Bester Kandidat: '{best_img['title']}' | Score: {best_score:.2f} | Dist: {best_img.get('dist')}m")
            print(f"  Gründe: {'; '.join(best_reasons)}")

        # Schwellenwert-Entscheidung
        if best_score >= 0.90:
            stats["auto_accepted"] += 1
            lic = best_img.get("license") or "Unbekannt"
            stats["licenses"][lic] = stats["licenses"].get(lic, 0) + 1

            # Element im XML anlegen
            foto_elem = ET.SubElement(node, "foto")
            foto_elem.set("zuordnungssicherheit", f"{best_score:.2f}")

            sub_fields = [
                ("bild_url", best_img.get("url")),
                ("vorschaubild_url", best_img.get("thumburl")),
                ("quellseite_url", best_img.get("descriptionurl")),
                ("fotograf", best_img.get("artist")),
                ("lizenz", best_img.get("license")),
                ("lizenz_url", best_img.get("license_url")),
                ("beschreibung", best_img.get("description")),
                ("aufnahmedatum", best_img.get("datetime")),
                ("entfernung_m", str(int(round(best_img["dist"]))) if best_img.get("dist") is not None else None)
            ]

            for tag_name, val in sub_fields:
                if val:
                    sub = ET.SubElement(foto_elem, tag_name)
                    sub.text = str(val)

            if verbose:
                print(f"  ==> [ÜBERNOMMEN >= 0.90] Lizenz: {lic}, Fotograf: {best_img.get('artist')}")
            else:
                print(f"  + [OK {best_score:.2f}] #{oid} {hofname or adresse} -> {best_img['title']}")

        elif best_score >= 0.60:
            stats["manual_review"] += 1
            csv_writer.writerow([
                oid, hofname, adresse, bezirk, best_img["title"],
                f"{best_score:.2f}",
                best_img.get("dist"),
                best_img.get("descriptionurl"),
                best_img.get("url"),
                best_img.get("artist"),
                best_img.get("license"),
                best_img.get("license_url"),
                best_img.get("datetime"),
                " | ".join(best_reasons)
            ])
            # Im XML bleibt xsi:nil="true"
            foto_elem = ET.SubElement(node, "foto")
            foto_elem.set("{http://www.w3.org/2001/XMLSchema-instance}nil", "true")
            foto_elem.set("zuordnungssicherheit", f"{best_score:.2f}")
            if verbose:
                print(f"  ==> [ZUR MANUELLEN PRÜFUNG (0.60-0.89)] In CSV exportiert.")

        else:
            stats["rejected"] += 1
            foto_elem = ET.SubElement(node, "foto")
            foto_elem.set("{http://www.w3.org/2001/XMLSchema-instance}nil", "true")
            if verbose:
                print(f"  ==> [VERWORFEN < 0.60]")
            stats["failures"].append({
                "objekt_id": oid,
                "name": hofname or adresse,
                "reason": f"Höchster Score {best_score:.2f} unter Schwellenwert 0.60"
            })

    csv_file.close()

    # Neues XML speichern (nur die Ziel-Knoten, falls gefiltert)
    output_xml_path.parent.mkdir(parents=True, exist_ok=True)
    if sample_ids is not None:
        # Erstelle schlankes XML mit den 25 Test-Objekten
        test_root = ET.Element("gemeindebauten_wien", root.attrib)
        test_root.set("anzahl_objekte", str(len(target_nodes)))
        
        # Metadaten kopieren
        meta = root.find("metadaten")
        if meta is not None:
            test_root.append(meta)
        
        gb_parent = ET.SubElement(test_root, "gemeindebauten")
        for n in target_nodes:
            gb_parent.append(n)
        
        new_tree = ET.ElementTree(test_root)
        new_tree.write(output_xml_path, encoding="utf-8", xml_declaration=True)
    else:
        tree.write(output_xml_path, encoding="utf-8", xml_declaration=True)

    elapsed = time.time() - start_time
    print(f"\nDurchlauf abgeschlossen in {elapsed:.1f} Sekunden.")
    return stats


def print_report(stats: dict):
    total = stats["total"]
    accepted = stats["auto_accepted"]
    manual = stats["manual_review"]
    rejected = stats["rejected"]

    print("\n" + "=" * 60)
    print("STATISTISCHER AUSWERTUNGSBERICHT (TESTLAUF 25 OBJEKTE)")
    print("=" * 60)
    print(f"Analysierte Objekte:                {total}")
    print(f"Automatisch übernommen (>= 0.90):   {accepted} ({accepted / total * 100:.1f} %)")
    print(f"Manuell zu prüfen (0.60 - 0.89):    {manual} ({manual / total * 100:.1f} %)")
    print(f"Verworfen / Keine Bilder (< 0.60):  {rejected} ({rejected / total * 100:.1f} %)")
    print("-" * 60)
    print("LIZENZVERTEILUNG DER ÜBERNOMMENEN BILDER:")
    if stats["licenses"]:
        for lic, count in sorted(stats["licenses"].items(), key=lambda x: x[1], reverse=True):
            print(f"  - {lic:30}: {count:2} ({count / accepted * 100:.1f} %)")
    else:
        print("  (Keine Lizenzen)")
    print("-" * 60)
    print("FEHLER- & ZWEIFELSFÄLLE / ZUR PRÜFUNG:")
    print(f"  - Manuelle Prüfung erforderlich:  {manual} Bilder in reports/bilder_manuell_pruefen.csv")
    print(f"  - Keine Treffer / unter 0.60:     {len(stats['failures'])} Fälle")
    for f in stats["failures"][:5]:
        print(f"    * ID {f['objekt_id']}: {f['name']} -> {f['reason']}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Gemeindebauten Foto-Anreicherung via Wikimedia Commons")
    parser.add_argument("--all", action="store_true", help="Führe vollständigen Lauf für alle 1.776 Objekte durch")
    parser.add_argument("--limit-25", action="store_true", help="Führe Testlauf mit 25 Objekten durch")
    parser.add_argument("--input-xml", type=Path, default=DEFAULT_INPUT_XML)
    parser.add_argument("--output-xml", type=Path, default=None)

    args = parser.parse_args()
    if args.all:
        sample = None
        output_xml = args.output_xml or (BASE_DIR / "data" / "Gemeindebauten_Wien_mit_Fotos.xml")
    else:
        sample = TEST_SAMPLE_OBJECT_IDS
        output_xml = args.output_xml or DEFAULT_OUTPUT_XML

    stats = run_enrichment(args.input_xml, output_xml, sample_ids=sample)
    print_report(stats)


if __name__ == "__main__":
    main()
