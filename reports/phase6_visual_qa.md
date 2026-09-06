# Visueller Abnahmebericht: Phase 6 – Umfeldstatistik & Frontend-Integration

**Projekt:** Wiener Gemeindebau-Ruheguide
**Datum:** 6. September 2026
**Status:** Lokale visuelle Abnahme erfolgreich durchgeführt
**Testumgebung:** Google Chrome Headless (CDP Automation) & lokaler Vite Dev-Server
**Datenbasis:** 1.776 Gemeindebauten mit Zählbezirkszuordnung (Stand: 31. Oktober 2023)

---

## 1. Übersicht der erfassten Screenshots

Alle Screenshots wurden im Verzeichnis `reports/screenshots/phase6/` abgelegt:

| Dateiname | Viewport | Ansicht / Testfall | Wichtigste visuelle Prüfkriterien |
|---|---|---|---|
| `01_desktop_gesamtansicht.png` | 1280 × 900 | Desktop Katalog-Übersicht | Gesamtanwendung, Filterleiste mit Demografiefiltern, Statusanzeige 1.776 Objekte |
| `02_umfeldfilter_aktive_auswahl.png` | 1280 × 900 | Demografie- & Umfeldfilter aktiv | Dichte: `50 bis unter 100 Pers/ha`, Entwicklung: `wachsend (5 bis < 20 %)`, Pensionsbezug: `15 bis unter 20 %`; Zähler: `32 ANLAGEN GEFILTERT` |
| `03_detailansicht_umfeldstatistik.png` | 1280 × 900 | Detailansicht Umfeldstatistik | 8 Kennzahlen-Karten, Gebietstyp-Badge, Info-Hinweisbox, Wien-Vergleichswerte |
| `04_detailansicht_methodik_akkordeon.png` | 1280 × 900 | Aufgeklapptes Methodik-Akkordeon | Amtliche Quellen (data.wien.gv.at / Statistik Austria), Lizenz CC BY 4.0, Formeln, Stichtag 31.10.2023 |
| `05_stark_wachsendes_gebiet.png` | 1280 × 900 | Robert-Uhlir-Hof (0201) | Entwicklung 2011–2023: `+97,8 %` (`Ø +5,8 %/Jahr`, Wien: `+16,6 %`), Dichte: `113,3 Pers/ha` |
| `06_ruecklaeufiges_gebiet.png` | 1280 × 900 | Fischerstiege 1-7 (0106) | Entwicklung 2011–2023: `-5,8 %` (`Ø -0,5 %/Jahr`), Pensionsbezug: `20,4 %` |
| `07_hohe_dichte_gebiet.png` | 1280 × 900 | Negerlegasse 4 (0204) | Bevölkerungsdichte: `256,4 Pers/ha` (Gründerzeit mit überwiegend größeren Wohnungen), Entwicklung: `-11,0 %` |
| `08_mobile_detailansicht.png` | 390 × 844 | Mobiler Viewport (iPhone-Maße) | 1-spaltige Darstellung (`grid-cols-1`), volle Lesbarkeit, kein horizontales Scrollen, Buttons optimal erreichbar |
| `09_seniorenmodus_vergleich.png` | 1280 × 900 | Seniorenmodus / Große Schrift | Erhöhter Kontrast, vergrößerte Schriftgrade (`text-4xl`, `text-lg`), barrierefreie Lesbarkeit |

---

## 2. Detaillierte Prüfergebnisse je Ansicht

### 2.1 Filterleiste & Demografiefilter (`02_umfeldfilter_aktive_auswahl.png`)
- **Filter 1 (Bevölkerungsdichte):**
  - Bezeichnungen: `alle Dichtestufen`, `unter 50 Personen/ha`, `50 bis unter 100 Personen/ha`, `100 bis unter 200 Personen/ha`, `mindestens 200 Personen/ha`.
  - Mathematische Grenzen: `< 50`, `[50, 100)`, `[100, 200)`, `>= 200`. Keine Lücken, keine Überlappungen.
- **Filter 2 (Bevölkerungsentwicklung 2011–2023):**
  - Bezeichnungen: `alle Entwicklungen`, `rückläufig (< 0 %)`, `stabil (0 bis < 5 %)`, `wachsend (5 bis < 20 %)`, `stark wachsend (≥ 20 %)`.
  - Negative Werte fallen niemals unter „stabil“, sondern ausnahmslos unter „rückläufig“.
- **Filter 3 (Anteil der Personen mit Pensionsbezug):**
  - Bezeichnungen: `alle Anteile`, `unter 15 %`, `15 bis unter 20 %`, `20 bis unter 25 %`, `mindestens 25 %`.
  - Neutral formuliert: Keine wertenden Begriffe („überdurchschnittlich“, „unterdurchschnittlich“). Vollständiger Verzicht auf „Seniorenquote“ oder „65+“.
- **Layout & Typografie:**
  - Feste Breitenklassen `min-w-[170px] max-w-[220px]` verhindern Textabschneidungen.
  - Reset-Button („Demografie-Filter zurücksetzen“) setzt alle drei Dropdowns synchron auf `'ALL'` zurück.
  - Zähler aktualisiert dynamisch (z. B. auf 32 gefilterte Anlagen bei der Testkombination).

### 2.2 Kennzahlen-Karten im DetailModal (`03_detailansicht_umfeldstatistik.png`)
- **Gliederung in 8 strukturierte Kacheln:**
  1. *Einwohner (HWS):* Amtliche Zahl der Hauptwohnsitz-Personen und Wohnungsbestand.
  2. *Bevölkerungsdichte:* Personen je Hektar mit textlicher Einordnung (z. B. „Zentrum, Altstadt und Gründerzeit“).
  3. *Anteil unter 15 Jahren:* Prozentwert und Wien-Benchmarkvergleich.
  4. *Anteil Personen mit Pensionsbezug:* Exakte amtliche Bezeichnung, Prozentwert und Wien-Benchmarkvergleich.
  5. *Anteil Personen in Hauptmiete:* Mietverhältnisstruktur inklusive Gemeindebau und Genossenschaft.
  6. *Entwicklung 2011–2023:* Langfristige Veränderung auf stabiler Zählbezirksschlüssel-Ebene mit jährlicher Wachstumsrate.
  7. *Entwicklung 2021–2023:* Kurzfristige Veränderung der letzten 2 Jahre.
  8. *Statistische Schlüssel:* Zählbezirk, Zählgebiet, Prognoseregion und Gemeindebezirk kompakt zusammengefasst.
- **Gebietstyp-Badge:** Am oberen rechten Rand des Abschnitts (z. B. „gründerzeitliche Gebiete“, „Mischgebiete der jüngeren Vergangenheit...“).
- **Hinweiskasten:** Klarer Disclaimer: *„Amtliche Umfeldstatistik des Zählbezirks. Die Werte beschreiben nicht die Bewohnerinnen und Bewohner dieser Wohnhausanlage.“*

### 2.3 Methodik- und Quellen-Akkordeon (`04_detailansicht_methodik_akkordeon.png`)
- Standardmäßig zugeklappt, öffnet sich per Klick animiert und ohne Sprünge im Scrollcontainer.
- Ausgewiesene Metadaten:
  - Räumliche Ebene: Zählbezirk (statistisches Gebiet der Stadt Wien)
  - Stichtag: 31. Oktober 2023 (amtliche Registerzählung)
  - Amtliche Quellen: Stadt Wien (data.wien.gv.at) / Statistik Austria
  - Lizenz: Creative Commons Namensnennung 4.0 International (CC BY 4.0)
  - Berechnungsformeln: `(ERW_STATUS_3 / WHG_POP_TOTAL) * 100`, `(ERW_STATUS_4 / WHG_POP_TOTAL) * 100`, etc.
  - Erläuterung zum Vergleich: Erläutert das Intervall für „ungefähr auf Wien-Niveau“ (±1,0 Prozentpunkte).

### 2.4 Härtetests für extreme Gebietscharakteristiken
- **Stark wachsendes Gebiet (`05_stark_wachsendes_gebiet.png`):**
  - Anlage: Robert-Uhlir-Hof (Zählbezirk 0201, Leopoldstadt).
  - Wert: `+97,8 %` von 2011 bis 2023 (`Ø +5,8 %/Jahr`).
  - Positives Vorzeichen `+` wird korrekt formatiert; Benchmark zeigt „über dem Wien-Wert (Wien: +16,6 %)“.
- **Rückläufiges Gebiet (`06_ruecklaeufiges_gebiet.png`):**
  - Anlage: Fischerstiege 1-7 (Zählbezirk 0106, Innere Stadt).
  - Wert: `-5,8 %` von 2011 bis 2023 (`Ø -0,5 %/Jahr`).
  - Negatives Vorzeichen `-` wird korrekt gerundet und dargestellt; Benchmark zeigt „unter dem Wien-Wert“.
- **Sehr hohe Dichte (`07_hohe_dichte_gebiet.png`):**
  - Anlage: Negerlegasse 4 (Zählbezirk 0204, Leopoldstadt).
  - Dichte: `256,4 Pers/ha` (übertrifft den Schwellenwert 200 deutlich).
  - Typisierung: „Gründerzeit mit überwiegend größeren Wohnungen“.

### 2.5 Mobile Responsivität (`08_mobile_detailansicht.png`)
- Viewport: 390 × 844 px (Standard Smartphone-Breite).
- Kacheln ordnen sich in eine saubere Einzelsäule (`grid-cols-1`).
- Keine horizontalen Scrollbalken oder überstehende Textzeilen.
- Typografie und Badges skalieren passgenau (`text-sm`, `text-xs`).
- Modal-Kopf und Schließen-Button bleiben fix bedienbar.

### 2.6 Seniorenmodus (`09_seniorenmodus_vergleich.png`)
- Bei aktivem Seniorenmodus („Große Schrift: AN“) sind Überschriften und Kacheltexte vergrößert (`text-4xl`, `text-xl`, `font-black`).
- Dunkle Kontrastfarben (`#0D1B2A`, `#1B4332`, `#4B5563`) garantieren hohe Barrierefreiheit gemäß WCAG AAA.

---

## 3. Begriffsprüfung und Neutralitätsaudit

Eine systemweite Suche über alle Quelldateien (`src/`) und Datenstrukturen (`public/data/gemeindebauten.json`) bestätigt:

| Geprüfter Begriff / Muster | Vorkommen in `src/` | Status |
|---|---|---|
| `Seniorenanteil` | 0 Treffer | Bestanden (vollständig entfernt) |
| `Anteil ab 65` / `65+` | 0 Treffer | Bestanden (ausschließlich als „Personen mit Pensionsbezug“ bezeichnet) |
| `unterdurchschnittlich` / `überdurchschnittlich` (Filter) | 0 Treffer | Bestanden (neutrale Bereichsbezeichnungen) |
| `Einpersonenwohnungen` / `anteil_einpersonenwohnungen_prozent` | 0 Treffer | Bestanden (im Frontend nicht verwendet) |

---

## 4. Fazit

Alle visuellen, funktionalen und datenschutzfachlichen Anforderungen an Phase 6 sind vollständig erfüllt. Die Umfeldstatistik fügt sich nahtlos, responsiv und neutral in das Gesamtbild des Wiener Gemeindebau-Ruheguides ein.

