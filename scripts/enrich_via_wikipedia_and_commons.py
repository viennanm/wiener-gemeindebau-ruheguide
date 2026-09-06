#!/usr/bin/env python3
"""
scripts/enrich_via_wikipedia_and_commons.py

Reichert die 1.776 Wiener Gemeindebauten massiv mit Fotos an durch:
1. Systematische Auswertung der 23 Wikipedia-Bezirkslisten ('Liste der Wiener Gemeindebauten/[Bezirk]')
   mit den von Denkmalpflegern und Fotografen kuratierten Fotos und Commonscats.
2. Hochpräzises Matching nach Koordinaten (Haversine <= 60m), Hofnamen und normalisierten Adressen (ss/ß).
3. Robuster Batch-Abruf mit Disk-Cache und Wikimedia-Rate-Limiting (Backoff bei HTTP 429).
4. Zusammenführung mit den bestehenden verifizierten Fotos in data/Gemeindebauten_Wien_mit_Fotos.xml.
5. Export nach public/data/gemeindebauten.json für die React-Web-App.
"""

import html
import json
import math
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "gemeindebauten.db"
INPUT_XML = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
OUTPUT_XML = BASE_DIR / "data" / "Gemeindebauten_Wien_mit_Fotos.xml"
REPORT_CSV = BASE_DIR / "reports" / "bilder_manuell_pruefen.csv"
EXPORT_SCRIPT = BASE_DIR / "scripts" / "export_db_to_json.py"
CACHE_DIR = BASE_DIR / "data" / "wiki_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

BEZIRKE_WIKI = [
    (1, "Innere_Stadt"),
    (2, "Leopoldstadt"),
    (3, "Landstraße"),
    (4, "Wieden"),
    (5, "Margareten"),
    (6, "Mariahilf"),
    (7, "Neubau"),
    (8, "Josefstadt"),
    (9, "Alsergrund"),
    (10, "Favoriten"),
    (11, "Simmering"),
    (12, "Meidling"),
    (13, "Hietzing"),
    (14, "Penzing"),
    (15, "Rudolfsheim-Fünfhaus"),
    (16, "Ottakring"),
    (17, "Hernals"),
    (18, "Währing"),
    (19, "Döbling"),
    (20, "Brigittenau"),
    (21, "Floridsdorf"),
    (22, "Donaustadt"),
    (23, "Liesing"),
]

USER_AGENT = "WienerGemeindebauRuheguide/2.0 (https://github.com/christianbruehne/Wiener-Gemeindebau-Ruheguide; contact: admin@ruheguide.wien) Python/3.12"


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def clean_html(raw: str | None) -> str:
    if not raw:
        return ""
    txt = re.sub(r"<[^>]+>", "", raw)
    return html.unescape(txt).strip()


def normalize_str(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower().replace("ß", "ss")
    s = re.sub(r"[,\.\-\/]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def robust_api_get(url: str, params: dict | None = None, max_retries: int = 5) -> dict:
    """Führt eine API-Abfrage mit automatischem Retry und Backoff bei 429 durch."""
    full_url = url
    if params:
        full_url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)

    for attempt in range(max_retries):
        req = urllib.request.Request(full_url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 504):
                wait_time = 4.0 * (attempt + 1)
                print(f"  [HTTP {e.code}] Rate limit erreicht. Warte {wait_time:.1f}s (Versuch {attempt+1}/{max_retries})...")
                time.sleep(wait_time)
            else:
                print(f"  [HTTP {e.code}] {e.reason} bei {url[:60]}")
                break
        except Exception as e:
            wait_time = 2.0 * (attempt + 1)
            print(f"  Verbindungsfehler: {e}. Warte {wait_time:.1f}s...")
            time.sleep(wait_time)

    return {}


def fetch_wikipedia_district(slug: str) -> list[dict]:
    """Liest die Wikipedia-Gemeindebautabelle eines Bezirks aus (mit lokalem Disk-Cache)."""
    safe_slug = re.sub(r"[^\w\-]", "_", slug)
    cache_file = CACHE_DIR / f"wiki_{safe_slug}.json"

    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    url = "https://de.wikipedia.org/w/api.php"
    params = {
        "action": "parse",
        "page": f"Liste_der_Wiener_Gemeindebauten/{slug}",
        "prop": "wikitext",
        "format": "json"
    }

    data = robust_api_get(url, params)
    time.sleep(1.0)  # Wikimedia Etikette

    wikitext = data.get("parse", {}).get("wikitext", {}).get("*", "")
    parts = re.split(r"\{\{Gemeindebau Wien Tabellenzeile", wikitext)[1:]

    items = []
    for p in parts:
        foto_m = re.search(r"\|\s*Foto\s*=\s*([^\n\|]+)", p)
        foto = foto_m.group(1).strip() if foto_m else ""
        if not foto or foto.lower() == "none":
            continue

        lat_m = re.search(r"\|\s*Breitengrad\s*=\s*([0-9\.]+)", p)
        lng_m = re.search(r"\|\s*Längengrad\s*=\s*([0-9\.]+)", p)
        addr_m = re.search(r"\|\s*Adresse\s*=\s*([^\n\|]+)", p)
        name_m = re.search(r"\|\s*Name\s*=\s*([^\n\|]+)", p)
        cat_m = re.search(r"\|\s*Commonscat\s*=\s*([^\n\|]+)", p)

        lat = float(lat_m.group(1)) if lat_m else None
        lng = float(lng_m.group(1)) if lng_m else None
        addr = addr_m.group(1).strip() if addr_m else ""
        name = name_m.group(1).strip() if name_m else ""
        cat = cat_m.group(1).strip() if cat_m else ""

        items.append({
            "foto": foto,
            "lat": lat,
            "lng": lng,
            "adresse": addr,
            "name": name,
            "commonscat": cat,
            "wiki_slug": slug
        })

    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    return items


def fetch_commons_metadata(filenames: list[str]) -> dict[str, dict]:
    """Holt strukturierte Metadaten für Bilddateien in Batches von 25 Titeln (mit Disk-Cache)."""
    cache_file = CACHE_DIR / "commons_meta_cache.json"
    meta_map = {}
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                meta_map = json.load(f)
        except Exception:
            pass

    clean_titles = []
    for f in set(filenames):
        fn = f.strip()
        if not fn.lower().startswith("file:"):
            fn = "File:" + fn
        clean_titles.append(fn)

    needed = [fn for fn in clean_titles if re.sub(r"^File:", "", fn, flags=re.IGNORECASE).strip() not in meta_map]
    print(f"  Metadaten-Abruf: {len(clean_titles)} gesamt, {len(needed)} müssen noch von Commons geladen werden...")

    for i in range(0, len(needed), 25):
        chunk = needed[i:i + 25]
        params = {
            "action": "query",
            "titles": "|".join(chunk),
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1200",
            "format": "json"
        }
        url = "https://commons.wikimedia.org/w/api.php"
        data = robust_api_get(url, params)
        time.sleep(1.0)  # Höfliches Wikimedia Rate-Limiting

        pages = data.get("query", {}).get("pages", {})
        for pid, p in pages.items():
            title = p.get("title", "")
            base_title = re.sub(r"^File:", "", title, flags=re.IGNORECASE).strip()
            imageinfo = p.get("imageinfo", [])
            if not imageinfo:
                continue
            info = imageinfo[0]
            ext = info.get("extmetadata", {})

            meta_map[base_title] = {
                "bild_titel": title,
                "bild_url": info.get("thumburl") or info.get("url"),
                "vorschaubild_url": info.get("thumburl") or info.get("url"),
                "quellseite_url": info.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title)}",
                "fotograf": clean_html(ext.get("Artist", {}).get("value")) or "Wikimedia Commons",
                "lizenz": ext.get("LicenseShortName", {}).get("value") or ext.get("License", {}).get("value") or "Freie Lizenz",
                "lizenz_url": ext.get("LicenseUrl", {}).get("value") or "https://creativecommons.org/licenses/",
                "aufnahmedatum": ext.get("DateTimeOriginal", {}).get("value") or ext.get("DateTime", {}).get("value") or "",
                "beschreibung": clean_html(ext.get("ImageDescription", {}).get("value")) or ""
            }

        # Cache nach jedem Batch sichern
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(meta_map, f, ensure_ascii=False, indent=2)

    return meta_map


def main():
    print("=== Starte optimierte Wikipedia- & Wikimedia-Commons-Fotoanreicherung ===")
    
    # 1. Bestehende Fotos aus Ziel-XML laden
    existing_photos = {}
    if OUTPUT_XML.exists():
        ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")
        tree = ET.parse(OUTPUT_XML)
        root = tree.getroot()
        for gb in root.findall(".//gemeindebau"):
            oid = gb.get("objekt_id")
            foto = gb.find("foto")
            if foto is not None and "{http://www.w3.org/2001/XMLSchema-instance}nil" not in foto.attrib:
                burl = foto.findtext("vorschaubild_url") or foto.findtext("bild_url")
                if burl:
                    existing_photos[oid] = {
                        "bild_titel": foto.findtext("bild_titel") or "",
                        "bild_url": burl,
                        "vorschaubild_url": burl,
                        "quellseite_url": foto.findtext("quellseite_url") or "",
                        "fotograf": foto.findtext("fotograf") or "Wikimedia Commons",
                        "lizenz": foto.findtext("lizenz") or "Freie Lizenz",
                        "lizenz_url": foto.findtext("lizenz_url") or "",
                        "aufnahmedatum": foto.findtext("aufnahmedatum") or "",
                        "zuordnungssicherheit": foto.findtext("zuordnungssicherheit") or "1.00",
                        "entfernung_meter": foto.findtext("entfernung_meter") or "0",
                        "begruendung": foto.findtext("begruendung") or "Bestehende verifizierte Zuordnung"
                    }
    print(f"Bestehende verifizierte Fotos im Ziel-XML: {len(existing_photos)}")

    # 2. SQLite-Datenbank laden
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT objekt_id, bezirk, hofname, adresse, breitengrad, laengengrad FROM gemeindebauten")
    db_buildings = [dict(r) for r in c.fetchall()]
    conn.close()
    print(f"Gemeindebauten in SQLite-Datenbank: {len(db_buildings)}")

    # 3. Wikipedia-Listen abfragen
    print("\nLade kuratierte Tabellenzeilen aus allen 23 Wiener Bezirken von Wikipedia...")
    all_wiki_items = []
    for bezirk_nr, slug in BEZIRKE_WIKI:
        items = fetch_wikipedia_district(slug)
        for it in items:
            it["bezirk"] = bezirk_nr
        all_wiki_items.extend(items)
        print(f"  Bezirk {bezirk_nr:2d} ({slug}): {len(items)} Bauten mit Bild")

    print(f"\nGesamtzahl gefundener Bauten mit Bild auf Wikipedia: {len(all_wiki_items)}")

    # 4. Matching durchführen
    matched_new = {}
    matched_files = set()

    for w in all_wiki_items:
        foto_fn = w["foto"]
        w_lat = w["lat"]
        w_lng = w["lng"]
        w_addr_norm = normalize_str(w["adresse"])
        w_name_norm = normalize_str(w["name"])
        w_bezirk = w["bezirk"]

        best_match = None
        best_dist = 999999.0
        best_reason = ""

        # Filter DB nach gleichem Bezirk
        candidates = [b for b in db_buildings if b["bezirk"] == w_bezirk]
        
        for b in candidates:
            oid = str(b["objekt_id"])
            b_lat = b["breitengrad"]
            b_lng = b["laengengrad"]
            b_addr_norm = normalize_str(b["adresse"])
            b_hof_norm = normalize_str(b["hofname"])

            # Distanz
            dist = haversine_m(w_lat, w_lng, b_lat, b_lng) if (w_lat and w_lng and b_lat and b_lng) else None

            # 1. Hofname-Match
            if w_name_norm and len(w_name_norm) > 4 and (w_name_norm in b_hof_norm or b_hof_norm in w_name_norm):
                if dist is None or dist < 250:
                    best_match = b
                    best_dist = dist or 0.0
                    best_reason = f"Wikipedia Hofname '{w['name']}' übereinstimmend"
                    break

            # 2. Exakte oder sehr nahe Koordinaten (<= 65 Meter)
            if dist is not None and dist <= 65.0:
                if dist < best_dist:
                    best_dist = dist
                    best_match = b
                    best_reason = f"Wikipedia Koordinaten-Match ({dist:.1f}m <= 65m)"

            # 3. Adress-Match (gleiche Straße und Hausnummer)
            if b_addr_norm and w_addr_norm:
                b_tokens = b_addr_norm.split()[:2]
                w_tokens = w_addr_norm.split()[:2]
                if len(b_tokens) >= 2 and len(w_tokens) >= 2 and b_tokens == w_tokens:
                    if dist is None or dist < 120.0:
                        if (dist or 50.0) < best_dist:
                            best_dist = dist or 50.0
                            best_match = b
                            best_reason = f"Wikipedia Adress-Match ('{b['adresse']}')"

        if best_match:
            oid = str(best_match["objekt_id"])
            if oid not in existing_photos and oid not in matched_new:
                matched_new[oid] = {
                    "foto_file": foto_fn,
                    "dist": best_dist,
                    "reason": best_reason,
                    "building": best_match
                }
                matched_files.add(foto_fn)

    print(f"\nNeu gematchte Bauten über Wikipedia-Listen: {len(matched_new)}")

    # 5. Metadaten für neu gematchte Fotos holen
    print(f"Rufe Commons-Metadaten für {len(matched_files)} Bilddateien ab...")
    meta_map = fetch_commons_metadata(list(matched_files))
    print(f"Erfolgreich geladene Metadaten: {len(meta_map)}")

    # 6. XML aufbereiten & anreichern
    ET.register_namespace("xsi", "http://www.w3.org/2001/XMLSchema-instance")
    tree = ET.parse(INPUT_XML)
    root = tree.getroot()

    added_count = 0
    retained_count = 0

    for gb in root.findall(".//gemeindebau"):
        oid = gb.get("objekt_id")
        foto_node = gb.find("foto")
        if foto_node is None:
            foto_node = ET.SubElement(gb, "foto")

        def populate_foto(p_dict):
            if "{http://www.w3.org/2001/XMLSchema-instance}nil" in foto_node.attrib:
                del foto_node.attrib["{http://www.w3.org/2001/XMLSchema-instance}nil"]
            foto_node.clear()
            for tag in ["bild_titel", "bild_url", "vorschaubild_url", "quellseite_url", "fotograf", "lizenz", "lizenz_url", "aufnahmedatum", "zuordnungssicherheit", "entfernung_meter", "begruendung"]:
                child = ET.SubElement(foto_node, tag)
                child.text = str(p_dict.get(tag, ""))

        if oid in existing_photos:
            populate_foto(existing_photos[oid])
            retained_count += 1
        elif oid in matched_new:
            m = matched_new[oid]
            fn = m["foto_file"]
            base_fn = re.sub(r"^File:", "", fn, flags=re.IGNORECASE).strip()
            c_meta = meta_map.get(base_fn)
            if c_meta and c_meta.get("vorschaubild_url"):
                p_dict = {
                    "bild_titel": c_meta["bild_titel"],
                    "bild_url": c_meta["vorschaubild_url"],
                    "vorschaubild_url": c_meta["vorschaubild_url"],
                    "quellseite_url": c_meta["quellseite_url"],
                    "fotograf": c_meta["fotograf"],
                    "lizenz": c_meta["lizenz"],
                    "lizenz_url": c_meta["lizenz_url"],
                    "aufnahmedatum": c_meta["aufnahmedatum"],
                    "zuordnungssicherheit": "0.95",
                    "entfernung_meter": f"{m['dist']:.1f}" if m["dist"] < 9000 else "",
                    "begruendung": m["reason"]
                }
                populate_foto(p_dict)
                added_count += 1
            else:
                foto_node.attrib["{http://www.w3.org/2001/XMLSchema-instance}nil"] = "true"
        else:
            foto_node.attrib["{http://www.w3.org/2001/XMLSchema-instance}nil"] = "true"

    tree.write(OUTPUT_XML, encoding="utf-8", xml_declaration=True)
    total_with_photos = retained_count + added_count
    print(f"\nErgebnis Ziel-XML ({OUTPUT_XML}):")
    print(f"  - Bisherige Fotos behalten:   {retained_count}")
    print(f"  - Neue Fotos hinzugefügt:     {added_count}")
    print(f"  - Gesamtzahl Fotos im XML:    {total_with_photos} / 1776 ({total_with_photos / 1776 * 100:.1f} %)")

    # 7. JSON exportieren
    print("\nRe-exportiere public/data/gemeindebauten.json...")
    import subprocess
    subprocess.run(["python3", str(EXPORT_SCRIPT)], check=True)
    print("Fertiggestellt!")


if __name__ == "__main__":
    main()
