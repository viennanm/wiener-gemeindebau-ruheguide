import React from 'react';
import { Gemeindebau } from '../types';
import { getGemeindebauImage } from '../data/gemeindebauImages';
import {
  X,
  TreePine,
  Volume2,
  VolumeX,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  Accessibility,
  MapPin,
  Info,
  Calendar,
  Building,
  ShieldCheck,
  ArrowRight,
  Mountain,
  Camera,
  Landmark,
  ExternalLink,
  Palette,
  BookOpen,
  Eye,
  Compass,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { playQuietCourtyard, playStreetTraffic, stopAudio } from '../utils/audioSimulator';
import {
  formatInteger,
  formatPercent,
  formatDensity,
  formatChange,
  getWienComparison,
  WIEN_BENCHMARKS
} from '../utils/populationFormatting';

interface Props {
  bau: Gemeindebau;
  onClose: () => void;
  seniorMode: boolean;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (val: boolean) => void;
  onOpenAudioLab: () => void;
}

export const GemeindebauDetailModal: React.FC<Props> = ({
  bau,
  onClose,
  seniorMode,
  isAudioPlaying,
  setIsAudioPlaying,
  onOpenAudioLab,
}) => {
  const [playingThisAudio, setPlayingThisAudio] = React.useState(false);
  const [mediaView, setMediaView] = React.useState<'photo' | 'streetview'>('photo');
  const [showMethodology, setShowMethodology] = React.useState(false);
  const photoUrl = bau.bildUrl || getGemeindebauImage(bau.id, bau.name, bau.bildUrl);

  const toggleAudio = () => {
    if (playingThisAudio) {
      stopAudio();
      setPlayingThisAudio(false);
      setIsAudioPlaying(false);
    } else {
      playQuietCourtyard();
      setPlayingThisAudio(true);
      setIsAudioPlaying(true);
    }
  };

  React.useEffect(() => {
    if (!isAudioPlaying) {
      setPlayingThisAudio(false);
    }
  }, [isAudioPlaying]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border-2 border-[#E5E7EB] overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 sm:px-8 py-4 border-b-2 border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
              {bau.bezirk}. Bezirk • {bau.bezirkName}
            </span>
            {bau.ogdId && (
              <span className="text-xs text-[#6B7280] font-mono font-bold">
                OGD: {bau.ogdId}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#4B5563] hover:text-[#0D1B2A] border-2 border-[#E5E7EB] hover:border-[#0D1B2A] transition"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Top Title & Score */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#6B7280] uppercase tracking-wider mb-1">
                {bau.bezirkName.toUpperCase()} • GEBAUT {bau.baujahr}
              </p>
              <h2 className={`${seniorMode ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'} font-black text-[#0D1B2A] tracking-tight`}>
                {bau.name}
              </h2>
              <p className={`${seniorMode ? 'text-xl' : 'text-base sm:text-lg'} text-[#4B5563] font-medium flex items-center gap-1.5 mt-1`}>
                <MapPin className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                <span>{bau.adresse}, {bau.plz} Wien</span>
              </p>
              {bau.architekt && (
                <p className="text-xs text-[#6B7280] font-medium mt-1 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  <span>Architektur: {bau.architekt} • {bau.wohnungenAnzahl} Wohnungen</span>
                </p>
              )}
            </div>

            {/* Big Ruhe Score Block (Geometric Balance) */}
            <div className="text-right shrink-0">
              <div className="text-5xl sm:text-6xl font-black text-[#2D6A4F] leading-none">
                {bau.ruheScore}
              </div>
              <div className="text-xs sm:text-sm font-black text-[#2D6A4F] tracking-widest uppercase mt-1">
                RUHE-SCORE
              </div>
            </div>
          </div>

          {/* Media Switcher: Hof-Fotografie vs. 360° Google Street View */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-[#F4F5F7] rounded-full border border-[#D1D5DB]">
                <button
                  onClick={() => setMediaView('photo')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    mediaView === 'photo'
                      ? 'bg-[#2D6A4F] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#0D1B2A]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Hof-Fotografie</span>
                </button>
                <button
                  onClick={() => setMediaView('streetview')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    mediaView === 'streetview'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-blue-600'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>360° Google Street View</span>
                </button>
              </div>

              <a
                href={bau.googleStreetViewUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${bau.koordinaten.lat},${bau.koordinaten.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full transition shadow-xs"
              >
                <span>In Google Maps öffnen</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {mediaView === 'photo' ? (
              /* Hof-Fotografie mit Urheberrecht */
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#E5E7EB] bg-stone-100 shadow-xs">
                <img
                  src={photoUrl}
                  alt={`Foto der Wohnhausanlage ${bau.name}`}
                  className="w-full h-56 sm:h-72 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />

                {/* Caption on Photo */}
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 mb-0.5">
                      <Camera className="w-3.5 h-3.5" />
                      Architektur & Hofansicht
                    </span>
                    <p className="text-sm font-bold text-white drop-shadow-sm">
                      {bau.name} – {bau.hofTyp}
                    </p>
                    <p className="text-xs text-white/90 drop-shadow-sm">
                      {bau.gruenraumBeschreibung}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs border border-white/20 text-white">
                      Höhe: {bau.hoehenmeter}
                    </span>
                    {bau.bildLizenz && (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-stone-300 border border-white/10">
                        © {bau.bildFotograf || 'Wikimedia'} • {bau.bildLizenz}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Interaktive Google Street View Straßenperspektive */
              <div className="rounded-2xl overflow-hidden border-2 border-blue-200 bg-stone-900 shadow-xs">
                <iframe
                  title={`Google Street View für ${bau.name}`}
                  src={`https://maps.google.com/maps?q=${bau.koordinaten.lat},${bau.koordinaten.lng}&layer=c&cbll=${bau.koordinaten.lat},${bau.koordinaten.lng}&cbp=11,0,0,0,0&output=svembed`}
                  className="w-full h-64 sm:h-80 border-0"
                  allowFullScreen
                  loading="lazy"
                />
                <div className="p-3 bg-stone-950 text-white flex flex-wrap items-center justify-between gap-2 text-xs border-t border-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="font-bold text-stone-200">
                      Interaktive 360°-Straßenansicht • Bildrechte: © Google Maps / Street View
                    </span>
                  </div>
                  <a
                    href={bau.googleStreetViewUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${bau.koordinaten.lat},${bau.koordinaten.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
                  >
                    <span>360° Vollbild öffnen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 3-Column Geometric Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. Akustik-Profil */}
            <div className="p-5 sm:p-6 bg-[#F9FAFB] rounded-2xl border-2 border-[#E5E7EB] flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-[#6B7280] uppercase tracking-wider mb-2">
                  Akustik-Profil
                </h4>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#0D1B2A]">{bau.akustikDbInnenhof}</span>
                  <span className="text-sm font-semibold text-[#6B7280]">dB(A) Innenhof</span>
                </div>
                <div className="h-2.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden my-2">
                  <div
                    className="h-full bg-[#2D6A4F] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, (bau.akustikDbInnenhof / 80) * 100))}%` }}
                  />
                </div>
              </div>
              <p className="text-xs font-semibold text-[#6B7280] mt-2">
                Schallpegelminderung zum Innenhof: -{bau.akustikDbStrasse - bau.akustikDbInnenhof} dB
              </p>
            </div>

            {/* 2. Barrierefreiheit & Lift */}
            <div className="p-5 sm:p-6 bg-[#F9FAFB] rounded-2xl border-2 border-[#E5E7EB] flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-[#6B7280] uppercase tracking-wider mb-2">
                  Barrierefreiheit & Lift
                </h4>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                    bau.isStufenlos ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {bau.isStufenlos ? '✓' : '!'}
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-[#0D1B2A]">
                    {bau.isStufenlos ? 'Stufenloser Lift' : 'Halbstock-Treppen'}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#4B5563] mt-2 leading-relaxed">
                {bau.isStufenlos
                  ? 'Ebenerdiger Einstieg bis vor die Wohnungstür, optimal für Barrierefreiheit und Gehkomfort.'
                  : 'Stufen bis zum Aufzug. Bei eingeschränkter Mobilität nur bedingt geeignet.'}
              </p>
            </div>

            {/* 3. Topographie & Höhenmeter (von - bis Spanne) */}
            <div className="p-5 sm:p-6 bg-[#F9FAFB] rounded-2xl border-2 border-[#E5E7EB] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-black text-[#6B7280] uppercase tracking-wider">
                    Höhenmeter & Gelände
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    m ü. Adria
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#0D1B2A] tracking-tight">
                    {bau.hoehenmeter}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D6A4F] mb-2">
                  <Mountain className="w-3.5 h-3.5 shrink-0" />
                  <span>{bau.gelaendeTyp}</span>
                  {bau.hoehenmeterSpanne > 5 && (
                    <span className="text-[#6B7280] font-normal">
                      (Spanne: Δ {bau.hoehenmeterSpanne} m)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#4B5563] mt-1 leading-relaxed">
                {bau.topographieHinweis}
              </p>
            </div>
          </div>

          {/* Interactive Audio Comparison Box */}
          <div className="bg-[#0D1B2A] text-white rounded-2xl p-6 border-2 border-[#0D1B2A] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-xs text-[#52B788] font-bold uppercase tracking-wider">
                  Akustik-Messung & Hörprobe
                </span>
                <h4 className="text-lg font-bold text-white">
                  Schallabschirmung: {bau.name}
                </h4>
              </div>

              <button
                onClick={toggleAudio}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
                  playingThisAudio
                    ? 'bg-rose-600 text-white border-rose-800 animate-pulse'
                    : 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white border-[#52B788] shadow-xs'
                }`}
              >
                {playingThisAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>
                  {playingThisAudio
                    ? 'Hörprobe anhalten'
                    : `Hofruhe abspielen (${bau.akustikDbInnenhof} dB)`}
                </span>
              </button>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-white text-xs sm:text-sm">
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/15">
                <span className="text-stone-300 block text-xs font-bold uppercase tracking-wider">Straßenseitig</span>
                <span className="text-xl font-black text-rose-400">{bau.akustikDbStrasse} dB(A)</span>
                <span className="text-[11px] text-stone-300 block mt-0.5">LDEN Tagesschnitt: {bau.laermPegelTag} dB</span>
              </div>

              <div className="bg-white/10 p-3.5 rounded-xl border border-white/15">
                <span className="text-stone-300 block text-xs font-bold uppercase tracking-wider">Im geschützten Hof</span>
                <span className="text-xl font-black text-[#52B788]">{bau.akustikDbInnenhof} dB(A)</span>
                <span className="text-[11px] text-stone-300 block mt-0.5">Nachtpegel: {bau.laermPegelNacht} dB</span>
              </div>

              <div className="bg-[#2D6A4F]/40 p-3.5 rounded-xl border border-[#2D6A4F] text-[#D1FAE5]">
                <span className="text-[#95D5B2] block text-xs font-bold uppercase tracking-wider">Lärmminderung</span>
                <span className="text-xl font-black text-white">
                  -{bau.akustikDbStrasse - bau.akustikDbInnenhof} dB(A)
                </span>
                <span className="text-[11px] text-[#D1FAE5] block mt-0.5">Spürbare Halbierung des Lärms</span>
              </div>
            </div>
          </div>

          {/* Hof-Typ & Grünraum */}
          <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-2xl p-6">
            <div className="flex items-center gap-2 text-[#0D1B2A] font-bold mb-2">
              <TreePine className="w-5 h-5 text-[#2D6A4F]" />
              <span>Hof-Typ: <strong>{bau.hofTyp}</strong></span>
            </div>
            <p className={`${seniorMode ? 'text-lg' : 'text-sm'} text-[#374151] leading-relaxed`}>
              {bau.gruenraumBeschreibung}
            </p>
          </div>

          {/* Öffentliche Verkehrsmittel */}
          <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 font-bold text-[#0D1B2A]">
                <Footprints className="w-5 h-5 text-[#2D6A4F]" />
                <span>Öffi-Anbindung: {bau.naechsteStation}</span>
              </div>
              <span className="text-xs font-bold text-[#065F46] bg-[#D1FAE5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                {bau.bimBusDistanzMeter} m Fußweg
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] font-medium mb-3">
              Zu Fuß in ca. {Math.round(bau.bimBusDistanzMeter / 60)} Minuten bequem erreichbar.
            </p>
            <div className="flex flex-wrap gap-2">
              {bau.linien.map((line) => (
                <span key={line} className="px-3 py-1 rounded-full bg-white border-2 border-[#E5E7EB] text-[#0D1B2A] font-bold text-xs">
                  {line}
                </span>
              ))}
            </div>
          </div>

          {/* Vor- und Nachteile Checkliste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vorteile */}
            <div className="bg-[#ECFDF5] border-2 border-[#A7F3D0] rounded-2xl p-5">
              <h5 className="font-bold text-[#065F46] text-sm flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                <span>Besondere Vorzüge:</span>
              </h5>
              <ul className="space-y-2">
                {bau.vorteileSenioren.map((v, i) => (
                  <li key={i} className="text-xs sm:text-sm text-[#064E3B] flex items-start gap-2">
                    <span className="text-[#059669] font-black">•</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nachteile */}
            <div className="bg-amber-50/60 border-2 border-amber-200 rounded-2xl p-5">
              <h5 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Zu beachten / Einschränkungen:</span>
              </h5>
              <ul className="space-y-2">
                {bau.nachteileSenioren.map((n, i) => (
                  <li key={i} className="text-xs sm:text-sm text-amber-950 flex items-start gap-2">
                    <span className="text-amber-600 font-black">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Architekturgeschichte, Denkmalschutz & Wikipedia */}
          <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#2D6A4F]" />
                <h4 className="text-lg font-bold text-[#0D1B2A]">
                  Architekturgeschichte & Denkmalschutz
                </h4>
              </div>

              {bau.denkmalschutz ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                  Bundesdenkmalamt geschützt (BDA)
                </span>
              ) : (
                <span className="text-xs text-[#6B7280] font-medium">
                  Kein gesonderter Ensembleschutz
                </span>
              )}
            </div>

            {/* WISEG Special Banner if this is a WISEG managed object */}
            {bau.isWiseg && (
              <div className="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-300 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-400">
                    <Landmark className="w-3.5 h-3.5 text-amber-900" />
                    WISEG-Objekt (Atypischer Gemeindebau)
                  </span>
                  {bau.wisegSanierungsstatus && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Status: {bau.wisegSanierungsstatus}
                    </span>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                  Dieses historische Zinshaus wird von der <strong>Wiener Substanzerhaltungsgesellschaft (WISEG)</strong> verwaltet.
                  Als "atypischer Gemeindebau" zeichnet es sich durch seine kleinteilige Struktur ({bau.wohnungenAnzahl} Wohnungen),
                  dicke Gründerzeit-/Biedermeier-Ziegelmauern und einen geschützten, kopfsteingepflasterten Hofbereich aus.
                </div>

                {bau.hauszeichen && (
                  <div className="text-xs font-bold text-amber-900">
                    Historisches Hauszeichen: <span className="underline decoration-amber-500 font-black">"{bau.hauszeichen}"</span>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2">
                  <a
                    href="https://de.wikipedia.org/wiki/Liste_der_von_der_WISEG_betreuten_Objekte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Wikipedia: Liste der von der WISEG betreuten Objekte</span>
                  </a>
                  <a
                    href="https://www.wiseg.at"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-800 hover:text-amber-950 font-medium"
                  >
                    wiseg.at
                  </a>
                </div>
              </div>
            )}

            {/* Badges Bar: Epoche, Baujahr, BDA-Objekt-ID */}
            <div className="flex flex-wrap items-center gap-2">
              {bau.bauEpoche && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#D1D5DB] text-[#0D1B2A]">
                  Epoche: <strong>{bau.bauEpoche}</strong>
                </span>
              )}
              {bau.architekt && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#D1D5DB] text-[#0D1B2A]">
                  Architekt: <strong>{bau.architekt}</strong>
                </span>
              )}
              {bau.bdaObjektId && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900">
                  BDA-Objekt-ID: <strong>{bau.bdaObjektId}</strong>
                </span>
              )}
            </div>

            {/* Kunst am Bau */}
            {bau.kunstAmBau && (
              <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-start gap-3">
                <Palette className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#6B7280] block">
                    Kunst am Bau (Freiluftgalerie):
                  </span>
                  <p className="text-xs sm:text-sm text-[#374151] font-medium mt-0.5 leading-relaxed">
                    {bau.kunstAmBau}
                  </p>
                </div>
              </div>
            )}

            {/* Wikipedia Deep-Links */}
            <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-[#6B7280] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#2D6A4F]" />
                Wikipedia-Register:
              </span>

              {bau.wikipediaUrl && (
                <a
                  href={bau.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#F0FDF4] text-[#2D6A4F] border border-[#2D6A4F]/40 hover:border-[#2D6A4F] transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Wikipedia-Artikel zu {bau.name.split('(')[0].trim()}</span>
                </a>
              )}

              {bau.wikipediaDistrictListUrl && (
                <a
                  href={bau.wikipediaDistrictListUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-[#4B5563] border border-[#D1D5DB] transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Gemeindebauten-Liste {bau.bezirkName}</span>
                </a>
              )}

              <a
                href="https://de.wikipedia.org/wiki/Liste_der_Wiener_Gemeindebauten"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#2D6A4F] font-medium ml-auto"
              >
                <span>Gesamtverzeichnis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Phase 6: Amtliche Umfeldstatistik & Demografie */}
          {bau.umfeldstatistik && (
            <div className="p-5 sm:p-6 bg-[#F8FAFC] rounded-2xl border-2 border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-[#0D1B2A]">
                      Umfeld & Bevölkerung
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Statistisches Gebiet: Zählbezirk {bau.umfeldstatistik.zaehlbezirkCode} • Datenstand: {bau.umfeldstatistik.datenstand}
                    </p>
                  </div>
                </div>
                {bau.umfeldstatistik.aggregierterGebietstyp && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-700">
                    {bau.umfeldstatistik.aggregierterGebietstyp}
                  </span>
                )}
              </div>

              {/* Pflicht-Hinweis direkt sichtbar */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5 shadow-2xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  {bau.umfeldstatistik.hinweis}
                </p>
              </div>

              {/* Raster der amtlichen Kennzahlen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Einwohner & Wohnungen */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Einwohner (HWS)
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatInteger(bau.umfeldstatistik.einwohner)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    in {formatInteger(bau.umfeldstatistik.hauptwohnsitzwohnungen)} Wohnungen
                  </p>
                </div>

                {/* 2. Bevölkerungsdichte */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Bevölkerungsdichte
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatDensity(bau.umfeldstatistik.bevoelkerungsdichtePersonenJeHektar)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {bau.umfeldstatistik.gebietstyp || 'Wohn- und Stadtgebiet'}
                  </p>
                </div>

                {/* 3. Anteil der Kinder & Jugend (< 15) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Anteil unter 15 Jahren
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatPercent(bau.umfeldstatistik.anteilUnter15Prozent)}
                  </div>
                  {(() => {
                    const comp = getWienComparison(bau.umfeldstatistik.anteilUnter15Prozent, WIEN_BENCHMARKS.anteilUnter15Prozent);
                    return comp ? (
                      <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {comp.text} (Wien: {formatPercent(WIEN_BENCHMARKS.anteilUnter15Prozent)})
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* 4. Personen mit Pensionsbezug */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Anteil Personen mit Pensionsbezug
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatPercent(bau.umfeldstatistik.anteilPensionsbezugProzent)}
                  </div>
                  {(() => {
                    const comp = getWienComparison(bau.umfeldstatistik.anteilPensionsbezugProzent, WIEN_BENCHMARKS.anteilPensionsbezugProzent);
                    return comp ? (
                      <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {comp.text} (Wien: {formatPercent(WIEN_BENCHMARKS.anteilPensionsbezugProzent)})
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* 5. Personen in Hauptmiete */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Anteil Personen in Hauptmiete
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatPercent(bau.umfeldstatistik.anteilPersonenInHauptmieteProzent)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    inkl. Gemeindebau & Genossenschaft
                  </p>
                </div>

                {/* 6. Bevölkerungsentwicklung 2011–2023 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Entwicklung 2011–2023
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatChange(bau.umfeldstatistik.bevoelkerungsentwicklung2011Bis2023Prozent)}
                  </div>
                  {(() => {
                    const comp = getWienComparison(bau.umfeldstatistik.bevoelkerungsentwicklung2011Bis2023Prozent, WIEN_BENCHMARKS.bevoelkerungsentwicklung2011Bis2023Prozent);
                    return comp ? (
                      <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {comp.text} (Wien: {formatChange(WIEN_BENCHMARKS.bevoelkerungsentwicklung2011Bis2023Prozent)})
                      </div>
                    ) : null;
                  })()}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ø {formatChange(bau.umfeldstatistik.bevoelkerungsentwicklung2011Bis2023ProJahr, '%/Jahr')}
                  </p>
                </div>

                {/* 7. Kurzfristige Entwicklung 2021–2023 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Entwicklung 2021–2023
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-[#0D1B2A]">
                    {formatChange(bau.umfeldstatistik.bevoelkerungsentwicklung2021Bis2023Prozent)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ø {formatChange(bau.umfeldstatistik.bevoelkerungsentwicklung2021Bis2023ProJahr, '%/Jahr')}
                  </p>
                </div>

                {/* 8. Räumliche Schlüssel */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-1 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Statistische Schlüssel
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-700 mt-1">
                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      Zählbezirk: <strong>{bau.umfeldstatistik.zaehlbezirkCode}</strong>
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      Zählgebiet: <strong>{bau.umfeldstatistik.zaehlgebietCode}</strong>
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      Prognoseregion: <strong>{bau.umfeldstatistik.prognoseregionCode}</strong>
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                      Bezirk: <strong>{bau.umfeldstatistik.gemeindebezirkCode}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Aufklappbarer Bereich: Methodik & Datenquelle */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowMethodology(!showMethodology)}
                  aria-expanded={showMethodology}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#0D1B2A] flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-600" />
                    Methodik & Datenquelle
                  </span>
                  {showMethodology ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {showMethodology && (
                  <div className="p-4 text-xs text-slate-700 space-y-2.5 border-t border-slate-200 bg-white leading-relaxed">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <strong>Räumliche Ebene:</strong> Zählbezirk (statistisches Gebiet der Stadt Wien)
                      </div>
                      <div>
                        <strong>Stichtag:</strong> 31. Oktober 2023 (amtliche Registerzählung)
                      </div>
                      <div>
                        <strong>Amtliche Quellen:</strong> Stadt Wien (data.wien.gv.at) / Statistik Austria
                      </div>
                      <div>
                        <strong>Lizenz:</strong> Creative Commons Namensnennung 4.0 International (CC BY 4.0)
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <strong>Berechnungsformeln:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600 font-mono text-[11px]">
                        <li>Anteil unter 15: (ERW_STATUS_3 / WHG_POP_TOTAL) * 100</li>
                        <li>Anteil mit Pensionsbezug: (ERW_STATUS_4 / WHG_POP_TOTAL) * 100</li>
                        <li>Anteil in Hauptmiete: (WHG_RECHTSVERH_3 / WHG_POP_TOTAL) * 100</li>
                        <li>Dichte: WHG_POP_TOTAL / (Fläche in ha)</li>
                        <li>Bevölkerungsveränderung 2011–2023: ((POP_2023 / POP_2011) - 1) * 100</li>
                      </ul>
                    </div>
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      Hinweis zum Langzeitvergleich: Vergleich auf stabiler Zählbezirksschlüssel-Ebene.
                      Als „ungefähr auf Wien-Niveau“ wird eine Abweichung von höchstens ±1,0 Prozentpunkt gegenüber dem gewichteten Gesamtwert für ganz Wien gewertet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empfehlung für Ruhesuchende */}
          <div className="p-6 bg-[#F0FDF4] rounded-2xl border-2 border-[#2D6A4F] flex items-start gap-5">
            <div className="w-14 h-14 bg-[#2D6A4F] rounded-full shrink-0 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-[#0D1B2A] mb-1">
                Empfehlung für Ruhesuchende
              </h4>
              <p className="text-[#2D6A4F] font-semibold leading-relaxed text-sm sm:text-base">
                {bau.tippFuerRuhesuchende}
              </p>
              <p className="text-xs text-[#374151] mt-2 font-medium">
                Hinweis: Beim Wohnungstausch über www.wohnberatung-wien.at kann der Mietvertrag einer bestehenden Gemeindewohnung
                direkt gegen eine barrierefreie Ruhelage eingetauscht werden.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 border-t-2 border-[#E5E7EB] bg-white flex items-center justify-between gap-3">
          <button
            onClick={onOpenAudioLab}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#2D6A4F] hover:underline"
          >
            <Volume2 className="w-4 h-4" />
            <span>Akustik-Labor öffnen</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-stone-800 text-white font-bold text-sm border-2 border-[#0D1B2A] transition shadow-xs"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

