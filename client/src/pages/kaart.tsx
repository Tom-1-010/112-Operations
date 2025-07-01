import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Basisteam } from '../../../shared/basisteam-schema';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Dynamic import for React Leaflet components to ensure client-side rendering
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let Polygon: any;

// Fix for default markers in React Leaflet
try {
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

// Create numbered incident markers with different colors based on incident type
const createIncidentIcon = (incidentNumber: number, incidentType: string, priority: number) => {
  // Color mapping based on MC1 classification
  const getColorForIncident = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('brand')) return '#ff4444'; // Red for fire
    if (lowerType.includes('geweld') || lowerType.includes('diefstal')) return '#4444ff'; // Blue for police
    if (lowerType.includes('medisch') || lowerType.includes('ambulance')) return '#44ff44'; // Green for medical
    if (lowerType.includes('verkeer') || lowerType.includes('ongeval')) return '#ff8800'; // Orange for traffic
    if (lowerType.includes('overlast')) return '#88ff44'; // Light green for public nuisance
    return '#888888'; // Gray for unknown
  };

  // Priority affects the border
  const borderColor = priority === 1 ? '#ff0000' : priority === 2 ? '#ffaa00' : '#888888';
  const borderWidth = priority === 1 ? 4 : priority === 2 ? 3 : 2;
  
  const color = getColorForIncident(incidentType);
  
  return L.divIcon({
    className: 'incident-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 35px; 
        height: 35px; 
        border-radius: 50%; 
        border: ${borderWidth}px solid ${borderColor}; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 14px; 
        color: white; 
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
      ">${incidentNumber}</div>
    `,
    iconSize: [35, 35],
    iconAnchor: [17, 17],
  });
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

interface ProcessedIncident {
  id: number;
  number: number;
  type: string;
  classification: string;
  address: string;
  coordinates: [number, number];
  priority: number;
  status: string;
  timestamp: string;
  units: string[];
  notes: string;
  isNew?: boolean;
}

const KaartPage: React.FC = () => {
  const [incidents, setIncidents] = useState<ProcessedIncident[]>([]);
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [showBasisteams, setShowBasisteams] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  const [priorityFilter, setPriorityFilter] = useState('alle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<number>>(new Set());
  const mapRef = useRef<L.Map | null>(null);
  const lastFetchTime = useRef<Date>(new Date());

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

  // Generate coordinates for Rotterdam area based on incident data
  const generateCoordinatesForIncident = (incident: GmsIncident): [number, number] => {
    // Base coordinates for Rotterdam center
    const baseCoords: [number, number] = [51.9225, 4.4792];
    
    // If we have address data, create variation based on it
    if (incident.straatnaam || incident.huisnummer) {
      const streetHash = (incident.straatnaam || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const houseNumber = parseInt(incident.huisnummer) || incident.id;
      
      // Create reasonable spread across Rotterdam metropolitan area
      const latOffset = ((streetHash % 200) - 100) * 0.002; // ±0.2 degrees
      const lonOffset = ((houseNumber % 200) - 100) * 0.002;
      
      return [
        Math.max(51.85, Math.min(52.0, baseCoords[0] + latOffset)),
        Math.max(4.3, Math.min(4.6, baseCoords[1] + lonOffset))
      ];
    }
    
    // Fallback: spread incidents around Rotterdam area based on ID
    const idOffset = incident.id * 137; // Prime number for better distribution
    const latOffset = ((idOffset % 100) - 50) * 0.003;
    const lonOffset = (((idOffset * 7) % 100) - 50) * 0.003;
    
    return [
      baseCoords[0] + latOffset,
      baseCoords[1] + lonOffset
    ];
  };

  // Process raw GMS incidents into map-ready format
  const processIncidents = (rawIncidents: GmsIncident[]): ProcessedIncident[] => {
    return rawIncidents.map((incident) => {
      const address = incident.straatnaam && incident.huisnummer 
        ? `${incident.straatnaam} ${incident.huisnummer}${incident.toevoeging ? incident.toevoeging : ''}, ${incident.plaatsnaam || 'Rotterdam'}`
        : incident.melderAdres || `Incident ${incident.id}`;

      const units = incident.assignedUnits 
        ? JSON.parse(incident.assignedUnits).map((u: any) => u.roepnummer || u.id) 
        : [];

      return {
        id: incident.id,
        number: incident.id,
        type: incident.mc1,
        classification: `${incident.mc1} - ${incident.mc2}`,
        address,
        coordinates: generateCoordinatesForIncident(incident),
        priority: incident.prioriteit,
        status: incident.status,
        timestamp: incident.tijdstip,
        units,
        notes: incident.notities || `${incident.mc3} ${incident.mc2}`.trim()
      };
    });
  };

  // Load incidents with real-time polling
  const loadIncidents = useCallback(async () => {
    try {
      console.log('🗺️ Loading GMS incidents for map...');
      
      const response = await fetch('/api/gms-incidents');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawIncidents: GmsIncident[] = await response.json();
      console.log('✅ Fetched GMS incidents for map:', rawIncidents.length);
      
      const processedIncidents = processIncidents(rawIncidents);
      
      // Detect new incidents
      setIncidents(prevIncidents => {
        const prevIds = new Set(prevIncidents.map(i => i.id));
        const newIds = processedIncidents
          .filter(incident => !prevIds.has(incident.id))
          .map(incident => incident.id);
        
        if (newIds.length > 0) {
          console.log('🚨 New incidents detected:', newIds);
          setNewIncidentIds(prev => new Set([...prev, ...newIds]));
          
          // Clear new incident highlighting after 10 seconds
          setTimeout(() => {
            setNewIncidentIds(prev => {
              const updated = new Set(prev);
              newIds.forEach(id => updated.delete(id));
              return updated;
            });
          }, 10000);
        }
        
        return processedIncidents;
      });
      
      lastFetchTime.current = new Date();
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading GMS incidents:', error);
      setError('Fout bij laden van GMS meldingen');
      setIsLoading(false);
    }
  }, []);

  // Initial load and setup polling
  useEffect(() => {
    loadIncidents();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(loadIncidents, 5000);
    
    return () => clearInterval(interval);
  }, [loadIncidents]);

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

  // Filter incidents based on user selection
  const filteredIncidents = incidents.filter(incident => {
    if (selectedFilter !== 'alle' && !incident.type.toLowerCase().includes(selectedFilter.toLowerCase())) {
      return false;
    }
    if (priorityFilter !== 'alle' && incident.priority.toString() !== priorityFilter) {
      return false;
    }
    return true;
  });

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
          zoom={11}
          className="h-full w-full"
          ref={(map: any) => {
            if (map) mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Incident Markers */}
          {filteredIncidents.map((incident) => {
            const isNew = newIncidentIds.has(incident.id);
            
            return (
              <Marker
                key={`incident-${incident.id}`}
                position={incident.coordinates}
                icon={createIncidentIcon(incident.number, incident.type, incident.priority)}
              >
                <Popup>
                  <div className={`p-3 min-w-[250px] ${isNew ? 'bg-yellow-50 border-yellow-300 border-2' : ''}`}>
                    {isNew && (
                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded mb-2 animate-pulse">
                        🚨 NIEUWE MELDING
                      </div>
                    )}
                    <h3 className="font-bold text-base mb-2 text-gray-800">
                      Incident #{incident.number}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Type:</strong> {incident.classification}</p>
                      <p><strong>Adres:</strong> {incident.address}</p>
                      <p><strong>Prioriteit:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs font-bold ${
                          incident.priority === 1 ? 'bg-red-500 text-white' :
                          incident.priority === 2 ? 'bg-orange-500 text-white' :
                          incident.priority === 3 ? 'bg-yellow-500 text-black' :
                          'bg-gray-500 text-white'
                        }`}>
                          P{incident.priority}
                        </span>
                      </p>
                      <p><strong>Status:</strong> {incident.status}</p>
                      <p><strong>Tijd:</strong> {new Date(incident.timestamp).toLocaleString('nl-NL')}</p>
                      {incident.units.length > 0 && (
                        <p><strong>Eenheden:</strong> {incident.units.join(', ')}</p>
                      )}
                      {incident.notes && (
                        <div className="mt-2 p-2 bg-gray-100 rounded">
                          <strong>Details:</strong> {incident.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Basisteam Polygons */}
          {showBasisteams && basisteams.map((basisteam) => (
            basisteam.polygon && basisteam.polygon.length > 0 && (
              <Polygon
                key={`basisteam-${basisteam.id}`}
                positions={basisteam.polygon}
                pathOptions={{
                  fillColor: basisteam.actief ? '#3388ff' : '#888888',
                  fillOpacity: 0.1,
                  color: basisteam.actief ? '#3388ff' : '#888888',
                  weight: 2,
                  opacity: 0.6,
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

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000] max-w-xs">
        <h3 className="font-bold text-sm mb-3">GMS Incidents Kaart</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Filter Type:</label>
            <select 
              value={selectedFilter} 
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="alle">Alle Types</option>
              <option value="brand">Brand</option>
              <option value="geweld">Geweld</option>
              <option value="medisch">Medisch</option>
              <option value="verkeer">Verkeer</option>
              <option value="overlast">Overlast</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Prioriteit:</label>
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1"
            >
              <option value="alle">Alle Prioriteiten</option>
              <option value="1">P1 - Zeer Hoog</option>
              <option value="2">P2 - Hoog</option>
              <option value="3">P3 - Normaal</option>
              <option value="4">P4 - Laag</option>
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
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Live Statistieken:</strong></p>
            <p>Actieve Incidents: {filteredIncidents.length}</p>
            <p>Totaal: {incidents.length}</p>
            <p>Laatste Update: {lastFetchTime.current.toLocaleTimeString('nl-NL')}</p>
            {newIncidentIds.size > 0 && (
              <p className="text-red-600 font-bold">🚨 {newIncidentIds.size} nieuwe melding(en)</p>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-bold text-xs mb-2">Legenda</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold mr-2">1</div>
            <span>Brand (Rood)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mr-2">2</div>
            <span>Politie (Blauw)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mr-2">3</div>
            <span>Medisch (Groen)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold mr-2">4</div>
            <span>Verkeer (Oranje)</span>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Randkleur: Rood=P1, Oranje=P2, Grijs=P3+
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-[1000]">
        🔄 LIVE
      </div>
    </div>
  );
};

export default KaartPage;