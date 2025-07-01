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

// Create priority-based icons
const createPriorityIcon = (priority: number) => {
  const colors = {
    1: '#ff0000', // Zeer Hoog - Rood
    2: '#ff6600', // Hoog - Oranje
    3: '#ffaa00', // Middel - Geel
    4: '#00aa00', // Laag - Groen
    5: '#00aa00'  // Laag - Groen
  };
  
  const color = colors[priority as keyof typeof colors] || '#888888';
  return createCustomIcon(color, priority.toString());
};

// Helper function to convert priority number to urgency label
const getPriorityUrgency = (priorityNumber: number): 'Laag' | 'Middel' | 'Hoog' | 'Zeer Hoog' => {
  switch (priorityNumber) {
    case 1: return 'Zeer Hoog';
    case 2: return 'Hoog';
    case 3: return 'Middel';
    case 4:
    case 5:
    default: return 'Laag';
  }
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

interface Melding {
  id: string;
  classificatie: string;
  adres: string;
  coordinaten: [number, number];
  urgentie: 'Laag' | 'Middel' | 'Hoog' | 'Zeer Hoog';
  tijdstip: string;
  eenheden: string[];
  details?: string;
  prioriteit?: number;
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

  // Load GMS2 incidents from API
  useEffect(() => {
    const loadGMSIncidents = async () => {
      try {
        console.log('🗺️ Loading GMS incidents for map...');
        
        const response = await fetch('/api/gms-incidents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gmsIncidents = await response.json();
        console.log('✅ Fetched GMS incidents for map:', gmsIncidents.length);
        
        // Convert GMS incidents to map format
        const mapIncidents: Melding[] = gmsIncidents
          .filter((incident: any) => incident.locatie && incident.locatie.coordinates)
          .map((incident: any) => {
            const priorityNumber = typeof incident.prioriteit === 'string' ? 
              parseInt(incident.prioriteit) : incident.prioriteit;
            
            return {
              id: incident.id?.toString() || `gms-${Math.random()}`,
              classificatie: [incident.mc1, incident.mc2, incident.mc3].filter(Boolean).join(' / ') || 'Onbekend',
              adres: `${incident.straat || ''} ${incident.huisnummer || ''}`.trim() || 
                     incident.locatie?.address || 'Onbekende locatie',
              coordinaten: [
                incident.locatie.coordinates[1], // lat
                incident.locatie.coordinates[0]  // lng
              ] as [number, number],
              urgentie: getPriorityUrgency(priorityNumber),
              tijdstip: incident.tijdstip ? 
                new Date(incident.tijdstip).toLocaleTimeString('nl-NL') : 'Onbekend',
              eenheden: incident.toegewezenEenheden || [],
              details: incident.omschrijving || '',
              prioriteit: priorityNumber
            };
          });
        
        setMeldingen(mapIncidents);
        console.log('✅ Set map incidents:', mapIncidents.length);
        
      } catch (error) {
        console.error('❌ Error loading GMS incidents:', error);
        setError('Fout bij laden meldingen');
        // Set empty array on error
        setMeldingen([]);
      }
    };
    
    loadGMSIncidents();
  }, []);

  // Load sample units data
  useEffect(() => {
    const sampleEenheden: Eenheid[] = [
      {
        id: 'POL-101',
        type: 'Politie',
        status: 'Beschikbaar',
        locatie: [51.9200, 4.4700],
        naam: 'Alpha-01'
      },
      {
        id: 'BRW-201',
        type: 'Brandweer',
        status: 'Onderweg',
        locatie: [51.9250, 4.4750],
        bestemming: 'B-20250101-002',
        naam: 'TS-201'
      },
      {
        id: 'AMB-301',
        type: 'Ambulance',
        status: 'Onderweg',
        locatie: [51.9240, 4.4770],
        bestemming: 'B-20250101-002',
        naam: '17-101'
      }
    ];

    setEenheden(sampleEenheden);
    setBasisteams(basisteamRegistry.getAllTeams());
    setIsLoading(false);
    console.log('✅ Kaart data loaded successfully');
  }, []);

  // Simulate unit movement every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEenheden(prevEenheden => 
        prevEenheden.map(eenheid => {
          if (eenheid.status === 'Onderweg' && eenheid.bestemming) {
            const melding = meldingen.find(m => m.id === eenheid.bestemming);
            if (melding) {
              // Simulate movement towards destination
              const [currentLat, currentLng] = eenheid.locatie;
              const [targetLat, targetLng] = melding.coordinaten;
              
              const deltaLat = (targetLat - currentLat) * 0.1;
              const deltaLng = (targetLng - currentLng) * 0.1;
              
              return {
                ...eenheid,
                locatie: [
                  currentLat + deltaLat + (Math.random() - 0.5) * 0.001,
                  currentLng + deltaLng + (Math.random() - 0.5) * 0.001
                ] as [number, number]
              };
            }
          }
          return eenheid;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [meldingen]);

  const getIncidentIcon = (melding: Melding) => {
    // Use priority-based icon if available
    if (melding.prioriteit) {
      return createPriorityIcon(melding.prioriteit);
    }
    
    // Fallback to type-based icons
    const classificatie = melding.classificatie.toLowerCase();
    if (classificatie.includes('brand')) return incidentIcons.brand;
    if (classificatie.includes('medisch') || classificatie.includes('ambulance')) return incidentIcons.medisch;
    if (classificatie.includes('politie') || classificatie.includes('diefstal') || classificatie.includes('geweld')) return incidentIcons.politie;
    if (classificatie.includes('verkeer') || classificatie.includes('ongeval')) return incidentIcons.verkeer;
    return incidentIcons.default;
  };

  const getUnitIcon = (type: string) => {
    return unitIcons[type as keyof typeof unitIcons] || unitIcons.default;
  };

  const filteredMeldingen = meldingen.filter(melding => {
    if (selectedFilter !== 'alle' && !melding.classificatie.toLowerCase().includes(selectedFilter)) return false;
    if (urgentieFilter !== 'alle' && melding.urgentie !== urgentieFilter) return false;
    return true;
  });

  const filteredEenheden = eenheden.filter(eenheid => {
    if (disciplineFilter !== 'alle' && eenheid.type !== disciplineFilter) return false;
    return true;
  });

  const getConnectionLines = () => {
    const lines: JSX.Element[] = [];
    
    filteredEenheden.forEach(eenheid => {
      if (eenheid.bestemming) {
        const melding = meldingen.find(m => m.id === eenheid.bestemming);
        if (melding) {
          lines.push(
            <Polyline
              key={`${eenheid.id}-${melding.id}`}
              positions={[eenheid.locatie, melding.coordinaten]}
              color="#007bff"
              weight={2}
              opacity={0.7}
              dashArray="5, 5"
            />
          );
        }
      }
    });
    
    return lines;
  };

  if (!mapLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Kaart wordt geladen...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar with filters */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Kaart Filters</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type incident
            </label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="alle">Alle incidenten</option>
              <option value="brand">Brand</option>
              <option value="medisch">Medisch</option>
              <option value="politie">Politie</option>
              <option value="verkeer">Verkeer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioriteit
            </label>
            <select
              value={urgentieFilter}
              onChange={(e) => setUrgentieFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="alle">Alle prioriteiten</option>
              <option value="Zeer Hoog">Zeer Hoog (1)</option>
              <option value="Hoog">Hoog (2)</option>
              <option value="Middel">Middel (3)</option>
              <option value="Laag">Laag (4-5)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Eenheden
            </label>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="alle">Alle eenheden</option>
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
            <label htmlFor="showBasisteams" className="text-sm font-medium text-gray-700">
              Toon basisteams
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 space-y-2">
          <div className="text-sm text-gray-600">
            <strong>Actieve meldingen:</strong> {filteredMeldingen.length}
          </div>
          <div className="text-sm text-gray-600">
            <strong>Actieve eenheden:</strong> {filteredEenheden.length}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-2">Legenda - Prioriteiten</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-600 mr-2"></div>
              <span>Prio 1 - Zeer Hoog</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-orange-600 mr-2"></div>
              <span>Prio 2 - Hoog</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-yellow-600 mr-2"></div>
              <span>Prio 3 - Middel</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-600 mr-2"></div>
              <span>Prio 4-5 - Laag</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.9225, 4.4792]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* GMS2 Incidents with priority-based icons */}
          {filteredMeldingen.map((melding) => (
            <Marker
              key={melding.id}
              position={melding.coordinaten}
              icon={getIncidentIcon(melding)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{melding.classificatie}</h3>
                  <p className="text-xs mb-1"><strong>Adres:</strong> {melding.adres}</p>
                  <p className="text-xs mb-1"><strong>Prioriteit:</strong> {melding.prioriteit || 'Onbekend'} ({melding.urgentie})</p>
                  <p className="text-xs mb-1"><strong>Tijd:</strong> {melding.tijdstip}</p>
                  {melding.details && (
                    <p className="text-xs mb-1"><strong>Details:</strong> {melding.details}</p>
                  )}
                  {melding.eenheden.length > 0 && (
                    <p className="text-xs"><strong>Eenheden:</strong> {melding.eenheden.join(', ')}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Units */}
          {filteredEenheden.map((eenheid) => (
            <Marker
              key={eenheid.id}
              position={eenheid.locatie}
              icon={getUnitIcon(eenheid.type)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{eenheid.naam || eenheid.id}</h3>
                  <p className="text-xs mb-1"><strong>Type:</strong> {eenheid.type}</p>
                  <p className="text-xs mb-1"><strong>Status:</strong> {eenheid.status}</p>
                  {eenheid.bestemming && (
                    <p className="text-xs"><strong>Bestemming:</strong> {eenheid.bestemming}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Connection lines between units and destinations */}
          {getConnectionLines()}

          {/* Basisteams polygons */}
          {showBasisteams && basisteams.map((team) => (
            <Polygon
              key={team.id}
              positions={team.polygon}
              color="#007bff"
              weight={2}
              opacity={0.6}
              fillColor="#007bff"
              fillOpacity={0.1}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{team.naam}</h3>
                  <p className="text-xs mb-1"><strong>Adres:</strong> {team.adres}</p>
                  <p className="text-xs"><strong>Gemeentes:</strong> {team.gemeentes.join(', ')}</p>
                </div>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default KaartPage;