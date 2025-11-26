import { IncidentType, LatLng } from '@meldkamerspel/shared';
import { log } from '../log';

export interface IncidentGenConfig {
  enabled: boolean;
  intervalMs: number;
  maxIncidents: number;
  locationBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

const defaultConfig: IncidentGenConfig = {
  enabled: false, // Disabled by default
  intervalMs: 60000, // 1 minute
  maxIncidents: 10,
  locationBounds: {
    north: 52.5,
    south: 52.0,
    east: 5.0,
    west: 4.5,
  },
};

/**
 * Generate random incidents for testing
 * Currently a stub - will create actual incidents in database
 */
export async function generateIncident(config: IncidentGenConfig = defaultConfig): Promise<void> {
  if (!config.enabled) {
    log.debug('Incident generation disabled');
    return;
  }

  try {
    // Generate random incident data
    const incidentTypes = Object.values(IncidentType);
    const randomType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    
    const location: LatLng = {
      lat: config.locationBounds.south + 
           Math.random() * (config.locationBounds.north - config.locationBounds.south),
      lng: config.locationBounds.west + 
           Math.random() * (config.locationBounds.east - config.locationBounds.west),
    };

    const priority = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
    const dwellSeconds = Math.floor(Math.random() * 3600) + 300; // 5min to 1hr
    const reward = Math.floor(Math.random() * 1000) + 100;

    log.info('Generated incident stub', {
      type: randomType,
      location,
      priority,
      dwellSeconds,
      reward,
    });

    // TODO: Save to database
    // await supabase.from('incidents').insert({...});

  } catch (error) {
    log.error('Failed to generate incident', error);
  }
}
