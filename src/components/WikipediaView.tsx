import React, { useState } from 'react';
import { 
  WIKIPEDIA_MAIN_URL, 
  WIKIPEDIA_DISTRICT_LIST, 
  WIKIPEDIA_ENCYCLOPEDIA_STATS,
  WikipediaDistrictEntry 
} from '../data/wikipediaDirectory';
import { 
  WIKIPEDIA_WISEG_URL, 
  WISEG_OFFICIAL_URL, 
  WISEG_INFO, 
  WISEG_OBJEKTE_LISTE, 
  WisegObject,
  convertWisegToGemeindebau
} from '../data/wisegDirectory';
import { Gemeindebau } from '../types';
import { 
  ExternalLink, 
  BookOpen, 
  Search, 
  Landmark, 
  Sparkles, 
  Building2, 
  Users, 
  ShieldCheck, 
  Palette, 
  CheckCircle2,
  ArrowRight,
  Home,
  SlidersHorizontal,
  Volume2,
  MapPin,
  Compass
} from 'lucide-react';

interface WikipediaViewProps {
  seniorMode: boolean;
  onFilterBezirkInApp: (bezirkNummer: number) => void;
  onSelectBau: (bau: Gemeindebau) => void;
  allBauten: Gemeindebau[];
}

export const WikipediaView: React.FC<WikipediaViewProps> = ({
  seniorMode,
  onFilterBezirkInApp,
  onSelectBau,
  allBauten,
}) => {
  const [activeWikiTab, setActiveWikiTab] = useState<'GEMEINDEBAUTEN' | 'WISEG'>('GEMEINDEBAUTEN');
  
  // Classic District search
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [selectedEpocheTab, setSelectedEpocheTab] = useState<'ALL' | 'ROTES_WIEN' | 'NACHKRIEG' | 'DENKMAL'>('ALL');

  // WISEG filter states
  const [wisegSearch, setWisegSearch] = useState('');
  const [wisegBezirkFilter, setWisegBezirkFilter] = useState<number | 'ALL'>('ALL');
  const [wisegDenkmalOnly, setWisegDenkmalOnly] = useState(false);
  const [wisegPawlatschenOnly, setWisegPawlatschenOnly] = useState(false);

  const filteredDistricts = WIKIPEDIA_DISTRICT_LIST.filter((d) => {
    if (!districtSearchTerm) return true;
    const term = districtSearchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      d.bezirk.toString() === term ||
      d.bekannteBauten.some(b => b.toLowerCase().includes(term)) ||
      d.bedeutendeArchitekten.some(a => a.toLowerCase().includes(term)) ||
      d.charakteristik.toLowerCase().includes(term)
    );
  });

  const filteredWisegObjects = WISEG_OBJEKTE_LISTE.filter((item) => {
    if (wisegBezirkFilter !== 'ALL' && item.bezirk !== wisegBezirkFilter) {
      return false;
    }
    if (wisegDenkmalOnly && !item.denkmalschutz) {
      return false;
    }
    if (wisegPawlatschenOnly && !item.pawlatschenHof) {
      return false;
    }
    if (wisegSearch) {
      const term = wisegSearch.toLowerCase();
      const matchAddress = item.adresse.toLowerCase().includes(term);
      const matchBezirk = item.bezirkName.toLowerCase().includes(term);
      const matchHauszeichen = item.hauszeichen ? item.hauszeichen.toLowerCase().includes(term) : false;
      const matchHeris = item.herisId ? item.herisId.toLowerCase().includes(term) : false;
      const matchStil = item.architekturStil.toLowerCase().includes(term);
      if (!matchAddress && !matchBezirk && !matchHauszeichen && !matchHeris && !matchStil) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Main Navigation Switcher between the two Wikipedia registers */}
      <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={() => setActiveWikiTab('GEMEINDEBAUTEN')}
            className={`px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 ${
              activeWikiTab === 'GEMEINDEBAUTEN'
                ? 'bg-[#2D6A4F] text-white shadow-md'
                : 'text-[#4B5563] hover:text-[#0D1B2A] hover:bg-[#F4F5F7]'
            }`}
          >
            <Building2 className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">Wiener Gemeindebauten</div>
              <div className={`text-xs ${activeWikiTab === 'GEMEINDEBAUTEN' ? 'text-emerald-200' : 'text-[#6B7280]'}`}>
                23 Bezirke • Rotes Wien bis heute
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveWikiTab('WISEG')}
            className={`px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2.5 ${
              activeWikiTab === 'WISEG'
                ? 'bg-[#B45309] text-white shadow-md'
                : 'text-[#4B5563] hover:text-[#0D1B2A] hover:bg-[#F4F5F7]'
            }`}
          >
            <Landmark className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">WISEG: Atypische Gemeindebauten</div>
              <div className={`text-xs ${activeWikiTab === 'WISEG' ? 'text-amber-200' : 'text-[#6B7280]'}`}>
                Historische Zinshäuser & Pawlatschenhöfe
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* VIEW 1: WISEG SPECIAL REGISTER */}
      {activeWikiTab === 'WISEG' && (
        <div className="space-y-8">
          {/* Hero Banner WISEG */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    <Landmark className="w-3.5 h-3.5 text-amber-800" />
                    Wikipedia-Spezialverzeichnis
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    Bundesdenkmalamt (HERIS)
                  </span>
                </div>

                <h2 className={`${seniorMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold text-[#0D1B2A] tracking-tight`}>
                  Liste der von der WISEG betreuten Objekte
                </h2>

                <p className={`${seniorMode ? 'text-lg' : 'text-base'} text-[#4B5563] leading-relaxed`}>
                  Die <strong>Wiener Substanzerhaltungsgesellschaft (WISEG)</strong> betreut ein Portfolio von rund <strong>100 "atypischen" Gemeindebauten</strong> der Stadt Wien. 
                  Im Gegensatz zu klassischen Großwohnanlagen handelt es sich überwiegend um geschichtsträchtige Bürger- und Zinshäuser des 18., 19. und frühen 20. Jahrhunderts. 
                  Sie umfassen meist <strong>nicht mehr als 18 Wohnungen</strong>, zeichnen sich durch <strong>idyllische Pawlatschen-Innenhöfe</strong> und meterstarke Ziegelmauern aus und stehen zu über 50 % unter <strong>Bundesdenkmalschutz</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <a
                  href={WIKIPEDIA_WISEG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-sm sm:text-base transition shadow-sm border-2 border-[#92400E]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Wikipedia: WISEG-Objektliste</span>
                </a>

                <a
                  href={WISEG_OFFICIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-[#0D1B2A] font-bold text-xs sm:text-sm transition border-2 border-[#E5E7EB]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>Offizielle Website wiseg.at</span>
                </a>

                <div className="text-xs text-[#6B7280] font-medium text-center sm:text-left">
                  Quelle: de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte
                </div>
              </div>
            </div>

            {/* 4 WISEG Characteristic KPI Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t-2 border-[#F3F4F6]">
              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-[#B45309]" />
                  Portfolio der Stadt
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  ~100 Objekte
                </div>
                <span className="text-xs text-[#6B7280] font-medium">Historische Zinshäuser</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B45309]" />
                  Denkmalschutz-Quote
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  &gt; 50 %
                </div>
                <span className="text-xs text-[#6B7280] font-medium">Mit BDA HERIS-Inventarnummer</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#B45309]" />
                  Kleinteiliger Maßstab
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  ≤ 18 WE
                </div>
                <span className="text-xs text-[#6B7280] font-medium">Kleine, ruhige Hausgemeinschaften</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
                  Altbau-Schallschutz
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  35–42 dB
                </div>
                <span className="text-xs text-[#6B7280] font-medium">Stille Pawlatschen-Innenhöfe</span>
              </div>
            </div>
          </div>

          {/* Comparison Card: Klassischer Gemeindebau vs. Atypischer WISEG-Bau */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-5">
            <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A]`}>
              Was unterscheidet WISEG-Objekte von klassischen Gemeindebauten?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Wiener Wohnen classic */}
              <div className="p-5 rounded-2xl border-2 border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#E5E7EB] text-[#374151]">
                    Wiener Wohnen (Klassisch)
                  </span>
                  <span className="text-xs font-bold text-[#6B7280]">Ab 1919 (Rotes Wien)</span>
                </div>
                <h4 className="font-bold text-[#0D1B2A] text-base mb-2">
                  Kommunale Großwohnanlagen ("Volkswohnpaläste")
                </h4>
                <ul className="text-xs sm:text-sm text-[#4B5563] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2D6A4F] font-bold">•</span>
                    <span>Von der Stadtgemeinde Wien selbst geplant und errichtet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2D6A4F] font-bold">•</span>
                    <span>Häufig hunderte bis über tausend Wohnungen in weitläufigen Superblöcken</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2D6A4F] font-bold">•</span>
                    <span>Großzügige Grünanlagen, Gemeinschaftswäschereien, Badeanstalten und Kindergärten</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2D6A4F] font-bold">•</span>
                    <span>Benannt nach historischen Persönlichkeiten der Wiener Sozial- und Arbeiterbewegung</span>
                  </li>
                </ul>
              </div>

              {/* WISEG Atypisch */}
              <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/40">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-200 text-amber-950 border border-amber-300">
                    WISEG (Atypisch)
                  </span>
                  <span className="text-xs font-bold text-amber-800">18. bis frühes 20. Jh.</span>
                </div>
                <h4 className="font-bold text-[#0D1B2A] text-base mb-2">
                  Historische Zinshäuser & Bürgerhäuser
                </h4>
                <ul className="text-xs sm:text-sm text-[#4B5563] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#B45309] font-bold">•</span>
                    <span>Ursprünglich privat errichtet; gelangten durch Erbschaften oder Zukäufe an die Stadt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#B45309] font-bold">•</span>
                    <span>Kleinteilig mit selten mehr als 18 Wohnungen und intimer Hausgemeinschaft</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#B45309] font-bold">•</span>
                    <span>Typische Pawlatschengänge, Biedermeier-Fassaden, Kastenfenster und meterstarke Ziegelmauern</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#B45309] font-bold">•</span>
                    <span>Tragen oft überlieferte Wiener Hauszeichen (z.B. <em>"Zu den drei Kronen"</em> oder <em>"Zum goldenen Hirschen"</em>)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Filter and Search Bar for WISEG */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A] flex items-center gap-2`}>
                  <span>Katalog der WISEG-Zinshäuser</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {filteredWisegObjects.length} von {WISEG_OBJEKTE_LISTE.length} Objekten
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Gefiltert nach Denkmalschutz, Pawlatschenhof und Wiener Bezirken
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={wisegSearch}
                  onChange={(e) => setWisegSearch(e.target.value)}
                  placeholder="Adresse, Hauszeichen, HERIS-ID..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#E5E7EB] focus:border-[#B45309] text-sm text-[#0D1B2A] outline-hidden placeholder:text-[#9CA3AF]"
                />
                {wisegSearch && (
                  <button
                    onClick={() => setWisegSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280] hover:text-[#0D1B2A] bg-stone-100 px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200">
              <div className="flex items-center gap-1.5 mr-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs font-bold text-[#4B5563]">Filter:</span>
              </div>

              {/* District Select */}
              <select
                value={wisegBezirkFilter}
                onChange={(e) => setWisegBezirkFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                aria-label="Bezirk filtern"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F4F5F7] border border-[#D1D5DB] text-[#0D1B2A] outline-hidden cursor-pointer"
              >
                <option value="ALL">Alle Bezirke</option>
                <option value="1">1. Innere Stadt</option>
                <option value="2">2. Leopoldstadt</option>
                <option value="3">3. Landstraße</option>
                <option value="4">4. Wieden</option>
                <option value="7">7. Neubau</option>
                <option value="8">8. Josefstadt</option>
                <option value="9">9. Alsergrund</option>
                <option value="13">13. Hietzing</option>
                <option value="14">14. Penzing</option>
                <option value="19">19. Döbling</option>
                <option value="23">23. Liesing</option>
              </select>

              {/* Denkmalschutz toggle */}
              <button
                onClick={() => setWisegDenkmalOnly(!wisegDenkmalOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  wisegDenkmalOnly
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[#F4F5F7] text-[#4B5563] hover:bg-stone-200 border border-[#D1D5DB]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Nur Denkmalschutz (HERIS)</span>
              </button>

              {/* Pawlatschenhof toggle */}
              <button
                onClick={() => setWisegPawlatschenOnly(!wisegPawlatschenOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  wisegPawlatschenOnly
                    ? 'bg-[#2D6A4F] text-white shadow-xs'
                    : 'bg-[#F4F5F7] text-[#4B5563] hover:bg-stone-200 border border-[#D1D5DB]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Nur mit Pawlatschenhof</span>
              </button>

              {(wisegBezirkFilter !== 'ALL' || wisegDenkmalOnly || wisegPawlatschenOnly || wisegSearch) && (
                <button
                  onClick={() => {
                    setWisegBezirkFilter('ALL');
                    setWisegDenkmalOnly(false);
                    setWisegPawlatschenOnly(false);
                    setWisegSearch('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition ml-auto"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          </div>

          {/* Grid of WISEG Objects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWisegObjects.map((item) => {
              const asGemeindebau = convertWisegToGemeindebau(item);

              return (
                <div
                  key={item.id}
                  className="bg-[#F9FAFB] rounded-2xl border-2 border-[#E5E7EB] hover:border-[#B45309] p-5 shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo if available */}
                    {item.bildUrl && (
                      <div className="relative rounded-xl overflow-hidden h-40 mb-3.5 border border-[#E5E7EB] bg-stone-200">
                        <img
                          src={item.bildUrl}
                          alt={item.adresse}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-xs text-white border border-white/20">
                            {item.bezirk}. Bezirk
                          </span>
                          {item.pawlatschenHof && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
                              Pawlatschenhof
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono font-bold flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                          <span>{item.schallpegelInnenhofDb} dB(A)</span>
                        </div>
                      </div>
                    )}

                    {/* Address & Hauszeichen */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        {item.hauszeichen ? (
                          <>
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309] block">
                              "{item.hauszeichen}"
                            </span>
                            <h4 className="font-bold text-[#0D1B2A] text-lg group-hover:text-[#B45309] transition">
                              {item.adresse}
                            </h4>
                          </>
                        ) : (
                          <h4 className="font-bold text-[#0D1B2A] text-lg group-hover:text-[#B45309] transition">
                            {item.adresse}
                          </h4>
                        )}
                        <p className="text-xs text-[#6B7280] font-medium">
                          {item.plz} Wien, {item.bezirkName}
                        </p>
                      </div>

                      {item.denkmalschutz && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-950 border border-amber-300 shrink-0">
                          BDA {item.herisId ? `#${item.herisId}` : 'Geschützt'}
                        </span>
                      )}
                    </div>

                    {/* Architecture and Build info */}
                    <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-stone-300 text-[#374151]">
                        Baujahr: {item.baujahr}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-stone-300 text-[#374151]">
                        Stil: {item.architekturStil}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-stone-300 text-[#374151]">
                        {item.wohnungenApprox} WE
                      </span>
                    </div>

                    {/* Quiet seeker description */}
                    <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3 mb-3">
                      {item.ruheCharakteristik}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-3 border-t border-stone-200">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectBau(asGemeindebau)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs"
                        title="Vollständiges Akustik- und Ruheprofil öffnen"
                      >
                        <span>Im Ruheguide öffnen</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={item.wikipediaUrl || WIKIPEDIA_WISEG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white hover:bg-stone-100 text-[#4B5563] border border-[#D1D5DB] transition shadow-xs"
                        title="Auf Wikipedia ansehen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: CLASSIC GEMEINDEBAUTEN (23 BEZIRKE) */}
      {activeWikiTab === 'GEMEINDEBAUTEN' && (
        <div className="space-y-8">
          {/* Top Hero Banner referencing the official Wikipedia entry */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#2D6A4F]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#F4F5F7] text-[#0D1B2A] border border-[#D1D5DB]">
                    <BookOpen className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    Enzyklopädie & Denkmalamt
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    <Landmark className="w-3.5 h-3.5 text-[#059669]" />
                    23 Wiener Bezirke
                  </span>
                </div>

                <h2 className={`${seniorMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold text-[#0D1B2A] tracking-tight`}>
                  Liste der Wiener Gemeindebauten (Wikipedia-Register)
                </h2>

                <p className={`${seniorMode ? 'text-lg' : 'text-base'} text-[#4B5563] leading-relaxed`}>
                  Offizielles Nachschlagewerk und architekturhistorisches Verzeichnis der Stadt Wien. 
                  Mit über <strong>2.300 Wohnhausanlagen</strong> und rund <strong>220.000 Wohnungen</strong> lebt etwa 
                  jeder vierte Wiener (über 500.000 Menschen) im sozialen Wohnbau. 
                  Hier finden Sie direkte Verweise zu den detaillierten Wikipedia-Listen aller 23 Wiener Bezirke, Denkmalschutz-Daten des Bundesdenkmalamts und Kunst am Bau.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <a
                  href={WIKIPEDIA_MAIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold text-sm sm:text-base transition shadow-sm border-2 border-[#1B4332]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Hauptartikel auf Wikipedia</span>
                </a>

                <button
                  onClick={() => setActiveWikiTab('WISEG')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm transition border-2 border-amber-300"
                >
                  <Landmark className="w-3.5 h-3.5 text-amber-800" />
                  <span>Spezial: WISEG-Objekte anzeigen</span>
                </button>

                <div className="text-xs text-[#6B7280] font-medium text-center sm:text-left">
                  Quelle: de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten
                </div>
              </div>
            </div>

            {/* 4 Geometric KPI Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t-2 border-[#F3F4F6]">
              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  Gemeindebauten
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  &gt; 2.300
                </div>
                <span className="text-xs text-[#6B7280] font-medium">In allen 23 Bezirken</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  Wohnungen gesamt
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  ~220.000
                </div>
                <span className="text-xs text-[#6B7280] font-medium">~500.000 Bewohner (25%)</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  Rotes Wien (1919–34)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  382 Bauten
                </div>
                <span className="text-xs text-[#6B7280] font-medium">65.000 Wohnungen von 199 Architekten</span>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  Denkmalschutz (BDA)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[#0D1B2A] mt-1">
                  &gt; 400
                </div>
                <span className="text-xs text-[#6B7280] font-medium">Bundesdenkmalamt geschützt</span>
              </div>
            </div>
          </div>

          {/* Epochs & Historic Context Tabs */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A]`}>
                  Architektur-Epochen des Wiener Gemeindebaus
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Wie sich Hofruhe, Begrünung und Raumaufteilung seit 1919 entwickelt haben
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F4F5F7] rounded-xl border border-[#E5E7EB]">
                <button
                  onClick={() => setSelectedEpocheTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedEpocheTab === 'ALL'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#0D1B2A]'
                  }`}
                >
                  Alle Epochen
                </button>
                <button
                  onClick={() => setSelectedEpocheTab('ROTES_WIEN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedEpocheTab === 'ROTES_WIEN'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#0D1B2A]'
                  }`}
                >
                  🏛️ Rotes Wien
                </button>
                <button
                  onClick={() => setSelectedEpocheTab('NACHKRIEG')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedEpocheTab === 'NACHKRIEG'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#0D1B2A]'
                  }`}
                >
                  🌲 Nachkriegszeit
                </button>
                <button
                  onClick={() => setSelectedEpocheTab('DENKMAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedEpocheTab === 'DENKMAL'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#0D1B2A]'
                  }`}
                >
                  🎨 Kunst am Bau & BDA
                </button>
              </div>
            </div>

            {/* Epochen Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Rotes Wien */}
              <div className={`p-5 rounded-2xl border-2 transition ${
                selectedEpocheTab === 'ROTES_WIEN' || selectedEpocheTab === 'ALL'
                  ? 'border-[#2D6A4F] bg-[#F0FDF4]/30'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-60'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                    1919–1934
                  </span>
                  <span className="text-xs font-bold text-[#6B7280]">382 Bauten</span>
                </div>
                <h4 className="text-lg font-bold text-[#0D1B2A] mb-1.5">
                  Das Erste Rote Wien: Die Volkswohnpaläste
                </h4>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed mb-3">
                  Monumentale "Superblöcke" mit geschlossenen Innenhöfen (z.B. Karl-Marx-Hof, Sandleitenhof, Rabenhof). 
                  Nur 30–40% Grundstücksverbauung schufen lichte, schallgeschützte Innenoasen mit Wäschereien, Badeanstalten und Bibliotheken.
                </p>
                <div className="text-xs text-[#065F46] font-bold">
                  Meisterwerke: Karl Ehn, Peter Behrens, Josef Frank, Hubert Gessner
                </div>
              </div>

              {/* 2. Wiederaufbau */}
              <div className={`p-5 rounded-2xl border-2 transition ${
                selectedEpocheTab === 'NACHKRIEG' || selectedEpocheTab === 'ALL'
                  ? 'border-[#2D6A4F] bg-[#F0FDF4]/30'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-60'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                    1947–1970er
                  </span>
                  <span className="text-xs font-bold text-[#6B7280]">96.000 WE bis 1970</span>
                </div>
                <h4 className="text-lg font-bold text-[#0D1B2A] mb-1.5">
                  Wiederaufbau & Pavillon-Siedlungen im Grünen
                </h4>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed mb-3">
                  Abkehr von Blockrändern hin zur aufgelockerten Zeilenbauweise (z.B. Hugo-Breitner-Hof in Penzing, Per-Albin-Hansson-Siedlung). 
                  Riesige Parkflächen, Baumhaine und maximale Ruhe durch weiten Abstand zu Verkehrsstraßen.
                </p>
                <div className="text-xs text-blue-800 font-bold">
                  Fokus: Hoher Grünflächenanteil & ebenflächige Spazierwege
                </div>
              </div>

              {/* 3. Kunst am Bau & BDA */}
              <div className={`p-5 rounded-2xl border-2 transition ${
                selectedEpocheTab === 'DENKMAL' || selectedEpocheTab === 'ALL'
                  ? 'border-[#2D6A4F] bg-[#F0FDF4]/30'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] opacity-60'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                    Bundesdenkmalamt
                  </span>
                  <span className="text-xs font-bold text-[#6B7280]">§ 2a DMSG</span>
                </div>
                <h4 className="text-lg font-bold text-[#0D1B2A] mb-1.5">
                  Denkmalschutz & Kunst am Bau
                </h4>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed mb-3">
                  Wien verpflichtete sich gesetzlich, bei jedem Gemeindebau bildende Künstler zu beauftragen. 
                  Über 4.000 Kunstwerke – von der Sonnenuhr bis zu Mosaikreliefs und Bronzebrunnen – prägen die Höfe und machen sie zu Freiluftgalerien.
                </p>
                <div className="text-xs text-amber-900 font-bold">
                  Besonderheit: Denkmalgeschützte Ruheinseln und Identifikationssymbole
                </div>
              </div>
            </div>
          </div>

          {/* District Directory (1. bis 23. Bezirk) */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A] flex items-center gap-2`}>
                  <span>Verzeichnis nach Wiener Bezirken (1. bis 23. Bezirk)</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4F5F7] text-[#4B5563] border border-[#E5E7EB]">
                    {filteredDistricts.length} Bezirke
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Jeder Bezirk verfügt über eine eigene, vollständige Teilliste auf Wikipedia mit allen Gemeindebauten
                </p>
              </div>

              {/* Search Field */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={districtSearchTerm}
                  onChange={(e) => setDistrictSearchTerm(e.target.value)}
                  placeholder="Bezirk, Architekt oder Anlage suchen..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2D6A4F] text-sm text-[#0D1B2A] outline-hidden placeholder:text-[#9CA3AF]"
                />
                {districtSearchTerm && (
                  <button
                    onClick={() => setDistrictSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280] hover:text-[#0D1B2A] bg-stone-100 px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* District Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDistricts.map((district) => {
                const bautenInBezirk = allBauten.filter((b) => b.bezirk === district.bezirk);

                return (
                  <div
                    key={district.bezirk}
                    className="bg-[#F9FAFB] rounded-2xl border-2 border-[#E5E7EB] hover:border-[#2D6A4F] p-5 shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top bar with district badge and Wikipedia link */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-[#2D6A4F] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                            {district.bezirk}
                          </span>
                          <div>
                            <h4 className="font-bold text-[#0D1B2A] text-base group-hover:text-[#2D6A4F] transition">
                              {district.bezirk}. {district.name}
                            </h4>
                            <span className="text-xs text-[#6B7280]">
                              ~{district.anzahlGemeindebautenApprox} Gemeindebauten
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-50 text-amber-900 border border-amber-200">
                          {district.denkmalgeschuetzteObjekte} BDA
                        </span>
                      </div>

                      {/* Character note */}
                      <p className="text-xs text-[#4B5563] mb-3 leading-relaxed">
                        {district.charakteristik}
                      </p>

                      {/* Famous complexes */}
                      <div className="space-y-1 mb-3 pt-2 border-t border-stone-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
                          Bekannte Anlagen:
                        </span>
                        <ul className="text-xs text-[#1F2937] space-y-0.5 font-medium">
                          {district.bekannteBauten.map((bau, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] shrink-0" />
                              <span className="line-clamp-1">{bau}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Architects */}
                      <div className="mb-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
                          Bedeutende Architekten:
                        </span>
                        <p className="text-xs text-[#4B5563] font-medium line-clamp-1 mt-0.5">
                          {district.bedeutendeArchitekten.join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="space-y-2 pt-3 border-t border-stone-200">
                      <div className="flex items-center gap-2">
                        <a
                          href={district.wikipediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F0FDF4] text-[#2D6A4F] border border-[#2D6A4F]/40 hover:border-[#2D6A4F] text-xs font-bold transition shadow-xs"
                          title={`Vollständige Liste der Gemeindebauten in ${district.name} auf Wikipedia öffnen`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Wikipedia Teilliste</span>
                        </a>

                        <button
                          onClick={() => onFilterBezirkInApp(district.bezirk)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs"
                          title="Im Ruheguide auf diesen Bezirk filtern"
                        >
                          <span>Filtern</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {bautenInBezirk.length > 0 && (
                        <div className="text-[11px] text-[#6B7280] flex items-center justify-between font-medium px-1">
                          <span>Im Ruheguide erfasst:</span>
                          <span className="font-bold text-[#0D1B2A]">{bautenInBezirk.length} Anlagen</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured Iconic Gemeindebauten with Wikipedia Deep-Links */}
          <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A]`}>
                  Wiener Ikonen & Wikipedia-Hauptartikel
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Die architektonisch bedeutendsten Wohnhausanlagen mit eigenem enzyklopädischem Eintrag
                </p>
              </div>
              <span className="text-xs font-bold text-[#2D6A4F] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                Weltkulturerbe des sozialen Wohnbaus
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: 'karl-marx-hof',
                  name: 'Karl-Marx-Hof',
                  bezirk: '19. Döbling',
                  jahr: '1927–1930',
                  architekt: 'Karl Ehn',
                  wohnungen: '1.382 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Karl-Marx-Hof',
                  highlight: '1,1 km Länge, "Ringstraße der Arbeiter"',
                },
                {
                  id: 'sandleitenhof',
                  name: 'Sandleitenhof',
                  bezirk: '16. Ottakring',
                  jahr: '1924–1928',
                  architekt: 'Hoppe, Schönthal, Matuschek',
                  wohnungen: '1.587 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Sandleitenhof',
                  highlight: 'Größter Bau des Roten Wien nach Wohnungszahl',
                },
                {
                  id: 'rabenhof-landstrasse',
                  name: 'Rabenhof',
                  bezirk: '3. Landstraße',
                  jahr: '1925–1928',
                  architekt: 'Heinrich Schmid, Hermann Aichinger',
                  wohnungen: '1.109 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Rabenhof',
                  highlight: 'Eigene Theaterbühne (Rabenhof Theater)',
                },
                {
                  id: 'reumannhof-margareten',
                  name: 'Reumannhof',
                  bezirk: '5. Margareten',
                  jahr: '1924–1926',
                  architekt: 'Hubert Gessner',
                  wohnungen: '999 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Reumannhof',
                  highlight: 'Zentralbau am Margaretengürtel',
                },
                {
                  id: 'hugo-breitner-hof',
                  name: 'Hugo-Breitner-Hof',
                  bezirk: '14. Penzing',
                  jahr: '1953–1956',
                  architekt: 'Leo Kammel, Franz Schuster',
                  wohnungen: '1.240 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Hugo-Breitner-Hof',
                  highlight: '126.000 m² Parkruhe, Pavillonbau',
                },
                {
                  id: 'karl-seitz-hof',
                  name: 'Karl-Seitz-Hof',
                  bezirk: '21. Floridsdorf',
                  jahr: '1926–1931',
                  architekt: 'Hubert Gessner',
                  wohnungen: '1.173 Wohnungen',
                  wikiUrl: 'https://de.wikipedia.org/wiki/Karl-Seitz-Hof',
                  highlight: '"Gartenstadt im Großformat" mit Uhrturm',
                },
              ].map((item) => {
                const existingBau = allBauten.find(b => b.id === item.id);

                return (
                  <div
                    key={item.name}
                    className="p-4 rounded-2xl bg-[#F9FAFB] border-2 border-[#E5E7EB] hover:border-[#2D6A4F] flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-[#2D6A4F]">{item.bezirk}</span>
                        <span className="text-[11px] font-bold text-[#6B7280]">{item.jahr}</span>
                      </div>
                      <h4 className="font-bold text-[#0D1B2A] text-base group-hover:text-[#2D6A4F] transition">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#4B5563] mt-0.5">
                        Architekt: {item.architekt} • {item.wohnungen}
                      </p>
                      <p className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md mt-2 border border-emerald-200">
                        {item.highlight}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-200">
                      <a
                        href={item.wikiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#2D6A4F]/40 hover:border-[#2D6A4F] text-[#2D6A4F] text-xs font-bold transition shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Wikipedia-Artikel</span>
                      </a>

                      {existingBau && (
                        <button
                          onClick={() => onSelectBau(existingBau)}
                          className="px-3 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold transition shadow-xs"
                          title="Akustik- und Ruheprofil ansehen"
                        >
                          Ruhedaten
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
