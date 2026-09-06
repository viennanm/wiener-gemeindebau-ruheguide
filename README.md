<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Wiener Gemeindebau-Ruheguide

Interaktiver Ruhe- und Wohnungswechsel-Guide für Wiener Gemeindebauten mit Echt-Stadtplan, 360° Google Street View Straßenansichten, verifizierten Wikimedia Commons Hof-Fotografien, Lärmkataster, Barrierefreiheit, Denkmalschutz, 23-Bezirke-Wikipedia-Verzeichnis und WISEG-Register für atypische Gemeindebauten & historische Zinshäuser.

---

## Bilddaten & Google Street View Integration

* **Rechtssichere Wikimedia Commons Fotos**: **1.403 verifizierte Gebäudefotografien (79,0 % Abdeckung)** mit originalen CC-Lizenzen und Fotografen-Angaben (automatisch angereichert über Wikipedia-Bezirkslisten und Commons API, siehe [`data/Gemeindebauten_Wien_mit_Fotos.xml`](data/Gemeindebauten_Wien_mit_Fotos.xml)).
* **Interaktives 360° Google Street View**: Jeder Gemeindebau kann in der Detailansicht direkt in einer interaktiven 360°-Straßenperspektive (inkl. © Google Maps Urheberrechtshinweis und Vollbild-Deep-Link) betrachtet werden (dient auch als nahtloser Fallback für Bauten ohne Wikimedia-Foto).

---

## Datenbasis & SQLite-Datenbank (`data/gemeindebauten.db`)

Die Datenbasis speist sich aus der unveränderten Originaldatei [`data/Gemeindebauten_Wien_KI.xml`](data/Gemeindebauten_Wien_KI.xml) und wird über einen reproduzierbaren Importer nach [`data/gemeindebauten.db`](data/gemeindebauten.db) überführt.

### Kernregeln der Datenintegrität
* **Unveränderlichkeit des Originals**: Die Datei `data/Gemeindebauten_Wien_KI.xml` wird strikt rein lesend verarbeitet und niemals modifiziert (wird per SHA-256-Prüfsumme überwacht).
* **Null-Wert-Behandlung**: XML-Elemente mit `xsi:nil="true"` oder ohne Textinhalt werden ausnahmslos als `NULL` in SQLite abgebildet.
* **Keine Schätzungen**: Fehlende Werte werden unter keinen Umständen imputiert oder interpoliert.
* **Vollständigkeit & Eindeutigkeit**: Exakt 1.776 Gemeindebauten mit eindeutiger `objekt_id` (Primärschlüssel).

---

## Datenbankschema

### Tabelle: `gemeindebauten`

| Bereich | Spaltenname | SQLite-Typ | Beschreibung & Wertebereich |
| :--- | :--- | :--- | :--- |
| **Identifikation** | `objekt_id` | `INTEGER PRIMARY KEY` | Eindeutige ID (1.776 Unikate) |
| | `bezirk` | `INTEGER NOT NULL` | Wiener Gemeindebezirk (1–23) |
| | `hofname` | `TEXT` | Name des Hofs / der Wohnhausanlage |
| | `adresse` | `TEXT` | Anschrift (`NULL` bei `xsi:nil="true"`) |
| **Bau- & Kenndaten** | `baujahr` | `INTEGER NOT NULL` | Errichtungsjahr (ab 1743 bei hist. Zinshäusern) |
| | `wohnungen` | `INTEGER` | Anzahl Wohnungen (`NULL` bei `xsi:nil="true"`) |
| | `baukoerper_anzahl` | `INTEGER` | Anzahl der Baukörper |
| | `bebaute_grundflaeche_m2` | `INTEGER` | Grundfläche in m² |
| | `anlagenhuelle_m2` | `INTEGER` | Hüllfläche in m² |
| | `geschosse_max` | `INTEGER` | Maximale Geschoßanzahl |
| | `groessenklasse` | `TEXT` | z. B. klein, mittel, groß, sehr groß |
| | `amtliche_bautypen` | `TEXT` | Amtliche Klassifikation |
| | `immobilientyp_abgeleitet`| `TEXT` | z. B. Hofanlage / gegliederter Block |
| **Geokoordinaten** | `breitengrad` | `REAL NOT NULL` | Latitude WGS84 (~48.11 bis 48.32) |
| | `laengengrad` | `REAL NOT NULL` | Longitude WGS84 (~16.18 bis 16.53) |
| **Höhenmeter** | `hoehe_von_m_adria` | `INTEGER` | Min. Höhe in m über Adria |
| | `hoehe_bis_m_adria` | `INTEGER` | Max. Höhe in m über Adria |
| | `hoehenmethode` | `TEXT` | Erhebungsmethode |
| **Mobilität & ÖPNV** | `naechste_haltestelle` | `TEXT` | Nächste ÖPNV-Haltestelle |
| | `entfernung_haltestelle_m`| `INTEGER` | Entfernung in Metern |
| | `verkehrsmittel` | `TEXT` | Bus, Straßenbahn, U-Bahn, S-Bahn |
| | `linien` | `TEXT` | Linienbezeichnungen |
| | `weitere_haltestellen` | `TEXT` | Zusätzliche Haltestellen im Umkreis |
| **Grünflächen & Freiraum** | `freiflaechenpotenzial_m2`| `INTEGER` | Freiflächen in m² |
| | `freiflaechenpotenzial_prozent`| `REAL` | Anteil Freifläche in % |
| | `naechster_park` | `TEXT` | Name des nächstgelegenen Parks |
| | `entfernung_park_m` | `INTEGER` | Entfernung zum Park in Metern |
| | `oeffentliches_gruen_500m_m2`| `INTEGER` | Öffentliches Grün im 500m-Radius (m²) |
| | `oeffentliches_gruen_500m_prozent`| `REAL` | Grünflächenanteil 500m-Radius in % |
| | `baeume_250m` | `INTEGER` | Baumbestand im 250m-Radius |
| | `gruenlage_abgeleitet` | `TEXT` | Bewertung (z. B. sehr grün, grün, mäßig) |
| | `gruenlage_score` | `INTEGER` | Grünlage-Score (0–100) |
| **Lärmklassen & Ruhe** | `strassenlaerm_lden_db_klasse` | `TEXT` | Straßenlärm Tag-Abend-Nacht Pegelklasse |
| | `strassenlaerm_lnight_db_klasse`| `TEXT` | Straßenlärm Nacht Pegelklasse |
| | `schienenlaerm_lden_db_klasse` | `TEXT` | Schienenlärm Tag-Abend-Nacht Pegelklasse |
| | `schienenlaerm_lnight_db_klasse`| `TEXT` | Schienenlärm Nacht Pegelklasse |
| | `fluglaerm_lden_db_klasse` | `TEXT` | Fluglärm Tag-Abend-Nacht Pegelklasse |
| | `fluglaerm_lnight_db_klasse`| `TEXT` | Fluglärm Nacht Pegelklasse |
| | `laermhinweis` | `TEXT` | Strategische Beurteilung & Hinweise |
| | `laermkarte_url` | `TEXT` | Link zu maps.laerminfo.at |
| **Quellen** | `gemeindebau_quelle_url` | `TEXT` | Link zu data.wien.gv.at / Wiener Wohnen |

### Tabelle: `metadaten`
Speichert Datenstand, Quellsysteme, Methodik und Koordinatenreferenzsystem als Key-Value-Paare.

---

## Indizes für performante Abfragen

Die Datenbank verfügt über dedizierte Indizes für alle Kernkriterien:
- `idx_gemeindebauten_bezirk` auf `(bezirk)`
- `idx_gemeindebauten_adresse` auf `(adresse)`
- `idx_gemeindebauten_baujahr` auf `(baujahr)`
- `idx_gemeindebauten_laerm_strassen` auf `(strassenlaerm_lden_db_klasse, strassenlaerm_lnight_db_klasse)`
- `idx_gemeindebauten_laerm_schienen` auf `(schienenlaerm_lden_db_klasse, schienenlaerm_lnight_db_klasse)`
- `idx_gemeindebauten_gruenlage` auf `(gruenlage_abgeleitet, gruenlage_score)`
- `idx_gemeindebauten_koordinaten` auf `(breitengrad, laengengrad)`

---

## Reproduzierbarer Import & Datenexport

### 1. XML in SQLite importieren
Der Import wird mit Python 3 ausgeführt (nutzt ausschließlich Standardbibliotheken, keine Drittpakete erforderlich):

```bash
python3 scripts/import_xml_to_sqlite.py
# oder via npm/bun:
npm run import-xml
```

Optionale Parameter:
* `--xml-path <Pfad>`: Pfad zur XML-Datei (Standard: `data/Gemeindebauten_Wien_KI.xml`)
* `--db-path <Pfad>`: Pfad zur SQLite-Datenbank (Standard: `data/gemeindebauten.db`)
* `--no-drop`: Tabellen vor Import nicht verwerfen

### 2. Export für das React-Frontend
Exportiert alle 1.776 Gemeindebauten mit realen Höhendaten, Lärmkataster-Werten, Grünraum-Scores und Haltestellen direkt in die Web-App:

```bash
python3 scripts/export_db_to_json.py
# oder via npm/bun:
npm run export-db
```

---

## Automatische Validierungstests

Zur Überprüfung von Datenintegrität, XML-Unverändertheit, exakter Objektanzahl (1.776), Null-Wert-Konsistenz, Datentypen, Indizes und Frontend-JSON:

```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

---

## Frontend & App lokal starten

**Voraussetzungen:** Node.js oder Bun

1. Abhängigkeiten installieren:
   ```bash
   npm install
   # oder
   bun install
   ```
2. `GEMINI_API_KEY` in `.env.local` eintragen (optional für KI-Funktionen)
3. App starten:
   ```bash
   npm run dev
   ```
Die Anwendung lädt beim Aufruf im Browser automatisch alle 1.776 Gemeindebauten aus `public/data/gemeindebauten.json`.