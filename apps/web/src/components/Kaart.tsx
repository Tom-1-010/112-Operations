'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Kaart() {
  const [isClient, setIsClient] = useState(false);
  const [bureaus, setBureaus] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    console.log('🗺️ Kaart: Component mounted and ready');
  }, []);

  // Load GMS2 incidents for unit movement
  const [gmsIncidents, setGmsIncidents] = useState<any[]>([]);

  // Load GMS2 incidents and listen for updates
  useEffect(() => {
    const loadGmsIncidents = () => {
      try {
        const stored = localStorage.getItem("gms2Incidents");
        if (stored) {
          const parsed = JSON.parse(stored);
          setGmsIncidents(parsed);
          console.log('🗺️ Kaart: GMS2 incidents loaded:', parsed.length);
          console.log('🗺️ Kaart: GMS2 incidents details:', parsed.map(i => ({ nr: i.nr, assignedUnits: i.assignedUnits?.length || 0 })));
        }
      } catch (error) {
        console.error('Error loading GMS2 incidents:', error);
      }
    };

    // Load initially
    loadGmsIncidents();

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gms2Incidents') {
        console.log('🗺️ Kaart: Storage event detected, reloading GMS2 incidents');
        loadGmsIncidents();
      }
    };
    
    // Listen for custom events (same-tab communication)
    const handleCustomUpdate = () => {
      console.log('🗺️ Kaart: Custom update event received');
      loadGmsIncidents();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gms2IncidentsUpdated', handleCustomUpdate);

    // Polling as backup (every 3 seconds)
    const interval = setInterval(loadGmsIncidents, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gms2IncidentsUpdated', handleCustomUpdate);
      clearInterval(interval);
    };
  }, []);

  // Load bureaus and units
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load from JSON file
        const response = await fetch('/data/basisteams-politie.json');
        if (response.ok) {
          const data = await response.json();
          setBureaus(data.bureaus || []);
          setUnits(data.units || []);
          console.log('🗺️ Kaart: Data loaded:', data.bureaus?.length || 0, 'bureaus,', data.units?.length || 0, 'units');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    const loadRoosterUnits = async () => {
      try {
        const response = await fetch('/attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json');
        if (response.ok) {
          const roosterData = await response.json();
          const roosterUnits: any[] = [];
          
          Object.entries(roosterData).forEach(([teamName, teamUnits]: [string, any]) => {
            // Only load A1 Waterweg units
            if (teamName === 'Basisteam Waterweg (A1)' && Array.isArray(teamUnits)) {
              teamUnits.forEach((unit: any) => {
                let status = '5 - Afmelden';
                if (unit.primair === true || unit.primair === 'true' || unit.primair === 1) {
                  status = '1 - Beschikbaar/vrij';
                }

                roosterUnits.push({
                  id: `bt-${unit.roepnummer}`,
                  roepnummer: unit.roepnummer,
                  aantal_mensen: unit.aantal_mensen,
                  rollen: Array.isArray(unit.rollen) ? unit.rollen : [unit.rollen],
                  soort_auto: unit.soort_auto,
                  team: teamName,
                  status: status,
                  locatie: 'Basisteam Waterweg, Delftseveerweg 40, Vlaardingen',
                  incident: '',
                  coordinates: [4.34367832, 51.91387332], // Bureau coordinates [lng, lat]
                  type: unit.soort_auto || 'BPV-auto'
                });
              });
            }
          });

          setUnits(prev => [...prev, ...roosterUnits]);
          console.log('🗺️ Kaart: Rooster units loaded:', roosterUnits.length);
          console.log('🗺️ Kaart: Rooster units details:', roosterUnits.map(u => ({ roepnummer: u.roepnummer, status: u.status })));
        }
      } catch (error) {
        console.error('Failed to load rooster units:', error);
      }
    };

    loadData();
    loadRoosterUnits();
  }, []);

  // Auto-send units to incidents when they get assigned
  useEffect(() => {
    const checkForNewAssignments = async () => {
      const activeUnits = units.filter(unit => {
        const status = unit.status;
        return status !== '5 - Afmelden' && 
               status !== '5 - afmelden' && 
               !status.toLowerCase().includes('afmelden');
      });

      console.log('🚗 Kaart: Checking assignments - GMS incidents:', gmsIncidents.length, 'Active units:', activeUnits.length);
      console.log('🚗 Kaart: Available units:', activeUnits.map(u => u.roepnummer));
      
      if (gmsIncidents.length === 0 || activeUnits.length === 0) return;

      try {
        // Check each incident for assigned units
        for (const incident of gmsIncidents) {
          console.log('🚗 Kaart: Checking incident:', incident.nr, 'assigned units:', incident.assignedUnits?.length || 0);
          if (incident.assignedUnits && incident.assignedUnits.length > 0 && incident.coordinates) {
            for (const assignedUnit of incident.assignedUnits) {
              console.log('🚗 Kaart: Looking for unit:', assignedUnit.roepnummer, 'in', activeUnits.length, 'units');
              // Find the unit in our units array
              const unit = activeUnits.find(u => u.roepnummer === assignedUnit.roepnummer);
              console.log('🚗 Kaart: Unit found:', unit ? 'YES' : 'NO', unit);
              if (unit && unit.coordinates && unit.coordinates.length === 2) {
                // Check if unit is not already at the incident location
                const distance = Math.sqrt(
                  Math.pow(unit.coordinates[0] - incident.coordinates[0], 2) + 
                  Math.pow(unit.coordinates[1] - incident.coordinates[1], 2)
                );
                
                console.log('🚗 Kaart: Distance between unit and incident:', distance);
                
                // If unit is more than 100 meters away, start movement
                if (distance > 0.001) { // ~100 meters in degrees
                  console.log(`🚗 Kaart: Auto-sending unit ${unit.roepnummer} to incident ${incident.nr}`);
                  
                  // For now, just log the movement - we can add actual routing later
                  console.log(`✅ Kaart: Unit ${unit.roepnummer} would move from [${unit.coordinates[0]}, ${unit.coordinates[1]}] to [${incident.coordinates[0]}, ${incident.coordinates[1]}]`);
                } else {
                  console.log(`🚗 Kaart: Unit ${unit.roepnummer} is already at incident ${incident.nr} location`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new assignments:', error);
      }
    };

    // Check for assignments when incidents or units change
    if (gmsIncidents.length > 0 && units.length > 0) {
      checkForNewAssignments();
    }
  }, [gmsIncidents, units]);

  // Center on Vlaardingen (Basisteam Waterweg location)
  const center: [number, number] = [51.91387332, 4.34367832];
  const zoom = 13;

  // Filter to only show active units (exclude status 5 - afmelden)
  const activeUnits = units.filter(unit => {
    const status = unit.status;
    return status !== '5 - Afmelden' && 
           status !== '5 - afmelden' && 
           !status.toLowerCase().includes('afmelden');
  });

  if (!isClient) {
    return (
      <div className="dispatch-panel h-full flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="animate-pulse">Kaart wordt geladen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dispatch-panel h-full overflow-hidden">
      <div className="h-full w-full">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Bureau markers */}
          {bureaus.map((bureau, index) => {
            if (bureau.coördinaten && bureau.coördinaten.latitude && bureau.coördinaten.longitude) {
              return (
                <Marker key={`bureau-${index}`} position={[bureau.coördinaten.latitude, bureau.coördinaten.longitude]}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{bureau.organisatie}</div>
                      <div className="text-gray-600">{bureau.locatie.bezoekadres.straat} {bureau.locatie.bezoekadres.nummer}</div>
                      <div className="text-gray-600">{bureau.locatie.bezoekadres.postcode} {bureau.locatie.bezoekadres.plaats}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
          
          {/* Unit markers */}
          {activeUnits.map((unit, index) => {
            if (unit.coordinates && unit.coordinates.length === 2) {
              return (
                <Marker key={`unit-${index}`} position={[unit.coordinates[1], unit.coordinates[0]]}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">Eenheid {unit.roepnummer}</div>
                      <div className="text-gray-600">Type: {unit.type}</div>
                      <div className="text-gray-600">Status: {unit.status}</div>
                      <div className="text-gray-600">Team: {unit.team}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
        </MapContainer>
      </div>
    </div>
  );
}
