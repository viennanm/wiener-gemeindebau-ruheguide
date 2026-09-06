import React, { useState, useEffect } from 'react';
import { Gemeindebau, BezirkNummer, BauEpoche } from './types';
import { GEMEINDEBAUTEN, GRINZINGER_ALLEE_REFERENCE } from './data/gemeindebauten';
import { WIENER_BEZIRKE } from './data/wienerBezirke';
import { fetchViennaOpenDataGemeindebauten } from './services/viennaOpenDataService';
import { loadGemeindebautenFromDb, getGemeindebauStats } from './services/gemeindebauDbService';
import { Header } from './components/Header';
import { ReferenzVergleichBanner } from './components/ReferenzVergleichBanner';
import { GemeindebauCard } from './components/GemeindebauCard';
import { GemeindebauDetailModal } from './components/GemeindebauDetailModal';
import { ViennaMap } from './components/ViennaMap';
import { ViennaLeafletMap } from './components/ViennaLeafletMap';
import { getGemeindebauImage } from './data/gemeindebauImages';
import { AcousticLabModal } from './components/AcousticLabModal';
import { SwiftCodeViewer } from './components/SwiftCodeViewer';
import { OpenDataGuide } from './components/OpenDataGuide';
import { WikipediaView } from './components/WikipediaView';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Accessibility, 
  Volume2, 
  SlidersHorizontal, 
  HelpCircle,
  CheckCircle2,
  TreePine,
  Mountain,
  Database,
  RefreshCw,
  Info,
  Landmark,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Navigation & Display State
  const [activeTab, setActiveTab] = useState<'app' | 'map' | 'audio' | 'swift' | 'opendata' | 'wikipedia'>('app');
  const [seniorMode, setSeniorMode] = useState<boolean>(true); // Default senior mode ON for readability
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [selectedBau, setSelectedBau] = useState<Gemeindebau | null>(null);
  const [mapMode, setMapMode] = useState<'real' | 'schematic'>('real'); // Real map plan by default

  // Data State (all 23 districts)
  const [bautenList, setBautenList] = useState<Gemeindebau[]>(GEMEINDEBAUTEN);
  const [isLoadingOpenData, setIsLoadingOpenData] = useState<boolean>(false);
  const [hasLoadedOpenData, setHasLoadedOpenData] = useState<boolean>(false);

  // Filter States
  const [searchText, setSearchText] = useState<string>('');
  const [selectedBezirk, setSelectedBezirk] = useState<BezirkNummer | 'ALL'>('ALL');
  const [minRuheScore, setMinRuheScore] = useState<number>(7);
  const [onlyStufenlos, setOnlyStufenlos] = useState<boolean>(true);
  const [maxBimDistanz, setMaxBimDistanz] = useState<number>(300);
  const [onlyFlatTerrain, setOnlyFlatTerrain] = useState<boolean>(false);
  const [onlyDenkmalschutz, setOnlyDenkmalschutz] = useState<boolean>(false);
  const [onlyWiseg, setOnlyWiseg] = useState<boolean>(false);
  const [selectedEpoche, setSelectedEpoche] = useState<BauEpoche | 'ALL'>('ALL');

  // Automatischer Import der 1.776 Gemeindebauten aus der SQLite-Datenbank beim Start
  useEffect(() => {
    let isMounted = true;
    loadGemeindebautenFromDb()
      .then((allDbBauten) => {
        if (!isMounted) return;
        if (allDbBauten && allDbBauten.length > 0) {
          setBautenList(allDbBauten);
          setHasLoadedOpenData(true);
        }
        setIsLoadingDb(false);
      })
      .catch((err) => {
        console.warn('Laden der SQLite-Gemeindebauten fehlgeschlagen:', err);
        if (isMounted) setIsLoadingDb(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Funktion zum manuellen Nachladen / Synchronisieren
  const handleLoadOpenData = async () => {
    setIsLoadingOpenData(true);
    try {
      const allDbBauten = await loadGemeindebautenFromDb();
      if (allDbBauten && allDbBauten.length > 0) {
        setBautenList(allDbBauten);
        setHasLoadedOpenData(true);
      }
    } catch (e) {
      console.warn('Fehler beim Aktualisieren der Daten', e);
    } finally {
      setIsLoadingOpenData(false);
    }
  };

  // Filter Logic
  const filteredBauten = bautenList.filter((bau) => {
    // Search query
    if (searchText.trim() !== '') {
      const q = searchText.toLowerCase();
      const matchName = bau.name.toLowerCase().includes(q);
      const matchAdresse = bau.adresse.toLowerCase().includes(q);
      const matchStation = bau.naechsteStation.toLowerCase().includes(q);
      const matchLinien = bau.linien.some((l) => l.toLowerCase().includes(q));
      if (!matchName && !matchAdresse && !matchStation && !matchLinien) return false;
    }

    // District filter
    if (selectedBezirk !== 'ALL' && bau.bezirk !== selectedBezirk) {
      return false;
    }

    // Min Ruhe Score
    if (bau.ruheScore < minRuheScore) {
      return false;
    }

    // Only Stufenlos Lift
    if (onlyStufenlos && !bau.isStufenlos) {
      return false;
    }

    // Bim distance
    if (bau.bimBusDistanzMeter > maxBimDistanz) {
      return false;
    }

    // Terrain: Only flat without hillsides
    if (onlyFlatTerrain && bau.gelaendeTyp !== 'Eben / Flachland') {
      return false;
    }

    // Monument protection (Denkmalschutz BDA)
    if (onlyDenkmalschutz && !bau.denkmalschutz) {
      return false;
    }

    // WISEG filter (historical Zinshäuser)
    if (onlyWiseg && !bau.isWiseg) {
      return false;
    }

    // Epoch filter
    if (selectedEpoche !== 'ALL' && bau.bauEpoche !== selectedEpoche) {
      return false;
    }

    return true;
  });

  const quickBezirke: { id: BezirkNummer | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Alle 23 Bezirke' },
    { id: 19, label: '19. Döbling' },
    { id: 18, label: '18. Währing' },
    { id: 17, label: '17. Hernals' },
    { id: 14, label: '14. Penzing' },
    { id: 13, label: '13. Hietzing' },
    { id: 22, label: '22. Donaustadt' },
    { id: 21, label: '21. Floridsdorf' },
    { id: 10, label: '10. Favoriten' },
    { id: 3, label: '3. Landstraße' },
    { id: 2, label: '2. Leopoldstadt' },
  ];

  const currentBezirkInfo = selectedBezirk !== 'ALL' 
    ? WIENER_BEZIRKE.find((b) => b.nummer === selectedBezirk) 
    : null;

  return (
    <div className={`min-h-screen bg-[#F4F5F7] text-[#1A1A1A] flex flex-col ${seniorMode ? 'text-lg' : 'text-base'}`}>
      {/* Universal Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        seniorMode={seniorMode}
        setSeniorMode={setSeniorMode}
        isAudioPlaying={isAudioPlaying}
        setIsAudioPlaying={setIsAudioPlaying}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
        {/* TAB 1: Main App Simulator / Ruhelagen-Katalog */}
        {activeTab === 'app' && (
          <div className="space-y-6">
            {/* Context & Starting Scenario Banner: Grinzinger Allee 54 */}
            <ReferenzVergleichBanner
              seniorMode={seniorMode}
              onOpenAudioLab={() => setActiveTab('audio')}
              isAudioPlaying={isAudioPlaying}
              setIsAudioPlaying={setIsAudioPlaying}
              onSelectRef={() => setSelectedBau(GRINZINGER_ALLEE_REFERENCE)}
            />

            {/* Filter & Search Controls Bar (Geometric Balance) */}
            <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search Field */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Suche nach Gemeindebau, Adresse, Haltestelle..."
                    className={`w-full pl-12 pr-4 py-3 rounded-xl bg-[#F9FAFB] border-2 border-[#E5E7EB] focus:bg-white focus:border-[#2D6A4F] focus:ring-0 outline-hidden transition font-medium ${
                      seniorMode ? 'text-lg' : 'text-base'
                    } text-[#1A1A1A] placeholder:text-[#9CA3AF]`}
                  />
                  {searchText && (
                    <button
                      onClick={() => setSearchText('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B7280] hover:text-[#0D1B2A] bg-[#E5E7EB] px-2 py-0.5 rounded"
                    >
                      Löschen
                    </button>
                  )}
                </div>

                {/* Counter Badge & Database Status */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="text-xs sm:text-sm font-bold text-[#4B5563] tracking-wide uppercase flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2D6A4F]"></span>
                    <span>
                      <strong>{filteredBauten.length}</strong> ANLAGEN GEFILTERT (VON {bautenList.length})
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#065F46] border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{bautenList.length >= 1700 ? '1.776 Gemeindebauten geladen' : 'Lade Datenbank...'}</span>
                  </span>
                </div>
              </div>

              {/* District Selector (All 23 Districts Dropdown & Quick Chips) */}
              <div className="space-y-3 pt-3 border-t-2 border-[#F3F4F6]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <label htmlFor="bezirk-select" className="text-xs font-black text-[#0D1B2A] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
                    <span>Wiener Bezirk auswählen (1. bis 23. Bezirk):</span>
                  </label>

                  <select
                    id="bezirk-select"
                    value={selectedBezirk}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedBezirk(val === 'ALL' ? 'ALL' : (Number(val) as BezirkNummer));
                    }}
                    className="px-4 py-2 rounded-xl bg-white border-2 border-[#2D6A4F]/40 text-[#0D1B2A] font-bold text-xs sm:text-sm focus:border-[#2D6A4F] focus:outline-hidden"
                  >
                    <option value="ALL">Alle 23 Wiener Bezirke (Wien gesamt • {bautenList.length} Anlagen)</option>
                    {WIENER_BEZIRKE.map((b) => (
                      <option key={b.nummer} value={b.nummer}>
                        {b.nummer}. {b.name} — {b.typischeHoehe} ({b.charakter})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick District Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mr-1">
                    Schnellfilter:
                  </span>
                  {quickBezirke.map((bezirk) => (
                    <button
                      key={bezirk.id}
                      onClick={() => setSelectedBezirk(bezirk.id)}
                      className={`px-3 py-1.5 rounded-full font-bold transition text-xs border-2 ${
                        selectedBezirk === bezirk.id
                          ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-xs'
                          : 'bg-white hover:bg-[#F0FDF4] text-[#4B5563] hover:text-[#0D1B2A] border-[#E5E7EB]'
                      }`}
                    >
                      {bezirk.label}
                    </button>
                  ))}
                </div>

                {/* Selected District Info Banner (Topography & Senior Context) */}
                {currentBezirkInfo && (
                  <div className="p-3.5 rounded-xl bg-[#F0FDF4] border-2 border-[#A7F3D0] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#065F46] font-black text-sm">
                          {currentBezirkInfo.nummer}. Bezirk: {currentBezirkInfo.name}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#A7F3D0] text-[#065F46] font-bold text-[11px]">
                          {currentBezirkInfo.typischeHoehe}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#065F46] font-semibold text-[11px]">
                          {currentBezirkInfo.gelaendeCharakteristik}
                        </span>
                      </div>
                      <p className="text-[#047857] text-xs">
                        <strong>Lage- & Umgebungshinweis:</strong> {currentBezirkInfo.seniorenEmpfehlung}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedBezirk('ALL')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#A7F3D0] hover:bg-emerald-50 text-[#065F46] font-bold text-xs"
                    >
                      Zurück zu allen 23 Bezirken
                    </button>
                  </div>
                )}
              </div>

              {/* Wohn- & Ruhekriterien Filter (Score, Lift, Bim, Topographie) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t-2 border-[#F3F4F6] text-xs sm:text-sm">
                {/* 1. Lift Toggle */}
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                  onlyStufenlos ? 'bg-[#ECFDF5] border-[#2D6A4F]' : 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={onlyStufenlos}
                    onChange={(e) => setOnlyStufenlos(e.target.checked)}
                    className="w-5 h-5 rounded text-[#2D6A4F] focus:ring-[#2D6A4F] accent-[#2D6A4F]"
                  />
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] block">Nur stufenloser Lift</span>
                    <span className="text-[11px] text-[#6B7280]">Keine Treppen zum Liftpodest</span>
                  </div>
                </label>

                {/* 2. Topographie / Geländeprofil Toggle */}
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                  onlyFlatTerrain ? 'bg-[#ECFDF5] border-[#2D6A4F]' : 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={onlyFlatTerrain}
                    onChange={(e) => setOnlyFlatTerrain(e.target.checked)}
                    className="w-5 h-5 rounded text-[#2D6A4F] focus:ring-[#2D6A4F] accent-[#2D6A4F]"
                  />
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] block">Nur ebenes Gelände</span>
                    <span className="text-[11px] text-[#6B7280]">Keine Steigungen / Hanglagen</span>
                  </div>
                </label>

                {/* 3. Ruhe-Score Slider/Select */}
                <div className="p-3 rounded-xl bg-[#F9FAFB] border-2 border-[#E5E7EB] flex items-center justify-between gap-2">
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] block">Mindest-Ruhe-Score</span>
                    <span className="text-[11px] text-[#6B7280]">Skala von 1 bis 10</span>
                  </div>
                  <select
                    value={minRuheScore}
                    onChange={(e) => setMinRuheScore(Number(e.target.value))}
                    className="font-bold bg-white border-2 border-[#E5E7EB] rounded-lg px-2.5 py-1 text-[#0D1B2A] focus:border-[#2D6A4F] outline-hidden"
                  >
                    <option value={5}>Ab Note 5</option>
                    <option value={7}>Ab Note 7 (Gut)</option>
                    <option value={8}>Ab Note 8 (Sehr ruhig)</option>
                    <option value={9}>Ab Note 9 (Hervorragend)</option>
                    <option value={10}>Note 10 (Oase)</option>
                  </select>
                </div>

                {/* 4. Max Bim Distanz */}
                <div className="p-3 rounded-xl bg-[#F9FAFB] border-2 border-[#E5E7EB] flex items-center justify-between gap-2">
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] block">Max. Bim-Distanz</span>
                    <span className="text-[11px] text-[#6B7280]">Gehweg zur Haltestelle</span>
                  </div>
                  <select
                    value={maxBimDistanz}
                    onChange={(e) => setMaxBimDistanz(Number(e.target.value))}
                    className="font-bold bg-white border-2 border-[#E5E7EB] rounded-lg px-2.5 py-1 text-[#0D1B2A] focus:border-[#2D6A4F] outline-hidden"
                  >
                    <option value={200}>Bis 200 m (Sehr nah)</option>
                    <option value={300}>Bis 300 m (Ideal)</option>
                    <option value={500}>Bis 500 m</option>
                  </select>
                </div>
              </div>

              {/* Denkmalschutz, WISEG, Bau-Epoche & Wikipedia Integration Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t-2 border-[#F3F4F6] text-xs sm:text-sm">
                {/* Denkmalschutz Toggle */}
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                  onlyDenkmalschutz ? 'bg-amber-50 border-amber-500' : 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={onlyDenkmalschutz}
                    onChange={(e) => setOnlyDenkmalschutz(e.target.checked)}
                    className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-amber-700" />
                      <span>Nur Denkmalschutz (BDA)</span>
                    </span>
                    <span className="text-[11px] text-[#6B7280]">Historisch geschützte Bausubstanz</span>
                  </div>
                </label>

                {/* WISEG Toggle */}
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                  onlyWiseg ? 'bg-amber-100/90 border-[#B45309]' : 'bg-[#F9FAFB] border-[#E5E7EB] hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={onlyWiseg}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOnlyWiseg(checked);
                      if (checked) {
                        setOnlyStufenlos(false);
                      }
                    }}
                    className="w-5 h-5 rounded text-[#B45309] focus:ring-[#B45309] accent-[#B45309]"
                  />
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>Nur WISEG-Zinshäuser</span>
                    </span>
                    <span className="text-[11px] text-[#6B7280]">Atypische Bauten (≤ 18 WE)</span>
                  </div>
                </label>

                {/* Bau-Epoche Selector */}
                <div className="p-3 rounded-xl bg-[#F9FAFB] border-2 border-[#E5E7EB] flex items-center justify-between gap-2">
                  <div className="leading-tight">
                    <span className="font-bold text-[#0D1B2A] block">Architektur-Epoche</span>
                    <span className="text-[11px] text-[#6B7280]">Baujahr & Stilistik</span>
                  </div>
                  <select
                    value={selectedEpoche}
                    onChange={(e) => setSelectedEpoche(e.target.value as BauEpoche | 'ALL')}
                    className="font-bold bg-white border-2 border-[#E5E7EB] rounded-lg px-2 py-1 text-[#0D1B2A] focus:border-[#2D6A4F] outline-hidden text-xs max-w-[140px]"
                  >
                    <option value="ALL">Alle Epochen</option>
                    <option value="Rotes Wien (1919–1934)">Rotes Wien (1919–34)</option>
                    <option value="Wiederaufbau & Nachkriegszeit (1945–1979)">Nachkrieg (1945–79)</option>
                    <option value="Postmoderne & Stadterneuerung (1980–2010)">Stadterneuerung (80–10)</option>
                    <option value="Gemeindebau NEU (ab 2019)">Gemeindebau NEU</option>
                    <option value="Bürgerhaus & Gründerzeit (WISEG)">WISEG (Bürgerhaus/Altbau)</option>
                  </select>
                </div>

                {/* Wikipedia-Register Callout Link */}
                <button
                  onClick={() => setActiveTab('wikipedia')}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border-2 border-[#2D6A4F]/40 hover:border-[#2D6A4F] text-[#2D6A4F] font-bold transition text-left"
                >
                  <div className="leading-tight">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Wikipedia-Register</span>
                    </span>
                    <span className="text-[11px] text-[#4B5563] font-normal block mt-0.5">
                      23 Bezirke & WISEG-Liste
                    </span>
                  </div>
                  <span className="text-xs bg-[#2D6A4F] text-white px-2 py-1 rounded-md shrink-0">
                    Öffnen →
                  </span>
                </button>
              </div>
            </div>

            {/* Results Grid */}
            {filteredBauten.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#F4F5F7] text-[#6B7280] flex items-center justify-center mx-auto">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0D1B2A]">
                  Keine Wohnhausanlage entspricht allen Kriterien
                </h3>
                <p className="text-[#4B5563] text-sm max-w-md mx-auto">
                  Probieren Sie, den Mindest-Ruhe-Score leicht zu senken oder den Umkreis für die Bim-Haltestelle zu erweitern.
                </p>
                <button
                  onClick={() => {
                    setMinRuheScore(7);
                    setOnlyStufenlos(false);
                    setSelectedBezirk('ALL');
                    setMaxBimDistanz(500);
                  }}
                  className="px-6 py-2 rounded-full bg-[#2D6A4F] hover:bg-[#1B4332] border-2 border-[#1B4332] text-white text-sm font-bold transition shadow-xs"
                >
                  Filter zurücksetzen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBauten.map((bau) => (
                  <GemeindebauCard
                    key={bau.id}
                    bau={bau}
                    onSelect={(b) => setSelectedBau(b)}
                    seniorMode={seniorMode}
                    isAudioPlaying={isAudioPlaying}
                    setIsAudioPlaying={setIsAudioPlaying}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Wien-Karte mit Lärmkorridoren & Echter Stadtplan */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Map Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border-2 border-[#E5E7EB] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Kartenansicht:
                </span>
                <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-xl border border-[#D1D5DB]">
                  <button
                    onClick={() => setMapMode('real')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      mapMode === 'real'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#4B5563] hover:text-[#0D1B2A]'
                    }`}
                  >
                    <span>🗺️ Echter Stadtplan (Straßen & Satellit)</span>
                  </button>
                  <button
                    onClick={() => setMapMode('schematic')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                      mapMode === 'schematic'
                        ? 'bg-[#2D6A4F] text-white shadow-xs'
                        : 'text-[#4B5563] hover:text-[#0D1B2A]'
                    }`}
                  >
                    <span>📐 Schematische Übersicht</span>
                  </button>
                </div>
              </div>

              <span className="text-xs text-[#6B7280] font-medium hidden sm:inline">
                {mapMode === 'real' ? 'Interaktive Karte mit echten Wiener Straßennamen & Hausblöcken' : 'Vektorschema mit Wienerwald- & Donauverlauf'}
              </span>
            </div>

            {mapMode === 'real' ? (
              <ViennaLeafletMap
                gemeindebauten={filteredBauten}
                selectedBau={selectedBau}
                onSelect={(b) => setSelectedBau(b)}
                seniorMode={seniorMode}
              />
            ) : (
              <ViennaMap
                gemeindebauten={filteredBauten}
                selectedBau={selectedBau}
                onSelect={(b) => setSelectedBau(b)}
                seniorMode={seniorMode}
              />
            )}

            {/* Quick List under the map with Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-[#0D1B2A] text-sm uppercase tracking-wider">
                  Ausgewählte Anlagen ({filteredBauten.length} Standorte auf dem Plan)
                </h4>
                <span className="text-xs text-[#6B7280]">Klicken für Detailansicht & Foto</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBauten.map((bau) => {
                  const bauPhoto = bau.bildUrl || getGemeindebauImage(bau.id, bau.name, bau.bildUrl);
                  return (
                    <div
                      key={bau.id}
                      onClick={() => setSelectedBau(bau)}
                      className="bg-white rounded-2xl border-2 border-[#E5E7EB] hover:border-[#2D6A4F] hover:border-l-8 cursor-pointer shadow-xs overflow-hidden flex flex-col transition-all group"
                    >
                      <div className="relative h-28 w-full overflow-hidden bg-stone-100">
                        <img
                          src={bauPhoto}
                          alt={bau.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-white/90 text-[#0D1B2A] backdrop-blur-xs">
                          {bau.bezirk}. Bezirk
                        </div>
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-black text-white bg-[#2D6A4F] shadow-xs">
                          {bau.ruheScore}/10
                        </span>
                      </div>

                      <div className="p-3.5 flex flex-col justify-between flex-1">
                        <div>
                          <h4 className="font-bold text-[#0D1B2A] text-sm group-hover:text-[#2D6A4F] transition">{bau.name}</h4>
                          <p className="text-xs text-[#6B7280]">{bau.adresse} • {bau.hoehenmeter}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2 mt-2 border-t border-stone-100 font-medium">
                          <span>Hof: {bau.akustikDbInnenhof} dB(A)</span>
                          <span className="text-[#065F46] font-bold">Details &rarr;</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Akustik-Labor (73 dB vs 41 dB) */}
        {activeTab === 'audio' && (
          <AcousticLabModal
            seniorMode={seniorMode}
            isAudioPlaying={isAudioPlaying}
            setIsAudioPlaying={setIsAudioPlaying}
          />
        )}

        {/* TAB 4: Swift iOS 17 Source Code Viewer */}
        {activeTab === 'swift' && (
          <SwiftCodeViewer seniorMode={seniorMode} />
        )}

        {/* TAB 5: Open Data Wien (data.gv.at) */}
        {activeTab === 'opendata' && (
          <OpenDataGuide seniorMode={seniorMode} />
        )}

        {/* TAB 6: Wikipedia-Register (Liste der Wiener Gemeindebauten) */}
        {activeTab === 'wikipedia' && (
          <WikipediaView
            seniorMode={seniorMode}
            onFilterBezirkInApp={(bezirkNummer) => {
              setSelectedBezirk(bezirkNummer as BezirkNummer);
              setActiveTab('app');
            }}
            onSelectBau={(bau) => setSelectedBau(bau)}
            allBauten={bautenList}
          />
        )}
      </main>

      {/* Detail Modal */}
      {selectedBau && (
        <GemeindebauDetailModal
          bau={selectedBau}
          onClose={() => setSelectedBau(null)}
          seniorMode={seniorMode}
          isAudioPlaying={isAudioPlaying}
          setIsAudioPlaying={setIsAudioPlaying}
          onOpenAudioLab={() => {
            setSelectedBau(null);
            setActiveTab('audio');
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white text-[#4B5563] border-t-2 border-[#E5E7EB] mt-12 py-8 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#0D1B2A]">
              Wiener Gemeindebau-Ruheguide • Konzeption & iOS 17 Swift-Implementierung
            </p>
            <p className="text-[#6B7280] text-xs mt-0.5">
              Geodaten: Stadt Wien (data.gv.at) • Umgebungslärmkataster 2022 (LDEN / LNIGHT) • Wohnberatung Wien
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('wikipedia')}
              className="font-bold text-[#2D6A4F] hover:underline"
            >
              Wikipedia-Register (23 Bezirke)
            </button>
            <span className="text-[#D1D5DB]">•</span>
            <button
              onClick={() => setActiveTab('swift')}
              className="font-bold text-[#2D6A4F] hover:underline"
            >
              Swift-Code ansehen
            </button>
            <span className="text-[#D1D5DB]">•</span>
            <button
              onClick={() => setActiveTab('opendata')}
              className="font-bold text-[#2D6A4F] hover:underline"
            >
              Open Data API
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
