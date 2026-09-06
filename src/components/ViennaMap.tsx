import React from 'react';
import { Gemeindebau } from '../types';
import { MapPin, Volume2, AlertTriangle, Layers, Info, CheckCircle2 } from 'lucide-react';

interface Props {
  gemeindebauten: Gemeindebau[];
  selectedBau: Gemeindebau | null;
  onSelect: (bau: Gemeindebau) => void;
  seniorMode: boolean;
}

export const ViennaMap: React.FC<Props> = ({
  gemeindebauten,
  selectedBau,
  onSelect,
  seniorMode,
}) => {
  const [mapScope, setMapScope] = React.useState<'all' | 'focus'>('all');

  // Coordinates bounds:
  // Scope 'all': Entire Vienna (all 23 districts, 48.12 to 48.29, 16.22 to 16.50)
  // Scope 'focus': Northwest Vienna (19, 18, 17, 14)
  const minLat = mapScope === 'all' ? 48.1250 : 48.1850;
  const maxLat = mapScope === 'all' ? 48.2850 : 48.2600;
  const minLng = mapScope === 'all' ? 16.2300 : 16.2550;
  const maxLng = mapScope === 'all' ? 16.4900 : 16.3850;

  const projectCoordinate = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Invert lat for SVG Y (high lat is top)
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { x: Math.max(4, Math.min(96, x)), y: Math.max(4, Math.min(96, y)) };
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] overflow-hidden shadow-xs">
      {/* Map Header */}
      <div className="p-4 sm:p-5 border-b-2 border-[#E5E7EB] bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`${seniorMode ? 'text-2xl' : 'text-lg sm:text-xl'} font-bold text-[#0D1B2A] tracking-tight`}>
            Wien-Karte: Ruhelagen aller 23 Bezirke
          </h3>
          <p className="text-xs sm:text-sm font-medium text-[#6B7280]">
            {mapScope === 'all' ? 'Übersicht ganz Wien (1. bis 23. Bezirk)' : 'Detailansicht Nordwest-Grüngürtel (19, 18, 17, 14)'} • {gemeindebauten.length} Anlagen auf der Karte
          </p>
        </div>

        {/* Scope Toggle Button */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F5F7] rounded-full border border-[#D1D5DB]">
          <button
            onClick={() => setMapScope('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              mapScope === 'all'
                ? 'bg-[#2D6A4F] text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#0D1B2A]'
            }`}
          >
            Ganz Wien (23 Bezirke)
          </button>
          <button
            onClick={() => setMapScope('focus')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              mapScope === 'focus'
                ? 'bg-[#2D6A4F] text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#0D1B2A]'
            }`}
          >
            Nordwest-Fokus
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2D6A4F] border-2 border-[#1B4332] shadow-xs"></span>
            <span className="text-[#0D1B2A]">Hofruhe (Note 9–10)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#52B788] border-2 border-[#2D6A4F] shadow-xs"></span>
            <span className="text-[#0D1B2A]">Gute Ruhe (Note 7–8)</span>
          </span>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#F4F5F7] overflow-hidden select-none">
        {/* Background Visual Map Styling */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {mapScope === 'all' ? (
            <>
              {/* Wienerwald West Arc */}
              <path
                d="M 0,0 L 28,0 C 22,35 15,65 10,100 L 0,100 Z"
                fill="#d1fae5"
                opacity="0.85"
              />
              {/* Danube River (Donau & Neue Donau across Vienna from NW to SE) */}
              <path
                d="M 52,0 Q 64,45 88,100"
                stroke="#93c5fd"
                strokeWidth="5"
                fill="none"
              />
              <path
                d="M 56,0 Q 68,45 92,100"
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
              />
              {/* Donaukanal through city center */}
              <path
                d="M 48,15 Q 54,42 75,70"
                stroke="#93c5fd"
                strokeWidth="2"
                fill="none"
                strokeDasharray="2 1"
              />
              {/* Wienfluss / Wiental */}
              <path
                d="M 12,65 Q 35,66 54,52"
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
              />
              {/* Elevation Contours */}
              <path
                d="M 12,0 C 18,35 10,65 6,100"
                stroke="#10b981"
                strokeWidth="1"
                fill="none"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <path
                d="M 24,0 C 30,35 20,68 14,100"
                stroke="#10b981"
                strokeWidth="0.8"
                fill="none"
                strokeDasharray="2 2"
                opacity="0.4"
              />
            </>
          ) : (
            <>
              {/* Wienerwald Green Mountain Zone (West & North) */}
              <path
                d="M 0,0 L 45,0 C 35,25 20,40 10,70 L 0,100 Z"
                fill="#d1fae5"
                opacity="0.8"
              />
              {/* Danube Canal / Donau (East) */}
              <path
                d="M 88,0 Q 86,50 98,100"
                stroke="#93c5fd"
                strokeWidth="3.5"
                fill="none"
                strokeDasharray="1 0"
              />
              {/* Topographic Elevation Contours (Wienerwald Hangstufen) */}
              <path
                d="M 15,0 C 25,35 15,65 5,100"
                stroke="#10b981"
                strokeWidth="1"
                fill="none"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <path
                d="M 32,0 C 42,35 28,68 18,100"
                stroke="#10b981"
                strokeWidth="0.8"
                fill="none"
                strokeDasharray="2 2"
                opacity="0.4"
              />
              {/* District Boundaries */}
              <line x1="25" y1="38" x2="88" y2="34" stroke="#d1d5db" strokeWidth="0.75" strokeDasharray="2 2" />
              <line x1="20" y1="52" x2="85" y2="50" stroke="#d1d5db" strokeWidth="0.75" strokeDasharray="2 2" />
              <line x1="12" y1="70" x2="75" y2="76" stroke="#d1d5db" strokeWidth="0.75" strokeDasharray="2 2" />
            </>
          )}
        </svg>

        {/* District & Topography Labels depending on Scope */}
        {mapScope === 'all' ? (
          <>
            <div className="absolute top-[3%] left-[3%] text-[10px] font-extrabold text-[#065F46] uppercase tracking-wider bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-xs">
              Wienerwald (&gt; 320m)
            </div>
            <div className="absolute top-[8%] left-[28%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              19. Döbling
            </div>
            <div className="absolute top-[8%] right-[25%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              21. Floridsdorf
            </div>
            <div className="absolute top-[28%] right-[8%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              22. Donaustadt
            </div>
            <div className="absolute top-[42%] left-[44%] text-xs font-bold text-[#0D1B2A] bg-white/95 border-2 border-[#2D6A4F] px-2 py-0.5 rounded pointer-events-none shadow-xs">
              1. Innere Stadt
            </div>
            <div className="absolute top-[40%] left-[22%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              18. / 17. / 16.
            </div>
            <div className="absolute top-[58%] left-[16%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              14. / 13. Hietzing
            </div>
            <div className="absolute bottom-[20%] left-[45%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              10. Favoriten
            </div>
            <div className="absolute bottom-[18%] right-[20%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              11. Simmering
            </div>
            <div className="absolute bottom-[8%] left-[22%] text-xs font-bold text-[#4B5563] bg-white/90 border border-[#E5E7EB] px-2 py-0.5 rounded pointer-events-none">
              23. Liesing
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-[3%] left-[4%] text-[10px] font-extrabold text-[#065F46] uppercase tracking-wider bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded pointer-events-none shadow-xs">
              Wienerwald-Hangkamm (&gt; 300 m ü. A.)
            </div>
            <div className="absolute top-[8%] left-[22%] text-xs sm:text-sm font-bold text-[#6B7280] uppercase tracking-wider bg-white/90 border border-[#E5E7EB] px-2.5 py-1 rounded-md pointer-events-none shadow-xs">
              19. Döbling (Weinberge)
            </div>
            <div className="absolute top-[40%] left-[26%] text-xs sm:text-sm font-bold text-[#6B7280] uppercase tracking-wider bg-white/90 border border-[#E5E7EB] px-2.5 py-1 rounded-md pointer-events-none shadow-xs">
              18. Währing
            </div>
            <div className="absolute top-[56%] left-[22%] text-xs sm:text-sm font-bold text-[#6B7280] uppercase tracking-wider bg-white/90 border border-[#E5E7EB] px-2.5 py-1 rounded-md pointer-events-none shadow-xs">
              17. Hernals (Dornbach)
            </div>
            <div className="absolute bottom-[14%] left-[12%] text-xs sm:text-sm font-bold text-[#6B7280] uppercase tracking-wider bg-white/90 border border-[#E5E7EB] px-2.5 py-1 rounded-md pointer-events-none shadow-xs">
              14. Penzing (Baumgarten)
            </div>
            <div className="absolute top-[5%] right-[2%] text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded pointer-events-none shadow-xs">
              Donaukanal / Heiligenstadt
            </div>
          </>
        )}

        {/* Markers for Curated Quiet Gemeindebauten */}
        {gemeindebauten.map((bau) => {
          const pos = projectCoordinate(bau.koordinaten.lat, bau.koordinaten.lng);
          const isSelected = selectedBau?.id === bau.id;
          const isTopScore = bau.ruheScore >= 9;
          const pinColor = isTopScore ? 'bg-[#2D6A4F]' : 'bg-[#52B788]';
          const ringColor = isSelected ? 'ring-4 ring-[#0D1B2A] scale-110' : 'ring-2 ring-white hover:scale-110';

          return (
            <div
              key={bau.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200"
            >
              <button
                onClick={() => onSelect(bau)}
                className="group flex flex-col items-center focus:outline-hidden"
                title={`${bau.name}: ${bau.akustikDbInnenhof} dB(A), Höhenmeter: ${bau.hoehenmeter} (${bau.gelaendeTyp})`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${pinColor} text-white flex items-center justify-center shadow-xs ${ringColor} transition-all`}
                >
                  <span className="text-xs font-black">{bau.ruheScore}</span>
                </div>
                <span className={`mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs whitespace-nowrap transition-all border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#0D1B2A] text-white border-[#0D1B2A] scale-105'
                    : 'bg-white text-[#0D1B2A] border-[#D1D5DB] hover:border-[#2D6A4F] hover:bg-[#F0FDF4]'
                }`}>
                  <span>{bau.name.split(' (')[0]}</span>
                  <span className={isSelected ? 'text-[#A7F3D0] font-normal' : 'text-[#6B7280] font-normal'}>
                    • {bau.hoehenmeter.replace(' m ü. A.', 'm')}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Map Footer Info */}
      <div className="p-4 bg-[#F9FAFB] border-t-2 border-[#E5E7EB] text-xs sm:text-sm text-[#4B5563] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#2D6A4F] shrink-0" />
          <span className="font-medium">
            Tipp: Klicken Sie auf einen Pin, um Lärmminderung, stufenlosen Lift und Bim-Gehweg anzuzeigen.
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-[#6B7280]">
          WGS84 EPSG:4326 • Stadt Wien OGD
        </span>
      </div>
    </div>
  );
};
