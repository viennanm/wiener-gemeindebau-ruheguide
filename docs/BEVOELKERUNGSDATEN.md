# Amtliche Bevölkerungs- und Umfeldstatistik für den Wiener Gemeindebau-Ruheguide

Dieses Dokument dokumentiert die amtlichen Datensätze, räumlichen Hierarchien, Datenverträge und methodischen Definitionen für die Umfeldstatistik der Wiener Gemeindebauten gemäß `ANTIGRAVITY_BEVOELKERUNGSSTATISTIK.md` (Phase 1).

---

## 1. Ausgangslage & Grundsatz der Umfeldstatistik

Die erhobenen statistischen Kennzahlen beschreiben **ausschließlich das statistische Umfeld** (Zählgebiet, Zählbezirk, Prognoseregion, Gemeindebezirk), in dem eine Wohnhausanlage verortet ist.
Sie beschreiben **ausdrücklich nicht** die Bewohnerinnen und Bewohner einer konkreten Wohnhausanlage oder eines Gemeindebaus.

### Verbindliche Regeln
1. **Keine Schätzungen oder Imputationen:** Fehlende oder amtlich unterdrückte Werte bleiben strikt `NULL`.
2. **Exakte räumliche Trennung:** Keine Vermischung der Ebenen. Merkmale der Zählbezirksebene werden niemals als Zählgebietsmerkmale deklariert.
3. **Stichtagstreue:** Jeder Indikator trägt seinen amtlichen Stichtag und seine räumliche Ebene.
4. **Reproduzierbarkeit:** Alle Rohdaten werden unverändert mit SHA-256-Prüfsumme und Abrufdatum im Quellenmanifest archiviert.

---

## 2. Amtliche räumliche Ebenen in Wien

| Ebene | Anzahl in Wien | Amtlicher Schlüssel | Primäre Verwendung |
| :--- | :---: | :--- | :--- |
| **Gemeindebezirk** | 23 | `BEZ` (String `'01'` bis `'23'`, bzw. Zahl 1 bis 23) | Gesamtwien- und Bezirksvergleich |
| **Prognoseregion** | 94 | `PRG_CODE` (String, z. B. `'1A'`, `'19B'`) | Kleinräumige Bevölkerungsprognosen der Stadt Wien |
| **Zählbezirk** | 250 | `SUB_DISTRICT_CODE` (String `'90101'`) / `ZBEZ` (String `'0101'`) | Demografische Struktur (Registerzählung) & Dichte |
| **Zählgebiet** | 1.368 | `ZGEB` (String 5-stellig, z. B. `'01010'`, `'19044'`) | Räumliche Zuordnung (Point-in-Polygon) & Gebietstypologie |

### Schlüsselabbildung Zählbezirk (`SUB_DISTRICT_CODE` → `ZBEZ`)
- In den Daten der Registerzählung (Statistik Austria / Stadt Wien) lautet der Code `SUB_DISTRICT_CODE` im Format `9BBZZ` (5-stellig, beginnend mit `9` für Bundesland Wien, `BB` = 2-stelliger Bezirk, `ZZ` = 2-stelliger Zählbezirk).
- In den amtlichen Geodaten (`ogdwien:ZAEHLGEBIETOGD` und `ogdwien:ZAEHLBEZIRKOGD`) lautet der Schlüssel `ZBEZ` im Format `BBZZ` (4-stellig mit führender Null, z. B. `'0101'`).
- **Verifizierte Transformationsregel:** `ZBEZ = SUB_DISTRICT_CODE[1:]` (bzw. `SUB_DISTRICT_CODE.removeprefix('9')`). Dies garantiert einen fehlerfreien 1:1-Abgleich unter Erhalt führender Nullen.
- **Besonderheit Zählbezirk 0210 (`02100`):** Reines Industrie- und Hafengebiet (Freudenau / Donaugelände) ohne Hauptwohnsitzbevölkerung. In den 250 Zählbezirken existieren 249 bewohnte Zählbezirke mit Wohnbevölkerungsdaten.

---

## 3. Dokumentation der amtlichen Primärquellen

Die Datenarchitektur umfasst **sechs logische amtliche Quellen**, die als **sieben konkrete Rohdateien** heruntergeladen und archiviert wurden (da die Registerzählung der Stadt Wien / Statistik Austria mehrere Jahresstände umfasst: 2011, 2021, 2023). Der 12-Jahres-Vergleich 2011–2023 erfolgt als **„Vergleich auf stabiler Zählbezirksschlüssel-Ebene“**.

### Quelle 1: Zählgebietsgrenzen Wien (WFS GeoJSON)
- **Datensatzname:** Zählgebietsgrenzen Wien (`ogdwien:ZAEHLGEBIETOGD`)
- **Herausgeber:** Stadt Wien
- **Katalog-URL:** `https://www.data.gv.at/datasets/0adc90c9-ac6b-47ef-aa83-b7780594720c`
- **Direkte WFS-URL:** `https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ZAEHLGEBIETOGD&srsName=EPSG:4326&outputFormat=json`
- **Format:** GeoJSON (FeatureCollection, 1.368 Features)
- **Encoding:** UTF-8
- **Lizenz:** Creative Commons Namensnennung 4.0 International (CC BY 4.0)
- **Räumliche Ebene:** Zählgebiet (1.368 Einheiten)
- **Gebietsschlüssel:** `ZGEB` (String, 5-stellig, führende Nullen, z. B. `'01010'`)
- **Verifizierte Felder:** `BEZNR`, `ZBEZNR`, `ZGEBNR`, `BEZ`, `ZBEZ`, `ZGEB`, `FLAECHE`, `UMFANG`, `AKT_TIMESTAMP`
- **Stichtag / Aktualisierung:** `2026-09-03` (laufend gepflegt)
- **Verwendung:** Point-in-Polygon-Abgleich der Gemeindebau-Koordinaten zur eindeutigen Zuordnung zu Zählgebiet, Zählbezirk und Gemeindebezirk.

---

### Quelle 2: Gebietstypen 2021 Wien (WFS GeoJSON)
- **Datensatzname:** Gebietstypen 2021 Wien (`ogdwien:GEBIETSTYPENOGD`)
- **Herausgeber:** Stadt Wien (MA 23 / MA 18)
- **Katalog-URL:** `https://www.data.gv.at/datasets/b7755371-63ca-4d33-94c4-61e0a02afc2d`
- **Direkte WFS-URL:** `https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&srsName=EPSG:4326&outputFormat=json&typeName=ogdwien:GEBIETSTYPENOGD`
- **Format:** GeoJSON (1.368 Features)
- **Encoding:** UTF-8
- **Lizenz:** CC BY 4.0
- **Räumliche Ebene:** Zählgebiet
- **Gebietsschlüssel:** `ZGEB` (String, 5-stellig, z. B. `'01010'`)
- **Verifizierte Felder:** `OBJECTID`, `ZGEB`, `GEBIETSTYP`, `AGGREGIERTER_GEBIETSTYP`, `GEBIETSTYP_CODE`, `AGGREGIERTER_GEBIETSTYP_CODE`, `FLAECHE`
- **Stichtag:** 2021 (Gebietstypologie 2021)
- **Verwendung:** Städtebauliche Typologie des unmittelbaren Wohnumfelds (16 detaillierte Typen, 7 aggregierte Hauptgruppen).

---

### Quelle 3: Zählbezirksgrenzen Wien (WFS GeoJSON)
- **Datensatzname:** Zählbezirksgrenzen Wien (`ogdwien:ZAEHLBEZIRKOGD`)
- **Herausgeber:** Stadt Wien
- **Katalog-URL:** `https://www.data.gv.at/datasets/f3338a3f-af13-37a2-9d45-06138081bdb3`
- **Direkte WFS-URL:** `https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:ZAEHLBEZIRKOGD&srsName=EPSG:4326&outputFormat=json`
- **Format:** GeoJSON (250 Features)
- **Encoding:** UTF-8
- **Lizenz:** CC BY 4.0
- **Räumliche Ebene:** Zählbezirk
- **Gebietsschlüssel:** `ZBEZ` (String, 4-stellig, z. B. `'0101'`, `'1904'`)
- **Verifizierte Felder:** `BEZNR`, `ZBEZNR`, `BEZ`, `ZBEZ`, `FLAECHE`, `UMFANG`, `AKT_TIMESTAMP`
- **Stichtag:** `2026-09-03`
- **Verwendung:** Amtliche Flächenbezugsbasis (`FLAECHE` in m²) für die exakte, amtlich fundierte Berechnung der Bevölkerungsdichte (Einwohner je Hektar).

---

### Quelle 4: Registerzählung 2023 – Bevölkerung nach Zählbezirken Wien (CSV)
- **Datensatzname:** Registerzählung (5) - Bevölkerung - Zählbezirke Wien
- **Herausgeber:** Stadt Wien (MA 23) / Statistik Austria
- **Katalog-URL:** `https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735`
- **Direkte Download-URL (2023):** `https://go.gv.at/l9ogdvie4052023`
- **Format:** CSV (Trennzeichen: Semikolon `;`, Encoding: UTF-8)
- **Lizenz:** CC BY 4.0
- **Räumliche Ebene:** Zählbezirk (249 bewohnte Einheiten)
- **Gebietsschlüssel:** `SUB_DISTRICT_CODE` (String, 5-stellig, z. B. `'90101'`)
- **Stichtag:** `2023-10-31` (Stichtag der Registerzählung 2023)
- **Kritisch verifizierte Merkmale:**
  - `WHG_POP_TOTAL`: Hauptwohnsitzbevölkerung gesamt (Summe über Wien: 1.997.966 Personen)
  - `WHG_WSA_TOTAL`: Wohnungen mit Hauptwohnsitz gesamt (Summe über Wien: 953.086 Wohnungen)
  - `ERW_STATUS_3`: **Personen unter 15 Jahren** (Kinderanteil, Summe: 288.899 Personen = 14,46 %)
  - `ERW_STATUS_4`: **Personen mit Pensionsbezug** (Empfänger einer Eigenpension oder eines Ruhegenusses, Summe: 352.874 Personen = 17,66 %). *Wichtiger Hinweis: Darf keinesfalls als „Personen ab 65 Jahren“ bezeichnet werden, da Pensionsbezug auch Vorruhestand, Erwerbsunfähigkeit und Witwenpensionen umfasst, während Personen über 65 ohne Pensionsbezug hier nicht enthalten sind.*
  - `WHG_NOC_1`: **Wohnungen mit 1 Person** (Einpersonenhaushalte, 436.673 Wohnungen = 45,82 % aller Hauptwohnsitzwohnungen)
  - `WHG_RECHTSVERH_3`: **Wohnungen in Hauptmiete** (1.506.787 Bewohner = 75,42 %)
  - `HST_1`: Personen in einer Kernfamilie (1.365.297 Personen)
  - `HST_2`: Personen in keiner Kernfamilie (585.317 Personen)

---

### Quelle 5: Registerzählung 2011 – Bevölkerung nach Zählbezirken Wien (CSV)
- **Datensatzname:** Registerzählung 2011 – Zählbezirke Wien (Referenzstand)
- **Herausgeber:** Stadt Wien (MA 23) / Statistik Austria
- **Katalog-URL:** `https://www.data.gv.at/datasets/156805d0-9f25-407d-ae52-acb9c4149735`
- **Direkte Download-URL:** `https://www.wien.gv.at/gogv/l9ogdvie405`
- **Format:** CSV (Trennzeichen: `;`, Encoding: UTF-8)
- **Lizenz:** CC BY 4.0
- **Räumliche Ebene:** Zählbezirk
- **Stichtag:** `2011-10-31`
- **Verwendung:** Basiswert `WHG_POP_TOTAL` für die 12-Jahres-Bevölkerungsentwicklung 2011–2023 je Zählbezirk.

---

### Quelle 6: Zuordnung der Wiener Zählbezirke zu Prognoseregionen (CSV)
- **Datensatzname:** Zuordnung der Wiener Zählbezirke in Prognoseregionen - Wien
- **Herausgeber:** Stadt Wien (MA 23)
- **Katalog-URL:** `https://www.data.gv.at/datasets/b228a28e-a779-42e9-8f18-f6b3fbe8bbb0`
- **Direkte Download-URL:** `https://www.wien.gv.at/gogv/l9ogdviebezzbezprggeo2023`
- **Format:** CSV (Trennzeichen: `;`, Encoding: UTF-8)
- **Lizenz:** CC BY 4.0
- **Räumliche Ebene:** Zählbezirk → Prognoseregion
- **Stichtag:** `2023-01-01`
- **Verifizierte Felder:** `NUTS`, `DISTRICT_CODE`, `SUB_DISTRICT_CODE`, `PRG_CODE`
- **Verwendung:** Eindeutige Zuordnung der 250 Zählbezirke zu den 94 kleinräumigen Prognoseregionen der Stadt Wien.
- **Validierte Gesamtzahl:** Genau **94 Prognoseregionen** (`1A` bis `23G`). Die Zahl 98 in früheren Entwürfen war ein typographischer Fehler. Die MA 23 führt exakt 94 Prognoseregionen.
- **Gemeindebau-Abdeckung:** **92 von 94 Prognoseregionen (97,87 %)** enthalten mindestens eine städtische Wohnhausanlage.
- **Prognoseregionen ohne Gemeindebau (2 Regionen):**
  1. `10A` (umfasst Zählbezirk 91001: Sonnwendviertel Nord / Hauptbahnhofumfeld)
  2. `22C` (umfasst Zählbezirk 92205: Kaisermühlen / Donau City / UNO-City)

---

## 4. Datenschutz- und Geheimhaltungsregeln

1. **Statistische Geheimhaltung nach § 17 Bundesstatistikgesetz (BStatG):**
   Amtliche Daten der Registerzählung unterliegen den strengen Primär- und Sekundärgeheimhaltungsregeln der Statistik Austria. Falls Zellen oder Merkmalsausprägungen aus Geheimhaltungsgründen von der amtlichen Statistik unterdrückt wurden, sind diese Werte im Datensatz als unbesetzt (`-`, `x` oder fehlend) gekennzeichnet.
2. **Strikte Null-Behandlung:**
   Alle amtlich unterdrückten oder fehlenden Werte werden im System ausnahmslos als `NULL` geführt. Es finden keinerlei statistische Imputationen, Hochrechnungen oder Modellschätzungen statt.
3. **Keine Pauschalannahmen:**
   Es wird keine hypothetische Fallzahlschwelle (wie z. B. „unter 30 bis 50“) postuliert, sondern ausschließlich die amtlich gelieferte Unterdrückungskennzeichnung respektiert.

---

## 5. Verifizierte Variablenübersicht für die Implementierung

| Variable | Einheit | Ebene | Quelle | Qualitätsstatus | Amtliche Definition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `zaehlgebietCode` | Text (5-stellig) | Zählgebiet | `ogdwien:ZAEHLGEBIETOGD` | amtlich | Amtlicher 5-stelliger Zählgebietscode `ZGEB` |
| `zaehlgebietFlaecheM2` | m² | Zählgebiet | `ogdwien:ZAEHLGEBIETOGD` | amtlich | Amtliche Polygongröße `FLAECHE` |
| `gebietstyp` | Text | Zählgebiet | `ogdwien:GEBIETSTYPENOGD` | amtlich | 16 städtebauliche Gebietstypen |
| `aggregierterGebietstyp` | Text | Zählgebiet | `ogdwien:GEBIETSTYPENOGD` | amtlich | 7 aggregierte Gebietstypen |
| `zaehlbezirkCode` | Text (4-stellig) | Zählbezirk | `ogdwien:ZAEHLBEZIRKOGD` | amtlich | Amtlicher 4-stelliger Zählbezirkscode `ZBEZ` |
| `prognoseregionCode` | Text | Prognoseregion | Prognoseregionen-Zuordnung | amtlich | 94 Kleinräumige Wiener Prognoseregionen `PRG_CODE` |
| `gemeindebezirkCode` | Zahl (1–23) | Bezirk | `ogdwien:ZAEHLGEBIETOGD` | amtlich | Wiener Gemeindebezirk |
| `einwohnerZaehlbezirk` | Personen | Zählbezirk | Registerzählung 2023 | amtlich | Hauptwohnsitzbevölkerung `WHG_POP_TOTAL` (Stichtag 31.10.2023) |
| `wohnungenZaehlbezirk` | Wohnungen | Zählbezirk | Registerzählung 2023 | amtlich | Hauptwohnsitzwohnungen `WHG_WSA_TOTAL` (Stichtag 31.10.2023) |
| `anteilUnter15` | Prozent | Zählbezirk | Registerzählung 2023 | berechnet_aus_amtlichen_daten | `(ERW_STATUS_3 / WHG_POP_TOTAL) * 100` (Kinder unter 15 Jahren) |
| `anteilPensionsbezug` | Prozent | Zählbezirk | Registerzählung 2023 | berechnet_aus_amtlichen_daten | `(ERW_STATUS_4 / WHG_POP_TOTAL) * 100` (Personen mit Pensionsbezug; **nicht** Alter ab 65) |
| `anteilEinpersonenHaushalte` | Prozent | Zählbezirk | Registerzählung 2023 | berechnet_aus_amtlichen_daten | `(WHG_NOC_1 / WHG_WSA_TOTAL) * 100` (Wohnungen mit 1 Person) |
| `anteilHauptmiete` | Prozent | Zählbezirk | Registerzählung 2023 | berechnet_aus_amtlichen_daten | `(WHG_RECHTSVERH_3 / WHG_POP_TOTAL) * 100` (Hauptmiete) |
| `bevoelkerungsentwicklungProzent` | Prozent | Zählbezirk | Registerzählung 2011 & 2023 | berechnet_aus_amtlichen_daten | `((POP_2023 - POP_2011) / POP_2011) * 100` (12-Jahres-Veränderung) |
| `einwohnerJeHektar` | Pers./ha | Zählbezirk | Registerzählung 2023 & `ZAEHLBEZIRKOGD` | berechnet_aus_amtlichen_daten | `WHG_POP_TOTAL / (FLAECHE_m2 / 10000.0)` |

