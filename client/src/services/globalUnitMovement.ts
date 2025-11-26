/**
 * Globale service voor het beheren van eenhedenbeweging
 * Deze service werkt onafhankelijk van de map component en blijft actief
 * zolang de app draait, zodat eenheden blijven bewegen naar meldingen/kazernes
 */

import { normalizeRoepnummer } from '../lib/renderEenhedenOpKaart';
import { setStatus } from '../lib/brw-status';

/**
 * Interface voor een eenheid positie
 */
interface UnitPosition {
  roepnummer: string;
  lat: number;
  lng: number;
  status: 'beschikbaar' | 'onderweg' | 'ter_plaatse' | 'terug_naar_kazerne';
  statusCode?: 'ov' | 'ut' | 'tp' | 'ir' | 'bs' | 'kz'; // BRW statuscode
  activeIncidentId?: string | number | null; // Incident waaraan voertuig gekoppeld is
  targetLat?: number;
  targetLng?: number;
  targetType?: 'incident' | 'kazerne';
  targetId?: string | number;
  lastUpdate: number;
  previousLat?: number; // Voor detectie van beweging
  previousLng?: number; // Voor detectie van beweging
}

/**
 * Interface voor een GMS2 incident
 */
interface GmsIncident {
  id: number;
  nr: number;
  coordinates?: [number, number] | null; // [longitude, latitude]
  assignedUnits?: Array<{ roepnummer: string; [key: string]: any }>;
  status?: string;
  [key: string]: any;
}

/**
 * Interface voor een kazerne
 */
interface Kazerne {
  id: string;
  naam: string;
  latitude: string | number;
  longitude: string | number;
  [key: string]: any;
}

const STORAGE_KEY = 'global_unit_positions';
const MOVEMENT_SPEED_KMH = 80; // km/u
const UPDATE_INTERVAL_MS = 100; // Update elke 100ms
const MOVEMENT_CHECK_INTERVAL_MS = 2000; // Check elke 2 seconden voor nieuwe assignments

/**
 * Laad eenheden posities uit localStorage
 */
function loadUnitPositions(): Map<string, UnitPosition> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as Record<string, UnitPosition>;
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.error('Fout bij laden eenheden posities:', error);
  }
  return new Map();
}

/**
 * Sla eenheden posities op in localStorage
 */
export function saveUnitPositions(positions: Map<string, UnitPosition>): void {
  try {
    const data = Object.fromEntries(positions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Fout bij opslaan eenheden posities:', error);
  }
}

/**
 * Mapping van post namen naar kazerne namen
 */
const postToKazerneMapping: Record<string, string> = {
  'gb - botlekweg': 'Gezamenlijke Brandweer - Botlekweg',
  'gb-botlekweg': 'Gezamenlijke Brandweer - Botlekweg',
  'botlekweg': 'Gezamenlijke Brandweer - Botlekweg',
  'gb - merseyweg': 'Gezamenlijke Brandweer - Merseyweg',
  'gb-merseyweg': 'Gezamenlijke Brandweer - Merseyweg',
  'merseyweg': 'Gezamenlijke Brandweer - Merseyweg',
};

/**
 * Haal kazerne coördinaten op voor een eenheid op basis van BRW data
 */
async function getKazerneCoords(roepnummer: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Laad BRW eenheden uit localStorage
    const brwUnits = localStorage.getItem('brw_units');
    if (brwUnits) {
      try {
        const units: Array<{ 
          roepnummer: string; 
          kazerne?: string; 
          post?: string;
          locatie?: { lat: number | null; lng: number | null } 
        }> = JSON.parse(brwUnits);
        const unit = units.find(u => normalizeRoepnummer(u.roepnummer) === normalizeRoepnummer(roepnummer));
        
        // Als eenheid al een locatie heeft, gebruik die
        if (unit?.locatie?.lat && unit?.locatie?.lng) {
          return { lat: unit.locatie.lat, lng: unit.locatie.lng };
        }
        
        // Probeer kazerne te vinden via kazerne naam
        if (unit?.kazerne) {
          const kazerneCoords = await findKazerneByName(unit.kazerne);
          if (kazerneCoords) {
            return kazerneCoords;
          }
        }
        
        // Probeer kazerne te vinden via post naam
        if (unit?.post) {
          const postNormalized = unit.post.toLowerCase().trim();
          // Check directe mapping
          if (postToKazerneMapping[postNormalized]) {
            const kazerneCoords = await findKazerneByName(postToKazerneMapping[postNormalized]);
            if (kazerneCoords) {
              return kazerneCoords;
            }
          }
          // Probeer ook direct op post naam
          const kazerneCoords = await findKazerneByName(unit.post);
          if (kazerneCoords) {
            return kazerneCoords;
          }
        }
      } catch (e) {
        console.warn('Fout bij parsen BRW units:', e);
      }
    }
    
    // Fallback: probeer kazerne te vinden op basis van roepnummer prefix
    // Bijvoorbeeld 17-20xx -> kazerne-020 (Botlekweg)
    const roepnummerMatch = roepnummer.match(/^(\d+)-(\d{2})/);
    if (roepnummerMatch) {
      const [, regio, prefix] = roepnummerMatch;
      // Mapping voor Rotterdam-Rijnmond (17-xx)
      if (regio === '17') {
        if (prefix.startsWith('20')) {
          const kazerneCoords = await findKazerneByName('Gezamenlijke Brandweer - Botlekweg');
          if (kazerneCoords) return kazerneCoords;
        }
      }
    }
    
    // Laatste fallback: laad kazernes uit JSON en gebruik eerste geldige
    const base = (import.meta as any)?.env?.BASE_URL || '/';
    const response = await fetch(`${base}attached_assets/63_kazernes_complete.json`);
    if (!response.ok) return null;
    
    const kazernes: Kazerne[] = await response.json();
    
    // Probeer kazerne te vinden op basis van roepnummer of post
    for (const kazerne of kazernes) {
      const lat = typeof kazerne.latitude === 'string' 
        ? parseFloat(kazerne.latitude) 
        : kazerne.latitude;
      const lng = typeof kazerne.longitude === 'string' 
        ? parseFloat(kazerne.longitude) 
        : kazerne.longitude;
      
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        // Gebruik eerste geldige kazerne als fallback
        return { lat, lng };
      }
    }
  } catch (error) {
    console.error('Fout bij ophalen kazerne coördinaten:', error);
  }
  return null;
}

/**
 * Vind kazerne coördinaten op basis van kazerne naam
 */
async function findKazerneByName(kazerneNaam: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const base = (import.meta as any)?.env?.BASE_URL || '/';
    const response = await fetch(`${base}attached_assets/63_kazernes_complete.json`);
    if (!response.ok) return null;
    
    const kazernes: Kazerne[] = await response.json();
    const normalizedNaam = kazerneNaam.toLowerCase().trim();
    
    for (const kazerne of kazernes) {
      const kazerneNaamNormalized = kazerne.naam.toLowerCase().trim();
      const kazernePlaatsNormalized = (kazerne.plaats || '').toLowerCase().trim();
      
      if (kazerneNaamNormalized.includes(normalizedNaam) || 
          normalizedNaam.includes(kazerneNaamNormalized) ||
          kazernePlaatsNormalized.includes(normalizedNaam) ||
          normalizedNaam.includes(kazernePlaatsNormalized)) {
        const lat = typeof kazerne.latitude === 'string' 
          ? parseFloat(kazerne.latitude) 
          : kazerne.latitude;
        const lng = typeof kazerne.longitude === 'string' 
          ? parseFloat(kazerne.longitude) 
          : kazerne.longitude;
        
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
          return { lat, lng };
        }
      }
    }
  } catch (error) {
    console.error('Fout bij vinden kazerne:', error);
  }
  return null;
}

/**
 * Bereken afstand tussen twee punten in kilometers (Haversine formule)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Aardstraal in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bereken nieuwe positie op basis van beweging
 */
function calculateNewPosition(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  speedKmh: number,
  deltaTimeMs: number
): { lat: number; lng: number; arrived: boolean } {
  const distance = calculateDistance(currentLat, currentLng, targetLat, targetLng);
  const speedKms = speedKmh / 3600; // km/s
  const deltaTimeS = deltaTimeMs / 1000;
  const distanceToMove = speedKms * deltaTimeS; // km
  
  if (distanceToMove >= distance) {
    // Aangekomen op bestemming
    return { lat: targetLat, lng: targetLng, arrived: true };
  }
  
  // Bereken nieuwe positie op basis van bearing
  const bearing = Math.atan2(
    Math.sin((targetLng - currentLng) * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180),
    Math.cos(currentLat * Math.PI / 180) * Math.sin(targetLat * Math.PI / 180) -
    Math.sin(currentLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
    Math.cos((targetLng - currentLng) * Math.PI / 180)
  );
  
  const angularDistance = distanceToMove / 6371; // Radial distance
  const newLat = Math.asin(
    Math.sin(currentLat * Math.PI / 180) * Math.cos(angularDistance) +
    Math.cos(currentLat * Math.PI / 180) * Math.sin(angularDistance) * Math.cos(bearing)
  ) * 180 / Math.PI;
  
  const newLng = currentLng + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(currentLat * Math.PI / 180),
    Math.cos(angularDistance) - Math.sin(currentLat * Math.PI / 180) * Math.sin(newLat * Math.PI / 180)
  ) * 180 / Math.PI;
  
  return { lat: newLat, lng: newLng, arrived: false };
}

/**
 * Centrale statusmanager functies
 */

/**
 * Update voertuigstatus en dispatch events
 */
export function updateVehicleStatus(
  position: UnitPosition,
  newStatusCode: 'ov' | 'ut' | 'tp' | 'ir' | 'bs' | 'kz',
  incidentId?: string | number | null
): void {
  const oldStatusCode = position.statusCode;
  position.statusCode = newStatusCode;
  
  if (incidentId !== undefined) {
    position.activeIncidentId = incidentId;
  }
  
  // Dispatch event voor GMS2 en andere modules
  window.dispatchEvent(new CustomEvent('unitStatusChanged', {
    detail: {
      roepnummer: position.roepnummer,
      oldStatusCode,
      newStatusCode,
      incidentId: position.activeIncidentId,
      coordinates: [position.lat, position.lng]
    }
  }));
  
  // Gebruik centrale statusmodule
  setStatus({
    roepnummer: position.roepnummer,
    statusCode: newStatusCode
  }, newStatusCode, {
    incidentId: position.activeIncidentId,
    coordinates: [position.lat, position.lng]
  });
  
  console.log(`🔄 Status ${position.roepnummer}: ${oldStatusCode || 'geen'} → ${newStatusCode}`);
}

/**
 * Behandel vertrek (OV → UT)
 */
function handleDeparture(position: UnitPosition): void {
  if (position.statusCode === 'ov' && position.targetLat && position.targetLng && position.targetType === 'incident') {
    // Als er een target is en status is nog 'beschikbaar', start beweging
    // Dit betekent dat de eenheid moet vertrekken
    if (position.status === 'beschikbaar' || !position.status) {
      updateVehicleStatus(position, 'ut', position.activeIncidentId);
      position.status = 'onderweg';
      console.log(`🚗 ${position.roepnummer} vertrekt (OV → UT)`);
    }
  }
}

/**
 * Behandel aankomst op incidentlocatie (UT → TP)
 */
function handleArrival(position: UnitPosition): void {
  if (position.statusCode === 'ut' && position.targetType === 'incident') {
    updateVehicleStatus(position, 'tp', position.activeIncidentId);
    position.status = 'ter_plaatse';
    
    // Dispatch arrival event
    window.dispatchEvent(new CustomEvent('unitArrival', {
      detail: {
        roepnummer: position.roepnummer,
        status: 'tp',
        coordinates: [position.lat, position.lng],
        incidentId: position.activeIncidentId
      }
    }));
  }
}

/**
 * Behandel vrijgave (TP → IR) en start retour-rit
 */
async function handleRelease(position: UnitPosition): Promise<void> {
  if (position.statusCode === 'tp' && position.targetType === 'incident') {
    // Bij vrijgave: activeIncidentId blijft nog gekoppeld tot voertuig op kazerne is (wordt null in handleArrivalAtStation)
    // Status wordt IR (ingerukt, vrij maar op locatie)
    updateVehicleStatus(position, 'ir', position.activeIncidentId);
    
    // Start automatisch retour-rit naar kazerne
    const kazerneCoords = await getKazerneCoords(position.roepnummer);
    if (kazerneCoords) {
      position.targetLat = kazerneCoords.lat;
      position.targetLng = kazerneCoords.lng;
      position.targetType = 'kazerne';
      position.targetId = undefined;
      // Status wordt BS zodra beweging start (in handleReturnToStation)
      // activeIncidentId wordt null zodra voertuig op kazerne aankomt (in handleArrivalAtStation)
    }
  }
}

/**
 * Behandel start retour-rit (IR → BS)
 */
function handleReturnToStation(position: UnitPosition): void {
  if (position.statusCode === 'ir' && position.targetType === 'kazerne') {
    // Detecteer beweging: als positie verandert, is voertuig vertrokken
    const hasMoved = position.previousLat !== undefined && 
                     position.previousLng !== undefined &&
                     (Math.abs(position.lat - position.previousLat) > 0.00001 ||
                      Math.abs(position.lng - position.previousLng) > 0.00001);
    
    if (hasMoved) {
      updateVehicleStatus(position, 'bs', position.activeIncidentId);
      position.status = 'terug_naar_kazerne';
    }
  }
}

/**
 * Behandel aankomst op kazerne (BS → KZ)
 */
function handleArrivalAtStation(position: UnitPosition): void {
  if (position.statusCode === 'bs' && position.targetType === 'kazerne') {
    updateVehicleStatus(position, 'kz', null);
    position.status = 'beschikbaar';
    position.activeIncidentId = null;
    position.targetLat = undefined;
    position.targetLng = undefined;
    position.targetType = undefined;
    position.targetId = undefined;
    
    // Dispatch event voor IV refresh
    window.dispatchEvent(new CustomEvent('unitArrivedAtStation', {
      detail: {
        roepnummer: position.roepnummer,
        status: 'kz',
        coordinates: [position.lat, position.lng]
      }
    }));
    
    console.log(`🏠 ${position.roepnummer} aangekomen op kazerne (BS → KZ), beschikbaar voor nieuwe inzet`);
  }
}

/**
 * Update eenheid positie op basis van beweging
 */
function updateUnitMovement(positions: Map<string, UnitPosition>): void {
  const now = Date.now();
  let updated = false;
  
  positions.forEach((position, roepnummer) => {
    // Bewaar vorige positie voor bewegingdetectie
    position.previousLat = position.lat;
    position.previousLng = position.lng;
    
    // Check of er een target is (eenheid moet bewegen)
    if (!position.targetLat || !position.targetLng) {
      return; // Geen doel
    }
    
    const deltaTime = now - position.lastUpdate;
    if (deltaTime < UPDATE_INTERVAL_MS) {
      return; // Te snel na laatste update
    }
    
    // Detecteer vertrek (OV → UT) - MOET voor status check komen
    if (position.statusCode === 'ov' && position.targetType === 'incident') {
      handleDeparture(position);
      updated = true; // Status is gewijzigd, markeer als updated
    }
    
    // Detecteer start retour-rit (IR → BS)
    if (position.statusCode === 'ir' && position.targetType === 'kazerne') {
      handleReturnToStation(position);
      updated = true; // Status is gewijzigd, markeer als updated
    }
    
    // Update positie als voertuig beweegt OF als er een target is (ook als status nog niet correct is)
    // Dit zorgt ervoor dat eenheden direct van richting veranderen wanneer targetType verandert
    if (position.status === 'onderweg' || position.status === 'terug_naar_kazerne' || 
        (position.targetLat && position.targetLng && (position.status === 'ter_plaatse' || !position.status))) {
      
      // Als targetType kazerne is maar status nog 'onderweg', fix dit direct
      if (position.targetType === 'kazerne' && position.status === 'onderweg') {
        position.status = 'terug_naar_kazerne';
        if (position.statusCode === 'ir') {
          updateVehicleStatus(position, 'bs', position.activeIncidentId || null);
        }
        updated = true;
      }
      
      // Als targetType incident is maar status 'terug_naar_kazerne', fix dit ook
      if (position.targetType === 'incident' && position.status === 'terug_naar_kazerne') {
        position.status = 'onderweg';
        updated = true;
      }
      
      const newPos = calculateNewPosition(
        position.lat,
        position.lng,
        position.targetLat,
        position.targetLng,
        MOVEMENT_SPEED_KMH,
        deltaTime
      );
      
      position.lat = newPos.lat;
      position.lng = newPos.lng;
      position.lastUpdate = now;
      updated = true;
      
      if (newPos.arrived) {
        // Aangekomen op bestemming
        if (position.targetType === 'incident') {
          handleArrival(position);
          updated = true; // Status is gewijzigd
        } else if (position.targetType === 'kazerne') {
          handleArrivalAtStation(position);
          updated = true; // Status is gewijzigd
        }
        
        position.targetLat = undefined;
        position.targetLng = undefined;
        position.targetType = undefined;
        position.targetId = undefined;
        
        console.log(`✅ ${roepnummer} aangekomen op bestemming`);
      }
    } else if (position.targetLat && position.targetLng) {
      // Eenheid heeft target maar beweegt nog niet - check of status update nodig is
      // Dit kan gebeuren als eenheid net is gekoppeld maar nog niet is vertrokken
      if (position.statusCode === 'ov' && position.targetType === 'incident' && position.status !== 'onderweg') {
        // Nog niet vertrokken, maar heeft target - probeer vertrek te triggeren
        handleDeparture(position);
        if (position.status === 'onderweg') {
          updated = true;
        }
      }
    }
  });
  
  if (updated) {
    saveUnitPositions(positions);
    // Dispatch event voor map component
    window.dispatchEvent(new CustomEvent('unitPositionsUpdated', {
      detail: Object.fromEntries(positions)
    }));
  }
  
  // Dispatch altijd een event zodat listeners weten dat er updates zijn (ook als alleen status is gewijzigd)
  // Dit zorgt ervoor dat brw-eenheden.tsx altijd de laatste status krijgt
  window.dispatchEvent(new CustomEvent('unitMovementTick', {
    detail: { timestamp: now }
  }));
}

/**
 * Initialiseer eenheid positie als deze nog niet bestaat
 */
async function initializeUnitPosition(roepnummer: string): Promise<UnitPosition | null> {
  const positions = loadUnitPositions();
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  
  // Check of positie al bestaat
  if (positions.has(normalizedRoepnummer)) {
    return positions.get(normalizedRoepnummer)!;
  }
  
  // Probeer kazerne coördinaten te vinden
  const kazerneCoords = await getKazerneCoords(roepnummer);
  if (!kazerneCoords) {
    console.warn(`⚠️ Kon geen kazerne coördinaten vinden voor ${normalizedRoepnummer}`);
    return null;
  }
  
  const position: UnitPosition = {
    roepnummer: normalizedRoepnummer,
    lat: kazerneCoords.lat,
    lng: kazerneCoords.lng,
    status: 'beschikbaar',
    statusCode: 'kz', // Op kazerne
    activeIncidentId: null,
    lastUpdate: Date.now(),
  };
  
  positions.set(normalizedRoepnummer, position);
  saveUnitPositions(positions);
  
  return position;
}

/**
 * Start beweging van een eenheid naar een doel
 */
export async function startMovement(
  roepnummer: string,
  targetLat: number,
  targetLng: number,
  targetType: 'incident' | 'kazerne',
  targetId?: string | number
): Promise<void> {
  const positions = loadUnitPositions();
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  
  let position = positions.get(normalizedRoepnummer);
  
  // Als eenheid nog niet bestaat, initialiseer positie
  if (!position) {
    position = await initializeUnitPosition(roepnummer);
    if (!position) {
      console.warn(`⚠️ Kon positie niet initialiseren voor ${normalizedRoepnummer}`);
      return;
    }
  }
  
  // Check of eenheid al op bestemming is
  const distance = calculateDistance(position.lat, position.lng, targetLat, targetLng);
  if (distance < 0.01) { // Minder dan 10 meter
    console.log(`✅ ${normalizedRoepnummer} is al op bestemming`);
    if (targetType === 'kazerne') {
      updateVehicleStatus(position, 'kz', null);
      position.status = 'beschikbaar';
      position.activeIncidentId = null;
    } else {
      updateVehicleStatus(position, 'tp', targetId);
      position.status = 'ter_plaatse';
      position.activeIncidentId = targetId || null;
    }
    position.targetLat = undefined;
    position.targetLng = undefined;
    position.targetType = undefined;
    position.targetId = undefined;
    position.lastUpdate = Date.now();
    saveUnitPositions(positions);
    return;
  }
  
  position.targetLat = targetLat;
  position.targetLng = targetLng;
  position.targetType = targetType;
  position.targetId = targetId;
  
  // Statuslogica: als voertuig al OV heeft, blijft OV tot beweging start
  // Als voertuig IR heeft en naar kazerne gaat, blijft IR tot beweging start
  if (targetType === 'kazerne') {
    // Retour-rit: status blijft IR tot beweging start (wordt BS in movement-loop)
    if (position.statusCode !== 'ir') {
      position.status = 'terug_naar_kazerne';
    }
  } else {
    // Naar incident: als status nog niet OV is, zet OV (wordt UT in movement-loop)
    if (!position.statusCode || position.statusCode === 'kz' || position.statusCode === 'bs') {
      updateVehicleStatus(position, 'ov', targetId);
    }
    position.status = 'beschikbaar'; // Blijft stil tot beweging start
  }
  
  position.lastUpdate = Date.now();
  
  positions.set(normalizedRoepnummer, position);
  saveUnitPositions(positions);
  
  console.log(`🚗 ${normalizedRoepnummer} start beweging naar ${targetType} (${targetLat}, ${targetLng})`);
  
  // Dispatch event
  window.dispatchEvent(new CustomEvent('unitMovementStarted', {
    detail: { roepnummer: normalizedRoepnummer, targetLat, targetLng, targetType, targetId }
  }));
}

/**
 * Check GMS2 incidenten en start beweging voor gekoppelde eenheden
 */
async function checkIncidentAssignments(processedAssignments: Set<string>): Promise<void> {
  try {
    const storedIncidenten = localStorage.getItem('gms2Incidents');
    if (!storedIncidenten) return;
    
    const incidenten: GmsIncident[] = JSON.parse(storedIncidenten);
    
    for (const incident of incidenten) {
      // Check of incident coördinaten heeft
      if (!incident.coordinates || !Array.isArray(incident.coordinates) || incident.coordinates.length !== 2) {
        continue;
      }
      
      const [lng, lat] = incident.coordinates; // GeoJSON: [lon, lat]
      
      // Check of er voertuigen zijn gekoppeld
      if (!incident.assignedUnits || incident.assignedUnits.length === 0) {
        continue;
      }
      
      // Voor elk gekoppeld voertuig
      for (const unit of incident.assignedUnits) {
        const roepnummer = unit.roepnummer;
        if (!roepnummer) continue;
        
        const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
        const assignmentKey = `${incident.id}-${normalizedRoepnummer}`;
        
        // Check of deze koppeling al is verwerkt
        if (processedAssignments.has(assignmentKey)) {
          continue;
        }
        
        // Markeer als verwerkt
        processedAssignments.add(assignmentKey);
        
        // Start beweging naar incident (async)
        await startMovement(normalizedRoepnummer, lat, lng, 'incident', incident.id);
      }
    }
  } catch (error) {
    console.error('Fout bij checken incident assignments:', error);
  }
}

/**
 * Check of eenheden terug moeten naar kazerne (bij gearchiveerde incidenten)
 */
async function checkReturnToKazerne(processedReturns: Set<string>): Promise<void> {
  try {
    const positions = loadUnitPositions();
    
    for (const [roepnummer, position] of positions.entries()) {
      // Check of eenheid ter plaatse is (TP) en terug moet
      if (position.statusCode === 'tp' && position.targetType === 'incident' && position.activeIncidentId) {
        const returnKey = `${position.activeIncidentId}-${roepnummer}-return`;
        
        if (processedReturns.has(returnKey)) {
          continue;
        }
        
        // Check of incident nog actief is
        const storedIncidenten = localStorage.getItem('gms2Incidents');
        if (storedIncidenten) {
          const incidenten: GmsIncident[] = JSON.parse(storedIncidenten);
          const incident = incidenten.find(inc => inc.id === position.activeIncidentId);
          
          // Als incident niet meer bestaat of gearchiveerd is, vrijgeven en terugrijden
          if (!incident || incident.status === 'Gearchiveerd' || incident.status === 'Afgesloten') {
            processedReturns.add(returnKey);
            
            // Vrijgeven: TP → IR
            await handleRelease(position);
            
            // Start retour-rit (status wordt BS zodra beweging start)
            const kazerneCoords = await getKazerneCoords(roepnummer);
            if (kazerneCoords) {
              position.targetLat = kazerneCoords.lat;
              position.targetLng = kazerneCoords.lng;
              position.targetType = 'kazerne';
              position.targetId = undefined;
              saveUnitPositions(positions);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Fout bij checken terug naar kazerne:', error);
  }
}

/**
 * Initialiseer globale beweging service
 */
export function initGlobalUnitMovement(): () => void {
  console.log('🚀 Initialiseer globale eenhedenbeweging service...');
  
  const processedAssignments = new Set<string>();
  const processedReturns = new Set<string>();
  
  // Movement update interval
  const movementInterval = setInterval(() => {
    const positions = loadUnitPositions();
    updateUnitMovement(positions);
  }, UPDATE_INTERVAL_MS);
  
  // Check voor nieuwe assignments
  const assignmentInterval = setInterval(() => {
    checkIncidentAssignments(processedAssignments).catch(console.error);
    checkReturnToKazerne(processedReturns).catch(console.error);
  }, MOVEMENT_CHECK_INTERVAL_MS);
  
  // Check direct bij start
  checkIncidentAssignments(processedAssignments).catch(console.error);
  
  // Listen voor storage changes
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'gms2Incidents') {
      // Reset processed assignments zodat nieuwe koppelingen worden verwerkt
      processedAssignments.clear();
      checkIncidentAssignments(processedAssignments).catch(console.error);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Listen voor custom events
  const handleIncidentArchived = (e: CustomEvent) => {
    const incident = e.detail as GmsIncident;
    if (incident && incident.assignedUnits) {
      // Reset returns zodat eenheden terug kunnen rijden
      processedReturns.clear();
      checkReturnToKazerne(processedReturns).catch(console.error);
    }
  };
  
  window.addEventListener('gms2IncidentArchived', handleIncidentArchived as EventListener);
  
  // Cleanup functie
  return () => {
    clearInterval(movementInterval);
    clearInterval(assignmentInterval);
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('gms2IncidentArchived', handleIncidentArchived as EventListener);
    console.log('🛑 Globale eenhedenbeweging service gestopt');
  };
}

/**
 * Haal alle eenheden posities op
 */
export function getUnitPositions(): Map<string, UnitPosition> {
  return loadUnitPositions();
}

/**
 * Haal positie van een specifieke eenheid op
 */
export function getUnitPosition(roepnummer: string): UnitPosition | undefined {
  const positions = loadUnitPositions();
  return positions.get(normalizeRoepnummer(roepnummer));
}

/**
 * Koppel voertuig aan incident (zet status OV)
 */
export function assignVehicleToIncident(roepnummer: string, incidentId: string | number): void {
  const positions = loadUnitPositions();
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  const position = positions.get(normalizedRoepnummer);
  
  if (position) {
    // Check of voertuig al gekoppeld is aan een ander incident
    if (position.activeIncidentId && position.activeIncidentId !== incidentId) {
      console.warn(`⚠️ Voertuig ${normalizedRoepnummer} is al gekoppeld aan incident ${position.activeIncidentId}`);
      return;
    }
    
    updateVehicleStatus(position, 'ov', incidentId);
    position.activeIncidentId = incidentId;
    saveUnitPositions(positions);
    
    console.log(`✅ Voertuig ${normalizedRoepnummer} gekoppeld aan incident ${incidentId} (status: OV)`);
  }
}

/**
 * Vrijgeven voertuig van incident (zet status IR en start retour-rit)
 * Ondersteunt alle statussen: TP, UT, OV → IR → BS → KZ
 */
export async function releaseVehicleFromIncident(roepnummer: string): Promise<void> {
  const positions = loadUnitPositions();
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  let position = positions.get(normalizedRoepnummer);
  
  // Als eenheid nog niet bestaat in movement service, initialiseer deze eerst
  if (!position) {
    position = await initializeUnitPosition(roepnummer);
    if (!position) {
      console.warn(`⚠️ Kon positie niet initialiseren voor ${normalizedRoepnummer}`);
      return;
    }
  }
  
  // Vrijgeven voor alle statussen: TP, UT, OV → IR
  const releasableStatuses = ['tp', 'ut', 'ov'];
  const currentStatusCode = position.statusCode?.toLowerCase();
  
  // Check of eenheid een vrij te geven status heeft
  if (currentStatusCode && releasableStatuses.includes(currentStatusCode)) {
    // Zet status direct naar IR (vrijgeven op locatie)
    updateVehicleStatus(position, 'ir', position.activeIncidentId || null);
    
    // Start automatisch retour-rit naar kazerne
    const kazerneCoords = await getKazerneCoords(normalizedRoepnummer);
    if (kazerneCoords) {
      position.targetLat = kazerneCoords.lat;
      position.targetLng = kazerneCoords.lng;
      position.targetType = 'kazerne';
      position.targetId = undefined;
      
      // BELANGRIJK: Als eenheid al aan het bewegen was, zet status direct naar 'terug_naar_kazerne'
      // zodat de movement loop weet dat het naar kazerne moet rijden
      if (position.status === 'onderweg' || position.status === 'ter_plaatse') {
        position.status = 'terug_naar_kazerne';
        // Zet ook direct BS status (beschikbaar maar rijdend)
        updateVehicleStatus(position, 'bs', position.activeIncidentId || null);
      }
      
      // Status wordt automatisch BS zodra beweging start (in handleReturnToStation)
      // activeIncidentId wordt null zodra voertuig op kazerne aankomt (in handleArrivalAtStation)
    }
    
    saveUnitPositions(positions);
    
    console.log(`✅ Voertuig ${normalizedRoepnummer} vrijgegeven van incident ${position.activeIncidentId || 'onbekend'} (${currentStatusCode.toUpperCase()} → IR, retour-rit gestart)`);
  } else {
    // Als eenheid al IR, BS of KZ is, zorg dat activeIncidentId wordt geleegd en retour-rit start
    if (currentStatusCode === 'ir' || currentStatusCode === 'bs') {
      // Al IR of BS: start retour-rit als die nog niet bezig is
      if (!position.targetType || position.targetType !== 'kazerne') {
        const kazerneCoords = await getKazerneCoords(normalizedRoepnummer);
        if (kazerneCoords) {
          position.targetLat = kazerneCoords.lat;
          position.targetLng = kazerneCoords.lng;
          position.targetType = 'kazerne';
          position.targetId = undefined;
          
          // Zet status direct naar 'terug_naar_kazerne' als eenheid al aan het bewegen was
          if (position.status === 'onderweg' || position.status === 'ter_plaatse') {
            position.status = 'terug_naar_kazerne';
            if (currentStatusCode === 'ir') {
              updateVehicleStatus(position, 'bs', position.activeIncidentId || null);
            }
          }
          
          saveUnitPositions(positions);
          console.log(`✅ Retour-rit gestart voor ${normalizedRoepnummer} (status: ${currentStatusCode.toUpperCase()})`);
        }
      } else if (position.targetType === 'kazerne' && position.status !== 'terug_naar_kazerne') {
        // Target is al kazerne, maar status is nog niet 'terug_naar_kazerne' - fix dit
        position.status = 'terug_naar_kazerne';
        if (currentStatusCode === 'ir') {
          updateVehicleStatus(position, 'bs', position.activeIncidentId || null);
        }
        saveUnitPositions(positions);
        console.log(`✅ Status gefixed voor ${normalizedRoepnummer}: nu terug_naar_kazerne`);
      }
    } else if (currentStatusCode === 'kz') {
      // Al KZ: zorg dat activeIncidentId wordt geleegd
      position.activeIncidentId = null;
      saveUnitPositions(positions);
      console.log(`✅ ${normalizedRoepnummer} al op kazerne (KZ), activeIncidentId geleegd`);
    } else {
      console.warn(`⚠️ Voertuig ${normalizedRoepnummer} heeft status ${currentStatusCode || 'onbekend'}, kan niet worden vrijgegeven (verwacht: TP, UT of OV)`);
    }
  }
}

/**
 * Check of voertuig beschikbaar is voor nieuwe incidenten
 */
export function isVehicleAvailable(roepnummer: string): boolean {
  const positions = loadUnitPositions();
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  const position = positions.get(normalizedRoepnummer);
  
  if (!position) {
    return true; // Onbekend voertuig wordt als beschikbaar beschouwd
  }
  
  // Voertuig is beschikbaar als:
  // - Geen actief incident (activeIncidentId is null)
  // - Status is KZ of BS
  return position.activeIncidentId === null || 
         position.activeIncidentId === undefined ||
         position.statusCode === 'kz' || 
         position.statusCode === 'bs';
}

/**
 * Zet alle eenheden op status KZ (op kazerne)
 * Verwijdert alle actieve incidenten en targets
 */
export function setAllUnitsToKZ(): void {
  const positions = loadUnitPositions();
  let updated = false;
  
  positions.forEach((position, roepnummer) => {
    // Zet status naar KZ
    updateVehicleStatus(position, 'kz', null);
    position.status = 'beschikbaar';
    position.activeIncidentId = null;
    
    // Verwijder alle targets (retour-ritten stoppen)
    position.targetLat = undefined;
    position.targetLng = undefined;
    position.targetType = undefined;
    position.targetId = undefined;
    
    updated = true;
    console.log(`✅ ${roepnummer} op status KZ gezet`);
  });
  
  if (updated) {
    saveUnitPositions(positions);
    
    // Dispatch event voor map component
    window.dispatchEvent(new CustomEvent('unitPositionsUpdated', {
      detail: Object.fromEntries(positions)
    }));
    
    console.log(`✅ Alle ${positions.size} eenheden op status KZ gezet`);
  } else {
    console.log('ℹ️ Geen eenheden gevonden om bij te werken');
  }
}

/**
 * Reset alle eenheden direct terug naar hun kazerne
 * Zet positie, status en verwijdert alle targets en actieve incidenten
 */
export async function resetAllUnitsToKazerne(): Promise<void> {
  const positions = loadUnitPositions();
  let updated = false;
  let successCount = 0;
  let failCount = 0;
  const failedUnits: string[] = [];
  
  console.log(`🔄 Reset alle eenheden naar kazerne...`);
  
  // Haal eerst een default kazerne locatie op (voor fallback)
  const base = (import.meta as any)?.env?.BASE_URL || '/';
  let defaultKazerne: { lat: number; lng: number } | null = null;
  try {
    const response = await fetch(`${base}attached_assets/63_kazernes_complete.json`);
    if (response.ok) {
      const kazernes: Kazerne[] = await response.json();
      for (const kazerne of kazernes) {
        const lat = typeof kazerne.latitude === 'string' 
          ? parseFloat(kazerne.latitude) 
          : kazerne.latitude;
        const lng = typeof kazerne.longitude === 'string' 
          ? parseFloat(kazerne.longitude) 
          : kazerne.longitude;
        
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
          defaultKazerne = { lat, lng };
          break;
        }
      }
    }
  } catch (error) {
    console.warn('Kon default kazerne niet ophalen:', error);
  }
  
  // Verzamel alle promises voor async kazerne lookup
  const resetPromises = Array.from(positions.entries()).map(async ([roepnummer, position]) => {
    try {
      // Haal kazerne coördinaten op
      let kazerneCoords = await getKazerneCoords(roepnummer);
      
      // Als geen kazerne gevonden, gebruik default (maar log wel een waarschuwing)
      if (!kazerneCoords) {
        if (defaultKazerne) {
          kazerneCoords = defaultKazerne;
          failedUnits.push(roepnummer);
          console.warn(`⚠️ Kon geen kazerne coördinaten vinden voor ${roepnummer}, gebruik default kazerne`);
        } else {
          failCount++;
          console.error(`❌ Kon geen kazerne coördinaten vinden voor ${roepnummer} en geen default beschikbaar`);
          return;
        }
      }
      
      // Zet positie direct naar kazerne
      position.lat = kazerneCoords.lat;
      position.lng = kazerneCoords.lng;
      position.previousLat = kazerneCoords.lat;
      position.previousLng = kazerneCoords.lng;
      
      // Zet status naar KZ en beschikbaar
      updateVehicleStatus(position, 'kz', null);
      position.status = 'beschikbaar';
      position.activeIncidentId = null;
      
      // Verwijder alle targets (belangrijk: dit zorgt ervoor dat beweging stopt)
      position.targetLat = undefined;
      position.targetLng = undefined;
      position.targetType = undefined;
      position.targetId = undefined;
      
      position.lastUpdate = Date.now();
      updated = true;
      successCount++;
      console.log(`✅ ${roepnummer} teruggezet naar kazerne (${kazerneCoords.lat.toFixed(6)}, ${kazerneCoords.lng.toFixed(6)})`);
    } catch (error) {
      failCount++;
      failedUnits.push(roepnummer);
      console.error(`❌ Fout bij resetten ${roepnummer}:`, error);
    }
  });
  
  // Wacht tot alle resets voltooid zijn
  await Promise.all(resetPromises);
  
  if (updated) {
    saveUnitPositions(positions);
    
    // Dispatch event voor map component
    window.dispatchEvent(new CustomEvent('unitPositionsUpdated', {
      detail: Object.fromEntries(positions)
    }));
    
    console.log(`✅ Reset voltooid: ${successCount} eenheden teruggezet naar kazerne${failCount > 0 ? `, ${failCount} gefaald` : ''}`);
    if (failedUnits.length > 0) {
      console.warn(`⚠️ Eenheden met fallback kazerne: ${failedUnits.join(', ')}`);
    }
  } else {
    console.log('ℹ️ Geen eenheden gevonden om te resetten');
  }
}

// Maak functies beschikbaar via window object voor console toegang
if (typeof window !== 'undefined') {
  (window as any).setAllUnitsToKZ = () => {
    setAllUnitsToKZ();
  };
  
  (window as any).resetAllUnitsToKazerne = async () => {
    await resetAllUnitsToKazerne();
  };
  
  // Voer direct uit bij laden (voor nu even alle eenheden op KZ)
  // Verwijder deze regel als je het handmatig wilt aanroepen via console
  setTimeout(() => {
    setAllUnitsToKZ();
  }, 1000); // Wacht 1 seconde zodat alles geladen is
}

