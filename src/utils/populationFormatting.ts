/**
 * src/utils/populationFormatting.ts
 *
 * Hilfsfunktionen zur neutralen Formatierung, Null-Sicherheit und
 * Wien-Vergleichsberechnung amtlicher Bevölkerungs- und Umfeldstatistiken.
 */

export const WIEN_BENCHMARKS = {
  anteilUnter15Prozent: 14.46,
  anteilPensionsbezugProzent: 17.66,
  bevoelkerungsdichtePersonenJeHektar: 48.16,
  bevoelkerungsentwicklung2011Bis2023Prozent: 16.55,
  toleranzProzentpunkte: 1.0,
};

export type WienVergleichKategorie = 'unter dem Wien-Wert' | 'ungefähr auf Wien-Niveau' | 'über dem Wien-Wert';

/**
 * Formatiert ganzzahlige Bestände (Einwohner, Wohnungen) mit österreichischer Tausendertrennung (.).
 * NULL oder ungültige Werte werden zu "Keine amtliche Angabe".
 */
export function formatInteger(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Keine amtliche Angabe';
  }
  return Math.round(val).toLocaleString('de-AT');
}

/**
 * Formatiert Prozentwerte mit genau einer Dezimalstelle und Komma.
 * NULL oder ungültige Werte werden zu "Keine amtliche Angabe".
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Keine amtliche Angabe';
  }
  return `${val.toFixed(1).replace('.', ',')} %`;
}

/**
 * Formatiert Bevölkerungsdichte (Personen/ha) mit einer Dezimalstelle.
 */
export function formatDensity(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Keine amtliche Angabe';
  }
  return `${val.toFixed(1).replace('.', ',')} Pers/ha`;
}

/**
 * Formatiert Veränderungsraten mit explizitem Vorzeichen (+ / -) und einer Dezimalstelle.
 */
export function formatChange(val: number | null | undefined, unit: string = '%'): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Keine amtliche Angabe';
  }
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1).replace('.', ',')} ${unit}`;
}

/**
 * Vergleicht einen Wert neutral mit dem gewichteten Wien-Gesamtwert.
 * Toleranz: ±1,0 Prozentpunkt gilt als "ungefähr auf Wien-Niveau".
 */
export function getWienComparison(
  val: number | null | undefined,
  benchmark: number,
  toleranz: number = WIEN_BENCHMARKS.toleranzProzentpunkte
): { kategorie: WienVergleichKategorie; text: string } | null {
  if (val === null || val === undefined || isNaN(val)) {
    return null;
  }
  const diff = val - benchmark;
  if (Math.abs(diff) <= toleranz) {
    return {
      kategorie: 'ungefähr auf Wien-Niveau',
      text: 'ungefähr auf Wien-Niveau',
    };
  }
  if (diff < -toleranz) {
    return {
      kategorie: 'unter dem Wien-Wert',
      text: 'unter dem Wien-Wert',
    };
  }
  return {
    kategorie: 'über dem Wien-Wert',
    text: 'über dem Wien-Wert',
  };
}

import {
  UmfeldDichteFilter,
  UmfeldEntwicklungFilter,
  UmfeldPensionsbezugFilter
} from '../types';

/**
 * Filterfunktionen für optionale Umfeldfilter
 */

export function matchesDichteFilter(
  dichte: number | null | undefined,
  filter: UmfeldDichteFilter = 'ALL'
): boolean {
  if (filter === 'ALL') return true;
  if (dichte === null || dichte === undefined || isNaN(dichte)) return false;
  if (filter === 'LOW') return dichte < 50.0;
  if (filter === 'MEDIUM') return dichte >= 50.0 && dichte < 100.0;
  if (filter === 'HIGH') return dichte >= 100.0 && dichte < 200.0;
  if (filter === 'VERY_HIGH') return dichte >= 200.0;
  return false;
}

export function matchesEntwicklungFilter(
  rate: number | null | undefined,
  filter: UmfeldEntwicklungFilter = 'ALL'
): boolean {
  if (filter === 'ALL') return true;
  if (rate === null || rate === undefined || isNaN(rate)) return false;
  if (filter === 'RUECKLAEUFIG') return rate < 0.0;
  if (filter === 'STABIL') return rate >= 0.0 && rate < 5.0;
  if (filter === 'WACHSEND') return rate >= 5.0 && rate < 20.0;
  if (filter === 'STARK_WACHSEND') return rate >= 20.0;
  return false;
}

export function matchesPensionsbezugFilter(
  quote: number | null | undefined,
  filter: UmfeldPensionsbezugFilter = 'ALL'
): boolean {
  if (filter === 'ALL') return true;
  if (quote === null || quote === undefined || isNaN(quote)) return false;
  if (filter === 'UNDER_15') return quote < 15.0;
  if (filter === '15_TO_20') return quote >= 15.0 && quote < 20.0;
  if (filter === '20_TO_25') return quote >= 20.0 && quote < 25.0;
  if (filter === 'OVER_25') return quote >= 25.0;
  return false;
}

