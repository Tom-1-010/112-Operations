import { useEffect, useRef } from 'react';
import { rijdNaarMelding, rijdTerugNaarKazerne, rijdAlleTerugNaarKazerne } from '../lib/renderEenhedenOpKaart';
import L from 'leaflet';

/**
 * Normaliseer roepnummer voor consistente matching
 */
function normalizeRoepnummer(roepnummer: string | null | undefined): string {
  if (!roepnummer) return '';
  
  // Verwijder spaties en converteer naar lowercase
  let normalized = roepnummer.trim().toLowerCase();
  
  // Normaliseer verschillende formaten:
  // "17-0232" -> "17-0232"
  // "17 0232" -> "17-0232"
  // "170232" -> "17-0232" (als het 6 cijfers is)
  normalized = normalized.replace(/\s+/g, '-');
  
  // Als het 6 cijfers is zonder streepje, voeg streepje toe na 2 cijfers
  if (/^\d{6}$/.test(normalized)) {
    normalized = normalized.slice(0, 2) + '-' + normalized.slice(2);
  }
  
  return normalized;
}

/**
 * Interface voor een GMS2 incident
 */
interface GmsIncident {
  id: number;
  nr: number;
  coordinates?: [number, number] | null; // [longitude, latitude]
  assignedUnits?: Array<{ roepnummer: string; [key: string]: any }>;
  [key: string]: any;
}

/**
 * Hook die automatisch luistert naar GMS2 incidenten en voertuigen laat rijden
 * wanneer ze aan een melding worden gekoppeld
 */
export function useAutoRijdenNaarMelding(map: L.Map | null, enabled: boolean = true) {
  const verwerkteKoppelingen = useRef<Set<string>>(new Set());
  const markersLoaded = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !map) return;

    // Listen voor wanneer markers geladen zijn
    const handleMarkersLoaded = () => {
      markersLoaded.current = true;
      console.log('✅ Voertuig markers geladen, kan nu ritten starten');
    };

    window.addEventListener('voertuigMarkersLoaded', handleMarkersLoaded);

    const checkIncidenten = () => {
      // Wacht tot markers geladen zijn voordat we ritten starten
      if (!markersLoaded.current) {
        console.log('⏳ Wachten op markers...');
        return;
      }
      try {
        const storedIncidenten = localStorage.getItem('gms2Incidents');
        if (!storedIncidenten) return;

        const incidenten: GmsIncident[] = JSON.parse(storedIncidenten);

        incidenten.forEach((incident) => {
          // Check of incident coördinaten heeft
          if (!incident.coordinates || !Array.isArray(incident.coordinates) || incident.coordinates.length !== 2) {
            return;
          }

          const [lng, lat] = incident.coordinates; // GeoJSON: [lon, lat]

          // Check of er voertuigen zijn gekoppeld
          if (!incident.assignedUnits || incident.assignedUnits.length === 0) {
            return;
          }

          // Voor elk gekoppeld voertuig
          incident.assignedUnits.forEach((unit) => {
            const roepnummer = unit.roepnummer;
            if (!roepnummer) return;

            // Normaliseer roepnummer voor consistente matching
            const normalizedRoepnummer = normalizeRoepnummer(roepnummer);

            // Maak unieke key voor deze koppeling
            const koppelingKey = `${incident.id}-${normalizedRoepnummer}`;

            // Check of deze koppeling al is verwerkt
            if (verwerkteKoppelingen.current.has(koppelingKey)) {
              return;
            }

            // Markeer als verwerkt
            verwerkteKoppelingen.current.add(koppelingKey);

            // Start rit naar melding
            console.log(`🚗 Auto-start rit: ${normalizedRoepnummer} naar melding #${incident.nr} (origineel: ${roepnummer})`);
            
            rijdNaarMelding(
              normalizedRoepnummer,
              {
                lat,
                lon: lng,
                id: incident.id,
                nr: incident.nr,
              },
              map,
              {
                snelheid: 80, // km/u
                updateInterval: 100, // ms
                toonRoute: true,
              }
            ).catch((error) => {
              console.error(`❌ Fout bij auto-start rit voor ${normalizedRoepnummer} (origineel: ${roepnummer}):`, error);
              // Verwijder uit verwerkte koppelingen zodat het opnieuw kan worden geprobeerd
              const koppelingKey = `${incident.id}-${normalizedRoepnummer}`;
              verwerkteKoppelingen.current.delete(koppelingKey);
            });
          });
        });
      } catch (error) {
        console.error('Fout bij checken incidenten:', error);
      }
    };

    // Check direct
    checkIncidenten();

    // Listen voor storage changes (wanneer GMS2 updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gms2Incidents') {
        checkIncidenten();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll elke 2 seconden voor updates (fallback als storage event niet werkt)
    const interval = setInterval(checkIncidenten, 2000);

    // Listen voor gearchiveerde incidenten
    const handleIncidentArchived = (e: CustomEvent) => {
      const incident = e.detail as GmsIncident;
      if (incident && incident.assignedUnits && incident.assignedUnits.length > 0) {
        console.log(`📋 Melding #${incident.nr} gearchiveerd, ${incident.assignedUnits.length} voertuigen rijden terug naar kazerne`);
        
        // Rij alle gekoppelde voertuigen terug naar hun kazernes
        const roepnummers = incident.assignedUnits
          .map(unit => normalizeRoepnummer(unit.roepnummer))
          .filter(rn => rn);
        
        if (roepnummers.length > 0 && map) {
          rijdAlleTerugNaarKazerne(roepnummers, map, {
            snelheid: 80,
            updateInterval: 100,
            toonRoute: true,
          }).catch(error => {
            console.error('❌ Fout bij terugrijden voertuigen:', error);
          });
        }
      }
    };

    window.addEventListener('gms2IncidentArchived', handleIncidentArchived as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gms2IncidentArchived', handleIncidentArchived as EventListener);
      window.removeEventListener('voertuigMarkersLoaded', handleMarkersLoaded);
      clearInterval(interval);
    };
  }, [map, enabled]);
}

