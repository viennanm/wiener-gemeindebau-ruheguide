import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Gemeindebau } from '../types';
import { GRINZINGER_ALLEE_REFERENCE } from '../data/gemeindebauten';
import { getGemeindebauImage } from '../data/gemeindebauImages';
import { 
  Layers, 
  MapPin, 
  Maximize2, 
  Navigation, 
  TreePine, 
  Volume2, 
  Mountain, 
  Sparkles,
  Info,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Props {
  gemeindebauten: Gemeindebau[];
  selectedBau: Gemeindebau | null;
  onSelect: (bau: Gemeindebau) => void;
  seniorMode: boolean;
}

type TileLayerType = 'streets' | 'satellite' | 'terrain';

export const ViennaLeafletMap: React.FC<Props> = ({
  gemeindebauten,
  selectedBau,
  onSelect,
  seniorMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeTileType, setActiveTileType] = useState<TileLayerType>('streets');
  const [showRefMarker, setShowRefMarker] = useState<boolean>(true);

  // Tile Layer URLs
  const getTileUrl = (type: TileLayerType) => {
    switch (type) {
      case 'streets':
        // CartoDB Voyager: crisp, beautiful street plan with street names and public transport
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'satellite':
        // Esri World Imagery: Real high-resolution aerial satellite photos
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        // OpenTopoMap: topographic elevation contours and terrain
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileAttribution = (type: TileLayerType) => {
    switch (type) {
      case 'streets':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      case 'terrain':
        return 'Kartendaten: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, SRTM | Kartendarstellung: &copy; <a href="http://opentopomap.org">OpenTopoMap</a>';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [48.2250, 16.3400], // Northwest Vienna focus
      zoom: 13,
      zoomControl: false, // We render custom accessible large buttons
    });

    const initialTiles = L.tileLayer(getTileUrl(activeTileType), {
      attribution: getTileAttribution(activeTileType),
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = initialTiles;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTiles = L.tileLayer(getTileUrl(activeTileType), {
      attribution: getTileAttribution(activeTileType),
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newTiles;
  }, [activeTileType]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Reference Noise Marker (Grinzinger Allee 54)
    if (showRefMarker) {
      const refLat = GRINZINGER_ALLEE_REFERENCE.koordinaten.lat;
      const refLng = GRINZINGER_ALLEE_REFERENCE.koordinaten.lng;
      const refLatLng = L.latLng(refLat, refLng);
      bounds.extend(refLatLng);

      const refIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <span class="absolute w-8 h-8 rounded-full bg-rose-600 animate-ping opacity-60"></span>
            <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg border-2 border-white text-xs font-black">
              ⚠️
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const refImage = getGemeindebauImage(GRINZINGER_ALLEE_REFERENCE.id, GRINZINGER_ALLEE_REFERENCE.name);

      const refMarker = L.marker(refLatLng, { icon: refIcon }).addTo(markersGroup);

      const refPopupContent = document.createElement('div');
      refPopupContent.className = 'p-1 font-sans text-stone-900 max-w-[260px]';
      refPopupContent.innerHTML = `
        <div class="rounded-lg overflow-hidden mb-2 border border-rose-200">
          <img src="${refImage}" alt="Grinzinger Allee 54" class="w-full h-24 object-cover" referrerpolicy="no-referrer" />
        </div>
        <div class="flex items-center gap-1.5 mb-1">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
            Lärm-Referenz
          </span>
          <span class="text-[11px] font-black text-rose-700">73 dB(A)</span>
        </div>
        <h4 class="font-bold text-sm text-stone-900 leading-tight">Grinzinger Allee 54</h4>
        <p class="text-xs text-stone-600 mb-1">1190 Wien • Tram 38 direkt vor Balkon</p>
        <p class="text-[11px] text-rose-700 font-medium">Unerträglicher Schienen- & Verkehrslärm. Dringender Umzugsbearf!</p>
      `;

      const inspectRefBtn = document.createElement('button');
      inspectRefBtn.className = 'mt-2 w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition';
      inspectRefBtn.innerText = 'Lageanalyse ansehen';
      inspectRefBtn.onclick = () => onSelect(GRINZINGER_ALLEE_REFERENCE);
      refPopupContent.appendChild(inspectRefBtn);

      refMarker.bindPopup(refPopupContent);
    }

    // 2. All Quiet Gemeindebau Markers
    gemeindebauten.forEach((bau) => {
      const latLng = L.latLng(bau.koordinaten.lat, bau.koordinaten.lng);
      bounds.extend(latLng);

      const isTopQuiet = bau.ruheScore >= 9;
      const isSelected = selectedBau?.id === bau.id;

      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : ''}">
          <div class="w-8 h-8 rounded-full ${isTopQuiet ? 'bg-[#2D6A4F]' : 'bg-[#1B4332]'} text-white flex items-center justify-center shadow-lg border-2 ${isSelected ? 'border-amber-400 ring-4 ring-amber-300' : 'border-white'} text-xs font-black">
            ${bau.ruheScore}
          </div>
          <span class="absolute -bottom-1 w-2 h-2 rotate-45 ${isTopQuiet ? 'bg-[#2D6A4F]' : 'bg-[#1B4332]'}"></span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 28],
      });

      const marker = L.marker(latLng, { icon }).addTo(markersGroup);

      // Lazy popup creation on demand (prevents creating 1,776 DOM elements simultaneously)
      marker.bindPopup(() => {
        const bauImage = bau.bildUrl || getGemeindebauImage(bau.id, bau.name, bau.bildUrl);
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans text-stone-900 max-w-[270px]';
        popupContent.innerHTML = `
          <div class="rounded-lg overflow-hidden mb-2 border border-emerald-200">
            <img src="${bauImage}" alt="${bau.name}" class="w-full h-24 object-cover" referrerpolicy="no-referrer" />
          </div>
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-[#065F46] border border-emerald-300">
              ${bau.bezirk}. Bezirk • Ruhe: ${bau.ruheScore}/10
            </span>
            <span class="text-[11px] font-bold text-emerald-800">${bau.akustikDbInnenhof} dB(A)</span>
          </div>
          <h4 class="font-bold text-sm text-stone-900 leading-tight">${bau.name}</h4>
          <p class="text-xs text-stone-600 mb-1">${bau.adresse}, ${bau.plz} Wien</p>
          <div class="text-[11px] text-stone-600 space-y-0.5 mb-2">
            <div>⛰️ <strong>Höhe:</strong> ${bau.hoehenmeter} (${bau.gelaendeTyp})</div>
            <div>🛗 <strong>Lift:</strong> ${bau.isStufenlos ? 'Stufenlos (Ebenerdig)' : 'Halbstock-Stufen'}</div>
            <div>🚋 <strong>Bim/Bus:</strong> ${bau.bimBusDistanzMeter} m (${bau.naechsteStation})</div>
          </div>
          <div class="mb-2 pt-1.5 border-t border-stone-200 flex items-center justify-between text-[11px]">
            <a
              href="${bau.googleStreetViewUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${bau.koordinaten.lat},${bau.koordinaten.lng}`}"
              target="_blank"
              rel="noopener noreferrer"
              class="font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
            >
              🌐 360° Street View ↗
            </a>
            ${bau.bildLizenz ? `<span class="text-[9px] text-stone-500 font-medium">© ${bau.bildLizenz}</span>` : ''}
          </div>
        `;

        const inspectBtn = document.createElement('button');
        inspectBtn.className = 'w-full py-1.5 px-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1';
        inspectBtn.innerHTML = '<span>Gemeindebau im Detail ansehen</span>';
        inspectBtn.onclick = () => onSelect(bau);
        popupContent.appendChild(inspectBtn);

        return popupContent;
      });
    });

    // If there are points, fit bounds gently
    if (gemeindebauten.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [gemeindebauten, showRefMarker, selectedBau]);

  // Center selected Bau if changed
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedBau) return;

    map.flyTo(
      [selectedBau.koordinaten.lat, selectedBau.koordinaten.lng],
      15,
      { duration: 1.2 }
    );
  }, [selectedBau]);

  // Quick Zoom Helper
  const jumpToArea = (lat: number, lng: number, zoom: number) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 1 });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetVienna = () => {
    mapInstanceRef.current?.flyTo([48.2100, 16.3700], 12, { duration: 1.2 });
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-[#E5E7EB] overflow-hidden shadow-xs flex flex-col">
      {/* Real Plan Header & Control Bar */}
      <div className="p-4 sm:p-5 border-b-2 border-[#E5E7EB] bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#2D6A4F] text-white">
              Echter Wiener Stadtplan
            </span>
            <span className="text-xs text-[#6B7280] font-bold">
              {gemeindebauten.length} Anlagen auf der echten Karte kartiert
            </span>
          </div>
          <h3 className={`${seniorMode ? 'text-2xl' : 'text-xl'} font-black text-[#0D1B2A] tracking-tight`}>
            Geografischer Lageplan & Lärmkataster Wien
          </h3>
          <p className="text-xs sm:text-sm text-[#4B5563] font-medium">
            Zoomen und navigieren Sie wie im gewohnten Stadtplan. Klicken Sie auf jede Markierung für Foto, Ruhewert und Barrierefreiheit.
          </p>
        </div>

        {/* Map Type & Layer Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Tile Layer Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#F4F5F7] rounded-xl border border-[#D1D5DB]">
            <button
              onClick={() => setActiveTileType('streets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTileType === 'streets'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#0D1B2A]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Straßenplan</span>
            </button>
            <button
              onClick={() => setActiveTileType('satellite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTileType === 'satellite'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#0D1B2A]'
              }`}
            >
              <span>Satellit / Luftbild</span>
            </button>
            <button
              onClick={() => setActiveTileType('terrain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTileType === 'terrain'
                  ? 'bg-[#2D6A4F] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#0D1B2A]'
              }`}
            >
              <span>Topographie</span>
            </button>
          </div>

          {/* Toggle Noise Reference Marker */}
          <button
            onClick={() => setShowRefMarker(!showRefMarker)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition flex items-center gap-1.5 ${
              showRefMarker
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
                : 'bg-white text-stone-500 border-stone-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Referenz Grinzinger Allee {showRefMarker ? 'an' : 'aus'}</span>
          </button>
        </div>
      </div>

      {/* Quick Jump Bar for Districts */}
      <div className="px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E7EB] flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-[#6B7280] uppercase tracking-wider mr-1">
          Schnellansicht:
        </span>
        <button
          onClick={handleResetVienna}
          className="px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] hover:border-[#2D6A4F] font-bold text-[#0D1B2A] transition"
        >
          Ganz Wien
        </button>
        <button
          onClick={() => jumpToArea(48.2450, 16.3350, 14)}
          className="px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] hover:border-[#2D6A4F] font-bold text-[#0D1B2A] transition"
        >
          19. Döbling
        </button>
        <button
          onClick={() => jumpToArea(48.2320, 16.3150, 14)}
          className="px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] hover:border-[#2D6A4F] font-bold text-[#0D1B2A] transition"
        >
          18. Währing
        </button>
        <button
          onClick={() => jumpToArea(48.2250, 16.3050, 14)}
          className="px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] hover:border-[#2D6A4F] font-bold text-[#0D1B2A] transition"
        >
          17. Hernals
        </button>
        <button
          onClick={() => jumpToArea(48.1980, 16.2750, 14)}
          className="px-2.5 py-1 rounded-md bg-white border border-[#D1D5DB] hover:border-[#2D6A4F] font-bold text-[#0D1B2A] transition"
        >
          14. Penzing
        </button>
        <button
          onClick={() => jumpToArea(48.2580, 16.3550, 16)}
          className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-300 text-rose-800 font-bold transition flex items-center gap-1"
        >
          <span>🎯 Problemort: Grinzinger Allee 54</span>
        </button>
      </div>

      {/* Real Map Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-[#E5E7EB]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Custom Senior-Friendly Large Zoom Buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-11 h-11 bg-white text-[#0D1B2A] hover:bg-[#F0FDF4] hover:text-[#2D6A4F] rounded-xl border-2 border-[#E5E7EB] shadow-md flex items-center justify-center font-black text-xl transition"
            title="Vergrößern (Zoom In)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-11 bg-white text-[#0D1B2A] hover:bg-[#F0FDF4] hover:text-[#2D6A4F] rounded-xl border-2 border-[#E5E7EB] shadow-md flex items-center justify-center font-black text-xl transition"
            title="Verkleinern (Zoom Out)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-2xl border-2 border-[#E5E7EB] shadow-md text-xs space-y-1.5 max-w-[280px]">
          <span className="font-bold text-[#0D1B2A] block uppercase tracking-wider text-[10px]">
            Legende echter Stadtplan:
          </span>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-[9px]">9</span>
            <span className="text-[#1A1A1A] font-medium">Grüne Ruhelage (Score 8–10)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-[9px]">7</span>
            <span className="text-[#1A1A1A] font-medium">Guter Schutz (Score 6–7)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">⚠️</span>
            <span className="text-rose-700 font-bold">Lärm-Referenz Grinzinger Allee</span>
          </div>
        </div>
      </div>
    </div>
  );
};
