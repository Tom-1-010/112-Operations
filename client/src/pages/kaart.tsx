import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { basisteamRegistry } from '../lib/basisteam-registry';
import { Basisteam } from '../../../shared/basisteam-schema';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamic import for React Leaflet components to ensure client-side rendering
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let Polyline: any;
let Polygon: any;

// Fix for default markers in React Leaflet - with error handling
try {
  // Delete the default _getIconUrl method if it exists
  if (L.Icon.Default.prototype._getIconUrl) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  
  console.log('✅ Leaflet icons configured successfully');
} catch (error) {
  console.error('❌ Error configuring Leaflet icons:', error);
}

// Custom icons for different incident types and units
const createCustomIcon = (color: string, iconType: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold;">${iconType}</div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
};

const incidentIcons = {
  'brand': createCustomIcon('#ff4444', '🔥'),
  'medisch': createCustomIcon('#44ff44', '🏥'),
  'politie': createCustomIcon('#4444ff', '👮'),
  'verkeer': createCustomIcon('#ffaa44', '🚗'),
  'default': createCustomIcon('#888888', '⚠️'),
};

const unitIcons = {
  'Politie': createCustomIcon('#0066cc', 'P'),
  'Brandweer': createCustomIcon('#cc0000', 'B'),
  'Ambulance': createCustomIcon('#00cc66', 'A'),
  'default': createCustomIcon('#666666', 'E'),
};

interface GmsIncident {
  id: number;
  melderNaam: string;
  melderAdres: string;
  telefoonnummer: string;
  straatnaam: string;
  huisnummer: string;
  toevoeging: string;
  postcode: string;
  plaatsnaam: string;
  gemeente: string;
  mc1: string;
  mc2: string;
  mc3: string;
  tijdstip: string;
  prioriteit: number;
  status: string;
  meldingslogging: string;
  notities: string;
  aangemaaktOp: string;
  afgesloten: string | null;
  assignedUnits: string | null;
}

interface Melding {
  id: string;
  classificatie: string;
  adres: string;
  coordinaten: [number, number];
  urgentie: 'Laag' | 'Middel' | 'Hoog' | 'Zeer Hoog';
  tijdstip: string;
  eenheden: string[];
  details?: string;
}

interface Eenheid {
  id: string;
  type: 'Politie' | 'Brandweer' | 'Ambulance';
  status: 'Beschikbaar' | 'Onderweg' | 'Bezig' | 'Uitruk';
  locatie: [number, number];
  bestemming?: string;
  naam?: string;
}

const KaartPage: React.FC = () => {
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [eenheden, setEenheden] = useState<Eenheid[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  const [urgentieFilter, setUrgentieFilter] = useState('alle');
  const [disciplineFilter, setDisciplineFilter] = useState('alle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [showBasisteams, setShowBasisteams] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // Load React Leaflet components dynamically
  useEffect(() => {
    const loadMapComponents = async () => {
      try {
        console.log('🗺️ Loading React Leaflet components...');
        const reactLeaflet = await import('react-leaflet');
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        Polyline = reactLeaflet.Polyline;
        Polygon = reactLeaflet.Polygon;
        setMapLoaded(true);
        console.log('✅ React Leaflet components loaded');
      } catch (error) {
        console.error('❌ Error loading React Leaflet components:', error);
        setError('Fout bij laden kaartcomponenten');
      }
    };

    if (typeof window !== 'undefined') {
      loadMapComponents();
    }
  }, []);

  // Helper functions
  const generateCoordinatesForLocation = (straat: string, huisnummer: string, plaats: string): [number, number] => {
    // Simple coordinate generation for Rotterdam area based on location
    const baseCoords: [number, number] = [51.9225, 4.4792]; // Rotterdam center
    
    // Add some variation based on street name and house number
    const streetHash = straat.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const houseNumber = parseInt(huisnummer) || 1;
    
    const latOffset = ((streetHash % 100) - 50) * 0.001; // ±0.05 degrees
    const lonOffset = ((houseNumber % 100) - 50) * 0.001; // ±0.05 degrees
    
    return [
      baseCoords[0] + latOffset,
      baseCoords[1] + lonOffset
    ];
  };

  const mapPriorityToUrgency = (priority: number): 'Laag' | 'Middel' | 'Hoog' | 'Zeer Hoog' => {
    switch (priority) {
      case 1: return 'Zeer Hoog';
      case 2: return 'Hoog';
      case 3: return 'Middel';
      default: return 'Laag';
    }
  };

  // Load GMS incidents from API
  useEffect(() => {
    const loadGmsIncidents = async () => {
      try {
        console.log('🗺️ Loading GMS incidents for map...');
        
        const response = await fetch('/api/gms-incidents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gmsIncidents: GmsIncident[] = await response.json();
        console.log('✅ Fetched GMS incidents for map:', gmsIncidents.length);
        
        // Convert GMS incidents to map format with coordinates
        const convertedIncidents: Melding[] = gmsIncidents
          .filter((incident) => incident.straatnaam && incident.plaatsnaam)
          .map((incident) => {
            // Generate coordinates based on location for Rotterdam area
            const coords = generateCoordinatesForLocation(
              incident.straatnaam, 
              incident.huisnummer, 
              incident.plaatsnaam
            );
            
            return {
              id: `GMS-${incident.id}`,
              classificatie: `${incident.mc1} - ${incident.mc2}`,
              adres: `${incident.straatnaam} ${incident.huisnummer}, ${incident.plaatsnaam}`,
              coordinaten: coords,
              urgentie: mapPriorityToUrgency(incident.prioriteit),
              tijdstip: incident.tijdstip,
              eenheden: incident.assignedUnits ? JSON.parse(incident.assignedUnits).map((u: any) => u.roepnummer) : [],
              details: incident.notities || `${incident.mc3} incident`
            };
          });
        
        console.log('✅ Set map incidents:', convertedIncidents.length);
        setMeldingen(convertedIncidents);
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ Error loading GMS incidents:', error);
        setError('Fout bij laden van GMS meldingen');
        setIsLoading(false);
      }
    };
    
    loadGmsIncidents();
  }, []);

  // Load basisteams data
  useEffect(() => {
    const loadBasisteams = async () => {
      try {
        const response = await fetch('/api/basisteams');
        if (response.ok) {
          const basisteamsData = await response.json();
          setBasisteams(basisteamsData);
        }
      } catch (error) {
        console.error('Error loading basisteams:', error);
      }
    };

    loadBasisteams();
  }, []);

  // Filter functions
  const filteredMeldingen = meldingen.filter(melding => {
    if (selectedFilter !== 'alle' && !melding.classificatie.toLowerCase().includes(selectedFilter)) return false;
    if (urgentieFilter !== 'alle' && melding.urgentie !== urgentieFilter) return false;
    return true;
  });

  const filteredEenheden = eenheden.filter(eenheid => {
    if (disciplineFilter !== 'alle' && eenheid.type !== disciplineFilter) return false;
    return true;
  });

  const getIncidentIcon = (melding: Melding) => {
    const classificatie = melding.classificatie.toLowerCase();
    if (classificatie.includes('brand')) return incidentIcons.brand;
    if (classificatie.includes('medisch') || classificatie.includes('ambulance')) return incidentIcons.medisch;
    if (classificatie.includes('politie') || classificatie.includes('diefstal')) return incidentIcons.politie;
    if (classificatie.includes('verkeer') || classificatie.includes('ongeval')) return incidentIcons.verkeer;
    return incidentIcons.default;
  };

  const getUnitIcon = (eenheid: Eenheid) => {
    return unitIcons[eenheid.type] || unitIcons.default;
  };

  if (!mapLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Kaart wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-lg mb-4">Er is een fout opgetreden:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Map Container */}
      <div className="h-full w-full">
        <MapContainer
          center={[51.9225, 4.4792]}
          zoom={12}
          className="h-full w-full"
          ref={(map: any) => {
            if (map) mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* GMS Incident Markers */}
          {filteredMeldingen.map((melding) => (
            <Marker
              key={melding.id}
              position={melding.coordinaten}
              icon={getIncidentIcon(melding)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-2">{melding.classificatie}</h3>
                  <p className="text-xs mb-1"><strong>Adres:</strong> {melding.adres}</p>
                  <p className="text-xs mb-1"><strong>Urgentie:</strong> {melding.urgentie}</p>
                  <p className="text-xs mb-1"><strong>Tijd:</strong> {new Date(melding.tijdstip).toLocaleTimeString()}</p>
                  {melding.eenheden.length > 0 && (
                    <p className="text-xs mb-1"><strong>Eenheden:</strong> {melding.eenheden.join(', ')}</p>
                  )}
                  {melding.details && (
                    <p className="text-xs mt-2 italic">{melding.details}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Unit Markers */}
          {filteredEenheden.map((eenheid) => (
            <Marker
              key={eenheid.id}
              position={eenheid.locatie}
              icon={getUnitIcon(eenheid)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-2">{eenheid.naam || eenheid.id}</h3>
                  <p className="text-xs mb-1"><strong>Type:</strong> {eenheid.type}</p>
                  <p className="text-xs mb-1"><strong>Status:</strong> {eenheid.status}</p>
                  {eenheid.bestemming && (
                    <p className="text-xs mb-1"><strong>Bestemming:</strong> {eenheid.bestemming}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Basisteam Polygons */}
          {showBasisteams && basisteams.map((basisteam) => (
            basisteam.polygon && basisteam.polygon.length > 0 && (
              <Polygon
                key={basisteam.id}
                positions={basisteam.polygon}
                pathOptions={{
                  fillColor: basisteam.actief ? '#3388ff' : '#888888',
                  fillOpacity: 0.1,
                  color: basisteam.actief ? '#3388ff' : '#888888',
                  weight: 2,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-2">{basisteam.naam}</h3>
                    <p className="text-xs mb-1"><strong>ID:</strong> {basisteam.id}</p>
                    <p className="text-xs mb-1"><strong>Status:</strong> {basisteam.actief ? 'Actief' : 'Inactief'}</p>
                    {basisteam.gemeentes && basisteam.gemeentes.length > 0 && (
                      <p className="text-xs"><strong>Gemeentes:</strong> {basisteam.gemeentes.join(', ')}</p>
                    )}
                  </div>
                </Popup>
              </Polygon>
            )
          ))}
        </MapContainer>
      </div>

      {/* Filter Controls */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000] max-w-xs">
        <h3 className="font-bold text-sm mb-3">Kaart Filters</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Incident Type:</label>
            <select 
              value={selectedFilter} 
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="alle">Alle Incidents</option>
              <option value="brand">Brand</option>
              <option value="medisch">Medisch</option>
              <option value="politie">Politie</option>
              <option value="verkeer">Verkeer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Urgentie:</label>
            <select 
              value={urgentieFilter} 
              onChange={(e) => setUrgentieFilter(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="alle">Alle Urgentie</option>
              <option value="Zeer Hoog">Zeer Hoog</option>
              <option value="Hoog">Hoog</option>
              <option value="Middel">Middel</option>
              <option value="Laag">Laag</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Discipline:</label>
            <select 
              value={disciplineFilter} 
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="alle">Alle Eenheden</option>
              <option value="Politie">Politie</option>
              <option value="Brandweer">Brandweer</option>
              <option value="Ambulance">Ambulance</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showBasisteams"
              checked={showBasisteams}
              onChange={(e) => setShowBasisteams(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showBasisteams" className="text-xs">Toon Basisteam Gebieden</label>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-600">
            <p><strong>Statistieken:</strong></p>
            <p>Actieve Incidents: {filteredMeldingen.length}</p>
            <p>Zichtbare Eenheden: {filteredEenheden.length}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-bold text-xs mb-2">Legenda</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span>Brand</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
            <span>Medisch</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
            <span>Politie</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
            <span>Verkeer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KaartPage;