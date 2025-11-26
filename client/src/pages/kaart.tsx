import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, MarkerClusterGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKazerneGeocoding } from '../hooks/use-kazerne-geocoding';
import { getKazernesWithVoertuigen } from '../lib/mock-kazernes-api';
import VoertuigenOpKaart from '../components/VoertuigenOpKaart';
import { resetAllUnitsToKazerne } from '../services/globalUnitMovement';

// GMS2 Incident interface
interface GmsIncident {
  id: number;
  nr: number;
  prio: number;
  tijd: string;
  mc: string;
  locatie: string;
  plaats: string;
  straatnaam?: string;
  huisnummer?: string;
  postcode?: string;
  plaatsnaam?: string;
  coordinates?: [number, number] | null;
  mc1?: string;
  mc2?: string;
  mc3?: string;
  status?: string;
  melderNaam?: string;
  assignedUnits?: any[];
}

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Kazerne iconen
const createKazerneIcon = (type: string | null) => {
  const colors: Record<string, string> = {
    'Beroeps': '#dc2626',
    'Vrijwilligers': '#f59e0b',
    'Vrijwillig': '#f59e0b',
    'Vrijwillig/Beroeps': '#ea580c',
  };
  
  const color = colors[type || ''] || '#6b7280';
  const svgIcon = `<svg width="30" height="45" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 30 15 30s15-21.716 15-30C30 6.716 23.284 0 15 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;

  return L.divIcon({
    html: svgIcon,
    className: 'kazerne-marker',
    iconSize: [30, 45],
    iconAnchor: [15, 45],
    popupAnchor: [0, -45]
  });
};

// Voertuig iconen
const createVoertuigIcon = (type: string, functie: string, gekoppeld: boolean) => {
  const typeColors: Record<string, string> = {
    'TS': '#ef4444',      // Tankautospuit - rood
    'HTS': '#dc2626',     // Hoogwerker - donkerrood
    'RV': '#f59e0b',      // Reddingsvoertuig - oranje
    'MP': '#10b981',      // Materieel/Personeel - groen
    'DB': '#3b82f6',      // Dienstbus - blauw
    'VBK': '#8b5cf6',     // Vakbekwaamheid - paars
    'OV': '#f97316',      // Overig - oranje
  };
  
  const color = typeColors[type] || '#6b7280';
  const opacity = gekoppeld ? '1' : '0.5';
  
  const svgIcon = `
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}">
      <rect x="2" y="8" width="20" height="12" rx="2" fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="7" cy="18" r="2" fill="#fff"/>
      <circle cx="17" cy="18" r="2" fill="#fff"/>
      <rect x="4" y="4" width="16" height="6" rx="1" fill="${color}" stroke="#fff" stroke-width="1"/>
      <text x="12" y="7" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">${type}</text>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'voertuig-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// Incident iconen (GMS2 meldingen)
const createIncidentIcon = (prio: number, hasUnits: boolean) => {
  const prioColors: Record<number, string> = {
    1: '#dc2626',      // Prio 1 - Donkerrood (urgent)
    2: '#f59e0b',      // Prio 2 - Oranje
    3: '#eab308',      // Prio 3 - Geel
    4: '#3b82f6',      // Prio 4 - Blauw
    5: '#6b7280',      // Prio 5 - Grijs
  };
  
  const color = prioColors[prio] || '#6b7280';
  const pulseAnimation = prio <= 2 ? 'animate-pulse' : '';
  const statusColor = hasUnits ? '#10b981' : '#ef4444'; // Groen als eenheden, rood als geen eenheden
  
  const svgIcon = `
    <svg width="35" height="50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d="M17.5 0C10.5 0 5 5.5 5 12.5c0 9.5 12.5 32.5 12.5 32.5s12.5-23 12.5-32.5C30 5.5 24.5 0 17.5 0z" 
            fill="${color}" stroke="#fff" stroke-width="2.5" filter="url(#shadow)"/>
      <circle cx="17.5" cy="12.5" r="8" fill="#fff"/>
      <text x="17.5" y="17" text-anchor="middle" fill="${color}" font-size="12" font-weight="bold">P${prio}</text>
      <circle cx="28" cy="8" r="4" fill="${statusColor}" stroke="#fff" stroke-width="1.5"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: `incident-marker ${pulseAnimation}`,
    iconSize: [35, 50],
    iconAnchor: [17.5, 50],
    popupAnchor: [0, -50]
  });
};

/**
 * Component die map state persistent maakt
 */
function MapStatePersister() {
  const map = useMap();

  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const state = {
        center: [center.lat, center.lng] as [number, number],
        zoom: zoom
      };
      localStorage.setItem('mapState', JSON.stringify(state));
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map]);

  return null;
}

export default function KaartPage() {
  const { data: kazernes, isLoading } = useQuery<any[]>({
    queryKey: ['/api/kazernes-with-voertuigen'],
  });

  const [showVoertuigen, setShowVoertuigen] = useState(false); // Standaard uit
  const [showIncidents, setShowIncidents] = useState(true); // Standaard aan
  const [incidents, setIncidents] = useState<GmsIncident[]>([]);
  
  // PDOK geocoding hook
  const { geocodingResults, isGeocoding, geocodeKazernes, clearResults } = useKazerneGeocoding();

  // Track incidents zonder coördinaten
  const [incidentsZonderCoordinaten, setIncidentsZonderCoordinaten] = useState(0);

  // Laad GMS2 incidents uit localStorage
  useEffect(() => {
    const loadIncidents = () => {
      try {
        const storedIncidents = localStorage.getItem('gms2Incidents');
        if (storedIncidents) {
          const parsedIncidents: GmsIncident[] = JSON.parse(storedIncidents);
          // Filter alleen incidents met coördinaten
          const incidentsMetCoordinaten = parsedIncidents.filter(
            inc => inc.coordinates && Array.isArray(inc.coordinates) && inc.coordinates.length === 2
          );
          const incidentsZonder = parsedIncidents.length - incidentsMetCoordinaten.length;
          
          setIncidents(incidentsMetCoordinaten);
          setIncidentsZonderCoordinaten(incidentsZonder);
          
          console.log(`📍 ${incidentsMetCoordinaten.length} incidents geladen met coördinaten uit ${parsedIncidents.length} totaal`);
          
          if (incidentsZonder > 0) {
            console.warn(`⚠️ ${incidentsZonder} incident(en) hebben geen coördinaten en worden niet getoond op de kaart!`);
            console.warn(`💡 Tip: Voeg een adres toe in GMS2 met "=Rotterdam/Kleiweg 12" om coördinaten toe te voegen`);
          }
        }
      } catch (error) {
        console.error('Error loading incidents from localStorage:', error);
      }
    };

    // Laad initial
    loadIncidents();

    // Listen voor storage changes (wanneer GMS2 updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gms2Incidents') {
        loadIncidents();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll elke 2 seconden voor updates (fallback als storage event niet werkt)
    const interval = setInterval(loadIncidents, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Geocode kazernes wanneer ze geladen zijn
  useEffect(() => {
    if (!kazernes || kazernes.length === 0) return;
    
    // Start geocoding voor kazernes zonder geldige coördinaten
    geocodeKazernes(kazernes);
  }, [kazernes, geocodeKazernes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg">Kaart laden...</div>
        </div>
      </div>
    );
  }

  // Combineer kazernes met geocoding resultaten
  const kazernesMetCoordinaten = (kazernes || []).map((k: any) => {
    const geocodingResult = geocodingResults.find(r => r.kazerneId === k.id);
    
    if (geocodingResult?.success && geocodingResult.coordinates) {
      return {
        ...k,
        latitude: geocodingResult.coordinates[0].toString(),
        longitude: geocodingResult.coordinates[1].toString(),
        geocoded: true
      };
    }
    
    // Fallback naar bestaande coördinaten
    if (k.latitude && k.longitude && 
        k.latitude !== 'NULL' && k.longitude !== 'NULL' &&
        !isNaN(parseFloat(k.latitude)) && !isNaN(parseFloat(k.longitude))) {
      return {
        ...k,
        geocoded: false
      };
    }
    
    return null;
  }).filter(Boolean);

  // Tel voertuigen
  const totaalVoertuigen = kazernes?.reduce((acc: number, k: any) => acc + (k.voertuigen?.length || 0), 0) || 0;

  // Laad opgeslagen map state of gebruik default
  const [mapState] = useState<{ center: [number, number]; zoom: number }>(() => {
    try {
      const saved = localStorage.getItem('mapState');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.center && Array.isArray(state.center) && state.center.length === 2 && state.zoom) {
          return { center: state.center, zoom: state.zoom };
        }
      }
    } catch (error) {
      console.warn('Fout bij laden map state:', error);
    }
    return { center: [52.1326, 5.2913], zoom: 7 };
  });

  // Centrum op Nederland of opgeslagen state
  const center: [number, number] = mapState.center;
  const zoom: number = mapState.zoom;

            return (
    <div className="h-screen w-full">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meldkamer Kaart</h1>
            <p className="text-gray-600 mt-1">
              {kazernesMetCoordinaten.length} kazernes • {totaalVoertuigen} voertuigen • {incidents.length} incidenten
              {isGeocoding && <span className="ml-2 text-blue-600">• Geocoding bezig...</span>}
            </p>
                        </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={showIncidents} 
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-semibold text-orange-600">Toon incidenten ({incidents.length})</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={showVoertuigen} 
                onChange={(e) => setShowVoertuigen(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Toon voertuigen</span>
            </label>
            <Button
              onClick={async () => {
                if (confirm('Weet je zeker dat je alle eenheden terug wilt zetten naar hun kazerne?')) {
                  await resetAllUnitsToKazerne();
                }
              }}
              variant="outline"
              className="ml-2"
            >
              Reset alle eenheden naar kazerne
            </Button>
                    </div>
                  </div>
      </div>
      
      <div className="h-[calc(100vh-120px)] w-full relative">
        {/* Warning banner voor incidents zonder coördinaten */}
        {incidentsZonderCoordinaten > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] max-w-2xl">
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">
                    {incidentsZonderCoordinaten} incident(en) hebben geen coördinaten en worden niet getoond
                  </p>
                  <p className="text-xs mt-1">
                    💡 Voeg een adres toe in GMS2 met: <code className="bg-orange-200 px-1 rounded">=Rotterdam/Kleiweg 12</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }} 
          scrollWheelZoom={true}
        >
          <MapStatePersister />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* Voertuigen markers (via renderEenhedenOpKaart - Leaflet markers die kunnen bewegen) */}
          {showVoertuigen && <VoertuigenOpKaart enabled={true} autoRijden={true} />}
          

          {/* Incident markers (GMS2 meldingen) */}
          {showIncidents && incidents.map((incident) => {
            if (!incident.coordinates) return null;
            const [lng, lat] = incident.coordinates; // GeoJSON standard: [longitude, latitude]
            const hasUnits = incident.assignedUnits && incident.assignedUnits.length > 0;
            const classificatie = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || 'Onbekend';

            return (
              <Marker 
                key={`incident-${incident.id}`} 
                position={[lat, lng]} 
                icon={createIncidentIcon(incident.prio, hasUnits)}
              >
                <Popup>
                  <div className="p-2 min-w-[280px]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">Incident #{incident.nr}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        incident.prio === 1 ? 'bg-red-600 text-white' :
                        incident.prio === 2 ? 'bg-orange-500 text-white' :
                        incident.prio === 3 ? 'bg-yellow-500 text-black' :
                        'bg-blue-500 text-white'
                      }`}>
                        P{incident.prio}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-semibold">Classificatie:</span> {classificatie}</div>
                      <div><span className="font-semibold">Locatie:</span> {incident.locatie}</div>
                      {incident.plaatsnaam && <div><span className="font-semibold">Plaats:</span> {incident.plaatsnaam}</div>}
                      <div><span className="font-semibold">Tijd:</span> {incident.tijd}</div>
                      <div>
                        <span className="font-semibold">Status:</span>{' '}
                        <span className={hasUnits ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {hasUnits ? `${incident.assignedUnits.length} eenheid(en) ingezet` : 'Geen eenheden'}
                        </span>
                      </div>
                      {incident.assignedUnits && incident.assignedUnits.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="font-semibold">Eenheden:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {incident.assignedUnits.map((unit, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                {unit.roepnummer}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {incident.melderNaam && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="font-semibold">Melder:</span> {incident.melderNaam}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        <span className="font-semibold">Coördinaten:</span> [{lng.toFixed(6)}, {lat.toFixed(6)}] (lon, lat)
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Kazerne markers */}
          {kazernesMetCoordinaten.map((k: any) => {
            const lat = parseFloat(k.latitude);
            const lng = parseFloat(k.longitude);

            return (
              <Marker key={k.id} position={[lat, lng]} icon={createKazerneIcon(k.type)}>
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-bold text-lg mb-2">{k.naam}</h3>
                    <div className="space-y-1 text-sm">
                      {k.type && <div><span className="font-semibold">Type:</span> <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{k.type}</span></div>}
                      {k.adres && k.adres !== '-' && <div><span className="font-semibold">Adres:</span><br/>{k.adres}<br/>{k.postcode} {k.plaats}</div>}
                      {k.telefoonnummer && <div><span className="font-semibold">Telefoon:</span> {k.telefoonnummer}</div>}
                      {k.voertuigen && k.voertuigen.length > 0 && <div><span className="font-semibold">Voertuigen:</span> {k.voertuigen.length}</div>}
                      <div><span className="font-semibold">Status:</span> <span className={k.actief ? 'text-green-600' : 'text-red-600'}>{k.actief ? 'Actief' : 'Inactief'}</span></div>
                      {k.geocoded && <div><span className="font-semibold">Locatie:</span> <span className="text-green-600">PDOK gegeocodeerd</span></div>}
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold">Coördinaten:</span> {lat.toFixed(6)}, {lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        <div className="absolute bottom-6 right-6 bg-white shadow-lg rounded-lg p-4 z-[1000] max-w-xs">
          <h3 className="font-bold mb-2">Legenda</h3>
          <div className="space-y-2 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Incidenten (GMS2):</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span>Prio 1 (Spoed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span>Prio 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                  <span>Prio 3</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs">Eenheden ingezet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs">Geen eenheden</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <h4 className="font-semibold mb-1">Kazernes:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-600"></div><span>Beroeps</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-500"></div><span>Vrijwilligers</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-600"></div><span>Gemengd</span></div>
            </div>
            </div>
          <div className="pt-2 border-t">
              <h4 className="font-semibold mb-1">Voertuigen:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500"></div><span>TS/HTS</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500"></div><span>RV</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-green-500"></div><span>MP</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500"></div><span>DB</span></div>
            </div>
            </div>
            </div>
            </div>

        {/* Debug panel */}
        <div className="absolute top-6 right-6 bg-white shadow-lg rounded-lg p-4 z-[1000] max-w-xs">
          <h3 className="font-bold mb-2">Debug Info</h3>
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-orange-600">
              Incidenten op kaart: {incidents.length}
              {incidentsZonderCoordinaten > 0 && (
                <span className="text-red-600"> (⚠️ {incidentsZonderCoordinaten} zonder coords)</span>
              )}
            </div>
            <div>Kazernes met coördinaten: {kazernesMetCoordinaten.length}</div>
            <div>Voertuigen: {totaalVoertuigen}</div>
            <div>Geocoding status: {isGeocoding ? 'Bezig...' : 'Voltooid'}</div>
            <div>Geocoding resultaten: {geocodingResults.length}</div>
            <div>Succesvol gegeocodeerd: {geocodingResults.filter(r => r.success).length}</div>
            <div>Kaart centrum: {center[0].toFixed(4)}, {center[1].toFixed(4)}</div>
            {incidents.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <strong>Eerste incident:</strong><br/>
                #{incidents[0].nr} - P{incidents[0].prio}<br/>
                <strong>Locatie:</strong> {incidents[0].locatie}<br/>
                <strong>Coördinaten:</strong><br/>
                {incidents[0].coordinates ? `[${incidents[0].coordinates[0].toFixed(6)}, ${incidents[0].coordinates[1].toFixed(6)}] (lon, lat)` : 'Geen'}
              </div>
            )}
            {incidentsZonderCoordinaten > 0 && (
              <div className="mt-2 pt-2 border-t text-red-600">
                <strong>⚠️ {incidentsZonderCoordinaten} incident(en) zonder coördinaten</strong><br/>
                <span className="text-gray-600 text-xs">Open debug-incidents.html om te debuggen</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
