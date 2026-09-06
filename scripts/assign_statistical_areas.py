#!/usr/bin/env python3
"""
scripts/assign_statistical_areas.py

Führt die räumliche Point-in-Polygon-Zuordnung aller 1.776 Gemeindebauten
aus data/Gemeindebauten_Wien_KI.xml zu den amtlichen Zählgebieten,
Zählbezirken, Prognoseregionen und Gebietstypen der Stadt Wien durch.

Eingangsdaten (read-only):
- data/Gemeindebauten_Wien_KI.xml
- data/raw/population/zaehlgebiete_wien.geojson
- data/raw/population/zaehlbezirke_wien.geojson
- data/raw/population/gebietstypen_2021_wien.geojson
- data/raw/population/prognoseregionen_zuordnung_2023.csv

Ausgangsdaten:
- data/staging/gemeindebau_statistische_zuordnung.csv
- reports/statistische_zuordnung_qa.csv
- reports/statistische_zuordnung_summary.json
"""

import os
import sys
import csv
import json
import math
import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ORIGINAL_XML_SHA256 = "ed68b173424ade90ae3ba245427836c882f95d70733ccfbcff041dafa7f8c097"

# Wiener Wertebereich (WGS84 EPSG:4326)
WIEN_LAT_MIN = 48.10
WIEN_LAT_MAX = 48.35
WIEN_LNG_MIN = 16.15
WIEN_LNG_MAX = 16.60

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

    x_wgs = (n + h) * cos_phi * math.cos(lam)
    y_wgs = (n + h) * cos_phi * math.sin(lam)
    z_wgs = (n * (1.0 - E2_WGS) + h) * sin_phi

    x_mgi = x_wgs + DX + SCALE_FACTOR_PPM * x_wgs - RZ * y_wgs + RY * z_wgs
    y_mgi = y_wgs + DY + RZ * x_wgs + SCALE_FACTOR_PPM * y_wgs - RX * z_wgs
    z_mgi = z_wgs + DZ - RY * x_wgs + RX * y_wgs + SCALE_FACTOR_PPM * z_wgs

    p = math.hypot(x_mgi, y_mgi)
    phi_bes = math.atan2(z_mgi, p * (1.0 - E2_BES))
    for _ in range(5):
        n_bes = A_BES / math.sqrt(1.0 - E2_BES * math.sin(phi_bes)**2)
        phi_bes = math.atan2(z_mgi + E2_BES * n_bes * math.sin(phi_bes), p)
    lam_bes = math.atan2(y_mgi, x_mgi)
    return lam_bes, phi_bes


def project_wgs84_to_epsg31256(lng: float, lat: float) -> tuple[float, float]:
    """Gauß-Krüger-Abbildung MGI M34 Ost (EPSG:31256, Bezugsmeridian 16° 20' Ost)."""
    lam_bes, phi_bes = wgs84_to_mgi_bessel(lng, lat)
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


def min_dist_to_ring_m(px: float, py: float, ring: list) -> float:
    """Berechnet den kürzesten metrischen Abstand im amtlichen Koordinatensystem EPSG:31256."""
    pm_x, pm_y = project_wgs84_to_epsg31256(px, py)
    min_d = float("inf")
    n = len(ring)
    for i in range(n - 1):
        p1x, p1y = project_wgs84_to_epsg31256(ring[i][0], ring[i][1])
        p2x, p2y = project_wgs84_to_epsg31256(ring[i+1][0], ring[i+1][1])
        dx = p2x - p1x
        dy = p2y - p1y
        if dx == 0 and dy == 0:
            d = math.hypot(pm_x - p1x, pm_y - p1y)
        else:
            t = ((pm_x - p1x) * dx + (pm_y - p1y) * dy) / (dx * dx + dy * dy)
            t = max(0.0, min(1.0, t))
            cx = p1x + t * dx
            cy = p1y + t * dy
            d = math.hypot(pm_x - cx, pm_y - cy)
        if d < min_d:
            min_d = d
    return min_d


def point_in_ring(x: float, y: float, ring: list) -> tuple[bool, bool]:
    """
    Ray-Casting Algorithmus (Jordan Curve Theorem) zur Prüfung,
    ob der Punkt (x=lng, y=lat) innerhalb eines Ringes liegt.

    Rückgabe: (inside: bool, on_boundary: bool)
    """
    n = len(ring)
    inside = False
    on_boundary = False
    # Numerische Toleranz in Grad WGS84: 10^-9 Grad entsprechen rund 0,11 mm bzw. ~100 µm
    eps = 1e-9

    p1x, p1y = ring[0]
    for i in range(1, n + 1):
        p2x, p2y = ring[i % n]

        # Prüfen, ob der Punkt exakt auf dem Segment liegt
        cross = (y - p1y) * (p2x - p1x) - (x - p1x) * (p2y - p1y)
        if abs(cross) < eps:
            if (min(p1x, p2x) - eps <= x <= max(p1x, p2x) + eps and
                min(p1y, p2y) - eps <= y <= max(p1y, p2y) + eps):
                on_boundary = True

        # Ray-Casting Schnittprüfung
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
        p1x, p1y = p2x, p2y

    return inside, on_boundary

def index_geojson_features(features: list) -> list:
    """
    Erstellt einen Bounding-Box-Index für jedes Polygon/MultiPolygon.
    Unterstützt Außenringe und Innenringe (Löcher).
    """
    indexed = []
    for feat in features:
        geom = feat.get("geometry", {})
        gtype = geom.get("type")
        coords = geom.get("coordinates", [])
        props = feat.get("properties", {})

        min_x, min_y = 180.0, 90.0
        max_x, max_y = -180.0, -90.0

        rings_list = [] # list of (exterior_ring, [interior_rings])
        if gtype == "Polygon":
            if coords:
                ext = coords[0]
                holes = coords[1:] if len(coords) > 1 else []
                rings_list.append((ext, holes))
                for pt in ext:
                    min_x = min(min_x, pt[0])
                    max_x = max(max_x, pt[0])
                    min_y = min(min_y, pt[1])
                    max_y = max(max_y, pt[1])
        elif gtype == "MultiPolygon":
            for poly in coords:
                if poly:
                    ext = poly[0]
                    holes = poly[1:] if len(poly) > 1 else []
                    rings_list.append((ext, holes))
                    for pt in ext:
                        min_x = min(min_x, pt[0])
                        max_x = max(max_x, pt[0])
                        min_y = min(min_y, pt[1])
                        max_y = max(max_y, pt[1])
        else:
            raise ValueError(f"Unerwarteter Geometrietyp: {gtype}")

        indexed.append({
            "bbox": (min_x, min_y, max_x, max_y),
            "rings": rings_list,
            "props": props
        })
    return indexed

def match_point_to_features(x: float, y: float, indexed_features: list) -> list[tuple[dict, bool, float]]:
    """
    Prüft einen Punkt (x=lng, y=lat) gegen alle indizierten Features.
    Gibt eine Liste von (properties, is_grenzfall, min_dist_to_boundary_m) zurück.
    """
    matches = []
    for feat in indexed_features:
        bx1, by1, bx2, by2 = feat["bbox"]
        # Schneller Bounding-Box-Ausschluss
        if not (bx1 <= x <= bx2 and by1 <= y <= by2):
            continue

        in_feature = False
        on_feature_edge = False
        min_boundary_dist = float('inf')

        for ext, holes in feat["rings"]:
            in_ext, on_ext = point_in_ring(x, y, ext)
            if in_ext or on_ext:
                # Prüfen, ob Punkt in einem Loch (Interior Ring) liegt
                in_hole = False
                for hole in holes:
                    in_h, on_h = point_in_ring(x, y, hole)
                    if in_h and not on_h:
                        in_hole = True
                        break
                if not in_hole:
                    in_feature = True
                    if on_ext:
                        on_feature_edge = True
                    # Distanz zur Außengrenze und zu Löchern ermitteln
                    min_boundary_dist = min_dist_to_ring_m(x, y, ext)
                    for hole in holes:
                        dh = min_dist_to_ring_m(x, y, hole)
                        if dh < min_boundary_dist:
                            min_boundary_dist = dh
                    break

        if in_feature:
            matches.append((feat["props"], on_feature_edge, min_boundary_dist))

    return matches

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    xml_path = os.path.join(base_dir, "data", "Gemeindebauten_Wien_KI.xml")
    zgeb_geojson_path = os.path.join(base_dir, "data", "raw", "population", "zaehlgebiete_wien.geojson")
    zbez_geojson_path = os.path.join(base_dir, "data", "raw", "population", "zaehlbezirke_wien.geojson")
    gtyp_geojson_path = os.path.join(base_dir, "data", "raw", "population", "gebietstypen_2021_wien.geojson")
    prg_csv_path = os.path.join(base_dir, "data", "raw", "population", "prognoseregionen_zuordnung_2023.csv")

    staging_dir = os.path.join(base_dir, "data", "staging")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(staging_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    print("=== Starte räumliche Point-in-Polygon-Zuordnung (Phase 3) ===")

    # 1. Prüfe Original-XML Prüfsumme
    with open(xml_path, "rb") as f:
        xml_sha = hashlib.sha256(f.read()).hexdigest()
    if xml_sha != ORIGINAL_XML_SHA256:
        raise ValueError(f"SICHERHEITSFEHLER: Original-XML Prüfsumme ungültig! {xml_sha}")
    print("✓ Original-XML Prüfsumme verifiziert.")

    # 2. Lade Geodaten und Referenzdaten
    with open(zgeb_geojson_path, "r", encoding="utf-8") as f:
        zgeb_data = json.load(f)
    with open(zbez_geojson_path, "r", encoding="utf-8") as f:
        zbez_data = json.load(f)
    with open(gtyp_geojson_path, "r", encoding="utf-8") as f:
        gtyp_data = json.load(f)

    # Prognoseregionen-Lookup (SUB_DISTRICT_CODE -> PRG_CODE)
    prg_map = {}
    with open(prg_csv_path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
        reader = csv.DictReader(lines[1:], delimiter=";")
        for r in reader:
            prg_map[str(r["SUB_DISTRICT_CODE"]).strip()] = str(r["PRG_CODE"]).strip()

    # Gebietstypen-Lookup (ZGEB -> properties)
    gtyp_map = {}
    for feat in gtyp_data.get("features", []):
        p = feat.get("properties", {})
        zgeb_key = str(p.get("ZGEB", "")).strip()
        if zgeb_key:
            gtyp_map[zgeb_key] = p

    print(f"✓ Geladene Features: {len(zgeb_data.get('features', []))} Zählgebiete, {len(zbez_data.get('features', []))} Zählbezirke")
    print(f"✓ Geladene Referenzen: {len(prg_map)} Prognoseregionen, {len(gtyp_map)} Gebietstypen")

    # 3. Indiziere Polygone
    print("-> Indiziere Geometrien...")
    indexed_zgeb = index_geojson_features(zgeb_data.get("features", []))
    indexed_zbez = index_geojson_features(zbez_data.get("features", []))

    # 4. Parse Gemeindebauten aus XML
    print("-> Lese Gemeindebauten aus XML...")
    tree = ET.parse(xml_path)
    root = tree.getroot()
    bauten_nodes = root.findall(".//gemeindebau")
    if len(bauten_nodes) != 1776:
        raise ValueError(f"FEHLER: Genau 1.776 Gemeindebauten erwartet, {len(bauten_nodes)} gefunden!")

    seen_ids = set()
    zuordnung_rows = []
    qa_anomalies = []

    # Zähler für Zusammenfassung
    stats = {
        "gesamt_objekte": 1776,
        "eindeutig_zugeordnet": 0,
        "grenzfaelle": 0,
        "grenznahe_punkte_unter_1m": 0,
        "mindestdistanz_grenze_meter": 0.0,
        "mehrfachtreffer": 0,
        "nicht_zugeordnet": 0,
        "bezirkswidersprueche": 0,
        "zaehlbezirkswidersprueche": 0,
        "fehlende_prognoseregionen": 0,
        "fehlende_gebietstypen": 0,
        "ungueltige_koordinaten": 0,
        "anzahl_zaehlgebiete_mit_gemeindebau": 0,
        "anzahl_zaehlbezirke_mit_gemeindebau": 0,
        "gesamtzahl_prognoseregionen": 0,
        "anzahl_prognoseregionen_mit_gemeindebau": 0,
        "prognoseregionen_ohne_gemeindebau": [],
        "prognoseregionen_abdeckungsquote_prozent": 0.0
    }

    used_zgeb = set()
    used_zbez = set()
    used_prg = set()
    min_dist_overall = float("inf")

    for node in bauten_nodes:
        oid_raw = node.attrib.get("objekt_id")
        if not oid_raw or not oid_raw.isdigit():
            raise ValueError(f"Ungültige objekt_id: {oid_raw}")
        oid = int(oid_raw)
        if oid in seen_ids:
            raise ValueError(f"Doppelte objekt_id gefunden: {oid}")
        seen_ids.add(oid)

        bez_bisher_raw = node.findtext("bezirk")
        bez_bisher = int(bez_bisher_raw) if bez_bisher_raw and bez_bisher_raw.isdigit() else None

        lat_str = node.findtext("breitengrad")
        lng_str = node.findtext("laengengrad")

        # Koordinatenvalidierung
        try:
            lat = float(lat_str)
            lng = float(lng_str)
            coords_valid = (WIEN_LAT_MIN <= lat <= WIEN_LAT_MAX and WIEN_LNG_MIN <= lng <= WIEN_LNG_MAX)
        except (ValueError, TypeError):
            coords_valid = False

        if not coords_valid:
            stats["ungueltige_koordinaten"] += 1
            row = {
                "objekt_id": str(oid),
                "breitengrad": lat_str or "",
                "laengengrad": lng_str or "",
                "gemeindebezirk_bisher": str(bez_bisher) if bez_bisher else "",
                "gemeindebezirk_polygon": "",
                "zaehlgebiet_code": "",
                "zaehlbezirk_code": "",
                "sub_district_code": "",
                "prognoseregion_code": "",
                "gebietstyp_code": "",
                "gebietstyp": "",
                "aggregierter_gebietstyp_code": "",
                "aggregierter_gebietstyp": "",
                "zuordnungsmethode": "point_in_polygon_ray_casting",
                "anzahl_polygon_treffer": "0",
                "grenzfall": "0",
                "bezirk_konsistent": "0",
                "zaehlbezirk_konsistent": "0",
                "qualitaetsstatus": "ungueltige_koordinaten"
            }
            zuordnung_rows.append(row)
            qa_anomalies.append(row)
            continue

        # Point-in-Polygon Abgleich
        zgeb_matches = match_point_to_features(lng, lat, indexed_zgeb)
        zbez_matches = match_point_to_features(lng, lat, indexed_zbez)

        anzahl_treffer = len(zgeb_matches)

        if anzahl_treffer == 0:
            stats["nicht_zugeordnet"] += 1
            row = {
                "objekt_id": str(oid),
                "breitengrad": f"{lat:.6f}",
                "laengengrad": f"{lng:.6f}",
                "gemeindebezirk_bisher": str(bez_bisher),
                "gemeindebezirk_polygon": "",
                "zaehlgebiet_code": "",
                "zaehlbezirk_code": "",
                "sub_district_code": "",
                "prognoseregion_code": "",
                "gebietstyp_code": "",
                "gebietstyp": "",
                "aggregierter_gebietstyp_code": "",
                "aggregierter_gebietstyp": "",
                "zuordnungsmethode": "point_in_polygon_ray_casting",
                "anzahl_polygon_treffer": "0",
                "grenzfall": "0",
                "bezirk_konsistent": "0",
                "zaehlbezirk_konsistent": "0",
                "qualitaetsstatus": "nicht_zugeordnet"
            }
            zuordnung_rows.append(row)
            qa_anomalies.append(row)
            continue

        if anzahl_treffer > 1:
            stats["mehrfachtreffer"] += 1
            row = {
                "objekt_id": str(oid),
                "breitengrad": f"{lat:.6f}",
                "laengengrad": f"{lng:.6f}",
                "gemeindebezirk_bisher": str(bez_bisher),
                "gemeindebezirk_polygon": "",
                "zaehlgebiet_code": ";".join(str(m[0].get("ZGEB", "")) for m in zgeb_matches),
                "zaehlbezirk_code": "",
                "sub_district_code": "",
                "prognoseregion_code": "",
                "gebietstyp_code": "",
                "gebietstyp": "",
                "aggregierter_gebietstyp_code": "",
                "aggregierter_gebietstyp": "",
                "zuordnungsmethode": "point_in_polygon_ray_casting",
                "anzahl_polygon_treffer": str(anzahl_treffer),
                "grenzfall": "1",
                "bezirk_konsistent": "0",
                "zaehlbezirk_konsistent": "0",
                "qualitaetsstatus": "mehrfachtreffer"
            }
            zuordnung_rows.append(row)
            qa_anomalies.append(row)
            continue

        # Genau 1 Zählgebiet-Treffer
        zgeb_props, is_grenzfall, dist_boundary = zgeb_matches[0]
        zgeb_code = str(zgeb_props.get("ZGEB", "")).strip()
        zbez_code = str(zgeb_props.get("ZBEZ", "")).strip()
        bez_poly_raw = zgeb_props.get("BEZ")
        bez_poly = int(bez_poly_raw) if bez_poly_raw is not None else None

        # Zählbezirk-Polygon Treffer zur Gegenprobe
        zbez_poly_match_code = str(zbez_matches[0][0].get("ZBEZ", "")).strip() if zbez_matches else ""

        sub_district_code = "9" + zbez_code
        prg_code = prg_map.get(sub_district_code, "")

        gtyp_props = gtyp_map.get(zgeb_code, {})
        gtyp_code = str(gtyp_props.get("GEBIETSTYP_CODE", "")).strip()
        gtyp_name = str(gtyp_props.get("GEBIETSTYP", "")).strip()
        agg_gtyp_code = str(gtyp_props.get("AGGREGIERTER_GEBIETSTYP_CODE", "")).strip()
        agg_gtyp_name = str(gtyp_props.get("AGGREGIERTER_GEBIETSTYP", "")).strip()

        bezirk_konsistent = 1 if (bez_bisher == bez_poly) else 0
        zaehlbezirk_konsistent = 1 if (zbez_code == zbez_poly_match_code) else 0

        # Grenznähe (< 1 Meter)
        is_grenznah = 1 if dist_boundary < 1.0 else 0
        if is_grenznah:
            stats["grenznahe_punkte_unter_1m"] += 1
        if dist_boundary < min_dist_overall:
            min_dist_overall = dist_boundary

        # Statusbestimmung
        if not bezirk_konsistent:
            status = "bezirkswiderspruch"
            stats["bezirkswidersprueche"] += 1
        elif not zaehlbezirk_konsistent:
            status = "zaehlbezirkswiderspruch"
            stats["zaehlbezirkswidersprueche"] += 1
        elif not prg_code:
            status = "prognoseregion_fehlt"
            stats["fehlende_prognoseregionen"] += 1
        elif not gtyp_name:
            status = "gebietstyp_fehlt"
            stats["fehlende_gebietstypen"] += 1
        elif is_grenzfall:
            status = "grenzfall_eindeutig_aufgeloest"
            stats["grenzfaelle"] += 1
        else:
            status = "eindeutig_zugeordnet"
            stats["eindeutig_zugeordnet"] += 1

        if zgeb_code:
            used_zgeb.add(zgeb_code)
        if zbez_code:
            used_zbez.add(zbez_code)
        if prg_code:
            used_prg.add(prg_code)

        row = {
            "objekt_id": str(oid),
            "breitengrad": f"{lat:.6f}",
            "laengengrad": f"{lng:.6f}",
            "gemeindebezirk_code": str(bez_poly) if bez_poly is not None else "",
            "gemeindebezirk_bisher": str(bez_bisher),
            "gemeindebezirk_polygon": str(bez_poly),
            "zaehlgebiet_code": zgeb_code,
            "zaehlbezirk_code": zbez_code,
            "sub_district_code": sub_district_code,
            "prognoseregion_code": prg_code,
            "gebietstyp_code": gtyp_code,
            "gebietstyp": gtyp_name,
            "aggregierter_gebietstyp_code": agg_gtyp_code,
            "aggregierter_gebietstyp": agg_gtyp_name,
            "zuordnungsmethode": "point_in_polygon_ray_casting",
            "geometrie_datenstand": str(zgeb_props.get("AKT_TIMESTAMP", "2026-09-03T22:00:00Z"))[:10],
            "anzahl_polygon_treffer": "1",
            "grenzfall": "1" if is_grenzfall else "0",
            "grenznah_unter_1m": "1" if is_grenznah else "0",
            "grenzdistanz_meter": f"{dist_boundary:.3f}",
            "bezirk_konsistent": str(bezirk_konsistent),
            "zaehlbezirk_konsistent": str(zaehlbezirk_konsistent),
            "qualitaetsstatus": status
        }
        zuordnung_rows.append(row)

        if status != "eindeutig_zugeordnet":
            qa_anomalies.append(row)

    all_prgs = set(prg_map.values())
    unassigned_prgs = sorted(list(all_prgs - used_prg))

    stats["anzahl_zaehlgebiete_mit_gemeindebau"] = len(used_zgeb)
    stats["anzahl_zaehlbezirke_mit_gemeindebau"] = len(used_zbez)
    stats["gesamtzahl_prognoseregionen"] = len(all_prgs)
    stats["anzahl_prognoseregionen_mit_gemeindebau"] = len(used_prg)
    stats["prognoseregionen_ohne_gemeindebau"] = unassigned_prgs
    stats["prognoseregionen_abdeckungsquote_prozent"] = round((len(used_prg) / len(all_prgs)) * 100, 2)
    stats["mindestdistanz_grenze_meter"] = round(min_dist_overall, 3) if min_dist_overall != float("inf") else 0.0

    # 5. Speichern data/staging/gemeindebau_statistische_zuordnung.csv
    staging_csv_path = os.path.join(staging_dir, "gemeindebau_statistische_zuordnung.csv")
    csv_columns = [
        "objekt_id",
        "breitengrad",
        "laengengrad",
        "gemeindebezirk_code",
        "gemeindebezirk_bisher",
        "gemeindebezirk_polygon",
        "zaehlgebiet_code",
        "zaehlbezirk_code",
        "sub_district_code",
        "prognoseregion_code",
        "gebietstyp_code",
        "gebietstyp",
        "aggregierter_gebietstyp_code",
        "aggregierter_gebietstyp",
        "zuordnungsmethode",
        "geometrie_datenstand",
        "anzahl_polygon_treffer",
        "grenzfall",
        "grenznah_unter_1m",
        "grenzdistanz_meter",
        "bezirk_konsistent",
        "zaehlbezirk_konsistent",
        "qualitaetsstatus"
    ]
    with open(staging_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()
        writer.writerows(zuordnung_rows)
    print(f"✓ Zuordnungsergebnis geschrieben: {staging_csv_path} ({len(zuordnung_rows)} Zeilen)")

    # 6. Speichern reports/statistische_zuordnung_qa.csv
    qa_csv_path = os.path.join(reports_dir, "statistische_zuordnung_qa.csv")
    with open(qa_csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()
        writer.writerows(qa_anomalies)
    print(f"✓ QA-Bericht geschrieben: {qa_csv_path} ({len(qa_anomalies)} Auffälligkeiten)")

    # 7. Speichern reports/statistische_zuordnung_summary.json
    summary_json_path = os.path.join(reports_dir, "statistische_zuordnung_summary.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"✓ Zusammenfassung geschrieben: {summary_json_path}")

    # 8. Unveränderte Original-XML Prüfsumme nach Ausführung bestätigen
    with open(xml_path, "rb") as f:
        xml_sha_after = hashlib.sha256(f.read()).hexdigest()
    if xml_sha_after != ORIGINAL_XML_SHA256:
        raise ValueError(f"SICHERHEITSFEHLER: Original-XML wurde unerlaubt verändert!")
    print(f"✓ Original-XML unverändert (SHA-256: {xml_sha_after})")

    print("\nPhase 3 erfolgreich abgeschlossen:")
    print(f"  Gesamt: {stats['gesamt_objekte']}")
    print(f"  Eindeutig zugeordnet: {stats['eindeutig_zugeordnet']}")
    print(f"  Grenzfälle: {stats['grenzfaelle']}")
    print(f"  Mehrfachtreffer: {stats['mehrfachtreffer']}")
    print(f"  Nicht zugeordnet: {stats['nicht_zugeordnet']}")
    print(f"  Bezirkswidersprüche: {stats['bezirkswidersprueche']}")
    print(f"  Zählbezirkswidersprüche: {stats['zaehlbezirkswidersprueche']}")
    print(f"  Zählgebiete mit Gemeindebau: {stats['anzahl_zaehlgebiete_mit_gemeindebau']}")
    print(f"  Zählbezirke mit Gemeindebau: {stats['anzahl_zaehlbezirke_mit_gemeindebau']}")
    print(f"  Gesamtzahl Prognoseregionen: {stats['gesamtzahl_prognoseregionen']}")
    print(f"  Prognoseregionen mit Gemeindebau: {stats['anzahl_prognoseregionen_mit_gemeindebau']} von {stats['gesamtzahl_prognoseregionen']} ({stats['prognoseregionen_abdeckungsquote_prozent']} %)")
    print(f"  Prognoseregionen ohne Gemeindebau: {stats['prognoseregionen_ohne_gemeindebau']}")
    print(f"  Grenznahe Punkte (< 1 m): {stats['grenznahe_punkte_unter_1m']}")
    print(f"  Mindestdistanz zur Grenze: {stats['mindestdistanz_grenze_meter']} m")

if __name__ == "__main__":
    main()

