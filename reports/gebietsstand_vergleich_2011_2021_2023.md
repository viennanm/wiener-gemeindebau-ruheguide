# Gebietsstandsvergleich der Wiener Zählbezirke (2011, 2021, 2023)

## 1. Übersicht der Gebietsschlüssel je Jahr

| Datenquelle / Erhebungsjahr | Stichtag | Anzahl Datensätze (Zeilen) | Eindeutige Zählbezirke (`SUB_DISTRICT_CODE`) | Gesamte Hauptwohnsitzbevölkerung |
| :--- | :---: | :---: | :---: | :---: |
| **Registerzählung 2011** | 31.10.2011 | 250 | 250 | 1.714.227 |
| **Registerzählung 2021** | 31.10.2021 | 249 | 249 | 1.926.960 |
| **Registerzählung 2023** | 31.10.2023 | 249 | 249 | 1.997.966 |

---

## 2. Schlüsselvergleich & Differenzanalyse

- **Schlüsselbestand 2021 vs. 2023:** 100,0 % identisch (249 Zählbezirke ohne jegliche Abweichung).
- **Schlüsselbestand 2011 vs. 2021/2023:** 249 Zählbezirke sind vollkommen identisch.
- **Nur in einem Jahr vorkommender Schlüssel:**
  - `90210` (Zählbezirk 0210: Leopoldstadt – Freudenau / Winterhafen)
  - Im Jahr 2011: 1 bewohnte Wohnung mit 2 Personen (`WHG_POP_TOTAL = 2`).
  - In den Jahren 2021 und 2023: 0 Hauptwohnsitzbewohner. Gemäß den statistischen Veröffentlichungsrichtlinien von Statistik Austria und Stadt Wien werden Zählbezirke mit 0 Einwohnern in der Wohnbevölkerungstabelle nicht als leere Zeile geführt, sondern entfallen.

---

## 3. Analyse des Sonderfalls Zählbezirk 0210

- **Korrekte amtliche Schreibweisen:**
  - **Zählbezirk:** `ZBEZ = "0210"` (4-stellig, Text mit führender Null).
  - **Registerzählungsschlüssel:** `SUB_DISTRICT_CODE = "90210"` (5-stellig, '9' + `0210`).
  - **Zählgebiet:** `ZGEB = "02100"` (5-stellig, Text mit führender Null).
- **Dokumentationsklärung:**
  Die Angabe `"02100"` in früheren Notizen war kein Tippfehler, sondern bezeichnete das **Zählgebiet** `ZGEB = "02100"` (das einzige Zählgebiet innerhalb des Zählbezirks `0210`). Für den Zählbezirk ist die exakte 4-stellige Bezeichnung `ZBEZ = "0210"` verbindlich.
- **Fläche & Nutzung:**
  Der Zählbezirk 0210 umfasst laut `ogdwien:ZAEHLBEZIRKOGD` 1.250.097,65 m² (ca. 125 Hektar) und ist laut `ogdwien:GEBIETSTYPENOGD` als *„überwiegend städtische Infrastruktur und sonstige Nutzungen“* (Code `Z` / `ZI`) ausgewiesen. Es befindet sich kein Gemeindebau in diesem Zählbezirk.

---

## 4. Hinweise auf Grenzänderungen & Gebietsreformen

- **Herbst 2020 (Seestadt Aspern & Hausfeld):**
  Die Stadt Wien und Statistik Austria führten im Herbst 2020 eine Anpassung der kleinräumigen **Zählgebietsabgrenzungen** (`ZGEB`, 1.368 Einheiten) durch, um den massiven städtebaulichen Entwicklungen in der Seestadt Aspern (22. Bezirk) Rechnung zu tragen.
- **Auswirkung auf die Zählbezirksebene (`ZBEZ`, 250 Einheiten):**
  Die übergeordneten Zählbezirksgrenzen blieben administrativ stabil. Die Zählbezirke wie z. B. `2231` (Flugfeld Aspern / Seestadt Süd) existierten bereits 2011 und wurden im Zuge der Besiedlung von 84 Einwohnern (2011) auf 3.889 Einwohner (2023) ausgebaut.
- **Keine Zusammenlegungen oder Teilungen von Zählbezirken:**
  Zwischen 2011 und 2023 wurden keine Zählbezirke zusammengelegt, aufgespalten oder umnummeriert.

---

## 5. Entscheidung zur Vergleichbarkeit

1. **Vergleich auf stabiler Zählbezirksschlüssel-Ebene für 249 bewohnte Zählbezirke:**
   Alle 249 Zählbezirke weisen identische Schlüssel und konsistente Abgrenzungen auf.
   - Der **Vergleich auf stabiler Zählbezirksschlüssel-Ebene (2011–2023)** kann für alle 249 bewohnten Zählbezirke direkt berechnet werden:
     $$\Delta\%_{2011-2023} = \frac{\text{POP}_{2023} - \text{POP}_{2011}}{\text{POP}_{2011}} \times 100$$
   - Die **Kurzfrist-Veränderung (2021–2023)** kann für dieselben 249 Zählbezirke berechnet werden:
     $$\Delta\%_{2021-2023} = \frac{\text{POP}_{2023} - \text{POP}_{2021}}{\text{POP}_{2021}} \times 100$$
2. **Behandlung von Zählbezirk 0210:**
   Da im Zählbezirk 0210 im Jahr 2023 0 Einwohner leben und keine Gemeindebauten liegen, entfällt für diesen Zählbezirk die Berechnung einer prozentualen Bevölkerungsentwicklung (bleibt `NULL`).
3. **Keine Crosswalk-Tabelle erforderlich:**
   Da eine 1:1-Identität für alle 249 bewohnten Zählbezirke vorliegt, ist keine mathematische Aufteilung oder Zerlegung von Zählbezirken notwendig.

