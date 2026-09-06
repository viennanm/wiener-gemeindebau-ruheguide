import React from 'react';
import { Volume2, VolumeX, Smartphone, Code2, MapPin, Database, Eye, BookOpen } from 'lucide-react';
import { stopAudio } from '../utils/audioSimulator';

interface HeaderProps {
  activeTab: 'app' | 'map' | 'audio' | 'swift' | 'opendata' | 'wikipedia';
  setActiveTab: (tab: 'app' | 'map' | 'audio' | 'swift' | 'opendata' | 'wikipedia') => void;
  seniorMode: boolean;
  setSeniorMode: (val: boolean) => void;
  isAudioPlaying: boolean;
  setIsAudioPlaying: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  seniorMode,
  setSeniorMode,
  isAudioPlaying,
  setIsAudioPlaying,
}) => {
  const handleStopAudio = () => {
    stopAudio();
    setIsAudioPlaying(false);
  };

  return (
    <header className="bg-white text-[#1A1A1A] border-b-2 border-[#E5E7EB] sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Senior / Contrast Switch & Audio indicator */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#2D6A4F] text-white text-xs font-black">
            W
          </span>
          <span className="text-[#4B5563] font-semibold">
            Stadt Wien • Wohnberatung & Gemeindebau-Ruheguide
          </span>
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#4B5563] font-bold text-xs">
            Alle 23 Wiener Bezirke • Gemeindebauten-Katalog
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {isAudioPlaying && (
            <button
              onClick={handleStopAudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-2 border-rose-800 animate-pulse transition"
              title="Ton anhalten"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Hörprobe stoppen</span>
            </button>
          )}

          <button
            onClick={() => setSeniorMode(!seniorMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border-2 ${
              seniorMode
                ? 'bg-[#2D6A4F] text-white border-[#1B4332]'
                : 'bg-white text-[#4B5563] hover:text-[#0D1B2A] border-[#D1D5DB]'
            }`}
            title="Schriftgröße und Lesbarkeit anpassen"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'Große Schrift: AN' : 'Große Schrift'}</span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#2D6A4F] rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${seniorMode ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold tracking-tight text-[#0D1B2A]`}>
                Wiener Gemeindebau-Ruheguide
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                iOS 17 Swift
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] uppercase tracking-wider mt-0.5">
              Wohnberatung Wien • Hofruhe, Grünlage & Barrierefreiheit
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Geometric Balance Pill Buttons) */}
        <nav className="flex flex-wrap items-center gap-2">
          <button
            id="tab-app"
            onClick={() => setActiveTab('app')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'app'
                ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-xs'
                : 'bg-white text-[#2D6A4F] border-[#2D6A4F]/30 hover:border-[#2D6A4F] hover:bg-[#F0FDF4]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>App-Simulator</span>
          </button>

          <button
            id="tab-map"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'map'
                ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-xs'
                : 'bg-white text-[#2D6A4F] border-[#2D6A4F]/30 hover:border-[#2D6A4F] hover:bg-[#F0FDF4]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Kartenansicht</span>
          </button>

          <button
            id="tab-audio"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'audio'
                ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-xs'
                : 'bg-white text-[#2D6A4F] border-[#2D6A4F]/30 hover:border-[#2D6A4F] hover:bg-[#F0FDF4]'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Akustik-Labor</span>
          </button>

          <button
            id="tab-wikipedia"
            onClick={() => setActiveTab('wikipedia')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'wikipedia'
                ? 'bg-[#2D6A4F] text-white border-[#1B4332] shadow-xs'
                : 'bg-white text-[#2D6A4F] border-[#2D6A4F]/30 hover:border-[#2D6A4F] hover:bg-[#F0FDF4]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Wikipedia-Register</span>
          </button>

          <button
            id="tab-swift"
            onClick={() => setActiveTab('swift')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'swift'
                ? 'bg-[#0D1B2A] text-white border-[#0D1B2A] shadow-xs'
                : 'bg-white text-[#4B5563] border-[#D1D5DB] hover:border-[#0D1B2A] hover:bg-gray-50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Swift-Code</span>
          </button>

          <button
            id="tab-opendata"
            onClick={() => setActiveTab('opendata')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition border-2 ${
              activeTab === 'opendata'
                ? 'bg-[#0D1B2A] text-white border-[#0D1B2A] shadow-xs'
                : 'bg-white text-[#4B5563] border-[#D1D5DB] hover:border-[#0D1B2A] hover:bg-gray-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Open Data Wien</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
