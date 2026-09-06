# Antigravity-Arbeitsauftrag: Bevölkerungsstatistik für den Wiener Gemeindebau-Ruheguide

## Ausgangslage

Repository: `https://github.com/viennanm/wiener-gemeindebau-ruheguide`

Die Anwendung ist eine React-/TypeScript-/Vite-Web-App. Sie verarbeitet 1.776 Gemeindebauten über folgende Datenpipeline:

1. `data/Gemeindebauten_Wien_KI.xml` – unveränderte Quelldatei
2. `scripts/import_xml_to_sqlite.py` – Import nach SQLite
3. `data/gemeindebauten.db` – zentrale Datenbank
4. `scripts/export_db_to_json.py` – Export für das Frontend
5. `public/data/gemeindebauten.json` – produktive Frontend-Daten
6. `src/types.ts`, `src/App.tsx` und Komponenten – Darstellung und Filter

Ziel ist die Ergänzung amtlicher, kleinräumiger Bevölkerungsdaten als **Umfeldstatistik**. Die Werte beschreiben nicht die Bewohnerinnen und Bewohner eines einzelnen Gemeindebaus, sondern das statistische Gebiet, in dem die Anlage liegt.

## Verbindliche Grundregeln

- Verändere `data/Gemeindebauten_Wien_KI.xml` nicht.
- Überschreibe keine bestehenden Tabellen oder Felder ohne Migration.
- Verwende ausschließlich amtliche Quellen der Stadt Wien, Statistik Austria oder data.gv.at.
- Lade Quelldateien reproduzierbar herunter und dokumentiere URL, Datenstand, Abrufdatum, Lizenz und Prüfsumme.
- Keine fehlenden Werte schätzen, imputieren oder durch scheinbar plausible Standardwerte ersetzen.
- Fehlende, unterdrückte oder nicht anwendbare Werte bleiben `NULL`.
- Verwechsle Zählgebiet, Zählbezirk, Prognoseregion und Gemeindebezirk nicht.
- Weise jedem Wert ausdrücklich seine räumliche Ebene und seinen Stichtag zu.
- Stelle niemals Umfeldmerkmale als Merkmale der konkreten Hausbewohner dar.
- Unterdrücke keine amtlichen Datenschutzkennzeichnungen. Werte mit Geheimhaltungs- oder Mindestfallzahlregeln bleiben fehlend.
- Die bestehende Web-App und alle 1.776 Gemeindebauten müssen nach der Änderung weiterhin funktionieren.

## Amtliche räumliche Ebenen

Folgende Ebenen sollen unterstützt werden:

| Ebene | Wien | Verwendung |
|---|---:|---|
| Gemeindebezirk | 23 | verständlicher Bezirksvergleich |
| Zählbezirk | ca. 250 | demografische Struktur und Zeitreihen |
| Prognoseregion | 94 | kleinräumige Bevölkerungsprognose |
| Zählgebiet/Zählsprengel | 1.368 | unmittelbares statistisches Umfeld |

Primäre räumliche Zuordnung: **Zählgebiet**. Ergänzend sollen der zugehörige Zählbezirk, die Prognoseregion und der Gemeindebezirk gespeichert werden.

## Vorrangige amtliche Quellen

1. Zählgebietsgrenzen Wien
   `https://www.data.gv.at/datasets/0adc90c9-ac6b-47ef-aa83-b7780594720c?locale=de`

2. Bevölkerung – Registerzählung – Zählbezirke Wien
   `https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735?locale=de`

3. Zuordnung der Wiener Zählbezirke zu 94 Prognoseregionen
   `https://www.data.gv.at/datasets/b228a28e-a779-42e9-8f18-f6b3fbe8bbb0?locale=de`

4. Gebietstypen der 1.368 Wiener Zählgebiete
   `https://www.data.gv.at/datasets/b7755371-63ca-4d33-94c4-61e0a02afc2d?locale=de`

5. Statistik Austria – Bevölkerung am 1.1. nach Zählsprengel
   `https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-zu-jahres-/-quartalsanfang`

6. Statistische Bezirksdaten der Stadt Wien
   `https://www.wien.gv.at/statistik/bezirksdaten`

Zusätzliche Datensätze dürfen nur aufgenommen werden, wenn Download, Definition, räumlicher Schlüssel, Stichtag und Lizenz eindeutig feststellbar sind. Nicht bloß Werte aus einer Grafik oder PDF abschreiben, wenn strukturierte CSV-, ODS-, GeoJSON-, GPKG- oder WFS-Daten verfügbar sind.

## Phase 1: Bestandsaufnahme und Datenvertrag

Bevor Code geändert wird:

1. Prüfe die vorhandenen Tabellen, Indizes und JSON-Typen.
2. Erstelle `docs/BEVOELKERUNGSDATEN.md` mit:
   - Datensatzname
   - Herausgeber
   - Download-URL
   - Lizenz
   - räumliche Ebene
   - Gebietsschlüssel
   - Stichtag/Zeitraum
   - Aktualisierungsrhythmus
   - verfügbare Merkmale
   - Datenschutz- und Interpretationshinweise
3. Erstelle `data/source_manifest_population.json` als maschinenlesbares Quellenmanifest.
4. Gib zuerst einen kurzen Bericht aus, welche Variablen tatsächlich strukturiert und offen verfügbar sind.
5. Implementiere nur nachgewiesene Variablen. Keine Feldnamen mit erfundenen oder noch nicht verfügbaren Inhalten anlegen.

## Phase 2: Download und unveränderte Rohdaten

Erstelle `scripts/download_population_sources.py`.

Anforderungen:

- Downloads nach `data/raw/population/`.
- Existierende unveränderte Dateien nicht still überschreiben.
- HTTP-Fehler, unerwartete Dateiformate und leere Dateien müssen zum Abbruch führen.
- Für jede Datei SHA-256, Dateigröße, Abrufdatum und Quell-URL im Manifest speichern.
- Bei dynamischen data.gv.at-Ressourcen zuerst die Metadaten lesen und daraus die aktuelle amtliche Ressourcen-URL ermitteln.
- Keine Zugangsschlüssel oder Secrets in das Repository schreiben.
- Für Tests kleine Fixture-Dateien unter `tests/fixtures/population/` verwenden; Tests dürfen nicht vom Netz abhängen.

## Phase 3: Räumliche Zuordnung

Erstelle `scripts/assign_statistical_areas.py`.

Nutze die bestehenden WGS84-Koordinaten `breitengrad` und `laengengrad` und führe einen Point-in-Polygon-Abgleich mit den amtlichen Zählgebietsgrenzen durch.

Bevorzugte Umsetzung:

- Python mit `geopandas`, `shapely` und `pyproj`, sofern diese Abhängigkeiten ausdrücklich dokumentiert werden.
- Alternativ eine robuste Standardbibliothekslösung, aber keine selbst erfundene vereinfachte Geometrieprüfung.
- Alle Daten vor dem räumlichen Join in dasselbe CRS transformieren.
- Grenzfälle mit `within` plus dokumentierter `intersects`-Fallback-Strategie behandeln.
- Keine Zuordnung über Postleitzahl oder bloße Adresszeichenfolge, wenn Geometrien vorhanden sind.

Zu speichern:

- `objekt_id`
- `zaehlgebiet_code`
- `zaehlbezirk_code`
- `prognoseregion_code`
- `gemeindebezirk_code`
- `zuordnungsmethode`
- `grenzfall` als Boolean
- `geometrie_datenstand`

Erzeuge einen QA-Bericht `reports/statistische_zuordnung_qa.csv` für:

- nicht zugeordnete Punkte
- mehrfach zugeordnete Punkte
- Grenzfälle
- ungültige Geometrien
- Widerspruch zwischen bestehendem Bezirk und Polygon-Bezirk

Akzeptanzkriterium: 1.776 Objekte werden geprüft. Kein Problemfall wird stillschweigend auf einen Bezirk oder ein Zählgebiet gesetzt.

## Phase 4: SQLite-Datenmodell

Erweitere die Datenbank normalisiert. Hänge nicht alle Zeitreihen als zusätzliche Spalten an `gemeindebauten`.

Empfohlenes Schema:

```sql
CREATE TABLE statistische_gebiete (
    gebietsebene TEXT NOT NULL,
    gebiet_code TEXT NOT NULL,
    gebiet_name TEXT,
    uebergeordneter_code TEXT,
    geometrie_datenstand TEXT,
    PRIMARY KEY (gebietsebene, gebiet_code)
);

CREATE TABLE gemeindebau_gebiet (
    objekt_id INTEGER NOT NULL,
    gebietsebene TEXT NOT NULL,
    gebiet_code TEXT NOT NULL,
    zuordnungsmethode TEXT NOT NULL,
    grenzfall INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (objekt_id, gebietsebene),
    FOREIGN KEY (objekt_id) REFERENCES gemeindebauten(objekt_id)
);

CREATE TABLE bevoelkerungsindikatoren (
    gebietsebene TEXT NOT NULL,
    gebiet_code TEXT NOT NULL,
    indikator_code TEXT NOT NULL,
    stichtag TEXT NOT NULL,
    wert REAL,
    einheit TEXT NOT NULL,
    quelle_id TEXT NOT NULL,
    qualitaetsstatus TEXT NOT NULL,
    PRIMARY KEY (gebietsebene, gebiet_code, indikator_code, stichtag)
);

CREATE TABLE datenquellen (
    quelle_id TEXT PRIMARY KEY,
    titel TEXT NOT NULL,
    herausgeber TEXT NOT NULL,
    url TEXT NOT NULL,
    lizenz TEXT,
    datenstand TEXT,
    abgerufen_am TEXT NOT NULL,
    sha256 TEXT
);
```

Lege Indizes auf `(gebietsebene, gebiet_code)`, `(indikator_code, stichtag)` und `objekt_id` an.

## Phase 5: Erste Indikatoren

Implementiere zuerst nur eine belastbare Minimalversion:

- Einwohnerzahl
- Fläche des statistischen Gebiets
- Einwohner je Hektar oder km²
- Bevölkerungsveränderung über einen klar definierten Zeitraum
- verfügbare Altersgruppen
- verfügbare Haushalts- oder Wohnungsmerkmale
- Gebietstyp
- Prognosewerte nur dann, wenn klar als Prognose und mit Prognosejahr gekennzeichnet

Jeder Indikator braucht:

- stabile Kennung
- verständlichen Namen
- Wert
- Einheit
- räumliche Ebene
- Stichtag oder Zeitraum
- Quelle
- Qualitätsstatus (`amtlich`, `amtlich_unterdrueckt`, `nicht_verfuegbar`)

Berechne Dichte nur dann selbst, wenn Einwohnerzahl und passende Land-/Gesamtfläche denselben Gebietsstand haben. Kennzeichne den Wert dann als `berechnet_aus_amtlichen_daten`.

## Phase 6: Export für React

Erweitere `scripts/export_db_to_json.py`, ohne die Rohdatenstruktur unnötig aufzublähen.

Empfohlene JSON-Struktur pro Gemeindebau:

```json
{
  "umfeldstatistik": {
    "zaehlgebietCode": "12031",
    "zaehlbezirkCode": "1203",
    "prognoseregionCode": "...",
    "stichtag": "2024-01-01",
    "einwohner": 2147,
    "einwohnerJeHektar": 115.4,
    "bevoelkerungsentwicklungProzent": 6.8,
    "altersanteile": {
      "unter15": 14.2,
      "ab65": 18.4
    },
    "gebietstyp": "...",
    "raeumlicheEbene": "Zählgebiet",
    "quelleId": "stadt-wien-..."
  }
}
```

Wenn ein Merkmal nur auf Zählbezirksebene verfügbar ist, darf es nicht innerhalb des Zählgebiet-Objekts so dargestellt werden, als wäre es kleinräumiger. Ergänze dann z. B. ein getrenntes Objekt `zaehlbezirkStatistik` oder speichere je Kennzahl `raeumlicheEbene`.

Erweitere `src/types.ts` mit optionalen, null-sicheren Interfaces. Ältere JSON-Dateien ohne Umfeldstatistik dürfen keinen Laufzeitfehler verursachen.

## Phase 7: Benutzeroberfläche

Ergänze in `GemeindebauDetailModal.tsx` einen Abschnitt **„Umfeld & Bevölkerung“**.

Zeige zunächst:

- Einwohner im statistischen Gebiet
- Bevölkerungsdichte
- Entwicklung
- Altersstruktur, wenn verfügbar
- Gebietstyp
- Datenstand und räumliche Ebene
- Quellenlink

Pflichttext direkt bei den Kennzahlen:

> Amtliche Umfeldstatistik des statistischen Gebiets. Die Werte beschreiben nicht die Bewohnerinnen und Bewohner dieser Wohnhausanlage.

Ergänze höchstens drei sinnvolle Filter:

- Bevölkerungsdichte: niedrig / mittel / hoch
- Anteil 65+: frei wählbarer Mindestwert, nur wenn amtlich verfügbar
- Bevölkerungsentwicklung: rückläufig / stabil / wachsend

Definiere Klassengrenzen transparent in einer zentralen Konfigurationsdatei. Keine wertenden Begriffe wie „gute Bevölkerung“, „problematische Herkunft“ oder ähnliche soziale Rankings verwenden.

Die Bevölkerungsdaten dürfen den bestehenden Ruhe-Score nicht automatisch verändern. Falls später ein eigener Umfeld-Score gewünscht wird, muss dieser separat benannt, fachlich begründet und abschaltbar sein.

## Phase 8: Datenqualitätskorrektur im bestehenden Export

Bei der Bestandsprüfung wurden im aktuellen `scripts/export_db_to_json.py` mehrere Ersatz- und Ableitungswerte festgestellt, obwohl die Dokumentation „keine Schätzungen“ verspricht. Prüfe insbesondere:

- fehlendes Baujahr wird teilweise auf `1955` gesetzt
- fehlende Wohnungsanzahl wird auf `0` gesetzt
- fehlende Lärmklassen erhalten numerische Standardpegel
- Innenhofpegel wird pauschal aus Straßenpegel minus 14/18 dB berechnet
- Liftstatus wird aus Baujahr, Geschoßen oder Wohnungszahl abgeleitet
- fehlende Haltestellen- und Parkdistanzen erhalten Standardwerte

Ändere diese Punkte nicht unbemerkt im selben Schritt. Erstelle zuerst `reports/abgeleitete_werte_audit.md` mit Anzahl, Feldern und Auswirkungen. Schlage danach eine Trennung vor zwischen:

- `amtlich_gemessen`
- `amtlich_klassifiziert`
- `regelbasiert_abgeleitet`
- `modelliert`
- `nicht_verfuegbar`

Die neue Bevölkerungsanreicherung selbst darf keine solchen Ersatzwerte verwenden.

## Tests und Abnahmekriterien

Erweitere `tests/test_import_validation.py` oder lege separate Tests an.

Pflichttests:

1. Das Original-XML hat weiterhin dieselbe SHA-256-Prüfsumme.
2. Es existieren weiterhin exakt 1.776 eindeutige `objekt_id`.
3. Jeder Gemeindebau wurde räumlich geprüft.
4. Mehrfach- und Nichtzuordnungen werden im QA-Bericht ausgewiesen.
5. Gebietscodes werden als Text gespeichert, damit führende Nullen erhalten bleiben.
6. Stichtage sind ISO-8601-konform.
7. Prozentwerte liegen zwischen 0 und 100 oder sind `NULL`.
8. Einwohner und Flächen sind nicht negativ.
9. Fehlende und amtlich unterdrückte Werte bleiben `NULL`.
10. JSON enthält keine `NaN`- oder `Infinity`-Werte.
11. `npm run lint` ist erfolgreich.
12. `npm run build` ist erfolgreich.
13. Bestehende Karten-, Foto-, Bezirks-, Höhen- und Ruhefilter funktionieren weiter.
14. Die Detailansicht ist auf Mobilgeräten und im Seniorenmodus lesbar.

## Auszuführende Reihenfolge

1. Repository und Datenmodell analysieren.
2. Amtliche Quellen und tatsächliche Ressourcen feststellen.
3. Datenvertrag und Quellenmanifest erstellen.
4. Downloadskript und Fixtures bauen.
5. Point-in-Polygon-Zuordnung implementieren.
6. SQLite-Schema migrieren und Bevölkerungsdaten importieren.
7. QA-Berichte erzeugen und Problemfälle beheben.
8. JSON-Export und TypeScript-Typen erweitern.
9. Detailansicht und Filter ergänzen.
10. Tests, TypeScript-Prüfung und Produktions-Build ausführen.
11. README mit Reproduktion, Quellen, Datenständen und Grenzen ergänzen.

## Arbeitsweise in Antigravity

Arbeite in kleinen, überprüfbaren Schritten. Zeige vor der Implementierung:

- erkannte Projektstruktur
- vorgeschlagene Datenquellen
- tatsächliche Variablen und Stichtage
- geplante Schemaänderungen
- neue Abhängigkeiten

Bitte um Zustimmung, bevor neue Python- oder Node-Abhängigkeiten installiert werden. Lege vor jeder größeren Änderung einen Git-Commit an oder stelle sicher, dass der aktuelle Zustand sauber wiederherstellbar ist. Keine Veröffentlichung auf GitHub Pages und kein Push, bevor die lokale Abnahme vollständig erfolgreich ist und ausdrücklich bestätigt wurde.

## Abschließende Ergebnisübersicht

Am Ende ausgeben:

- Anzahl zugeordneter Gemeindebauten
- Anzahl Grenzfälle und nicht zugeordneter Objekte
- verwendete Datenstände
- Indikatoren je räumlicher Ebene
- Anteil fehlender/unterdrückter Werte je Indikator
- neu angelegte und geänderte Dateien
- Testergebnisse
- Build-Ergebnis
- verbleibende fachliche und technische Einschränkungen

