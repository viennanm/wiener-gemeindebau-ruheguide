import React from 'react';
import { 
  SWIFT_GEMEINDEBAU_MODEL, 
  SWIFT_GEMEINDEBAU_STORE, 
  SWIFT_CONTENT_VIEW, 
  SWIFT_DETAIL_VIEW, 
  OPEN_DATA_LEITFADEN 
} from '../data/swiftCode';
import { Copy, Check, Download, FileCode, ExternalLink, ShieldAlert } from 'lucide-react';

interface Props {
  seniorMode: boolean;
}

export const SwiftCodeViewer: React.FC<Props> = ({ seniorMode }) => {
  const [selectedFile, setSelectedFile] = React.useState<
    'model' | 'store' | 'content' | 'detail' | 'leitfaden'
  >('model');
  const [copied, setCopied] = React.useState(false);

  const fileMap = {
    model: {
      name: 'Gemeindebau.swift',
      desc: 'Model Layer: Datenstrukturen, Enums & Decodable GeoJSON-Parser',
      code: SWIFT_GEMEINDEBAU_MODEL,
      ext: '.swift',
    },
    store: {
      name: 'GemeindebauStore.swift',
      desc: 'Data Layer: Store-ViewModel mit @Observable & 6 realen Wiener Datensätzen',
      code: SWIFT_GEMEINDEBAU_STORE,
      ext: '.swift',
    },
    content: {
      name: 'ContentView.swift',
      desc: 'View Layer: Gemeindebau-Liste, Filterchips & MapKit Kartenansicht',
      code: SWIFT_CONTENT_VIEW,
      ext: '.swift',
    },
    detail: {
      name: 'GemeindebauDetailView.swift',
      desc: 'View Layer: Kartenvorschau, Score-Badges, Akustik-Box & Barrierefreiheit',
      code: SWIFT_DETAIL_VIEW,
      ext: '.swift',
    },
    leitfaden: {
      name: 'OpenData_Leitfaden.md',
      desc: 'Leitfaden für data.gv.at: WFS-URLs, GEMEINDEBAUOGD & Lärmkataster (LDEN/LNIGHT)',
      code: OPEN_DATA_LEITFADEN,
      ext: '.md',
    },
  };

  const current = fileMap[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([current.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = current.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Download each file
    Object.values(fileMap).forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }, index * 200);
    });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E5E7EB] overflow-hidden shadow-xs">
      {/* Top Header */}
      <div className="p-6 border-b-2 border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
              iOS 17+ / Swift 5.9+ Code
            </span>
            <span className="text-xs text-[#6B7280] font-bold">
              SwiftUI • MapKit • @Observable
            </span>
          </div>
          <h2 className={`${seniorMode ? 'text-3xl' : 'text-2xl'} font-black text-[#0D1B2A] tracking-tight`}>
            Vollständiger Swift-Code & Projektdateien
          </h2>
          <p className="text-xs sm:text-sm text-[#4B5563] font-medium mt-1">
            Einsatzbereit für Xcode 15/16 mit nativer MapKit-Integration und städtischen Wiener Realdaten.
          </p>
        </div>

        {/* Global Download Button */}
        <button
          onClick={handleDownloadAll}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0D1B2A] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition shrink-0 shadow-xs border-2 border-[#0D1B2A]"
        >
          <Download className="w-4 h-4" />
          <span>Alle 5 Dateien exportieren</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-3 bg-[#F4F5F7] border-b-2 border-[#E5E7EB]">
        {(Object.keys(fileMap) as Array<keyof typeof fileMap>).map((key) => {
          const item = fileMap[key];
          const isSelected = selectedFile === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedFile(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition border-2 ${
                isSelected
                  ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-xs'
                  : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#2D6A4F] hover:text-[#0D1B2A]'
              }`}
            >
              <FileCode className={`w-4 h-4 ${isSelected ? 'text-[#D1FAE5]' : 'text-[#2D6A4F]'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active File Banner */}
      <div className="px-6 py-3.5 bg-[#F9FAFB] border-b-2 border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="text-[#374151] font-medium">
          <strong className="text-[#0D1B2A] font-bold">{current.name}:</strong> {current.desc}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition border-2 ${
              copied
                ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                : 'bg-white text-[#374151] hover:bg-stone-50 border-[#E5E7EB]'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopiert!' : 'Code kopieren'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#374151] hover:bg-stone-50 border-2 border-[#E5E7EB] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Herunterladen</span>
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="relative p-4 sm:p-6 bg-[#0D1B2A] text-[#E5E7EB] overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs sm:text-[13px] leading-relaxed">
        <pre className="selection:bg-[#2D6A4F] selection:text-white">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
};
