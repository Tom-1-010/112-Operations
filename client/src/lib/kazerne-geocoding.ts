/**
 * Kazerne geocoding utility met PDOK (BAG) integratie en RD→WGS84 conversie
 * Cachet resultaten in localStorage voor snelle herlaad
 */

import proj4 from 'proj4';

// EPSG:28992 definitie (Amersfoort / RD New)
proj4.defs(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 ' +
    '+k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel ' +
    '+towgs84=565.2369,50.0087,465.658, -0.406857,0.350732,-1.87035,4.0812 ' +
    '+units=m +no_defs'
);

/**
 * Converteer RD-coördinaten (EPSG:28992) naar WGS84 (EPSG:4326)
 */
export function rdToWgs84(x: number, y: number): { lat: number; lng: number } {
  const [lng, lat] = proj4('EPSG:28992', 'WGS84', [x, y]);
  return { lat, lng };
}

/**
 * Parse POINT(lon lat) string naar coördinaten
 */
function parsePointLL(s: string): { lat: number; lng: number } | null {
  const m = s?.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  const lon = parseFloat(m[1]);
  const lat = parseFloat(m[2]);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lng: lon };
  return null;
}

/**
 * Parse POINT(x y) string in meters (RD)
 */
function parsePointRD(s: string): { x: number; y: number } | null {
  const m = s?.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  return null;
}

/**
 * PDOK document type
 */
type PdokDoc = {
  id?: string;
  type?: string;
  weergavenaam?: string;
  centroide_ll?: string;
  centroide_rd?: string;
};

/**
 * OpenStreetMap Nominatim geocoder (primair)
 */
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  osm_type: string;
  osm_id: string;
}

async function geocodeNominatim(adres: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${adres}, Nederland`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=nl&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeldkamerSimulator/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Nominatim HTTP ${response.status} voor: ${adres}`);
      return null;
    }
    
    const data: NominatimResult[] = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Nominatim fout voor "${adres}":`, error);
    return null;
  }
}

/**
 * PDOK geocoder (BAG) – fallback
 */
async function pdokFree(query: string): Promise<PdokDoc | null> {
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(query)}&rows=5`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json();
  const docs: PdokDoc[] = json?.response?.docs ?? [];
  if (!docs.length) return null;

  // Prioriteit: adres → verblijfsobject → openbareruimte → rest
  const pick =
    docs.find((d) => d.type === 'adres') ??
    docs.find((d) => d.type === 'verblijfsobject') ??
    docs.find((d) => d.type === 'openbareruimte') ??
    docs[0];

  return pick ?? null;
}

/**
 * Geocodeer een adres (probeer eerst Nominatim, dan PDOK)
 */
export async function geocodeAdresPDOK(adres: string): Promise<{
  lat: number;
  lng: number;
  precisie: 'adres' | 'verblijfsobject' | 'openbareruimte' | 'onbekend';
  bagId?: string;
  bron: 'PDOK' | 'Nominatim';
}> {
  // Probeer eerst Nominatim (OpenStreetMap)
  const nominatimResult = await geocodeNominatim(adres);
  if (nominatimResult) {
    return {
      lat: nominatimResult.lat,
      lng: nominatimResult.lng,
      precisie: 'adres',
      bron: 'Nominatim',
    };
  }
  
  // Fallback naar PDOK
  const doc = await pdokFree(adres);
  if (!doc) throw new Error(`Geen geocoding-resultaat voor: ${adres}`);

  let coords: { lat: number; lng: number } | null = null;

  if (doc.centroide_ll) {
    const p = parsePointLL(doc.centroide_ll);
    if (p) coords = p;
  }

  if (!coords && doc.centroide_rd) {
    const p = parsePointRD(doc.centroide_rd);
    if (p) coords = rdToWgs84(p.x, p.y);
  }

  if (!coords) throw new Error(`Geen bruikbare coördinaten voor: ${adres}`);

  const precisie =
    doc.type === 'adres'
      ? 'adres'
      : doc.type === 'verblijfsobject'
      ? 'verblijfsobject'
      : doc.type === 'openbareruimte'
      ? 'openbareruimte'
      : 'onbekend';

  return {
    lat: coords.lat,
    lng: coords.lng,
    precisie,
    bagId: doc.id,
    bron: 'PDOK',
  };
}

/**
 * Cache helpers
 */
const CACHE_KEY = 'kazernes_geocode_v1';

export interface GeocodeCache {
  lat: number;
  lng: number;
  precisie: string;
  bagId?: string;
  bron: string;
}

export function loadGeocodeCache(): Record<string, GeocodeCache> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGeocodeCache(cache: Record<string, GeocodeCache>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function keyForAdres(adres: string): string {
  return adres.trim().toLowerCase();
}

/**
 * Rate limiter helper
 */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Interface voor kazerne met optionele coördinaten
 */
export interface KazerneMetAdres {
  id: string;
  naam: string;
  adres: string;
  postcode?: string;
  plaats?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

/**
 * Zorg dat alle kazernes coördinaten hebben (geocodeer indien nodig)
 * @param forceRegeocode - Als true, geocodeer altijd opnieuw, zelfs als er al coördinaten zijn
 */
export async function ensureAllCoords(
  kazernes: KazerneMetAdres[],
  onProgress?: (done: number, total: number, current?: string) => void,
  forceRegeocode: boolean = false
): Promise<Array<KazerneMetAdres & { lat: number; lng: number }>> {
  const total = kazernes.length;
  const cache = loadGeocodeCache();
  const result: Array<KazerneMetAdres & { lat: number; lng: number }> = [];

  let done = 0;
  for (const k of kazernes) {
    // Maak een volledig adres string voor geocoding
    const adresString = k.postcode && k.plaats
      ? `${k.adres}, ${k.postcode} ${k.plaats}`
      : k.adres;

    const kKey = keyForAdres(adresString);
    
    // Check of er al coördinaten zijn
    let lat: number | null = null;
    let lng: number | null = null;

    // Parse bestaande coördinaten (alleen gebruiken als forceRegeocode false is)
    if (!forceRegeocode && k.latitude != null && k.longitude != null) {
      const parsedLat = typeof k.latitude === 'string' ? parseFloat(k.latitude) : k.latitude;
      const parsedLng = typeof k.longitude === 'string' ? parseFloat(k.longitude) : k.longitude;
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }

    // Check cache als nog geen coördinaten (en niet forceren)
    if (!forceRegeocode && (lat == null || lng == null) && cache[kKey]) {
      lat = cache[kKey].lat;
      lng = cache[kKey].lng;
    }

    // Geocodeer indien nodig (of als geforceerd)
    if (lat == null || lng == null || forceRegeocode) {
      onProgress?.(done, total, k.naam);
      try {
        const geo = await geocodeAdresPDOK(adresString);
        lat = geo.lat;
        lng = geo.lng;
        cache[kKey] = {
          lat,
          lng,
          precisie: geo.precisie,
          bagId: geo.bagId,
          bron: geo.bron,
        };
        saveGeocodeCache(cache);
        // Rate limit: 250ms tussen requests
        await wait(250);
      } catch (error) {
        console.error(`Fout bij geocoding van ${k.naam} (${adresString}):`, error);
        // Als geocoding faalt en er waren al coördinaten, gebruik die
        if (lat == null || lng == null) {
          // Skip deze kazerne als geocoding faalt en er geen coördinaten zijn
          done++;
          onProgress?.(done, total, k.naam);
          continue;
        }
        // Anders gebruik de bestaande coördinaten
      }
    }

    if (lat != null && lng != null) {
      result.push({ ...k, lat, lng });
    }

    done++;
    onProgress?.(done, total, k.naam);
  }

  return result;
}

/**
 * Interface voor kazerne uit JSON bestand
 */
export interface KazerneFromJSON {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string | null;
  telefoonnummer: string | null;
  email: string | null;
  capaciteit: number;
  actief: boolean;
  latitude: string | null;
  longitude: string | null;
  regio: string | null;
  opmerkingen?: string | null;
}

/**
 * Interface voor kazerne met coördinaten (opgeslagen formaat)
 */
export interface KazerneMetCoords extends KazerneFromJSON {
  lat: number;
  lng: number;
}

/**
 * Controleer of een kazerne geldige coördinaten heeft
 */
function heeftGeldigeCoordinaten(kazerne: KazerneFromJSON): boolean {
  if (!kazerne.latitude || !kazerne.longitude) {
    return false;
  }

  const lat = typeof kazerne.latitude === 'string' ? parseFloat(kazerne.latitude) : kazerne.latitude;
  const lng = typeof kazerne.longitude === 'string' ? parseFloat(kazerne.longitude) : kazerne.longitude;

  // Controleer of coördinaten geldig zijn (Nederland ligt tussen 50-54°N en 3-8°E)
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 50 &&
    lat <= 54 &&
    lng >= 3 &&
    lng <= 8 &&
    lat !== 0 &&
    lng !== 0
  );
}

/**
 * Laad kazernes uit localStorage
 */
export function loadKazernesFromStorage(): KazerneMetCoords[] | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log('⚠️ localStorage niet beschikbaar (server-side rendering)');
      return null;
    }
    
    const raw = localStorage.getItem('kazernes_coords');
    if (!raw) {
      console.log('📭 Geen opgeslagen kazernes gevonden in localStorage');
      return null;
    }
    
    const kazernes = JSON.parse(raw) as KazerneMetCoords[];
    
    // Valideer dat de data correct is
    const validKazernes = kazernes.filter(k => 
      k && 
      k.id && 
      k.naam && 
      typeof k.lat === 'number' && 
      typeof k.lng === 'number' &&
      Number.isFinite(k.lat) &&
      Number.isFinite(k.lng) &&
      k.lat !== 0 &&
      k.lng !== 0
    );
    
    if (validKazernes.length !== kazernes.length) {
      console.warn(`⚠️ ${kazernes.length - validKazernes.length} kazernes uit localStorage zijn ongeldig`);
    }
    
    console.log(`✅ ${validKazernes.length} kazernes geladen uit localStorage (${kazernes.length} totaal)`);
    return validKazernes.length > 0 ? validKazernes : null;
  } catch (error) {
    console.error('❌ Fout bij laden kazernes uit localStorage:', error);
    return null;
  }
}

/**
 * Sla kazernes op in localStorage
 */
export function saveKazernesToStorage(kazernes: KazerneMetCoords[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('⚠️ localStorage niet beschikbaar, kan niet opslaan');
      return;
    }
    
    // Valideer data voordat opslaan
    const validKazernes = kazernes.filter(k => 
      k && 
      k.id && 
      k.naam && 
      typeof k.lat === 'number' && 
      typeof k.lng === 'number' &&
      Number.isFinite(k.lat) &&
      Number.isFinite(k.lng) &&
      k.lat !== 0 &&
      k.lng !== 0
    );
    
    if (validKazernes.length !== kazernes.length) {
      console.warn(`⚠️ ${kazernes.length - validKazernes.length} kazernes hebben ongeldige coördinaten en worden niet opgeslagen`);
    }
    
    localStorage.setItem('kazernes_coords', JSON.stringify(validKazernes));
    console.log(`✅ ${validKazernes.length} kazernes opgeslagen in localStorage`);
  } catch (error) {
    console.error('❌ Fout bij opslaan kazernes in localStorage:', error);
  }
}

/**
 * Wis kazernes uit localStorage (voor debug/test doeleinden)
 */
export function clearKazernesFromStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('⚠️ localStorage niet beschikbaar');
      return;
    }
    
    localStorage.removeItem('kazernes_coords');
    console.log('✅ Kazernes verwijderd uit localStorage');
  } catch (error) {
    console.error('❌ Fout bij verwijderen kazernes uit localStorage:', error);
  }
}

/**
 * Laad kazernes uit JSON bestand (63_kazernes_complete.json)
 */
async function loadKazernesFromJSON(): Promise<KazerneFromJSON[]> {
  try {
    // Probeer eerst via /attached_assets endpoint (geserveerd door server)
    const url = '/attached_assets/63_kazernes_complete.json';
    
    console.log('📖 Laden kazernes uit JSON bestand:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      // Fallback: probeer via API endpoint
      console.log('⚠️ Directe fetch mislukt, probeer via API endpoint...');
      const apiResponse = await fetch('/api/kazernes');
      if (!apiResponse.ok) {
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }
      const kazernes = await apiResponse.json() as KazerneFromJSON[];
      console.log(`✅ ${kazernes.length} kazernes geladen via API endpoint`);
      return kazernes;
    }
    
    const kazernes = await response.json() as KazerneFromJSON[];
    console.log(`✅ ${kazernes.length} kazernes geladen uit JSON bestand`);
    return kazernes;
  } catch (error) {
    console.error('❌ Fout bij laden kazernes uit JSON:', error);
    // Laatste fallback: probeer via API
    try {
      const apiResponse = await fetch('/api/kazernes');
      if (apiResponse.ok) {
        const kazernes = await apiResponse.json() as KazerneFromJSON[];
        console.log(`✅ ${kazernes.length} kazernes geladen via API endpoint (fallback)`);
        return kazernes;
      }
    } catch (apiError) {
      console.error('❌ Ook API fallback mislukt:', apiError);
    }
    throw error;
  }
}

/**
 * Initialiseer kazernes: laad uit localStorage of JSON, geocodeer indien nodig
 * @param onProgress - Callback voor voortgangs updates
 * @returns Array van kazernes met coördinaten
 */
export async function initKazernes(
  onProgress?: (done: number, total: number, current?: string) => void,
  forceRegeocode: boolean = false
): Promise<KazerneMetCoords[]> {
  // Stap 1: Laad uit JSON bestand (altijd, om te controleren op updates)
  console.log('📖 Laden kazernes uit JSON bestand...');
  const kazernesFromJSON = await loadKazernesFromJSON();
  
  // Stap 2: Check of JSON bestand coördinaten heeft - als ja, gebruik die altijd (overschrijf cache)
  const kazernesMetCoordsInJSON = kazernesFromJSON.filter(k => heeftGeldigeCoordinaten(k));
  if (kazernesMetCoordsInJSON.length > 0) {
    console.log(`📖 ${kazernesMetCoordsInJSON.length} kazernes hebben coördinaten in JSON bestand - deze worden gebruikt`);
    // Wis localStorage cache om nieuwe coördinaten uit JSON te forceren
    clearKazernesFromStorage();
  }

  // Stap 3: Laad uit localStorage (alleen als niet geforceerd regeocoderen EN geen coördinaten in JSON)
  if (forceRegeocode) {
    console.log('🔄 Geforceerd regeocoderen - localStorage wordt genegeerd');
    clearKazernesFromStorage();
  } else if (kazernesMetCoordsInJSON.length === 0) {
    // Alleen localStorage gebruiken als er geen coördinaten in JSON zijn
    const cachedKazernes = loadKazernesFromStorage();
    
    // Als we gecachte kazernes hebben en het aantal komt overeen EN alle kazernes hebben coördinaten, gebruik die
    if (cachedKazernes && cachedKazernes.length === kazernesFromJSON.length) {
      // Valideer dat alle kazernes coördinaten hebben
      const allHaveCoords = cachedKazernes.every(k => 
        k && typeof k.lat === 'number' && typeof k.lng === 'number' && 
        Number.isFinite(k.lat) && Number.isFinite(k.lng) && 
        k.lat !== 0 && k.lng !== 0
      );
      
      if (allHaveCoords) {
        console.log(`✅ ${cachedKazernes.length} kazernes geladen uit localStorage - alle kazernes hebben coördinaten`);
        console.log(`📍 Voorbeeld kazerne: ${cachedKazernes[0]?.naam} op ${cachedKazernes[0]?.lat}, ${cachedKazernes[0]?.lng}`);
        return cachedKazernes;
      } else {
        console.log('⚠️ Gecachte kazernes hebben niet allemaal geldige coördinaten, opnieuw geocoderen...');
      }
    } else {
      console.log('📊 Geen complete cache gevonden - kazernes worden geladen uit JSON of gegeocodeerd...');
    }
  }

  // Stap 3: Geocodeer ALLE kazernes automatisch op basis van hun adres (één keer, daarna opgeslagen)
  // Dit gebeurt automatisch bij het laden van de kaart
  console.log(`📊 Automatisch geocoderen van alle ${kazernesFromJSON.length} kazernes op basis van adres...`);
  console.log(`   🔄 Dit gebeurt één keer automatisch - daarna worden de coördinaten opgeslagen`);
  
  const kazernesMetCoordsArray: KazerneMetCoords[] = [];
  const cache = loadGeocodeCache();
  let done = 0;
  let fromCache = 0;
  let geocoded = 0;

  for (const kazerne of kazernesFromJSON) {
    const adresString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
    const kKey = keyForAdres(adresString);
    
    onProgress?.(done, kazernesFromJSON.length, kazerne.naam);

    let lat: number | null = null;
    let lng: number | null = null;

    // PRIORITEIT 1: Gebruik coördinaten uit JSON bestand (als die er zijn en geldig zijn)
    if (heeftGeldigeCoordinaten(kazerne)) {
      const parsedLat = typeof kazerne.latitude === 'string' ? parseFloat(kazerne.latitude) : kazerne.latitude;
      const parsedLng = typeof kazerne.longitude === 'string' ? parseFloat(kazerne.longitude) : kazerne.longitude;
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
        fromCache++;
        console.log(`✅ Coördinaten voor "${kazerne.naam}" uit JSON bestand: ${lat}, ${lng}`);
      }
    }

    // PRIORITEIT 2: Als geen coördinaten in JSON, check geocode cache
    if (lat == null || lng == null) {
      if (cache[kKey]) {
        lat = cache[kKey].lat;
        lng = cache[kKey].lng;
        fromCache++;
        console.log(`✅ Coördinaten voor "${kazerne.naam}" gevonden in geocode cache: ${lat}, ${lng}`);
      }
    }

    // PRIORITEIT 3: Als nog steeds geen coördinaten, geocodeer via API
    if (lat == null || lng == null) {
      // Geocodeer automatisch via Nominatim/PDOK op basis van adres
      try {
        console.log(`🔄 Automatisch geocoderen van "${kazerne.naam}" op basis van adres: ${adresString}...`);
        const geo = await geocodeAdresPDOK(adresString);
        lat = geo.lat;
        lng = geo.lng;
        geocoded++;
        
        // Sla op in cache
        cache[kKey] = {
          lat,
          lng,
          precisie: geo.precisie,
          bagId: geo.bagId,
          bron: geo.bron,
        };
        saveGeocodeCache(cache);
        console.log(`✅ Coördinaten voor "${kazerne.naam}" automatisch opgehaald via ${geo.bron} op basis van adres: ${lat}, ${lng}`);
        
        // Rate limit: 1 seconde tussen requests (Nominatim vereist dit)
        await wait(1000);
      } catch (error) {
        console.error(`❌ Fout bij automatisch geocoding van "${kazerne.naam}" op basis van adres "${adresString}":`, error);
        
        // Als geocoding faalt, skip deze kazerne
        console.error(`❌ Kan geen coördinaten vinden voor "${kazerne.naam}" op basis van adres - wordt overgeslagen`);
        done++;
        onProgress?.(done, kazernesFromJSON.length, kazerne.naam);
        continue;
      }
    }

    if (lat != null && lng != null) {
      kazernesMetCoordsArray.push({
        ...kazerne,
        lat,
        lng,
      });
    }

    done++;
    onProgress?.(done, kazernesFromJSON.length, kazerne.naam);
  }
  
  console.log(`📊 Geocoding resultaten: ${fromCache} uit cache, ${geocoded} nieuw gegeocodeerd`);

  console.log(`✅ Automatische geocoding voltooid: ${kazernesMetCoordsArray.length} kazernes hebben nu coördinaten op basis van hun adres`);
  console.log(`📍 Alle kazernes zijn automatisch gegeocodeerd op basis van hun adres`);

  // Stap 4: Sla alle kazernes op in localStorage (één keer, daarna permanent opgeslagen)
  console.log(`💾 Opslaan van ${kazernesMetCoordsArray.length} kazernes in localStorage (permanent)...`);
  saveKazernesToStorage(kazernesMetCoordsArray);
  
  console.log(`✅ Automatische initialisatie voltooid: ${kazernesMetCoordsArray.length} kazernes klaar voor weergave op kaart`);
  console.log(`📍 Alle kazernes staan nu automatisch op de juiste plek op basis van hun adres`);
  console.log(`💾 Coördinaten zijn permanent opgeslagen - bij volgende keer geen geocoding nodig`);

  return kazernesMetCoordsArray;
}


