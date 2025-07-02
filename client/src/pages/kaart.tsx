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

// Create police unit markers with different colors based on status
const createUnitIcon = (unit: PoliceUnit) => {
  const getColorForStatus = (status: string) => {
    // Extract status number from status string
    const statusMatch = status.match(/^(\d+)/);
    const statusNum = statusMatch ? parseInt(statusMatch[1]) : null;

    // Check for noodoproep
    if (status.toLowerCase().includes('n') || status.toLowerCase().includes('nood')) {
      return '#dc143c'; // Crimson red for emergency
    }

    switch (statusNum) {
      case 1: return '#00ff00'; // Available - Green
      case 2: return '#ffff00'; // On patrol - Yellow  
      case 3: return '#ff6600'; // Responding - Orange
      case 4: return '#ff0000'; // At scene - Red
      case 6: return '#9900ff'; // En route back - Purple
      case 7: return '#00ffff'; // Available at station - Cyan
      case 8: return '#ff00ff'; // Out of service - Magenta
      case 9: return '#888888'; // Off duty - Gray
      default: return '#000000'; // Unknown - Black
    }
  };

  // Animation for moving units
  const animation = unit.isMoving ? 'animation: pulse 1.5s infinite;' : '';

  const color = getColorForStatus(unit.status);
  const roepnummer = unit.roepnummer.replace('RT ', '');

  return L.divIcon({
    className: 'unit-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 30px; 
        height: 30px; 
        border-radius: 4px; 
        border: 2px solid #000; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 10px; 
        color: black; 
        font-weight: bold;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ${animation}
      ">${roepnummer}</div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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

interface PoliceUnit {
  id: number;
  roepnummer: string;
  aantal_mensen: number;
  rollen: string[];
  soort_auto: string;
  team: string;
  basisteam_id: string;
  status: string;
  locatie: string | null;
  incident: string | null;
  currentPosition: [number, number];
  targetPosition?: [number, number];
  movementSpeed: number; // km/h
  lastUpdateTime: number;
  isMoving: boolean;
}

interface MovementPattern {
  type: 'idle' | 'responding' | 'patrol';
  target?: [number, number];
  waypoints?: [number, number][];
  speed: number;
}

const KaartPage: React.FC = () => {
  const [incidents, setIncidents] = useState<ProcessedIncident[]>([]);
  const [basisteams, setBasisteams] = useState<Basisteam[]>([]);
  const [policeUnits, setPoliceUnits] = useState<PoliceUnit[]>([]);
  const [showBasisteams, setShowBasisteams] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('alle');
  const [priorityFilter, setPriorityFilter] = useState('alle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<number>>(new Set());
  const mapRef = useRef<L.Map | null>(null);
  const lastFetchTime = useRef<Date>(new Date());
  const movementIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
    const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Generate random position within a municipality boundary
  const generateRandomPositionInMunicipality = (basisteam: Basisteam): [number, number] => {
    const polygon = basisteam.polygon as [number, number][];
    if (!polygon || polygon.length === 0) {
      return [51.9225, 4.4792]; // Default Rotterdam center
    }

    // Find bounding box
    const lats = polygon.map(p => p[0]);
    const lngs = polygon.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Generate random point within bounding box
    const randomLat = minLat + Math.random() * (maxLat - minLat);
    const randomLng = minLng + Math.random() * (maxLng - minLng);

    return [randomLat, randomLng];
  };

  // Get movement speed based on unit status and type
  const getMovementSpeed = (unit: PoliceUnit, isEmergency: boolean = false): number => {
    const statusNum = parseInt(unit.status.split(' ')[0]);

    // Base speeds (km/h)
    const baseSpeed = unit.soort_auto.includes('Motor') ? 60 : 50;

    if (isEmergency || statusNum === 3 || statusNum === 4) {
      return baseSpeed * 1.5; // Emergency response speed
    } else if (statusNum === 2) {
      return baseSpeed * 1.2; // Patrol speed
    } else {
      return baseSpeed * 0.8; // Normal movement
    }
  };

  // Generate initial position for a unit based on its basisteam
  const generateInitialUnitPosition = (unit: PoliceUnit): [number, number] => {
    const basisteam = basisteams.find(bt => bt.id === unit.basisteam_id);
    if (basisteam) {
      return generateRandomPositionInMunicipality(basisteam);
    }
    return [51.9225, 4.4792]; // Default Rotterdam center
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

  // Simulate realistic status distribution for active units
  const assignRealisticStatus = (unit: any, index: number): string => {
    // If unit has status 5 (afmelden), keep it as is
    if (unit.status.includes('5 - Afmelden')) {
      return unit.status;
    }
    
    // For active units (status 1), distribute realistic statuses
    const random = (index * 7 + unit.id * 13) % 100; // Deterministic but varied
    
    if (random < 60) return '1 - Beschikbaar/vrij';        // 60% available
    if (random < 75) return '2 - Surveilleren';            // 15% patrolling  
    if (random < 85) return '3 - Onderweg naar incident';  // 10% responding
    if (random < 90) return '4 - Ter plaatse';             // 5% at scene
    if (random < 94) return '6 - Terug naar post';         // 4% returning
    if (random < 97) return '7 - Beschikbaar op post';     // 3% at station
    if (random < 99) return '8 - Uitruk';                  // 2% emergency response
    return '9 - Dienst uit';                               // 1% off duty
  };

  // Load police units from database
  const loadPoliceUnits = useCallback(async () => {
    try {
      console.log('🚔 Loading police units for map...');

      const response = await fetch('/api/police-units');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawUnits = await response.json();
      console.log('✅ Fetched police units for map:', rawUnits.length);

      // Convert raw units to map-ready format with movement tracking
      const processedUnits: PoliceUnit[] = rawUnits.map((unit: any, index: number) => {
        const currentPosition = unit.locatie 
          ? JSON.parse(unit.locatie) 
          : generateInitialUnitPosition(unit);
        
        // Assign realistic status for simulation
        const realisticStatus = assignRealisticStatus(unit, index);

        return {
          ...unit,
          status: realisticStatus, // Override with realistic status
          currentPosition,
          movementSpeed: getMovementSpeed(unit),
          lastUpdateTime: Date.now(),
          isMoving: false
        };
      });

      setPoliceUnits(processedUnits);

    } catch (error) {
      console.error('❌ Error loading police units:', error);
    }
  }, [basisteams]);

  // Update unit positions based on movement simulation
  const updateUnitPositions = useCallback(() => {
    setPoliceUnits(prevUnits => {
      return prevUnits.map(unit => {
        const now = Date.now();
        const deltaTime = (now - unit.lastUpdateTime) / 1000; // seconds

        // Only move units with active statuses
        const statusNum = parseInt(unit.status.split(' ')[0]);
        const shouldMove = [1, 2, 3, 4, 6, 7, 8, 9].includes(statusNum) || unit.status.includes('N');

        if (!shouldMove) {
          return { ...unit, lastUpdateTime: now };
        }

        let newPosition = [...unit.currentPosition] as [number, number];
        let isMoving = false;

        // Determine movement target based on incident assignment
        const assignedIncident = incidents.find(inc => 
          inc.units.includes(unit.roepnummer)
        );

        if (assignedIncident && statusNum === 3) {
          // Unit is responding to incident - move toward incident location
          const target = assignedIncident.coordinates;
          const distance = calculateDistance(unit.currentPosition, target);

          if (distance > 0.1) { // Still more than 100m away
            const speed = getMovementSpeed(unit, true); // Emergency response
            const distancePerSecond = (speed * 1000) / 3600; // m/s
            const moveDistance = distancePerSecond * deltaTime / 1000; // km

            // Calculate direction
            const bearing = Math.atan2(
              target[1] - unit.currentPosition[1],
              target[0] - unit.currentPosition[0]
            );

            // Move toward target
            const latMove = Math.cos(bearing) * moveDistance / 111; // Rough km to degrees
            const lonMove = Math.sin(bearing) * moveDistance / (111 * Math.cos(unit.currentPosition[0] * Math.PI / 180));

            newPosition = [
              unit.currentPosition[0] + latMove,
              unit.currentPosition[1] + lonMove
            ];
            isMoving = true;
          }
        } else if (statusNum === 1 || statusNum === 2) {
          // Unit is available or on patrol - random movement within municipality
          const basisteam = basisteams.find(bt => bt.id === unit.basisteam_id);
          if (basisteam && Math.random() < 0.3) { // 30% chance to move each update
            const speed = getMovementSpeed(unit);
            const distancePerSecond = (speed * 1000) / 3600;
            const moveDistance = distancePerSecond * deltaTime / 1000;

            // Random direction
            const bearing = Math.random() * 2 * Math.PI;
            const latMove = Math.cos(bearing) * moveDistance / 111;
            const lonMove = Math.sin(bearing) * moveDistance / (111 * Math.cos(unit.currentPosition[0] * Math.PI / 180));

            newPosition = [
              unit.currentPosition[0] + latMove,
              unit.currentPosition[1] + lonMove
            ];

            // Keep within reasonable bounds
            newPosition[0] = Math.max(51.8, Math.min(52.1, newPosition[0]));
            newPosition[1] = Math.max(4.2, Math.min(4.7, newPosition[1]));

            isMoving = true;
          }
        }

        return {
          ...unit,
          currentPosition: newPosition,
          lastUpdateTime: now,
          isMoving
        };
      });
    });
  }, [incidents, basisteams]);

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

  // Load police units when basisteams are loaded
  useEffect(() => {
    if (basisteams.length > 0) {
      loadPoliceUnits();
    }
  }, [basisteams, loadPoliceUnits]);

  // Start movement simulation
  useEffect(() => {
    if (policeUnits.length > 0) {
      // Update unit positions every 2 seconds
      movementIntervalRef.current = setInterval(updateUnitPositions, 2000);

      return () => {
        if (movementIntervalRef.current) {
          clearInterval(movementIntervalRef.current);
        }
      };
    }
  }, [policeUnits.length, updateUnitPositions]);

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

          {/* Police Unit Markers */}
          {showUnits && policeUnits.map((unit) => {
            // Extract status number from status string (e.g., "1 - Beschikbaar" -> 1, "5 - Afmelden" -> 5)
            const statusMatch = unit.status.match(/^(\d+)/);
            const statusNum = statusMatch ? parseInt(statusMatch[1]) : null;
            
            // Check for noodoproep (N)
            const isNoodoproep = unit.status.toLowerCase().includes('n') || unit.status.toLowerCase().includes('nood');
            
            // Debug only first few units to avoid log spam
            if (unit.id <= 5) {
              console.log(`🔍 Unit ${unit.roepnummer}: Status="${unit.status}", StatusNum=${statusNum}, IsNoodoproep=${isNoodoproep}`);
            }
            
            // Only show units with allowed statuses: 1,2,3,4,6,7,8,9 or N (noodoproep)
            // Explicitly exclude status 5 (afmelden)
            const allowedStatuses = [1, 2, 3, 4, 6, 7, 8, 9];
            
            // Hide status 5 (afmelden) units completely
            if (statusNum === 5) {
              return null;
            }
            
            const shouldShow = isNoodoproep || (statusNum !== null && allowedStatuses.includes(statusNum));

            if (!shouldShow) {
              return null;
            }

            return (
              <Marker
                key={`unit-${unit.id}`}
                position={unit.currentPosition}
                icon={createUnitIcon(unit)}
              >
                <Popup>
                  <div className="p-3 min-w-[200px]">
                    <h3 className="font-bold text-base mb-2 text-gray-800">
                      {unit.roepnummer}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Status:</strong> {unit.status}</p>
                      <p><strong>Team:</strong> {unit.team}</p>
                      <p><strong>Voertuig:</strong> {unit.soort_auto}</p>
                      <p><strong>Bezetting:</strong> {unit.aantal_mensen} personen</p>
                      <p><strong>Snelheid:</strong> {unit.movementSpeed} km/h</p>
                      {unit.incident && (
                        <p><strong>Incident:</strong> {unit.incident}</p>
                      )}
                      {unit.isMoving && (
                        <div className="mt-2 p-1 bg-orange-100 rounded text-xs">
                          🚗 In beweging
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Basisteam Polygons */}
          {showBasisteams && basisteams.map((basisteam) => {
            // If team has multiple polygons per gemeente, show them separately
            if (basisteam.polygons && Object.keys(basisteam.polygons).length > 0) {
              return Object.entries(basisteam.polygons).map(([gemeente, polygonCoords]) => (
                polygonCoords && polygonCoords.length > 0 && (
                  <Polygon
                    key={`basisteam-${basisteam.id}-${gemeente}`}
                    positions={polygonCoords}
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
                        <p className="text-xs mb-1"><strong>Gemeente:</strong> {gemeente}</p>
                        <p className="text-xs mb-1"><strong>ID:</strong> {basisteam.id}</p>
                        <p className="text-xs mb-1"><strong>Status:</strong> {basisteam.actief ? 'Actief' : 'Inactief'}</p>
                      </div>
                    </Popup>
                  </Polygon>
                )
              ));
            } else {
              // Fallback to single polygon
              return basisteam.polygon && basisteam.polygon.length > 0 && (
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
              );
            }
          }).flat()}
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

          <div className="space-y-2">
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showUnits"
                checked={showUnits}
                onChange={(e) => setShowUnits(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="showUnits" className="text-xs">Toon Politie-eenheden ({policeUnits.filter(unit => {
                const statusMatch = unit.status.match(/^(\d+)/);
                const statusNum = statusMatch ? parseInt(statusMatch[1]) : null;
                const isNoodoproep = unit.status.toLowerCase().includes('n') || unit.status.toLowerCase().includes('nood');
                const allowedStatuses = [1, 2, 3, 4, 6, 7, 8, 9];
                // Exclude status 5 explicitly
                if (statusNum === 5) return false;
                return isNoodoproep || (statusNum !== null && allowedStatuses.includes(statusNum));
              }).length})</label>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Live Statistieken:</strong></p>
            <p>Incidents: {incidents.length} ({filteredIncidents.length} zichtbaar)</p>
            <p>Eenheden: {policeUnits.filter(unit => {
              const statusMatch = unit.status.match(/^(\d+)/);
              const statusNum = statusMatch ? parseInt(statusMatch[1]) : null;
              const isNoodoproep = unit.status.toLowerCase().includes('n') || unit.status.toLowerCase().includes('nood');
              const allowedStatuses = [1, 2, 3, 4, 6, 7, 8, 9];
              // Exclude status 5 explicitly
              if (statusNum === 5) return false;
              return isNoodoproep || (statusNum !== null && allowedStatuses.includes(statusNum));
            }).length}</p>
            <p>In beweging: {policeUnits.filter(u => {
              const statusMatch = u.status.match(/^(\d+)/);
              const statusNum = statusMatch ? parseInt(statusMatch[1]) : null;
              const isNoodoproep = u.status.toLowerCase().includes('n') || u.status.toLowerCase().includes('nood');
              const allowedStatuses = [1, 2, 3, 4, 6, 7, 8, 9];
              // Exclude status 5 explicitly
              if (statusNum === 5) return false;
              const shouldShow = isNoodoproep || (statusNum !== null && allowedStatuses.includes(statusNum));
              return shouldShow && u.isMoving;
            }).length}</p>
            <p>Laatste Update: {lastFetchTime.current.toLocaleTimeString('nl-NL')}</p>
            {newIncidentIds.size > 0 && (
              <p className="text-red-600 font-bold">🚨 {Array.from(newIncidentIds).length} nieuwe melding(en)</p>
            )}
          </div>
        </div>
      </div>

      {/* Unit Status Legend - Only show when units are visible */}
      {showUnits && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000] max-w-xs">
          <h4 className="font-bold text-xs mb-2">Eenheid Status Legenda</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm border border-black"></div>
              <span>1-Beschikbaar</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm border border-black"></div>
              <span>2-Surveilleren</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-600 rounded-sm border border-black"></div>
              <span>3-Onderweg</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-sm border border-black"></div>
              <span>4-Ter plaatse</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-600 rounded-sm border border-black"></div>
              <span>6-Terug</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-cyan-500 rounded-sm border border-black"></div>
              <span>7-Post</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-pink-500 rounded-sm border border-black"></div>
              <span>8-Uitruk</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-500 rounded-sm border border-black"></div>
              <span>9-Dienst uit</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Bewegende eenheden: pulserende animatie
          </div>
        </div>
      )}

      {/* Incident Legend - Only show when units are hidden */}
      {!showUnits && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
          <h4 className="font-bold text-xs mb-2">Incident Legenda</h4>
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
      )}

      {/* Auto-refresh indicator */}
      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-[1000]">
        🔄 LIVE
      </div>
    </div>
  );
};

export default KaartPage;