#!/usr/bin/env python3
"""
scripts/validate_assignment_with_shapely.py

Unabhängige Vergleichsvalidierung der räumlichen Point-in-Polygon-Zuordnung
aller 1.776 Wiener Gemeindebauten mit Shapely 2.x und GEOS C-Engine.

Prüft unabhängig:
- point.within(polygon)
- polygon.covers(point)
- Anzahl Zählgebietstreffer
- Anzahl Zählbezirkstreffer
- zugeordnetes ZGEB und ZBEZ
- Abgleich mit data/staging/gemeindebau_statistische_zuordnung.csv
- Metrische Grenzabstandsberechnung in EPSG:31256 (MGI / Austria GK East)

Erzeugt:
- reports/shapely_assignment_validation.json
- reports/shapely_assignment_differences.csv
"""

import os
import sys
import csv
import json
import math
import hashlib
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    import shapely
    from shapely.geometry import Point, Polygon
except ImportError:
    print("FEHLER: Shapely ist nicht installiert. Bitte .venv verwenden:")
    print("  .venv/bin/python scripts/validate_assignment_with_shapely.py")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent.parent
XML_PATH = BASE_DIR / "data" / "Gemeindebauten_Wien_KI.xml"
ZGEB_PATH = BASE_DIR / "data" / "raw" / "population" / "zaehlgebiete_wien.geojson"
ZBEZ_PATH = BASE_DIR / "data" / "raw" / "population" / "zaehlbezirke_wien.geojson"
STAGING_CSV_PATH = BASE_DIR / "data" / "staging" / "gemeindebau_statistische_zuordnung.csv"

REPORTS_DIR = BASE_DIR / "reports"
OUTPUT_JSON_PATH = REPORTS_DIR / "shapely_assignment_validation.json"
OUTPUT_CSV_PATH = REPORTS_DIR / "shapely_assignment_differences.csv"

EXPECTED_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"
TOTAL_RECORDS = 1776

# ---------------------------------------------------------------------------
# Geodätische Transformation WGS84 (EPSG:4326) -> MGI Austria GK East (EPSG:31256)
# Standard BEV (Bundesamt für Eich- und Vermessungswesen) 7-Parameter-Helmert-Shift
# ---------------------------------------------------------------------------
DX = 577.326
DY = 90.129
DZ = 463.919
RX = math.radians(5.137 / 3600.0)
RY = math.radians(1.474 / 3600.0)
RZ = math.radians(5.297 / 3600.0)
SCALE_FACTOR_PPM = 2.4232e-6

A_WGS = 6378137.0
F_WGS = 1.0 / 298.257223563
E2_WGS = 2 * F_WGS - F_WGS**2

A_BES = 6377397.155
F_BES = 1.0 / 299.1528128
E2_BES = 2 * F_BES - F_BES**2


def wgs84_to_mgi_bessel(lng: float, lat: float, h: float = 200.0) -> tuple[float, float]:
    """Konvertiert WGS84 Geokoordinaten via 7-Parameter-Helmert-Transformation auf das Bessel-Ellipsoid (MGI)."""
    phi = math.radians(lat)
    lam = math.radians(lng)
    sin_phi = math.sin(phi)
    cos_phi = math.cos(phi)
    n = A_WGS / math.sqrt(1.0 - E2_WGS * sin_phi**2)

    # Kartesische WGS84-Koordinaten
    x_wgs = (n + h) * cos_phi * math.cos(lam)
    y_wgs = (n + h) * cos_phi * math.sin(lam)
    z_wgs = (n * (1.0 - E2_WGS) + h) * sin_phi

    # Helmert-Rotation & Translation nach MGI
    x_mgi = x_wgs + DX + SCALE_FACTOR_PPM * x_wgs - RZ * y_wgs + RY * z_wgs
    y_mgi = y_wgs + DY + RZ * x_wgs + SCALE_FACTOR_PPM * y_wgs - RX * z_wgs
    z_mgi = z_wgs + DZ - RY * x_wgs + RX * y_wgs + SCALE_FACTOR_PPM * z_wgs

    # Rückprojektion auf Bessel-1841-Ellipsoid
    p = math.hypot(x_mgi, y_mgi)
    phi_bes = math.atan2(z_mgi, p * (1.0 - E2_BES))
    for _ in range(5):
        n_bes = A_BES / math.sqrt(1.0 - E2_BES * math.sin(phi_bes)**2)
        phi_bes = math.atan2(z_mgi + E2_BES * n_bes * math.sin(phi_bes), p)
    lam_bes = math.atan2(y_mgi, x_mgi)

    return lam_bes, phi_bes


def mgi_to_epsg31256(lam_bes: float, phi_bes: float) -> tuple[float, float]:
    """Gauß-Krüger-Abbildung MGI M34 Ost (Bezugslängenmeridian 16° 20' Ost = 16.3333333333°)."""
    lam0 = math.radians(16.0 + 20.0 / 60.0)
    b2 = A_BES**2 * (1.0 - E2_BES)
    e_prime2 = (A_BES**2 - b2) / b2
    sin_phi = math.sin(phi_bes)
    cos_phi = math.cos(phi_bes)
    tan_phi = math.tan(phi_bes)

    n = A_BES / math.sqrt(1.0 - E2_BES * sin_phi**2)
    t = tan_phi**2
    c = e_prime2 * cos_phi**2
    a = (lam_bes - lam0) * cos_phi

    m = A_BES * (
        (1.0 - E2_BES / 4.0 - 3.0 * E2_BES**2 / 64.0 - 5.0 * E2_BES**3 / 256.0) * phi_bes
        - (3.0 * E2_BES / 8.0 + 3.0 * E2_BES**2 / 32.0 + 45.0 * E2_BES**3 / 1024.0) * math.sin(2.0 * phi_bes)
        + (15.0 * E2_BES**2 / 256.0 + 45.0 * E2_BES**3 / 1024.0) * math.sin(4.0 * phi_bes)
        - (35.0 * E2_BES**3 / 3072.0) * math.sin(6.0 * phi_bes)
    )

    x = n * (a + (1.0 - t + c) * a**3 / 6.0 + (5.0 - 18.0 * t + t**2 + 72.0 * c - 58.0 * e_prime2) * a**5 / 120.0)
    y = m + n * tan_phi * (
        a**2 / 2.0
        + (5.0 - t + 9.0 * c + 4.0 * c**2) * a**4 / 24.0
        + (61.0 - 58.0 * t + t**2 + 600.0 * c - 330.0 * e_prime2) * a**6 / 720.0
    ) - 5000000.0

    return x, y


def project_wgs84_to_epsg31256(lng: float, lat: float) -> tuple[float, float]:
    """Wandelt WGS84 Koordinaten in metrische Koordinaten des österreichischen Bundesmeldenetzes EPSG:31256 um."""
    lam_bes, phi_bes = wgs84_to_mgi_bessel(lng, lat)
    return mgi_to_epsg31256(lam_bes, phi_bes)


def main():
    print("=== Starte unabhängige Validierung mit Shapely & GEOS ===")
    shapely_ver = shapely.__version__
    geos_ver = shapely.geos_version_string
    crs_name = "EPSG:31256 (MGI / Austria GK East)"
    print(f"✓ Shapely Version: {shapely_ver}")
    print(f"✓ GEOS Version: {geos_ver}")
    print(f"✓ Metrisches Referenzsystem: {crs_name}")

    # 1. XML Integrität prüfen
    with open(XML_PATH, "rb") as f:
        xml_sha = hashlib.sha256(f.read()).hexdigest()
    if xml_sha != EXPECTED_SHA256:
        raise ValueError("Original-XML Prüfsumme ungültig!")

    # 2. GeoJSONs laden
    with open(ZGEB_PATH, "r", encoding="utf-8") as f:
        zgeb_json = json.load(f)
    with open(ZBEZ_PATH, "r", encoding="utf-8") as f:
        zbez_json = json.load(f)

    # 3. Shapely Polygone & STRtree Index erstellen
    print("-> Erstelle Shapely Polygone und R-Tree Raumindizes...")
    zgeb_features = []
    zgeb_polys_wgs = []
    zgeb_polys_metric = {}

    for feat in zgeb_json["features"]:
        p = feat["properties"]
        coords = feat["geometry"]["coordinates"][0] # äußere Kontur
        poly = Polygon(coords)
        zgeb_polys_wgs.append(poly)
        zgeb_features.append(p)

    tree_zgeb = shapely.STRtree(zgeb_polys_wgs)

    zbez_features = []
    zbez_polys_wgs = []
    for feat in zbez_json["features"]:
        p = feat["properties"]
        coords = feat["geometry"]["coordinates"][0]
        poly = Polygon(coords)
        zbez_polys_wgs.append(poly)
        zbez_features.append(p)

    tree_zbez = shapely.STRtree(zbez_polys_wgs)

    # 4. Staging-Daten für den Abgleich laden
    with open(STAGING_CSV_PATH, "r", encoding="utf-8") as f:
        staging_rows = {r["objekt_id"]: r for r in csv.DictReader(f)}

    # 5. XML-Gemeindebauten parsen
    tree_xml = ET.parse(XML_PATH)
    bauten = tree_xml.findall(".//gemeindebau")
    if len(bauten) != TOTAL_RECORDS:
        raise ValueError(f"Erwartet 1.776 Gemeindebauten, gefunden: {len(bauten)}")

    print("-> Validiere alle 1.776 Objekte unabhängig mit Shapely (within, covers, distance)...")

    matched_zgeb_count = 0
    mismatched_zgeb_count = 0
    matched_zbez_count = 0
    mismatched_zbez_count = 0
    multiple_matches = 0
    unassigned = 0
    boundary_cases = 0
    close_under_1m = 0
    min_boundary_distance = float("inf")
    differences = []

    for elem in bauten:
        oid = elem.attrib.get("objekt_id")
        lat = float(elem.findtext("breitengrad"))
        lng = float(elem.findtext("laengengrad"))
        pt_wgs = Point(lng, lat)

        staging_ref = staging_rows.get(oid, {})
        staging_zgeb = staging_ref.get("zaehlgebiet_code", "")
        staging_zbez = staging_ref.get("zaehlbezirk_code", "")

        # A. Zählgebiet-Zuordnung via STRtree
        zg_candidate_indices = tree_zgeb.query(pt_wgs, predicate="intersects")
        zg_hits = []
        for idx in zg_candidate_indices:
            poly = zgeb_polys_wgs[idx]
            # Prüfe sowohl point.within(poly) als auch poly.covers(point)
            is_within = pt_wgs.within(poly)
            is_covered = poly.covers(pt_wgs)
            if is_within or is_covered:
                zg_hits.append((idx, zgeb_features[idx], is_within, is_covered))

        # B. Zählbezirk-Zuordnung via STRtree
        zb_candidate_indices = tree_zbez.query(pt_wgs, predicate="intersects")
        zb_hits = []
        for idx in zb_candidate_indices:
            poly = zbez_polys_wgs[idx]
            is_within = pt_wgs.within(poly)
            is_covered = poly.covers(pt_wgs)
            if is_within or is_covered:
                zb_hits.append((idx, zbez_features[idx], is_within, is_covered))

        # Prüfe Eindeutigkeit
        if len(zg_hits) == 0:
            unassigned += 1
            differences.append({
                "objekt_id": oid,
                "breitengrad": lat,
                "laengengrad": lng,
                "zgeb_staging": staging_zgeb,
                "zgeb_shapely": "",
                "zbez_staging": staging_zbez,
                "zbez_shapely": "",
                "treffer_zgeb": 0,
                "treffer_zbez": len(zb_hits),
                "within_match": False,
                "covers_match": False,
                "grenzdistanz_meter": 0.0,
                "differenz_grund": "nicht_zugeordnet"
            })
            continue

        if len(zg_hits) > 1:
            multiple_matches += 1
            differences.append({
                "objekt_id": oid,
                "breitengrad": lat,
                "laengengrad": lng,
                "zgeb_staging": staging_zgeb,
                "zgeb_shapely": ";".join(str(h[1]["ZGEB"]) for h in zg_hits),
                "zbez_staging": staging_zbez,
                "zbez_shapely": "",
                "treffer_zgeb": len(zg_hits),
                "treffer_zbez": len(zb_hits),
                "within_match": False,
                "covers_match": False,
                "grenzdistanz_meter": 0.0,
                "differenz_grund": "mehrfachtreffer"
            })
            continue

        # Genau 1 Zählgebiet-Treffer
        zg_idx, zg_props, is_within, is_covered = zg_hits[0]
        shapely_zgeb = str(zg_props.get("ZGEB", "")).strip()
        shapely_zbez = str(zb_hits[0][1].get("ZBEZ", "")).strip() if zb_hits else ""

        # Metrische Grenzabstandsberechnung in EPSG:31256 (MGI GK Ost)
        if zg_idx not in zgeb_polys_metric:
            coords_wgs = zgeb_json["features"][zg_idx]["geometry"]["coordinates"][0]
            coords_metric = [project_wgs84_to_epsg31256(c[0], c[1]) for c in coords_wgs]
            zgeb_polys_metric[zg_idx] = Polygon(coords_metric)

        poly_metric = zgeb_polys_metric[zg_idx]
        pt_metric = Point(project_wgs84_to_epsg31256(lng, lat))
        dist_boundary_m = poly_metric.exterior.distance(pt_metric)

        if dist_boundary_m < min_boundary_distance:
            min_boundary_distance = dist_boundary_m

        if dist_boundary_m < 1.0:
            close_under_1m += 1

        if not is_within and is_covered:
            boundary_cases += 1

        # Abgleich mit Staging-CSV
        diff_reasons = []
        if shapely_zgeb == staging_zgeb:
            matched_zgeb_count += 1
        else:
            mismatched_zgeb_count += 1
            diff_reasons.append(f"ZGEB-Abweichung: shapely={shapely_zgeb}, staging={staging_zgeb}")

        if shapely_zbez == staging_zbez:
            matched_zbez_count += 1
        else:
            mismatched_zbez_count += 1
            diff_reasons.append(f"ZBEZ-Abweichung: shapely={shapely_zbez}, staging={staging_zbez}")

        if diff_reasons:
            differences.append({
                "objekt_id": oid,
                "breitengrad": lat,
                "laengengrad": lng,
                "zgeb_staging": staging_zgeb,
                "zgeb_shapely": shapely_zgeb,
                "zbez_staging": staging_zbez,
                "zbez_shapely": shapely_zbez,
                "treffer_zgeb": len(zg_hits),
                "treffer_zbez": len(zb_hits),
                "within_match": is_within,
                "covers_match": is_covered,
                "grenzdistanz_meter": round(dist_boundary_m, 4),
                "differenz_grund": "; ".join(diff_reasons)
            })

    # 6. JSON-Bericht erstellen
    validation_summary = {
        "shapely_version": shapely_ver,
        "geos_version": geos_ver,
        "verwendetes_crs": crs_name,
        "gesamt_objekte": TOTAL_RECORDS,
        "uebereinstimmende_zaehlgebiete": matched_zgeb_count,
        "abweichende_zaehlgebiete": mismatched_zgeb_count,
        "uebereinstimmende_zaehlbezirke": matched_zbez_count,
        "abweichende_zaehlbezirke": mismatched_zbez_count,
        "mehrfachtreffer": multiple_matches,
        "nicht_zugeordnet": unassigned,
        "grenzfaelle": boundary_cases,
        "grenznahe_punkte_unter_1m": close_under_1m,
        "minimale_grenzdistanz_meter": round(min_boundary_distance, 3)
    }

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(validation_summary, f, indent=2, ensure_ascii=False)
    print(f"✓ JSON-Validierungsbericht geschrieben: {OUTPUT_JSON_PATH}")

    # 7. CSV-Differenzenbericht erstellen
    csv_fields = [
        "objekt_id",
        "breitengrad",
        "laengengrad",
        "zgeb_staging",
        "zgeb_shapely",
        "zbez_staging",
        "zbez_shapely",
        "treffer_zgeb",
        "treffer_zbez",
        "within_match",
        "covers_match",
        "grenzdistanz_meter",
        "differenz_grund"
    ]
    with open(OUTPUT_CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(differences)
    print(f"✓ Differenzenbericht geschrieben: {OUTPUT_CSV_PATH} ({len(differences)} Abweichungen)")

    print("\nErgebnis der Shapely/GEOS-Validierung:")
    print(f"  Gesamt: {TOTAL_RECORDS}")
    print(f"  Zählgebiete Übereinstimmung: {matched_zgeb_count} / {TOTAL_RECORDS} (Abweichungen: {mismatched_zgeb_count})")
    print(f"  Zählbezirke Übereinstimmung: {matched_zbez_count} / {TOTAL_RECORDS} (Abweichungen: {mismatched_zbez_count})")
    print(f"  Mehrfachtreffer: {multiple_matches}")
    print(f"  Nicht zugeordnet: {unassigned}")
    print(f"  Grenzfälle auf Kanten: {boundary_cases}")
    print(f"  Grenznähe (< 1 m): {close_under_1m}")
    print(f"  Minimale Grenzdistanz (EPSG:31256): {validation_summary['minimale_grenzdistanz_meter']} m")


if __name__ == "__main__":
    main()

