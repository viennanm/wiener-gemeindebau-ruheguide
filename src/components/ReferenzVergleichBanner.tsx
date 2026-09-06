import React from 'react';
import { Volume2, VolumeX, AlertTriangle, ArrowRight, Activity, Accessibility, Mountain } from 'lucide-react';
import { GRINZINGER_ALLEE_REFERENCE } from '../data/gemeindebauten';
import { playStreetTraffic, stopAudio } from '../utils/audioSimulator';

interface Props {
  seniorMode: boolean;
  onOpenAudioLab: () => void;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (val: boolean) => void;
  onSelectRef: () => void;
}

export const ReferenzVergleichBanner: React.FC<Props> = ({
  seniorMode,
  onOpenAudioLab,
  isAudioPlaying,
  setIsAudioPlaying,
  onSelectRef,
}) => {
  const [playingRefAudio, setPlayingRefAudio] = React.useState(false);

  const toggleStreetAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingRefAudio) {
      stopAudio();
      setPlayingRefAudio(false);
      setIsAudioPlaying(false);
    } else {
      playStreetTraffic();
      setPlayingRefAudio(true);
      setIsAudioPlaying(true);
    }
  };

  React.useEffect(() => {
    if (!isAudioPlaying) {
      setPlayingRefAudio(false);
    }
  }, [isAudioPlaying]);

  return (
    <div
      id="referenz-vergleichs-banner"
      className="bg-white border-2 border-rose-300 rounded-2xl p-5 sm:p-6 shadow-xs mb-6 transition-all hover:border-rose-400"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left side: Problem Description */}
        <div className="flex items-start gap-4 max-w-3xl">
          <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider">
                Ausgangssituation & Problemstellung
              </span>
              <span className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">
                Ziel: Umzug über Wohnberatung Wien
              </span>
            </div>

            <h2 className={`${seniorMode ? 'text-2xl' : 'text-lg sm:text-xl'} font-bold text-[#0D1B2A] tracking-tight`}>
              {GRINZINGER_ALLEE_REFERENCE.adresse}, {GRINZINGER_ALLEE_REFERENCE.plz} Wien
            </h2>

            <p className={`${seniorMode ? 'text-lg' : 'text-sm'} text-[#374151] mt-1 leading-relaxed`}>
              Direkt vor dem Balkon fahren die <strong className="text-rose-700 font-bold">Straßenbahnlinie 38</strong> und dichter Autoverkehr. 
              Dauerschallpegel von <strong className="text-rose-700 font-bold">73 dB(A)</strong>, dazu 8 Halbstock-Treppenstufen zum Aufzug. 
              Der Dauerlärm und die baulichen Barrieren belasten die Wohnqualität massiv.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border-2 border-rose-200">
                <Activity className="w-4 h-4" />
                Lärm: 73 dB(A) • Ruhe-Score 2/10 (Mangelhaft)
              </span>

              <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border-2 border-amber-200">
                <Accessibility className="w-4 h-4" />
                Halbstock-Stufen (Nicht rollstuhlgerecht)
              </span>

              <span className="inline-flex items-center gap-1.5 font-bold text-[#4B5563] bg-[#F4F5F7] px-3 py-1 rounded-full border-2 border-[#E5E7EB]">
                <Mountain className="w-4 h-4 text-[#2D6A4F]" />
                Höhenlage: {GRINZINGER_ALLEE_REFERENCE.hoehenmeter} ({GRINZINGER_ALLEE_REFERENCE.gelaendeTyp})
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Actions (Geometric Balance Pill Buttons) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E5E7EB]">
          <button
            onClick={toggleStreetAudio}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold transition text-xs sm:text-sm border-2 ${
              playingRefAudio
                ? 'bg-rose-600 text-white border-rose-800 animate-pulse shadow-xs'
                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'
            }`}
            title="Lärmpegel der Grinzinger Allee anhören"
          >
            {playingRefAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{playingRefAudio ? 'Lärm stoppen' : 'Lärm anhören (73 dB)'}</span>
          </button>

          <button
            onClick={onSelectRef}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0D1B2A] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition border-2 border-[#0D1B2A] shadow-xs"
          >
            <span>Ist-Zustand Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
