import { Gemeindebau } from '../types';
import { GEMEINDEBAUTEN } from '../data/gemeindebauten';

let cachedGemeindebauten: Gemeindebau[] | null = null;
let fetchPromise: Promise<Gemeindebau[]> | null = null;

/**
 * Lädt alle 1.776 Gemeindebauten aus der exportierten SQLite-Datenbankdatei (public/data/gemeindebauten.json).
 * Bei Netzwerkproblemen oder SSR wird auf die kuratierten Basiseinträge zurückgegriffen.
 */
export async function loadGemeindebautenFromDb(): Promise<Gemeindebau[]> {
  if (cachedGemeindebauten && cachedGemeindebauten.length > 0) {
    return cachedGemeindebauten;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const base = import.meta.env.BASE_URL || './';
      const fetchUrl = `${base.endsWith('/') ? base : base + '/'}data/gemeindebauten.json?v=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Fehler beim Laden der Gemeindebauten-Daten`);
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedGemeindebauten = data as Gemeindebau[];
        return cachedGemeindebauten;
      }
      throw new Error('Ungültiges Datenformat empfangen');
    } catch (error) {
      console.warn('Fallback auf Basiseinträge wegen Fehler beim DB-Laden:', error);
      return GEMEINDEBAUTEN;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Gibt statistische Kennzahlen über den importierten Datensatz zurück.
 */
export function getGemeindebauStats(bauten: Gemeindebau[]) {
  const bezirkeSet = new Set<number>();
  let totalWohnungen = 0;
  let totalStufenlos = 0;
  let totalDenkmal = 0;
  let totalWiseg = 0;

  for (const b of bauten) {
    bezirkeSet.add(b.bezirk);
    totalWohnungen += b.wohnungenAnzahl || 0;
    if (b.isStufenlos) totalStufenlos++;
    if (b.denkmalschutz) totalDenkmal++;
    if (b.isWiseg) totalWiseg++;
  }

  return {
    totalBauten: bauten.length,
    totalBezirke: bezirkeSet.size,
    totalWohnungen,
    totalStufenlos,
    totalDenkmal,
    totalWiseg,
  };
}
