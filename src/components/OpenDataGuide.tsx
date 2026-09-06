import React, { useState } from 'react';
import { Database, Globe, ExternalLink, Code2, ShieldAlert, CheckCircle2, Copy, Check, Search, RefreshCw, Layers } from 'lucide-react';
import { WIENER_BEZIRKE } from '../data/wienerBezirke';
import { fetchViennaOpenDataGemeindebauten, estimateElevation } from '../services/viennaOpenDataService';
import { Gemeindebau } from '../types';

interface Props {
  seniorMode: boolean;
}

export const OpenDataGuide: React.FC<Props> = ({ seniorMode }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedBezirk, setSelectedBezirk] = useState<number>(19);
  const [liveResults, setLiveResults] = useState<Gemeindebau[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasQueried, setHasQueried] = useState<boolean>(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleFetchDistrictLive = async () => {
    setIsLoading(true);
    setHasQueried(true);
    try {
      const items = await fetchViennaOpenDataGemeindebauten();
      // Filter by selected district
      const filtered = items.filter((b) => b.bezirk === selectedBezirk);
      setLiveResults(filtered);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  const currentBezirk = WIENER_BEZIRKE.find((b) => b.nummer === selectedBezirk);

  const gemeindebauUrl =
    'https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:GEMEINDEBAUOGD&srsName=EPSG:4326&outputFormat=json';

  const laermkarteUrl =
    'https://data.wien.gv.at/daten/geo?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien:LAERMKARTE2022OGD&srsName=EPSG:4326&outputFormat=json';

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
            Offene Geodaten Stadt Wien
          </span>
          <span className="text-xs text-[#6B7280] font-bold">data.gv.at / OGD Wien</span>
        </div>
        <h2 className={`${seniorMode ? 'text-3xl' : 'text-2xl'} font-black text-[#0D1B2A] tracking-tight`}>
          Leitfaden: Open Data Wien & Lärmkataster Integration
        </h2>
        <p className="text-[#4B5563] font-medium text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
          Die Stadt Wien stellt über die Plattform <strong>data.gv.at</strong> amtliche Geodaten 
          für alle Wiener Gemeindebauten sowie den aktuellen Umgebungslärmkataster (Straße und Schiene) kostenfrei bereit.
        </p>
      </div>

      {/* 2 Endpoints Overview */}
      <div className="space-y-6">
        {/* Endpoint 1 */}
        <div className="p-6 rounded-2xl bg-[#F9FAFB] border-2 border-[#E5E7EB]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#2D6A4F] text-white font-mono uppercase tracking-wider">
                1. GEMEINDEBAUOGD (WFS / GeoJSON)
              </span>
              <h4 className="text-lg font-black text-[#0D1B2A] mt-2">
                Katalog aller Wiener Gemeindebauten
              </h4>
            </div>
            <button
              onClick={() => copyText(gemeindebauUrl)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#0D1B2A] hover:bg-stone-50 border-2 border-[#E5E7EB] transition shadow-xs"
            >
              {copiedUrl === gemeindebauUrl ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl === gemeindebauUrl ? 'Kopiert!' : 'URL kopieren'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#4B5563] font-medium mb-3">
            Enthält Hofnamen, Anschrift, Postleitzahl, Bezirk, Baujahr und Wohnungsanzahl als Punkt- oder Polygon-Geometrien in WGS84 (EPSG:4326).
          </p>

          <div className="p-3.5 bg-[#0D1B2A] text-[#52B788] rounded-xl font-mono text-xs overflow-x-auto border border-[#0D1B2A]">
            <code>{gemeindebauUrl}</code>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border-2 border-[#E5E7EB]">
              <span className="font-bold text-[#0D1B2A] block">HOFNAME</span>
              <span className="text-[#6B7280]">z.B. "Karl-Marx-Hof"</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border-2 border-[#E5E7EB]">
              <span className="font-bold text-[#0D1B2A] block">ADRESSE / PLZ</span>
              <span className="text-[#6B7280]">z.B. "Boschstraße 28–34", 1190</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border-2 border-[#E5E7EB]">
              <span className="font-bold text-[#0D1B2A] block">BAUJAHR_VON</span>
              <span className="text-[#6B7280]">Errichtungsjahr (z.B. 1930)</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border-2 border-[#E5E7EB]">
              <span className="font-bold text-[#0D1B2A] block">WOHNUNGEN_ANZAHL</span>
              <span className="text-[#6B7280]">Größe der Wohnanlage</span>
            </div>
          </div>
        </div>

        {/* Endpoint 2 */}
        <div className="p-6 rounded-2xl bg-[#F9FAFB] border-2 border-[#E5E7EB]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#0D1B2A] text-white font-mono uppercase tracking-wider">
                2. LAERMKARTESTEWG / STRASSE & SCHIENE (WFS)
              </span>
              <h4 className="text-lg font-black text-[#0D1B2A] mt-2">
                Strategischer Umgebungslärmkataster Wien
              </h4>
            </div>
            <button
              onClick={() => copyText(laermkarteUrl)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#0D1B2A] hover:bg-stone-50 border-2 border-[#E5E7EB] transition shadow-xs"
            >
              {copiedUrl === laermkarteUrl ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl === laermkarteUrl ? 'Kopiert!' : 'URL kopieren'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#4B5563] font-medium mb-3">
            Gemäß EU-Richtlinie 2002/49/EG erfasst die Stadt Wien alle 5 Jahre Isophonen für Straßen- und Schienenlärm:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
            <div className="p-3.5 bg-white rounded-xl border-2 border-[#E5E7EB]">
              <strong className="text-[#0D1B2A] block font-bold mb-1">LDEN (Day-Evening-Night Pegel):</strong>
              <span className="text-[#4B5563] font-medium">
                24-Stunden-Mittelwert mit Zuschlägen von +5 dB(A) für den Abend (19:00–22:00) und +10 dB(A) für die Nacht (22:00–06:00).
                Gesundheitsgefährdung ab 65 dB(A).
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border-2 border-[#E5E7EB]">
              <strong className="text-[#0D1B2A] block font-bold mb-1">LNIGHT (Nachtlärmpegel):</strong>
              <span className="text-[#4B5563] font-medium">
                Mittelwert zwischen 22:00 und 06:00 Uhr. Schlafstörungs-Schwellenwert liegt bei 50 dB(A).
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-[#0D1B2A] text-[#93C5FD] rounded-xl font-mono text-xs overflow-x-auto border border-[#0D1B2A]">
            <code>{laermkarteUrl}</code>
          </div>
        </div>
      </div>

      {/* Algorithmus zur Berechnung des Ruhe-Scores */}
      <div className="p-6 rounded-2xl bg-[#F0FDF4] border-2 border-[#2D6A4F]">
        <h4 className="text-base font-bold text-[#0D1B2A] mb-2 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-[#2D6A4F]" />
          <span>Algorithmus zur Berechnung des Ruhe-Scores (Skala 1–10) in Swift</span>
        </h4>
        <p className="text-xs sm:text-sm text-[#2D6A4F] font-semibold mb-3 leading-relaxed">
          In der App wird der Ruhe-Score wie folgt berechnet:
        </p>
        <ol className="list-decimal list-inside text-xs sm:text-sm text-[#374151] space-y-1.5 font-medium">
          <li>
            <strong>Basispunktzahl:</strong> 10 Punkte als Höchstwert für absolute Hofruhe.
          </li>
          <li>
            <strong>Abzug für Straßenpegel:</strong> -1 Punkt je 5 dB(A) über dem Schwellenwert von 50 dB(A).
          </li>
          <li>
            <strong>Baukörper-Abschirmung:</strong> +2 Bonuspunkte für U-förmige oder geschlossene Blockrand-Höfe (Schalldämpfung &gt; 20 dB).
          </li>
          <li>
            <strong>Straßenbahn-Dämpfung:</strong> Bei Tramgleisen in &lt; 50 m Distanz erfolgt ein Malus von -4 Punkten, sofern keine geschlossene Hoffassade existiert.
          </li>
        </ol>
      </div>

      {/* Live Open Data Explorer for all 23 districts */}
      <div className="p-6 rounded-2xl bg-[#F9FAFB] border-2 border-[#E5E7EB] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#0D1B2A] text-white font-mono">
              Live Open Data Geodaten-Abfrage
            </span>
            <h4 className="text-lg font-black text-[#0D1B2A] mt-2">
              Amtliche Gemeindebauten für jeden der 23 Wiener Bezirke
            </h4>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Wählen Sie einen Wiener Bezirk, um die Geodaten inklusive berechneter Höhenmeter (m ü. A.) und Ruhelagen abzufragen.
            </p>
          </div>

          <button
            onClick={handleFetchDistrictLive}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#2D6A4F] hover:bg-[#1B4332] text-white transition shadow-xs disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isLoading ? 'Lade Daten...' : `${selectedBezirk}. Bezirk live abfragen`}</span>
          </button>
        </div>

        {/* District Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t-2 border-[#E5E7EB]">
          <div>
            <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1">
              Bezirk auswählen:
            </label>
            <select
              value={selectedBezirk}
              onChange={(e) => setSelectedBezirk(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl bg-white border-2 border-[#E5E7EB] text-[#0D1B2A] font-bold text-sm focus:border-[#2D6A4F] focus:outline-hidden"
            >
              {WIENER_BEZIRKE.map((b) => (
                <option key={b.nummer} value={b.nummer}>
                  {b.nummer}. {b.name} ({b.typischeHoehe})
                </option>
              ))}
            </select>
          </div>

          {currentBezirk && (
            <div className="p-3 bg-white rounded-xl border-2 border-[#E5E7EB] text-xs">
              <span className="font-bold text-[#065F46] block">{currentBezirk.nummer}. {currentBezirk.name}</span>
              <p className="text-[#4B5563] mt-0.5">{currentBezirk.charakter} • Höhenlage: {currentBezirk.typischeHoehe}</p>
              <p className="text-[#047857] font-medium mt-1">Umgebung: {currentBezirk.seniorenEmpfehlung}</p>
            </div>
          )}
        </div>

        {/* Query Results */}
        {hasQueried && (
          <div className="pt-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
              Ergebnis ({liveResults.length} Gemeindebauten gefunden)
            </h5>
            {liveResults.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border-2 border-[#E5E7EB] text-center text-xs text-[#6B7280]">
                Keine separaten WFS-Daten für diesen Bezirk in der aktuellen Abfrage oder Verbindung via Sandbox gepuffert. Nutzen Sie die vollständige integrierte Datenbank in der App-Ansicht.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveResults.slice(0, 6).map((b) => (
                  <div key={b.id} className="p-3.5 bg-white rounded-xl border-2 border-[#E5E7EB] text-xs space-y-1">
                    <strong className="text-[#0D1B2A] block font-bold truncate">{b.name}</strong>
                    <div className="text-[#6B7280] truncate">{b.adresse}, {b.plz} Wien</div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#065F46] font-bold">
                        {b.hoehenmeter}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-[#4B5563] font-semibold">
                        {b.gelaendeTyp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
