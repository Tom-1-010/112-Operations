/**
 * Centrale BRW Status Module
 * 
 * Deze module beheert alle BRW-statussen op basis van brw-statussen.json
 * en biedt een centrale setStatus() functie voor statuswijzigingen.
 */

// Laad brw-statussen.json dynamisch
let brwStatussenCache: BrwStatussenData | null = null;

async function loadBrwStatussen(): Promise<BrwStatussenData> {
  if (brwStatussenCache) {
    return brwStatussenCache;
  }
  
  try {
    const response = await fetch('/data/brw-statussen.json');
    if (!response.ok) {
      throw new Error(`Failed to load brw-statussen.json: ${response.statusText}`);
    }
    brwStatussenCache = await response.json() as BrwStatussenData;
    return brwStatussenCache;
  } catch (error) {
    console.error('Fout bij laden brw-statussen.json:', error);
    // Fallback naar lege structuur
    return { brandweer_statussen: [] };
  }
}

// Laad statussen bij initialisatie
loadBrwStatussen();

/**
 * Type definitie voor een status uit brw-statussen.json
 */
export interface StatusDef {
  id: number;
  naam: string;
  afkorting: string;
  c2000_toets: number | null;
  gms_int_code: number | null;
  gms_ext_code: number | null;
  beschikbaar_voor_nieuw_incident: boolean | null;
  omschrijving: string;
  opmerking?: string;
}

/**
 * Type definitie voor de brw-statussen.json structuur
 */
interface BrwStatussenData {
  brandweer_statussen: StatusDef[];
}

/**
 * Haal alle beschikbare statussen op
 */
export async function getAllStatuses(): Promise<StatusDef[]> {
  const data = await loadBrwStatussen();
  return data.brandweer_statussen;
}

/**
 * Synchronous versie - gebruikt cache als beschikbaar
 */
export function getAllStatusesSync(): StatusDef[] {
  if (!brwStatussenCache) {
    console.warn('brw-statussen.json nog niet geladen, gebruik getAllStatuses() async versie');
    return [];
  }
  return brwStatussenCache.brandweer_statussen;
}

/**
 * Zoek een status definitie op basis van afkorting
 */
export function getStatusDef(afkorting: string): StatusDef | undefined {
  if (!brwStatussenCache) {
    console.warn('brw-statussen.json nog niet geladen');
    return undefined;
  }
  return brwStatussenCache.brandweer_statussen.find(
    s => s.afkorting?.toLowerCase() === afkorting.toLowerCase()
  );
}

/**
 * Haal de standaard status op (Op kazerne)
 * Geeft een fallback terug als de data nog niet geladen is
 */
export function getDefaultStatus(): StatusDef {
  const kz = getStatusDef('kz');
  if (!kz) {
    // Fallback als data nog niet geladen is
    return {
      id: 5,
      naam: 'Op kazerne',
      afkorting: 'kz',
      c2000_toets: 5,
      gms_int_code: 9,
      gms_ext_code: 5,
      beschikbaar_voor_nieuw_incident: true,
      omschrijving: 'Eenheid staat beschikbaar op de kazerne.'
    };
  }
  return kz;
}

/**
 * Event bus voor statuswijzigingen
 * Andere modules kunnen luisteren naar statuswijzigingen
 */
class StatusEventBus {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in status event listener for ${event}:`, error);
        }
      });
    }
  }
}

export const statusEventBus = new StatusEventBus();

/**
 * Interface voor een unit met status
 */
export interface UnitWithStatus {
  id?: string | number;
  roepnummer: string;
  statusCode?: string;
  statusDef?: StatusDef;
  [key: string]: any; // Voor flexibiliteit met andere unit velden
}

/**
 * Centrale functie om de status van een unit te wijzigen
 * 
 * @param unit - De unit waarvan de status moet worden gewijzigd
 * @param statusCode - De nieuwe statuscode (bijv. "ov", "ut", "tp", "ir", "bs", "kz")
 * @param options - Optionele extra data voor de statuswijziging
 */
export function setStatus(
  unit: UnitWithStatus | string,
  statusCode: string,
  options?: {
    incidentId?: string | number;
    coordinates?: [number, number];
    [key: string]: any;
  }
): void {
  // Als unit een string is (roepnummer), moeten we de unit eerst vinden
  // Dit is een fallback voor legacy code
  if (typeof unit === 'string') {
    console.warn('setStatus called with roepnummer string instead of unit object. This is deprecated.');
    // Dispatch event zodat andere modules kunnen reageren
    statusEventBus.emit('statusChanged', {
      roepnummer: unit,
      statusCode,
      ...options
    });
    return;
  }

  // Zoek status definitie
  const statusDef = getStatusDef(statusCode);
  
  if (!statusDef) {
    console.warn(`⚠️ Statuscode "${statusCode}" niet gevonden in brw-statussen.json`);
  }

  // Update unit status
  unit.statusCode = statusCode;
  unit.statusDef = statusDef;

  // Dispatch event voor andere modules
  statusEventBus.emit('statusChanged', {
    unitId: unit.id,
    roepnummer: unit.roepnummer,
    statusCode,
    statusDef,
    ...options
  });

  console.log(`✅ Status van ${unit.roepnummer} gewijzigd naar: ${statusCode} (${statusDef?.naam || 'onbekend'})`);
}

/**
 * Initialiseer een unit met de standaard status (Op kazerne)
 */
export function initializeUnitStatus(unit: UnitWithStatus): void {
  const defaultStatus = getDefaultStatus();
  unit.statusCode = defaultStatus.afkorting;
  unit.statusDef = defaultStatus;
}

/**
 * Mapping voor UI-kolomnamen naar interne statuscodes
 * De "ar" kolom toont de "ut" status
 */
export const STATUS_COLUMN_MAPPING: Record<string, string> = {
  'ov': 'ov',
  'ar': 'ut', // AR kolom toont UT status
  'tp': 'tp',
  'ir': 'ir',
  'nb': 'bs', // NB kan BS zijn (bezig maar inzetbaar)
  'bs': 'bs',
  'kz': 'kz'
};

/**
 * Check of een unit een bepaalde status heeft (rekening houdend met kolommapping)
 */
export function hasStatus(unit: UnitWithStatus, columnCode: string): boolean {
  const statusCode = STATUS_COLUMN_MAPPING[columnCode] || columnCode;
  return unit.statusCode?.toLowerCase() === statusCode.toLowerCase();
}

