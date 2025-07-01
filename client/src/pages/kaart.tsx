
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { basisteamRegistry } from '../lib/basisteam-registry';
import { Basisteam } from '../../../shared/basisteam-schema';
import { useLocalStorage } from '../hooks/use-local-storage';

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

// GMS Incident Marker Component
const GmsIncidentMarker: React.FC<{ incident: GmsIncident; coordinates: [number, number] }> = ({ incident, coordinates }) => {
  const priorityIcon = priorityIcons[incident.prio] || priorityIcons[3];
  
  return (
    <Marker
      position={coordinates}
      icon={priorityIcon}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-sm mb-1">GMS Incident #{incident.nr}</h3>
          <p className="text-xs mb-1">
            <strong>Prioriteit:</strong> 
            <span className={`ml-1 font-bold ${
              incident.prio === 1 ? 'text-red-600' :
              incident.prio === 2 ? 'text-orange-600' :
              incident.prio === 3 ? 'text-blue-600' :
              'text-purple-600'
            }`}>
              P{incident.prio}
            </span>
          </p>
          <p className="text-xs mb-1"><strong>Classificatie:</strong> {incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || 'Onbekend'}</p>
          <p className="text-xs mb-1"><strong>Locatie:</strong> {incident.locatie || 'Onbekend'}</p>
          <p className="text-xs mb-1"><strong>Plaats:</strong> {incident.plaatsnaam || incident.plaats || 'Onbekend'}</p>
          <p className="text-xs mb-1"><strong>Tijd:</strong> {incident.tijd}</p>
          <p className="text-xs mb-1"><strong>Status:</strong> {incident.status || 'Openstaand'}</p>
          {incident.assignedUnits && incident.assignedUnits.length > 0 && (
            <p className="text-xs mb-1">
              <strong>Eenheden:</strong> {incident.assignedUnits.map(u => u.roepnummer).join(', ')}
            </p>
          )}
          {incident.functie && (
            <p className="text-xs mb-1"><strong>Object:</strong> {incident.functie}</p>
          )}
          {incident.notities && (
            <p className="text-xs"><strong>Notities:</strong> {incident.notities}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

const incidentIcons = {
  'brand': createCustomIcon('#ff4444', '🔥'),
  'medisch': createCustomIcon('#44ff44', '🏥'),
  'politie': createCustomIcon('#4444ff', '👮'),
  'verkeer': createCustomIcon('#ffaa44', '🚗'),
  'default': createCustomIcon('#888888', '⚠️'),
};

// Priority-based icons for GMS incidents
const priorityIcons = {
  1: createCustomIcon('#dc3545', '1'), // Red for priority 1
  2: createCustomIcon('#ff8c00', '2'), // Orange for priority 2  
  3: createCustomIcon('#87ceeb', '3'), // Light blue for priority 3
  4: createCustomIcon('#8a2be2', '4'), // Purple for priority 4
  5: createCustomIcon('#6c757d', '5'), // Gray for priority 5
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
}

interface GmsIncident {
  id: number;
  nr: number;
  prio: number;
  tijd: string;
  mc: string;
  locatie: string;
  plaats: string;
  roepnr: string;
  positie: string;
  melderNaam?: string;
  melderAdres?: string;
  telefoonnummer?: string;
  straatnaam?: string;
  huisnummer?: string;
  toevoeging?: string;
  postcode?: string;
  plaatsnaam?: string;
  gemeente?: string;
  mc1?: string;
  mc2?: string;
  mc3?: string;
  notities?: string;
  karakteristieken?: any[];
  status?: string;
  functie?: string;
  meldingslogging?: string;
  tijdstip?: string;
  prioriteit?: number;
  assignedUnits?: any[];
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
  const [gmsIncidents, setGmsIncidents] = useState<GmsIncident[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  const [urgentieFilter, setUrgentieFilter] = useState('alle');
  const [disciplineFilter, setDisciplineFilter] = useState('alle');
  const [priorityFilter, setPriorityFilter] = useState('alle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [showBasisteams, setShowBasisteams] = useState(true);
  const [showGmsIncidents, setShowGmsIncidents] = useState(true);
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
        console.log('✅ React Leaflet components loaded successfully');
      } catch (error) {
        console.error('❌ Error loading React Leaflet components:', error);
        setError('Fout bij laden kaartcomponenten');
      }
    };

    if (typeof window !== 'undefined') {
      loadMapComponents();
    }
  }, []);

  // Load GMS incidents from localStorage and API
  useEffect(() => {
    const loadGmsIncidents = async () => {
      try {
        console.log('🗺️ Loading GMS incidents for kaart...');
        
        // First try to load from localStorage (GMS2 data)
        const localGmsIncidents = localStorage.getItem('gms2Incidents');
        if (localGmsIncidents) {
          const incidents = JSON.parse(localGmsIncidents);
          console.log(`📍 Loaded ${incidents.length} GMS incidents from localStorage`);
          setGmsIncidents(incidents);
        }

        // Also try to load from API database
        try {
          const response = await fetch('/api/gms-incidents');
          if (response.ok) {
            const apiIncidents = await response.json();
            console.log(`📍 Loaded ${apiIncidents.length} GMS incidents from API`);
            
            // Merge with localStorage data, preferring localStorage for active incidents
            const mergedIncidents = [...incidents || [], ...apiIncidents.filter((api: any) => 
              !(incidents || []).some((local: any) => local.id === api.id)
            )];
            setGmsIncidents(mergedIncidents);
          }
        } catch (apiError) {
          console.warn('Could not load from API, using localStorage only:', apiError);
        }
      } catch (error) {
        console.error('Error loading GMS incidents:', error);
      }
    };

    loadGmsIncidents();

    // Set up interval to refresh GMS incidents every 10 seconds
    const interval = setInterval(loadGmsIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sample data - in real implementation this would come from API  
  useEffect(() => {
    try {
      console.log('🗺️ Initializing kaart page...');
      
      const sampleMeldingen: Melding[] = [
      {
        id: 'P-20250101-001',
        classificatie: 'Diefstal met geweld',
        adres: 'Coolsingel 101, Rotterdam',
        coordinaten: [51.9225, 4.4792],
        urgentie: 'Hoog',
        tijdstip: new Date().toISOString(),
        eenheden: ['POL-101', 'POL-102'],
        details: 'Overval bij juwelier, dader nog ter plaatse'
      },
      {
        id: 'B-20250101-002',
        classificatie: 'Woningbrand',
        adres: 'Weena 505, Rotterdam',
        coordinaten: [51.9244, 4.4777],
        urgentie: 'Zeer Hoog',
        tijdstip: new Date().toISOString(),
        eenheden: ['BRW-201', 'AMB-301'],
        details: 'Brand op tweede verdieping, mogelijk personen binnen'
      },
      {
        id: 'A-20250101-003',
        classificatie: 'Verkeersongeval letsel',
        adres: 'Erasmusbrug, Rotterdam',
        coordinaten: [51.9094, 4.4829],
        urgentie: 'Middel',
        tijdstip: new Date().toISOString(),
        eenheden: ['AMB-302', 'POL-103'],
        details: 'Aanrijding tussen twee voertuigen, één gewonde'
      }
    ];

    const sampleEenheden: any[] = [
      {
        id: 'POL-101',
        type: 'Politie',
        status: 'Onderweg',
        locatie: [51.9200, 4.4780],
        bestemming: 'P-20250101-001',
        naam: 'Alpha-01',
        basisteam_id: 'BT-RotterdamCentrum'
      },
      {
        id: 'POL-102',
        type: 'Politie',
        status: 'Bezig',
        locatie: [51.9225, 4.4792],
        bestemming: 'P-20250101-001',
        naam: 'Alpha-02',
        basisteam_id: 'BT-RotterdamCentrum'
      },
      {
        id: 'BRW-201',
        type: 'Brandweer',
        status: 'Onderweg',
        locatie: [51.9230, 4.4785],
        bestemming: 'B-20250101-002',
        naam: 'TS-201',
        basisteam_id: 'BT-RotterdamCentrum'
      },
      {
        id: 'AMB-301',
        type: 'Ambulance',
        status: 'Onderweg',
        locatie: [51.9240, 4.4770],
        bestemming: 'B-20250101-002',
        naam: '17-101',
        basisteam_id: 'BT-RotterdamCentrum'
      },
      {
        id: 'AMB-302',
        type: 'Ambulance',
        status: 'Bezig',
        locatie: [51.9094, 4.4829],
        bestemming: 'A-20250101-003',
        naam: '17-102',
        basisteam_id: 'BT-RotterdamZuid'
      },
      {
        id: 'POL-103',
        type: 'Politie',
        status: 'Beschikbaar',
        locatie: [51.9100, 4.4820],
        naam: 'Bravo-01',
        basisteam_id: 'BT-RotterdamNoord'
      }
    ];

    setMeldingen(sampleMeldingen);
      setEenheden(sampleEenheden);
      setBasisteams(basisteamRegistry.getAllTeams());
      setIsLoading(false);
      console.log('✅ Kaart data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading kaart data:', error);
      setError(`Fout bij laden kaartgegevens: ${error}`);
      setIsLoading(false);
    }
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

  const getIncidentIcon = (classificatie: string) => {
    if (classificatie.toLowerCase().includes('brand')) return incidentIcons.brand;
    if (classificatie.toLowerCase().includes('medisch') || classificatie.toLowerCase().includes('ambulance')) return incidentIcons.medisch;
    if (classificatie.toLowerCase().includes('politie') || classificatie.toLowerCase().includes('diefstal') || classificatie.toLowerCase().includes('geweld')) return incidentIcons.politie;
    if (classificatie.toLowerCase().includes('verkeer') || classificatie.toLowerCase().includes('ongeval')) return incidentIcons.verkeer;
    return incidentIcons.default;
  };

  const getUnitIcon = (type: string) => {
    return unitIcons[type] || unitIcons.default;
  };

  const getUrgentieColor = (urgentie: string) => {
    switch (urgentie) {
      case 'Zeer Hoog': return '#ff0000';
      case 'Hoog': return '#ff6600';
      case 'Middel': return '#ffaa00';
      case 'Laag': return '#00aa00';
      default: return '#888888';
    }
  };

  // Geocoding function for GMS incidents
  const geocodeAddress = async (address: string, city: string = 'Rotterdam'): Promise<[number, number] | null> => {
    try {
      const fullAddress = `${address}, ${city}, Netherlands`;
      const encodedAddress = encodeURIComponent(fullAddress);
      
      // Use Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=nl`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          console.log(`📍 Geocoded "${address}" to [${lat}, ${lon}]`);
          return [lat, lon];
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    
    // Fallback to Rotterdam center if geocoding fails
    console.warn(`⚠️ Could not geocode "${address}", using Rotterdam center`);
    return [51.9225, 4.4792];
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

  const filteredGmsIncidents = gmsIncidents.filter(incident => {
    if (priorityFilter !== 'alle' && incident.prio.toString() !== priorityFilter) return false;
    if (selectedFilter !== 'alle') {
      const classification = incident.mc3 || incident.mc2 || incident.mc1 || incident.mc || '';
      if (!classification.toLowerCase().includes(selectedFilter)) return false;
    }
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
              color="#666666"
              weight={2}
              opacity={0.6}
              dashArray="5, 5"
            />
          );
        }
      }
    });
    
    return lines;
  };

  // Debug logging
  console.log('🗺️ Kaart component render state:', {
    isLoading,
    error,
    meldingen: meldingen.length,
    eenheden: eenheden.length,
    windowExists: typeof window !== 'undefined'
  });

  if (isLoading || !mapLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-xl">🗺️ Kaart wordt geladen...</div>
        <div className="text-sm text-gray-600 mt-2">
          {!mapLoaded ? 'Kaartcomponenten worden geladen...' : 'Data wordt geladen...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50">
        <div className="text-xl text-red-600">❌ Fout bij laden kaart</div>
        <div className="text-sm text-red-500 mt-2">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">📍 Operationele Kaart</h1>
        <div className="mt-2 flex gap-4 flex-wrap">
          {/* Classificatie Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Classificatie:</label>
            <select 
              value={selectedFilter} 
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="text-black px-2 py-1 rounded text-xs"
            >
              <option value="alle">Alle</option>
              <option value="brand">Brand</option>
              <option value="diefstal">Diefstal</option>
              <option value="verkeer">Verkeer</option>
              <option value="medisch">Medisch</option>
            </select>
          </div>
          
          {/* Urgentie Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Urgentie:</label>
            <select 
              value={urgentieFilter} 
              onChange={(e) => setUrgentieFilter(e.target.value)}
              className="text-black px-2 py-1 rounded text-xs"
            >
              <option value="alle">Alle</option>
              <option value="Zeer Hoog">Zeer Hoog</option>
              <option value="Hoog">Hoog</option>
              <option value="Middel">Middel</option>
              <option value="Laag">Laag</option>
            </select>
          </div>
          
          {/* Discipline Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Discipline:</label>
            <select 
              value={disciplineFilter} 
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="text-black px-2 py-1 rounded text-xs"
            >
              <option value="alle">Alle</option>
              <option value="Politie">Politie</option>
              <option value="Brandweer">Brandweer</option>
              <option value="Ambulance">Ambulance</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Prioriteit:</label>
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-black px-2 py-1 rounded text-xs"
            >
              <option value="alle">Alle</option>
              <option value="1">P1 - Zeer Hoog</option>
              <option value="2">P2 - Hoog</option>
              <option value="3">P3 - Normaal</option>
              <option value="4">P4 - Laag</option>
            </select>
          </div>
          
          {/* Basisteam Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={showBasisteams}
                onChange={(e) => setShowBasisteams(e.target.checked)}
                className="mr-1"
              />
              Toon basisteams
            </label>
          </div>

          {/* GMS Incidents Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={showGmsIncidents}
                onChange={(e) => setShowGmsIncidents(e.target.checked)}
                className="mr-1"
              />
              Toon GMS meldingen
            </label>
          </div>
          
          {/* Stats */}
          <div className="text-sm ml-auto">
            Meldingen: {filteredMeldingen.length} | GMS: {filteredGmsIncidents.length} | Eenheden: {filteredEenheden.length}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1" style={{ minHeight: '400px' }}>
        {typeof window !== 'undefined' && mapLoaded && MapContainer ? (
          <MapContainer
            center={[51.9225, 4.4792]} // Rotterdam center
            zoom={12}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
              console.log('✅ Map instance created successfully');
            }}
          >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Basisteam polygonen */}
          {showBasisteams && basisteams
            .filter(team => team.actief && team.instellingen.zichtbaar_op_kaart)
            .map((team) => (
            <Polygon
              key={team.id}
              positions={team.polygon}
              color="#2563eb"
              fillColor="#dbeafe"
              fillOpacity={0.2}
              weight={2}
              dashArray="5, 5"
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm">{team.naam}</h3>
                  <p className="text-xs text-gray-600">{team.adres}</p>
                  <p className="text-xs">Gemeentes: {team.gemeentes.join(', ')}</p>
                  <p className="text-xs">Max eenheden: {team.instellingen.max_aantal_eenheden}</p>
                  <p className="text-xs">
                    Inzet buiten gebied: {team.instellingen.kan_inzetten_buiten_gebied ? 'Ja' : 'Nee'}
                  </p>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Connection lines between units and incidents */}
          {getConnectionLines()}
          
          {/* Incident markers */}
          {filteredMeldingen.map((melding) => (
            <Marker
              key={melding.id}
              position={melding.coordinaten}
              icon={getIncidentIcon(melding.classificatie)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{melding.id}</h3>
                  <p className="text-xs mb-1"><strong>Type:</strong> {melding.classificatie}</p>
                  <p className="text-xs mb-1"><strong>Adres:</strong> {melding.adres}</p>
                  <p className="text-xs mb-1">
                    <strong>Urgentie:</strong> 
                    <span style={{ color: getUrgentieColor(melding.urgentie) }}> {melding.urgentie}</span>
                  </p>
                  <p className="text-xs mb-1"><strong>Tijd:</strong> {new Date(melding.tijdstip).toLocaleTimeString('nl-NL')}</p>
                  {melding.details && (
                    <p className="text-xs mb-1"><strong>Details:</strong> {melding.details}</p>
                  )}
                  <p className="text-xs"><strong>Eenheden:</strong> {melding.eenheden.join(', ')}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Unit markers */}
          {filteredEenheden.map((eenheid) => (
            <Marker
              key={eenheid.id}
              position={eenheid.locatie}
              icon={getUnitIcon(eenheid.type)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{eenheid.id}</h3>
                  <p className="text-xs mb-1"><strong>Naam:</strong> {eenheid.naam}</p>
                  <p className="text-xs mb-1"><strong>Type:</strong> {eenheid.type}</p>
                  <p className="text-xs mb-1">
                    <strong>Status:</strong> 
                    <span className={`ml-1 ${
                      eenheid.status === 'Beschikbaar' ? 'text-green-600' :
                      eenheid.status === 'Onderweg' ? 'text-yellow-600' :
                      eenheid.status === 'Bezig' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {eenheid.status}
                    </span>
                  </p>
                  {eenheid.basisteam_id && (
                    <p className="text-xs mb-1">
                      <strong>Basisteam:</strong> {basisteamRegistry.getTeamById(eenheid.basisteam_id)?.naam || eenheid.basisteam_id}
                    </p>
                  )}
                  {eenheid.bestemming && (
                    <p className="text-xs"><strong>Bestemming:</strong> {eenheid.bestemming}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* GMS Incident markers */}
          {showGmsIncidents && filteredGmsIncidents.map((incident) => {
            // Create coordinates from address if available
            const getIncidentCoordinates = async (): Promise<[number, number]> => {
              if (incident.locatie) {
                const coords = await geocodeAddress(incident.locatie, incident.plaatsnaam || incident.plaats);
                return coords || [51.9225, 4.4792]; // Fallback to Rotterdam center
              }
              return [51.9225, 4.4792];
            };

            // For now, use a simple offset based on incident ID for positioning
            const baseCoords: [number, number] = [
              51.9225 + (incident.id % 10) * 0.01 - 0.05,
              4.4792 + ((incident.id * 7) % 10) * 0.01 - 0.05
            ];

            return (
              <GmsIncidentMarker
                key={`gms-${incident.id}`}
                incident={incident}
                coordinates={baseCoords}
              />
            );
          })}
          </MapContainer>
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="text-xl mb-2">🗺️</div>
              <div className="text-sm text-gray-600">Kaart wordt geladen...</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="bg-gray-100 p-2 border-t">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">🔥</div>
            <span>Brand</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">👮</div>
            <span>Politie</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">🏥</div>
            <span>Medisch</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">🚗</div>
            <span>Verkeer</span>
          </div>
          <div className="border-l pl-4 ml-4">
            <span className="font-semibold">Eenheden: </span>
            <span className="text-blue-600">P</span>=Politie, 
            <span className="text-red-600"> B</span>=Brandweer, 
            <span className="text-green-600"> A</span>=Ambulance
          </div>
          {showGmsIncidents && (
            <div className="border-l pl-4 ml-4">
              <span className="font-semibold">GMS Prioriteiten: </span>
              <span className="inline-flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                <span className="mr-2">P1</span>
                <div className="w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                <span className="mr-2">P2</span>
                <div className="w-3 h-3 bg-sky-400 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                <span className="mr-2">P3</span>
                <div className="w-3 h-3 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                <span>P4</span>
              </span>
            </div>
          )}
          {showBasisteams && (
            <div className="border-l pl-4 ml-4">
              <span className="font-semibold">Basisteams: </span>
              <span className="text-blue-600">━━━</span> Teamgrenzen
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaartPage;
