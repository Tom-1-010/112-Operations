/**
 * GMS2 module - Functies voor het ophalen van actieve incident coördinaten
 */

export interface IncidentCoordinaten {
  lat: number;
  lng: number;
}

/**
 * Haalt de coördinaten op van het actieve incident uit localStorage
 * @returns De coördinaten van het actieve incident, of null als er geen actief incident is
 */
export function getActiveIncidentCoordinates(): IncidentCoordinaten | null {
  try {
    const storedIncidents = localStorage.getItem('gms2Incidents');
    if (!storedIncidents) {
      return null;
    }

    const incidents: any[] = JSON.parse(storedIncidents);
    
    // Zoek het eerste incident met coördinaten en status 'actief' of het meest recente
    const actiefIncident = incidents.find(
      (inc) => inc.coordinates && 
               Array.isArray(inc.coordinates) && 
               inc.coordinates.length === 2 &&
               (inc.status === 'actief' || inc.status === 'active' || !inc.status)
    );

    if (!actiefIncident) {
      // Als er geen actief incident is, neem het meest recente incident met coördinaten
      const incidentMetCoordinaten = incidents
        .filter((inc) => inc.coordinates && Array.isArray(inc.coordinates) && inc.coordinates.length === 2)
        .sort((a, b) => {
          // Sorteer op tijd (meest recent eerst)
          const tijdA = new Date(a.tijd || a.tijdstip || 0).getTime();
          const tijdB = new Date(b.tijd || b.tijdstip || 0).getTime();
          return tijdB - tijdA;
        })[0];

      if (!incidentMetCoordinaten) {
        return null;
      }

      // GeoJSON format: [longitude, latitude]
      const [lng, lat] = incidentMetCoordinaten.coordinates;
      return { lat, lng };
    }

    // GeoJSON format: [longitude, latitude]
    const [lng, lat] = actiefIncident.coordinates;
    return { lat, lng };
  } catch (error) {
    console.error('Fout bij ophalen actieve incident coördinaten:', error);
    return null;
  }
}

/**
 * Haalt alle incidenten op met coördinaten
 * @returns Array van incidenten met coördinaten
 */
export function getAllIncidentsWithCoordinates(): Array<{
  id: number;
  coordinates: [number, number];
  [key: string]: any;
}> {
  try {
    const storedIncidents = localStorage.getItem('gms2Incidents');
    if (!storedIncidents) {
      return [];
    }

    const incidents: any[] = JSON.parse(storedIncidents);
    
    return incidents.filter(
      (inc) => inc.coordinates && 
               Array.isArray(inc.coordinates) && 
               inc.coordinates.length === 2
    );
  } catch (error) {
    console.error('Fout bij ophalen incidenten:', error);
    return [];
  }
}












