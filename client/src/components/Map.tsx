import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eenheid } from '../hooks/useUnitsMovement';
import VoertuigenOpKaart from './VoertuigenOpKaart';

// Fix voor Leaflet iconen in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Interface voor GMS2 incidenten
 */
export interface GmsIncident {
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
  coordinates?: [number, number] | null; // [longitude, latitude]
  mc1?: string;
  mc2?: string;
  mc3?: string;
  status?: string;
  melderNaam?: string;
  assignedUnits?: Array<{ roepnummer: string; [key: string]: any }>;
}

/**
 * Interface voor kazernes
 */
export interface Kazerne {
  id: string;
  naam: string;
  adres?: string;
  postcode?: string;
  plaats: string;
  type?: string | null;
  telefoonnummer?: string;
  email?: string;
  capaciteit?: number;
  actief?: boolean;
  latitude: string | number;
  longitude: string | number;
  regio?: string;
  opmerkingen?: string;
  voertuigen?: Voertuig[];
}

/**
 * Interface voor voertuigen
 */
export interface Voertuig {
  roepnummer: string;
  roepnummer_interregionaal?: string;
  type?: string;
  functie?: string;
  bemanning?: number | null;
  typenummer_lrnp?: number | null;
  gms_omschrijving?: string;
  criteria?: string | null;
  opmerking?: string | null;
}

/**
 * Props voor de Map component
 */
interface MapProps {
  eenheden: Eenheid[];
  eenhedenPosities: Record<string, { lat: number; lng: number }>;
  incidenten?: GmsIncident[];
  kazernes?: Kazerne[];
  showVoertuigen?: boolean; // Toggle om voertuigen te tonen
  center?: [number, number];
  zoom?: number;
  onMapReady?: (map: L.Map) => void; // Callback wanneer map klaar is
}

/**
 * Maakt een gekleurde marker icon op basis van de status van de eenheid
 */
const createEenheidIcon = (status: Eenheid['status']): L.DivIcon => {
  const kleuren: Record<Eenheid['status'], string> = {
    beschikbaar: '#10b981', // Groen
    onderweg: '#f59e0b',    // Oranje
    ter_plaatse: '#ef4444', // Rood
  };

  const kleur = kleuren[status] || '#6b7280';
  
  const svgIcon = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${kleur}" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'eenheid-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

/**
 * Maakt een kazerne marker icon op basis van type
 */
const createKazerneIcon = (type: string | null | undefined): L.DivIcon => {
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

/**
 * Maakt een voertuig marker icon op basis van type
 */
const createVoertuigIcon = (type?: string): L.DivIcon => {
  const typeColors: Record<string, string> = {
    'TS': '#dc2626',      // Tankautospuit - Rood
    'MP': '#3b82f6',      // Materieel/Personeel - Blauw
    'HW': '#f59e0b',      // Hoogwerker - Oranje
    'RV': '#10b981',      // Reddingsvoertuig - Groen
    'DAT': '#8b5cf6',     // Dienstauto Terreinvaardig - Paars
    'DA': '#6b7280',      // Dienstauto - Grijs
    'WOV': '#06b6d4',     // Waterongevallenvoertuig - Cyan
    'WO': '#06b6d4',      // Waterongevallen - Cyan
    'AL': '#ec4899',      // Ademlucht - Roze
    'HV': '#84cc16',      // Hulpverleningsvoertuig - Limoengroen
    'SI': '#f97316',      // Slangwagen - Oranje
    'BM': '#14b8a6',      // Blusmaterieel - Teal
    'HA': '#a855f7',      // Haakarmbak - Paars
    'AS': '#ef4444',      // Autospuit - Rood
    'SB': '#f59e0b',      // Schuimblusvoertuig - Oranje
  };
  
  const color = typeColors[type || ''] || '#6b7280';
  
  const svgIcon = `
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="12" y="16" text-anchor="middle" fill="#fff" font-size="10" font-weight="bold">${type || '?'}</text>
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

/**
 * Maakt een incident marker icon op basis van prioriteit
 */
const createIncidentIcon = (prio: number, hasUnits: boolean): L.DivIcon => {
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
 * Component om map instance door te geven aan parent
 */
function MapController({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  return null;
}

/**
 * Map component die eenheden toont als markers op een Leaflet kaart
 */
export default function Map({ 
  eenheden, 
  eenhedenPosities, 
  incidenten = [],
  kazernes = [],
  showVoertuigen = false,
  center = [52.1, 5.3], 
  zoom = 8,
  onMapReady
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <MapController onMapReady={onMapReady} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Voertuigen markers (via renderEenhedenOpKaart module) */}
      {showVoertuigen && <VoertuigenOpKaart enabled={showVoertuigen} />}
      
      {/* Incident markers (GMS2 meldingen) */}
      {incidenten.map((incident) => {
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
                      {hasUnits ? `${incident.assignedUnits!.length} eenheid(en) ingezet` : 'Geen eenheden'}
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
      {kazernes.map((kazerne) => {
        const lat = typeof kazerne.latitude === 'string' 
          ? parseFloat(kazerne.latitude) 
          : kazerne.latitude;
        const lng = typeof kazerne.longitude === 'string' 
          ? parseFloat(kazerne.longitude) 
          : kazerne.longitude;

        // Skip kazernes zonder geldige coördinaten
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <React.Fragment key={kazerne.id}>
            <Marker
              position={[lat, lng]}
              icon={createKazerneIcon(kazerne.type || null)}
            >
              <Popup>
                <div className="p-2 min-w-[250px]">
                  <h3 className="font-bold text-lg mb-2">{kazerne.naam}</h3>
                  <div className="space-y-1 text-sm">
                    {kazerne.type && (
                      <div>
                        <span className="font-semibold">Type:</span>{' '}
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100">
                          {kazerne.type}
                        </span>
                      </div>
                    )}
                    {kazerne.adres && kazerne.adres !== '-' && (
                      <div>
                        <span className="font-semibold">Adres:</span><br/>
                        {kazerne.adres}<br/>
                        {kazerne.postcode} {kazerne.plaats}
                      </div>
                    )}
                    {kazerne.telefoonnummer && (
                      <div>
                        <span className="font-semibold">Telefoon:</span> {kazerne.telefoonnummer}
                      </div>
                    )}
                    {kazerne.capaciteit && (
                      <div>
                        <span className="font-semibold">Capaciteit:</span> {kazerne.capaciteit}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className={kazerne.actief ? 'text-green-600' : 'text-red-600'}>
                        {kazerne.actief ? 'Actief' : 'Inactief'}
                      </span>
                    </div>
                    {kazerne.regio && (
                      <div>
                        <span className="font-semibold">Regio:</span> {kazerne.regio}
                      </div>
                    )}
                    {kazerne.voertuigen && kazerne.voertuigen.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-semibold">Voertuigen:</span> {kazerne.voertuigen.length}
                        <div className="mt-1 space-y-1">
                          {kazerne.voertuigen.slice(0, 5).map((v) => (
                            <div key={v.roepnummer} className="text-xs">
                              <span className="font-mono">{v.roepnummer}</span>
                              {v.type && <span className="ml-1 text-gray-600">({v.type})</span>}
                            </div>
                          ))}
                          {kazerne.voertuigen.length > 5 && (
                            <div className="text-xs text-gray-500">
                              ... en {kazerne.voertuigen.length - 5} meer
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-semibold">Coördinaten:</span> {lat.toFixed(6)}, {lng.toFixed(6)}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
      
      {/* Eenheid markers (alleen tonen wanneer voertuigen UIT staan om duplicaten te voorkomen) */}
      {!showVoertuigen && eenheden.map((eenheid) => {
        const positie = eenhedenPosities[eenheid.id];
        if (!positie) return null;

        return (
          <Marker
            key={eenheid.id}
            position={[positie.lat, positie.lng]}
            icon={createEenheidIcon(eenheid.status)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{eenheid.naam}</h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-semibold">Status:</span>{' '}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      eenheid.status === 'beschikbaar' ? 'bg-green-100 text-green-800' :
                      eenheid.status === 'onderweg' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {eenheid.status === 'beschikbaar' ? 'Beschikbaar' :
                       eenheid.status === 'onderweg' ? 'Onderweg' :
                       'Ter Plaatse'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">ID:</span> {eenheid.id}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-semibold">Coördinaten:</span><br/>
                    Lat: {positie.lat.toFixed(6)}<br/>
                    Lng: {positie.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

