import React from 'react';
import { Gemeindebau } from '../types';
import { getGemeindebauImage } from '../data/gemeindebauImages';
import { 
  TreePine, 
  Volume2, 
  VolumeX, 
  Footprints, 
  CheckCircle2, 
  AlertCircle, 
  Accessibility, 
  ChevronRight, 
  Sparkles,
  Mountain,
  Landmark,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { playQuietCourtyard, stopAudio } from '../utils/audioSimulator';

interface Props {
  bau: Gemeindebau;
  onSelect: (bau: Gemeindebau) => void;
  seniorMode: boolean;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (val: boolean) => void;
}

export const GemeindebauCard: React.FC<Props> = ({
  bau,
  onSelect,
  seniorMode,
  isAudioPlaying,
  setIsAudioPlaying,
}) => {
  const [playingHofAudio, setPlayingHofAudio] = React.useState(false);
  const imageUrl = bau.bildUrl || getGemeindebauImage(bau.id, bau.name, bau.bildUrl);

  const toggleCourtyardAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingHofAudio) {
      stopAudio();
      setPlayingHofAudio(false);
      setIsAudioPlaying(false);
    } else {
      playQuietCourtyard();
      setPlayingHofAudio(true);
      setIsAudioPlaying(true);
    }
  };

  React.useEffect(() => {
    if (!isAudioPlaying) {
      setPlayingHofAudio(false);
    }
  }, [isAudioPlaying]);

  // Score color badge
  const isExcellent = bau.ruheScore >= 9;
  const badgeBg = isExcellent
    ? 'bg-[#2D6A4F] text-white'
    : 'bg-[#1B4332] text-white';

  return (
    <div
      id={`gemeindebau-card-${bau.id}`}
      onClick={() => onSelect(bau)}
      className={`group bg-white rounded-2xl border-2 border-[#E5E7EB] hover:border-[#2D6A4F] ${
        isExcellent ? 'hover:border-l-8 hover:border-l-[#2D6A4F]' : ''
      } overflow-hidden shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between`}
    >
      <div>
        {/* Photo Banner with Badges */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-stone-100">
          <img
            src={imageUrl}
            alt={`Wohnhausanlage ${bau.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          
          {/* Overlay Top Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white/95 text-[#0D1B2A] backdrop-blur-xs border border-white/50 shadow-xs">
              {bau.bezirk}. Bezirk • {bau.bezirkName}
            </span>
            {bau.isWiseg && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[#B45309] text-white shadow-xs">
                <Landmark className="w-3 h-3" />
                WISEG Zinshaus
              </span>
            )}
            {bau.denkmalschutz && !bau.isWiseg && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100/95 text-amber-900 backdrop-blur-xs border border-amber-300 shadow-xs">
                <Landmark className="w-3 h-3 text-amber-800" />
                BDA Denkmal
              </span>
            )}
            {bau.ruheScore === 10 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white shadow-xs">
                <Sparkles className="w-3 h-3" />
                Top-Ruheoase
              </span>
            )}
          </div>

          {/* Floating Photographer / License Badge */}
          {bau.bildLizenz && (
            <div className="absolute bottom-3 left-3 max-w-[55%] truncate px-2 py-0.5 rounded-md text-[9px] font-semibold bg-black/70 text-white/90 backdrop-blur-xs border border-white/20">
              © {bau.bildFotograf || 'Wikimedia'} • {bau.bildLizenz}
            </div>
          )}

          {/* Floating Ruhe-Score Pill on photo */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white shadow-md">
            <span className="text-[10px] font-black text-[#4B5563] uppercase tracking-wider">
              RUHE-NOTE
            </span>
            <span className={`px-2 py-0.5 rounded font-black text-lg ${badgeBg}`}>
              {bau.ruheScore}/10
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 pb-2">
          {/* Title & Address */}
          <div className="mb-3">
            {bau.hauszeichen && (
              <span className="text-[11px] font-black uppercase tracking-wider text-[#B45309] block mb-0.5">
                "{bau.hauszeichen}"
              </span>
            )}
            <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-bold text-[#0D1B2A] group-hover:text-[#2D6A4F] transition tracking-tight`}>
              {bau.name}
            </h3>

            <p className={`${seniorMode ? 'text-base' : 'text-sm'} text-[#4B5563] font-medium`}>
              {bau.adresse}, {bau.plz} Wien
            </p>

            {(bau.architekt || bau.baujahr || bau.bauEpoche) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-[#6B7280]">
                {bau.baujahr && (
                  <span className="font-semibold text-[#1F2937]">Baujahr {bau.baujahr}</span>
                )}
                {bau.architekt && (
                  <span className="truncate max-w-[200px]" title={`Architekt: ${bau.architekt}`}>
                    • Arch. {bau.architekt}
                  </span>
                )}
                {bau.bauEpoche && (
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4F5F7] text-[#4B5563] border border-[#E5E7EB]">
                    {bau.isWiseg 
                      ? 'WISEG Altbau' 
                      : bau.bauEpoche === 'Rotes Wien (1919–1934)' 
                      ? 'Rotes Wien' 
                      : bau.bauEpoche === 'Wiederaufbau & Nachkriegszeit (1945–1979)' 
                      ? 'Nachkrieg' 
                      : 'Moderne'}
                  </span>
                )}
              </div>
            )}
          </div>

        {/* Hof-Typ & Höhenmeter Tag Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex-1 min-w-[150px] flex items-center gap-2 text-[#4B5563] text-xs sm:text-sm font-semibold bg-[#F9FAFB] p-2.5 rounded-xl border-2 border-[#E5E7EB]">
            <TreePine className="w-4 h-4 text-[#2D6A4F] shrink-0" />
            <span className="truncate">Hof: <strong className="text-[#0D1B2A]">{bau.hofTyp}</strong></span>
          </div>

          <div 
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#F9FAFB] border-2 border-[#E5E7EB] text-[#0D1B2A]"
            title={`Geländeprofil: ${bau.gelaendeTyp} • ${bau.topographieHinweis}`}
          >
            <Mountain className="w-4 h-4 text-[#2D6A4F] shrink-0" />
            <span>{bau.hoehenmeter}</span>
            {bau.hoehenmeterSpanne >= 12 ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold ml-0.5">
                Hanglage (Δ {bau.hoehenmeterSpanne}m)
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] font-bold ml-0.5">
                Eben
              </span>
            )}
          </div>
        </div>

        {/* 4 Essential Senior Metrics in a 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs sm:text-sm">
          {/* 1. Lift Status */}
          <div className={`p-3 rounded-xl border-2 ${
            bau.isStufenlos 
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider mb-1">
              <Accessibility className="w-4 h-4 text-[#2D6A4F]" />
              <span>Liftzugang</span>
            </div>
            <p className="font-bold truncate" title={bau.liftStatus}>
              {bau.isStufenlos ? 'Stufenlos (Ebenerdig)' : 'Halbstock (Stufen)'}
            </p>
          </div>

          {/* 2. Innenhof Akustik dB */}
          <div className="p-3 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[#0D1B2A]">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#6B7280] mb-1">
              <Volume2 className="w-4 h-4 text-[#2D6A4F]" />
              <span>Innenhof</span>
            </div>
            <p className="font-extrabold text-[#2D6A4F]">
              {bau.akustikDbInnenhof} dB(A)
              <span className="text-xs font-medium text-[#6B7280] ml-1">
                (-{bau.akustikDbStrasse - bau.akustikDbInnenhof} dB)
              </span>
            </p>
          </div>

          {/* 3. Gehdistanz zur Bim */}
          <div className="p-3 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[#0D1B2A]">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[#6B7280] mb-1">
              <Footprints className="w-4 h-4 text-[#4B5563]" />
              <span>Bim / Bus</span>
            </div>
            <p className="font-bold">
              {bau.bimBusDistanzMeter} m
              <span className="text-xs font-medium text-[#6B7280] ml-1">
                (~{Math.round(bau.bimBusDistanzMeter / 60)} Min.)
              </span>
            </p>
          </div>

          {/* 4. Linien */}
          <div className="p-3 rounded-xl border-2 border-[#E5E7EB] bg-[#F9FAFB] text-[#0D1B2A]">
            <div className="text-[#6B7280] font-bold text-xs uppercase tracking-wider mb-1">
              Öffis vor Ort
            </div>
            <div className="flex flex-wrap gap-1">
              {bau.linien.slice(0, 3).map((line) => (
                <span key={line} className="px-2 py-0.5 rounded bg-white border border-[#D1D5DB] text-[#1A1A1A] font-bold text-[11px]">
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Highlight Vorzüge */}
        <div className="space-y-1.5 mb-4">
          <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
            Besondere Vorzüge:
          </p>
          <ul className="space-y-1.5">
            {bau.vorteileSenioren.slice(0, 2).map((v, idx) => (
              <li key={idx} className={`${seniorMode ? 'text-base' : 'text-xs sm:text-sm'} text-[#374151] flex items-start gap-2`}>
                <div className="w-4 h-4 rounded-full bg-[#D1FAE5] text-[#065F46] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                  ✓
                </div>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>

      {/* Action Buttons: Audio Sample, Wikipedia & Details (Pill Buttons) */}
      <div className="pt-3.5 border-t-2 border-[#F3F4F6] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleCourtyardAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border-2 ${
              playingHofAudio
                ? 'bg-[#2D6A4F] text-white border-[#1B4332] animate-pulse'
                : 'bg-white hover:bg-[#ECFDF5] text-[#2D6A4F] border-[#2D6A4F]/40'
            }`}
            title="Hofgeräusche anhören (Vögel, Wind, 42 dB)"
          >
            {playingHofAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#2D6A4F]" />}
            <span>{playingHofAudio ? 'Stopp' : `${bau.akustikDbInnenhof} dB Hörprobe`}</span>
          </button>

          {(bau.wikipediaUrl || bau.wikipediaDistrictListUrl) && (
            <a
              href={bau.wikipediaUrl || bau.wikipediaDistrictListUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-[#F9FAFB] hover:bg-stone-100 text-[#2D6A4F] border border-[#D1D5DB] transition"
              title="Auf Wikipedia nachschlagen"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Wiki</span>
            </a>
          )}
        </div>

        <button
          onClick={() => onSelect(bau)}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-bold text-xs sm:text-sm transition border-2 border-[#1B4332] shadow-xs"
        >
          <span>Details & Tausch</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
