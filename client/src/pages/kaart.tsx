
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in React Leaflet
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (error) {
  console.warn('Leaflet icon setup failed:', error);
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
  const mapRef = useRef<L.Map | null>(null);

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

    const sampleEenheden: Eenheid[] = [
      {
        id: 'POL-101',
        type: 'Politie',
        status: 'Onderweg',
        locatie: [51.9200, 4.4780],
        bestemming: 'P-20250101-001',
        naam: 'Alpha-01'
      },
      {
        id: 'POL-102',
        type: 'Politie',
        status: 'Bezig',
        locatie: [51.9225, 4.4792],
        bestemming: 'P-20250101-001',
        naam: 'Alpha-02'
      },
      {
        id: 'BRW-201',
        type: 'Brandweer',
        status: 'Onderweg',
        locatie: [51.9230, 4.4785],
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
      },
      {
        id: 'AMB-302',
        type: 'Ambulance',
        status: 'Bezig',
        locatie: [51.9094, 4.4829],
        bestemming: 'A-20250101-003',
        naam: '17-102'
      },
      {
        id: 'POL-103',
        type: 'Politie',
        status: 'Beschikbaar',
        locatie: [51.9100, 4.4820],
        naam: 'Bravo-01'
      }
    ];

    setMeldingen(sampleMeldingen);
      setEenheden(sampleEenheden);
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

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-xl">🗺️ Kaart wordt geladen...</div>
        <div className="text-sm text-gray-600 mt-2">Even geduld, de kaartcomponenten worden geïnitialiseerd</div>
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
          
          {/* Stats */}
          <div className="text-sm ml-auto">
            Meldingen: {filteredMeldingen.length} | Eenheden: {filteredEenheden.length}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={[52.1326, 5.2913]} // Center of Netherlands
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
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
                  {eenheid.bestemming && (
                    <p className="text-xs"><strong>Bestemming:</strong> {eenheid.bestemming}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          </MapContainer>
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
        </div>
      </div>
    </div>
  );
};

export default KaartPage;
