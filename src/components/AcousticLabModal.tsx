import React from 'react';
import { Volume2, VolumeX, AlertTriangle, ShieldCheck, Activity, TreePine, ArrowRight, HeartPulse } from 'lucide-react';
import { playQuietCourtyard, playStreetTraffic, stopAudio } from '../utils/audioSimulator';

interface Props {
  seniorMode: boolean;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (val: boolean) => void;
}

export const AcousticLabModal: React.FC<Props> = ({
  seniorMode,
  isAudioPlaying,
  setIsAudioPlaying,
}) => {
  const [activeSound, setActiveSound] = React.useState<'traffic' | 'courtyard' | null>(null);

  const handlePlayTraffic = () => {
    playStreetTraffic();
    setActiveSound('traffic');
    setIsAudioPlaying(true);
  };

  const handlePlayCourtyard = () => {
    playQuietCourtyard();
    setActiveSound('courtyard');
    setIsAudioPlaying(true);
  };

  const handleStop = () => {
    stopAudio();
    setActiveSound(null);
    setIsAudioPlaying(false);
  };

  React.useEffect(() => {
    if (!isAudioPlaying) {
      setActiveSound(null);
    }
  }, [isAudioPlaying]);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] p-6 sm:p-8 shadow-xs space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
            Wiener Lärmkataster & Hörvergleich
          </span>
          <span className="text-xs text-[#6B7280] font-bold">
            Strategische Lärmkarten Wien 2022 (LDEN / LNIGHT)
          </span>
        </div>
        <h2 className={`${seniorMode ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-black text-[#0D1B2A] tracking-tight`}>
          Akustik-Labor: Straßenlärm vs. Hofruhe im direkten Hörtest
        </h2>
        <p className={`${seniorMode ? 'text-lg' : 'text-sm sm:text-base'} text-[#4B5563] font-medium mt-2 max-w-3xl leading-relaxed`}>
          Vergleichen Sie die reale Lärmbelastung einer stark befahrenen Verkehrsachse mit der Stille eines geschützten
          Wiener Gemeindebau-Innenhofs (z. B. Hugo-Breitner-Hof oder Karl-Marx-Hof).
        </p>
      </div>

      {/* A/B Audio Player Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card A: Stark befahrene Verkehrsachse */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          activeSound === 'traffic'
            ? 'bg-rose-50 border-rose-600 shadow-md ring-2 ring-rose-300'
            : 'bg-[#F9FAFB] border-[#E5E7EB]'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white uppercase tracking-wider">
                Hauptverkehrsstraße
              </span>
              <h3 className="text-xl font-black text-[#0D1B2A] mt-2">
                Hauptstraße mit Straßenbahn
              </h3>
              <p className="text-xs font-medium text-[#6B7280]">
                Straßenbahn- & Hauptstraßenverkehr
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-rose-600">70 dB</span>
              <span className="text-xs text-[#6B7280] block font-bold">Dauerschall</span>
            </div>
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-[#374151] mb-6">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>Straßenbahnkurve erzeugt periodisches Quietschen</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>Balkongespräche ohne Schreien nicht möglich</span>
            </p>
            <p className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Übersteigt WHO-Grenzwert für Herz-Kreislauf-Risiko</span>
            </p>
          </div>

          <button
            onClick={activeSound === 'traffic' ? handleStop : handlePlayTraffic}
            className={`w-full py-3 px-5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-2 transition shadow-xs ${
              activeSound === 'traffic'
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'
            }`}
          >
            {activeSound === 'traffic' ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span>{activeSound === 'traffic' ? 'Lärm anhalten' : 'Hörprobe: Straßenbahn & Verkehrslärm (ca. 70 dB)'}</span>
          </button>
        </div>

        {/* Card B: Ruhiger Innenhof */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          activeSound === 'courtyard'
            ? 'bg-[#F0FDF4] border-[#2D6A4F] shadow-md ring-2 ring-[#52B788]'
            : 'bg-[#F9FAFB] border-[#E5E7EB]'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#2D6A4F] text-white uppercase tracking-wider">
                Ruhige Hoflage
              </span>
              <h3 className="text-xl font-black text-[#0D1B2A] mt-2">
                Hofruhelage (z. B. Hugo-Breitner-Hof)
              </h3>
              <p className="text-xs font-medium text-[#6B7280]">
                Geschlossener Parkhof, alter Baumbestand
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#2D6A4F]">41 dB</span>
              <span className="text-xs text-[#6B7280] block font-bold">Naturgeräusche</span>
            </div>
          </div>

          <div className="space-y-2 text-xs sm:text-sm text-[#374151] mb-6">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
              <span>Baukörper schirmt Straßenlärm um 28 bis 32 dB ab</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
              <span>Blätterrauschen, Vogelgezwitscher, schattige Bänke</span>
            </p>
            <p className="flex items-center gap-2 text-[#065F46] font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#2D6A4F]" />
              <span>Schont Nervensystem, ermöglicht erholsamen Schlaf</span>
            </p>
          </div>

          <button
            onClick={activeSound === 'courtyard' ? handleStop : handlePlayCourtyard}
            className={`w-full py-3 px-5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-2 transition shadow-xs ${
              activeSound === 'courtyard'
                ? 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white border-[#1B4332] animate-pulse'
                : 'bg-[#2D6A4F] hover:bg-[#1B4332] text-white border-[#2D6A4F]'
            }`}
          >
            {activeSound === 'courtyard' ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span>{activeSound === 'courtyard' ? 'Hofruhe anhalten' : 'Hörprobe: Park-Innenhof (41 dB)'}</span>
          </button>
        </div>
      </div>

      {/* Decibel Scale Visualizer */}
      <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-2xl p-6">
        <h4 className="font-bold text-[#0D1B2A] text-sm mb-3">
          Akustische Einordnung nach WHO-Richtlinien für Umgebungslärm (dB(A)):
        </h4>

        {/* Visual Bar */}
        <div className="relative w-full h-8 rounded-full bg-gradient-to-r from-[#52B788] via-amber-300 to-rose-600 overflow-hidden shadow-inner mb-4">
          {/* Indicator for 41 dB */}
          <div className="absolute top-0 bottom-0 left-[25%] w-1.5 bg-[#0D1B2A] z-10"></div>
          {/* Indicator for 53 dB (WHO Limit) */}
          <div className="absolute top-0 bottom-0 left-[48%] w-1.5 bg-[#0D1B2A] z-10"></div>
          {/* Indicator for 70 dB */}
          <div className="absolute top-0 bottom-0 left-[78%] w-1.5 bg-[#0D1B2A] z-10"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border-2 border-[#E5E7EB]">
            <span className="font-bold text-[#2D6A4F] block text-sm">30–45 dB(A)</span>
            <span className="text-[#4B5563] font-medium">Park-Innenhof, Blätterrauschen (Erholungszone)</span>
          </div>

          <div className="p-3 rounded-xl bg-white border-2 border-[#E5E7EB]">
            <span className="font-bold text-amber-800 block text-sm">53 dB(A)</span>
            <span className="text-[#4B5563] font-medium">WHO-Grenzwert Tag (Gesundheitsschutz)</span>
          </div>

          <div className="p-3 rounded-xl bg-white border-2 border-[#E5E7EB]">
            <span className="font-bold text-orange-800 block text-sm">65 dB(A)</span>
            <span className="text-[#4B5563] font-medium">EU-Schwelle für Lärmsanierungsmaßnahmen</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-200">
            <span className="font-bold text-rose-800 block text-sm">≥ 70 dB(A)</span>
            <span className="text-rose-950 font-medium">Stark befahrene Verkehrsachse</span>
          </div>
        </div>
      </div>

      {/* Health Impact Box for Seniors */}
      <div className="p-6 bg-[#F0FDF4] rounded-2xl border-2 border-[#2D6A4F] flex items-start gap-5">
        <div className="w-14 h-14 bg-[#2D6A4F] rounded-full shrink-0 flex items-center justify-center text-white shadow-xs">
          <HeartPulse className="w-7 h-7" />
        </div>
        <div>
          <h5 className="font-bold text-[#0D1B2A] text-lg mb-1">
            Medizinische Relevanz von Lärmschutz & Ruhelagen
          </h5>
          <p className={`${seniorMode ? 'text-base' : 'text-sm'} text-[#2D6A4F] font-semibold leading-relaxed`}>
            Dauerhafter Verkehrslärm über 65 dB(A) führt nachweislich zu chronischer Ausschüttung von Stresshormonen (Cortisol, Adrenalin),
            Schlaffragmentierung und erhöht das Risiko für Bluthochdruck und Herz-Kreislauf-Erkrankungen signifikant.
            Ein Umzug in eine hofseitige Ruhelage senkt den Schallpegel um rund 30 dB(A) – dies entspricht einer <strong>gefühlten Lärmreduktion um mehr als 85%</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
