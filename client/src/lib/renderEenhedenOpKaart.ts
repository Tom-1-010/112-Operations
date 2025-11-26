import L from 'leaflet';
import { setStatus as setUnitStatusCentral } from './brw-status';

/**
 * Normaliseer roepnummer voor consistente matching
 * Verwijdert spaties, converteert naar lowercase, en normaliseert formaten
 * 
 * @param roepnummer - Het roepnummer om te normaliseren
 * @returns Genormaliseerd roepnummer (bijv. "17-0232")
 */
export function normalizeRoepnummer(roepnummer: string | null | undefined): string {
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
 * Interface voor een voertuig uit BRW eenheden
 */
interface Voertuig {
  roepnummer: string;
  roepnummer_interregionaal?: string;
  type?: string;
  functie?: string;
  post?: string;
  lat?: number;
  lon?: number;
  status?: string; // 'uitrukkend' | 'onderweg' | 'beschikbaar' | 'buiten dienst'
  kazerneNaam?: string; // Voor popup
  origineleLat?: number; // Originele kazerne coördinaat (voor referentie)
  origineleLon?: number; // Originele kazerne coördinaat (voor referentie)
  hiddenFromMap?: boolean; // Of eenheid verborgen moet zijn (VP eenheden)
}

/**
 * Interface voor een kazerne
 */
interface Kazerne {
  id: string;
  naam: string;
  plaats: string;
  latitude: string | number;
  longitude: string | number;
  [key: string]: any;
}

/**
 * Parse BRW eenheden bestand (tab-gescheiden)
 */
function parseBRWEenheden(text: string): Voertuig[] {
  const lines = text.split(/\r?\n/);
  const result: Voertuig[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const cols = trimmed.split('\t');
    if (cols.length < 2) continue;
    
    const roepnummer_interregionaal = cols[0]?.trim();
    const roepnummer = cols[1]?.trim();
    const post = cols[cols.length - 1]?.trim();
    
    if (!roepnummer && !roepnummer_interregionaal) continue;
    if (!post) continue;
    
    const type = cols[2]?.trim() || '';
    const functie = cols[3]?.trim() || '';
    
    // Normaliseer roepnummers voor consistente matching
    const normalizedRoepnummer = normalizeRoepnummer(roepnummer || roepnummer_interregionaal);
    
    result.push({
      roepnummer: normalizedRoepnummer,
      roepnummer_interregionaal: normalizeRoepnummer(roepnummer_interregionaal || roepnummer),
      type: type,
      functie: functie,
      post: post
    });
  }
  
  return result;
}

/**
 * Normaliseer plaatsnaam voor matching
 */
function normalizePlaatsnaam(naam: string | null | undefined): string {
  if (!naam) return '';
  return naam
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Koppel voertuigen aan kazernes op basis van roepnummer/post matching
 */
function koppelVoertuigenAanKazernes(
  voertuigen: Voertuig[],
  kazernes: Kazerne[]
): Map<string, { voertuig: Voertuig; kazerne: Kazerne }> {
  const gekoppeldeVoertuigen = new Map<string, { voertuig: Voertuig; kazerne: Kazerne }>();
  
  // Maak mapping tussen postnamen en kazerne IDs
  const postnaamMapping = new Map<string, Kazerne>();
  
  for (const kazerne of kazernes) {
    const plaatsGenormaliseerd = normalizePlaatsnaam(kazerne.plaats);
    const naamGenormaliseerd = normalizePlaatsnaam(kazerne.naam);
    
    if (plaatsGenormaliseerd) {
      postnaamMapping.set(plaatsGenormaliseerd, kazerne);
    }
    if (naamGenormaliseerd && naamGenormaliseerd !== plaatsGenormaliseerd) {
      postnaamMapping.set(naamGenormaliseerd, kazerne);
    }
    
    // Match op kazerne ID in roepnummer (bijv. "kazerne-002-TS-01" → "kazerne-002")
    const kazerneIdMatch = kazerne.id.match(/kazerne-(\d+)/);
    if (kazerneIdMatch) {
      const kazerneNummer = kazerneIdMatch[1];
      postnaamMapping.set(`kazerne${kazerneNummer}`, kazerne);
      postnaamMapping.set(`kazerne-${kazerneNummer}`, kazerne);
    }
  }
  
  // Speciale mappings voor gevallen die niet direct matchen
  const specialeMappings: Record<string, string> = {
    'hoekvanholland': 'kazerne-001',
    'maassluis': 'kazerne-002',
    'vlaardingen': 'kazerne-003',
    'schiedam': 'kazerne-004',
    'frobenstraat': 'kazerne-005',
    'baan': 'kazerne-006',
    'berkelenrodenrijs': 'kazerne-007',
    'bleiswijk': 'kazerne-008',
    'bosland': 'kazerne-009',
    'metaalhof': 'kazerne-010',
    'capelleaandijssel': 'kazerne-011',
    'capellea/dijssel': 'kazerne-011',
    'capelleadijssel': 'kazerne-011',
    'krimpenaandijssel': 'kazerne-012',
    'krimpena/dijssel': 'kazerne-012',
    'krimpenadijssel': 'kazerne-012',
    'maximaweg': 'kazerne-013',
    'gb-maximaweg': 'kazerne-013',
    'gbmaximaweg': 'kazerne-013',
    'coloradoweg': 'kazerne-014',
    'gb-coloradoweg': 'kazerne-014',
    'gbcoloradoweg': 'kazerne-014',
    'elbeweg': 'kazerne-015',
    'gb-elbeweg': 'kazerne-015',
    'gbelbeweg': 'kazerne-015',
    'hoofdkantoor': 'kazerne-016',
    'gb-hoofdkantoor': 'kazerne-016',
    'gbhoofdkantoor': 'kazerne-016',
    'rozenburg': 'kazerne-017',
    'gb-rozenburg': 'kazerne-017',
    'gbrozenburg': 'kazerne-017',
    'franshalsstraat': 'kazerne-018',
    'merseyweg': 'kazerne-019',
    'gb-merseyweg': 'kazerne-019',
    'gbmerseyweg': 'kazerne-019',
    'botlekweg': 'kazerne-020',
    'gb-botlekweg': 'kazerne-020',
    'gbbotlekweg': 'kazerne-020',
    'butaanweg': 'kazerne-021',
    'gb-butaanweg': 'kazerne-021',
    'gbbutaanweg': 'kazerne-021',
    'hoogvliet': 'kazerne-022',
    'gb-hoogvliet': 'kazerne-022',
    'gbhoogvliet': 'kazerne-022',
    'rockanje': 'kazerne-023',
    'oostvoorne': 'kazerne-024',
    'hellevoetsluis': 'kazerne-025',
    'brielle': 'kazerne-026',
    'zwartewaal': 'kazerne-027',
    'oudenhoorn': 'kazerne-028',
    'heenvliet': 'kazerne-029',
    'zuidland': 'kazerne-030',
    'spijkenisse': 'kazerne-031',
    'albrandswaard': 'kazerne-032',
    'keijenburg': 'kazerne-033',
    'mijnsherenlaan': 'kazerne-034',
    'albertplesmanweg': 'kazerne-035',
    'barendrecht': 'kazerne-036',
    'groenetuin': 'kazerne-037',
    'ridderkerk': 'kazerne-038',
    'ouddorp': 'kazerne-039',
    'goedereede': 'kazerne-040',
    'stellendam': 'kazerne-041',
    'melissant': 'kazerne-042',
    'dirksland': 'kazerne-043',
    'herkingen': 'kazerne-044',
    'olympiaweg': 'kazerne-045',
    'olympia': 'kazerne-045',
    'nieuwetonge': 'kazerne-046',
    'stadaanhetharingvliet': 'kazerne-047',
    'stada/haringvliet': 'kazerne-047',
    'stadaharingvliet': 'kazerne-047',
    'oudetonge': 'kazerne-048',
    'denbommel': 'kazerne-049',
    'ooltgensplaat': 'kazerne-050',
  };
  
  // Voeg speciale mappings toe aan postnaamMapping
  for (const [key, kazerneId] of Object.entries(specialeMappings)) {
    const kazerne = kazernes.find(k => k.id === kazerneId);
    if (kazerne) {
      postnaamMapping.set(key, kazerne);
    }
  }
  
  // Koppel voertuigen aan kazernes
  let gekoppeld = 0;
  let nietGekoppeld = 0;
  const nietGekoppeldeVoertuigen: Voertuig[] = [];
  
  for (const voertuig of voertuigen) {
    const postGenormaliseerd = normalizePlaatsnaam(voertuig.post);
    const kazerne = postnaamMapping.get(postGenormaliseerd);
    
    // Probeer ook te matchen op roepnummer (bijv. "kazerne-002-TS-01" → "kazerne-002")
    let matchedKazerne = kazerne;
    if (!matchedKazerne && voertuig.roepnummer) {
      const roepnummerMatch = voertuig.roepnummer.match(/kazerne-(\d+)/i);
      if (roepnummerMatch) {
        const kazerneId = `kazerne-${roepnummerMatch[1]}`;
        matchedKazerne = kazernes.find(k => k.id === kazerneId);
      }
    }
    
    if (matchedKazerne) {
      const lat = typeof matchedKazerne.latitude === 'string' 
        ? parseFloat(matchedKazerne.latitude) 
        : matchedKazerne.latitude;
      const lon = typeof matchedKazerne.longitude === 'string' 
        ? parseFloat(matchedKazerne.longitude) 
        : matchedKazerne.longitude;
      
      if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
        voertuig.lat = lat;
        voertuig.lon = lon;
        // Normaliseer roepnummer voor consistente opslag
        const normalizedRoepnummer = normalizeRoepnummer(voertuig.roepnummer);
        gekoppeldeVoertuigen.set(normalizedRoepnummer, {
          voertuig: { ...voertuig, roepnummer: normalizedRoepnummer },
          kazerne: matchedKazerne
        });
        gekoppeld++;
        console.log(`✅ Gekoppeld: ${voertuig.roepnummer} → ${matchedKazerne.naam} (genormaliseerd: ${normalizedRoepnummer})`);
      } else {
        nietGekoppeld++;
        nietGekoppeldeVoertuigen.push(voertuig);
        console.warn(`⚠️ Geen geldige coördinaten voor kazerne ${matchedKazerne.naam} (voertuig: ${voertuig.roepnummer})`);
      }
    } else {
      nietGekoppeld++;
      nietGekoppeldeVoertuigen.push(voertuig);
      console.warn(`⚠️ Geen kazerne gevonden voor voertuig ${voertuig.roepnummer} (post: ${voertuig.post})`);
    }
  }
  
  console.log(`\n📊 Koppeling resultaten:`);
  console.log(`   ✅ Gekoppeld: ${gekoppeld}`);
  console.log(`   ❌ Niet gekoppeld: ${nietGekoppeld}`);
  
  if (nietGekoppeldeVoertuigen.length > 0) {
    console.log(`\n❌ Niet gekoppelde voertuigen:`);
    nietGekoppeldeVoertuigen.slice(0, 10).forEach(v => {
      console.log(`   - ${v.roepnummer} (post: ${v.post})`);
    });
    if (nietGekoppeldeVoertuigen.length > 10) {
      console.log(`   ... en ${nietGekoppeldeVoertuigen.length - 10} meer`);
    }
  }
  
  return gekoppeldeVoertuigen;
}

/**
 * Maak een custom voertuig icon voor Leaflet (rechthoekig label zoals in voorbeeld)
 */
function createUnitIcon(voertuig: Voertuig): L.DivIcon {
  // Statuskleuren mapping
  const statusColorMap: Record<string, string> = {
    'uitrukkend': '#E53935',
    'onderweg': '#FB8C00',
    'beschikbaar': '#43A047',
    'buiten dienst': '#9E9E9E',
    'ter plaatse': '#E53935', // Rood voor ter plaatse
    'rijdend': '#FB8C00', // Oranje voor rijdend
  };

  // Bepaal statuskleur (standaard: beschikbaar = groen)
  const status = (voertuig.status || 'beschikbaar').toLowerCase();
  const statusColor = statusColorMap[status] || '#43A047';

  // Functiecode: gebruik type als functiecode (bijv. "TS", "HV", "DB")
  const functiecode = voertuig.type || '?';

  // Roepnummer
  const roepnummer = voertuig.roepnummer || '?';

  return L.divIcon({
    className: 'voertuig-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        overflow: hidden;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        height: 24px;
        min-width: 80px;
      ">
        <div style="
          width: 6px;
          height: 100%;
          background: ${statusColor};
          flex-shrink: 0;
        "></div>
        <div style="
          padding: 2px 6px;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          flex: 1;
          text-align: center;
        ">${roepnummer}</div>
        <div style="
          background: linear-gradient(to bottom right, #0047AB, #007BFF);
          color: white;
          padding: 2px 6px;
          font-weight: bold;
          border-left: 1px solid #ccc;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-width: 28px;
          font-size: 11px;
        ">${functiecode}</div>
      </div>
    `,
    iconSize: [90, 24],
    iconAnchor: [45, 12],
    popupAnchor: [0, -12]
  });
}

/**
 * Store voor voertuig markers (roepnummer → marker)
 */
const voertuigMarkers = new Map<string, L.Marker>();

/**
 * Store voor actieve routes (roepnummer → route polyline)
 */
const actieveRoutes = new Map<string, L.Polyline>();

/**
 * Store voor actieve animaties (roepnummer → interval ID)
 */
const actieveAnimaties = new Map<string, NodeJS.Timeout>();

/**
 * Render alle voertuigen op de kaart
 */
export async function renderEenhedenOpKaart(map: L.Map): Promise<void> {
  console.log('🚀 Start laden voertuigen en kazernes...');
  
  // Verwijder eerst bestaande markers om dubbele markers te voorkomen
  clearEenheden();
  
  try {
    // Laad kazernes
    console.log('📖 Laden kazernes...');
    const base = (import.meta as any)?.env?.BASE_URL || '/';
    let kazernes: Kazerne[] = [];
    
    const kazernesResponse = await fetch(`${base}attached_assets/63_kazernes_complete.json`);
    if (!kazernesResponse.ok) {
      // Probeer alternatief pad via API
      const altResponse = await fetch('/api/kazernes-with-voertuigen');
      if (!altResponse.ok) {
        throw new Error(`Kan kazernes niet laden: ${kazernesResponse.status}`);
      }
      const kazernesData = await altResponse.json();
      // Extract kazernes uit de response (zonder voertuigen)
      kazernes = kazernesData.map((k: any) => ({
        id: k.id,
        naam: k.naam,
        plaats: k.plaats,
        latitude: k.latitude,
        longitude: k.longitude,
      }));
      console.log(`✅ ${kazernes.length} kazernes geladen via API`);
    } else {
      kazernes = await kazernesResponse.json();
      console.log(`✅ ${kazernes.length} kazernes geladen`);
    }
    
    // Laad BRW eenheden
    console.log('📖 Laden BRW eenheden...');
    const brwResponse = await fetch(`${base}data/BRW%20eenheden.json`);
    if (!brwResponse.ok) {
      throw new Error(`Kan BRW eenheden niet laden: ${brwResponse.status}`);
    }
    const brwText = await brwResponse.text();
    const voertuigen = parseBRWEenheden(brwText);
    console.log(`✅ ${voertuigen.length} voertuigen geladen`);
    
    // Koppel voertuigen aan kazernes
    console.log('\n🔗 Koppelen voertuigen aan kazernes...');
    const gekoppeldeVoertuigen = koppelVoertuigenAanKazernes(voertuigen, kazernes);
    
    // Groepeer voertuigen per kazerne
    const voertuigenPerKazerne = new Map<string, Array<{ voertuig: Voertuig; kazerne: Kazerne }>>();
    
    gekoppeldeVoertuigen.forEach(({ voertuig, kazerne }) => {
      if (voertuig.lat && voertuig.lon) {
        const kazerneId = kazerne.id;
        if (!voertuigenPerKazerne.has(kazerneId)) {
          voertuigenPerKazerne.set(kazerneId, []);
        }
        voertuigenPerKazerne.get(kazerneId)!.push({ voertuig, kazerne });
      }
    });
    
    console.log(`📊 ${voertuigenPerKazerne.size} kazernes met voertuigen gevonden`);
    
    // Voeg voertuigen toe aan kaart met offset per kazerne
    console.log('\n🗺️ Voeg voertuigen toe aan kaart met offset...');
    
    // Schaalbare offset: basis offset in graden (ongeveer 20 meter)
    // Bij veel voertuigen wordt de offset groter om overlap te voorkomen
    const baseOffset = 0.0002; // ~20 meter
    
    voertuigenPerKazerne.forEach((voertuigenLijst, kazerneId) => {
      const kazerne = voertuigenLijst[0].kazerne;
      const baseLat = typeof kazerne.latitude === 'string' 
        ? parseFloat(kazerne.latitude) 
        : kazerne.latitude;
      const baseLon = typeof kazerne.longitude === 'string' 
        ? parseFloat(kazerne.longitude) 
        : kazerne.longitude;
      
      if (isNaN(baseLat) || isNaN(baseLon) || baseLat === 0 || baseLon === 0) {
        console.warn(`⚠️ Kazerne ${kazerne.naam} heeft geen geldige coördinaten`);
        return;
      }
      
      const totalVoertuigen = voertuigenLijst.length;
      
      // Schaal offset op basis van aantal voertuigen
      // Bij 1-5 voertuigen: basis offset
      // Bij 6-10 voertuigen: 1.5x offset
      // Bij 11+ voertuigen: 2x offset
      const offsetMultiplier = totalVoertuigen <= 5 ? 1 : totalVoertuigen <= 10 ? 1.5 : 2;
      const offset = baseOffset * offsetMultiplier;
      
      voertuigenLijst.forEach(({ voertuig }, index) => {
        // Filter VP (voertuigpost/verzamelpunt) eenheden - deze horen niet op de kaart
        if (voertuig.type === 'VP' || voertuig.functie === 'VP' || voertuig.type === 'AVP') {
          console.log(`🚫 VP eenheid ${voertuig.roepnummer} overgeslagen (niet zichtbaar op kaart)`);
          return; // Skip deze eenheid
        }
        
        // Bereken hoek in cirkel (evenredig verdeeld)
        const angle = (index / totalVoertuigen) * 2 * Math.PI;
        
        // Bereken offset coördinaten in cirkel rond kazernepunt
        const offsetLat = baseLat + Math.sin(angle) * offset;
        const offsetLon = baseLon + Math.cos(angle) * offset;
        
        // Voeg standaard status toe als deze niet bestaat (standaard: beschikbaar)
        if (!voertuig.status) {
          voertuig.status = 'beschikbaar';
        }
        
        // Sla voertuig data op (met kazerne referentie voor popup)
        // Bewaar originele kazerne coördinaten voor referentie
        // Normaliseer roepnummer voor consistente opslag
        const normalizedRoepnummer = normalizeRoepnummer(voertuig.roepnummer);
        const voertuigMetKazerne = { 
          ...voertuig, 
          roepnummer: normalizedRoepnummer, // Zorg dat roepnummer genormaliseerd is
          kazerneNaam: kazerne.naam,
          origineleLat: baseLat,
          origineleLon: baseLon,
          hiddenFromMap: false // Markeer als zichtbaar
        };
        voertuigData.set(normalizedRoepnummer, voertuigMetKazerne);
        
        // Maak custom icon voor dit voertuig
        const voertuigIcon = createUnitIcon(voertuig);
        
        // Plaats marker op offset positie (visueel, originele coördinaten blijven behouden)
        const marker = L.marker([offsetLat, offsetLon], { icon: voertuigIcon })
          .addTo(map)
          .bindPopup(`
            <b>Roepnummer:</b> ${voertuig.roepnummer}<br>
            <b>Type:</b> ${voertuig.type || 'Onbekend'}<br>
            <b>Functie:</b> ${voertuig.functie || 'Onbekend'}<br>
            <b>Status:</b> ${voertuig.status || 'Beschikbaar'}<br>
            <b>Kazerne:</b> ${kazerne.naam}
          `);
        
        voertuigMarkers.set(normalizedRoepnummer, marker);
      });
      
      console.log(`   ✅ ${totalVoertuigen} voertuigen toegevoegd voor ${kazerne.naam} (offset: ${(offset * 111000).toFixed(0)}m)`);
    });
    
    // Herstel opgeslagen posities na het laden van alle markers
    const savedPositions = loadSavedUnitPositions();
    savedPositions.forEach((position, roepnummer) => {
      const marker = voertuigMarkers.get(roepnummer);
      if (marker) {
        marker.setLatLng([position.lat, position.lon]);
        const voertuig = voertuigData.get(roepnummer);
        if (voertuig) {
          voertuig.lat = position.lat;
          voertuig.lon = position.lon;
        }
        console.log(`📍 Herstelde positie voor ${roepnummer}: ${position.lat}, ${position.lon}`);
      }
    });
    
    console.log(`✅ ${voertuigMarkers.size} voertuigen toegevoegd aan kaart`);
    
    // Log alle beschikbare roepnummers voor debugging
    const alleRoepnummers = Array.from(voertuigMarkers.keys()).sort();
    console.log(`📋 Beschikbare roepnummers op kaart (${alleRoepnummers.length}):`, alleRoepnummers.slice(0, 20).join(', '), alleRoepnummers.length > 20 ? `... en ${alleRoepnummers.length - 20} meer` : '');
    
    // Dispatch event dat markers geladen zijn
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voertuigMarkersLoaded', {
        detail: { count: voertuigMarkers.size, roepnummers: alleRoepnummers }
      }));
      
      // Luister naar statuswijzigingen en update kaartmarkers
      const handleStatusChanged = (event: CustomEvent) => {
        const { roepnummer, newStatusCode } = event.detail;
        
        // Map statuscode naar kaart status
        const statusMap: Record<string, string> = {
          'ov': 'uitrukkend',
          'ut': 'onderweg',
          'tp': 'ter plaatse',
          'ir': 'beschikbaar',
          'bs': 'beschikbaar',
          'kz': 'beschikbaar'
        };
        
        const mapStatus = statusMap[newStatusCode] || 'beschikbaar';
        updateEenheidStatus(roepnummer, mapStatus);
      };
      
      window.addEventListener('unitStatusChanged', handleStatusChanged as EventListener);
    }
  } catch (error) {
    console.error('❌ Fout bij renderen voertuigen op kaart:', error);
    throw error;
  }
}

/**
 * Store voor voertuig data (roepnummer → voertuig)
 */
const voertuigData = new Map<string, Voertuig>();

/**
 * Laad opgeslagen unit posities uit localStorage
 */
function loadSavedUnitPositions(): Map<string, { lat: number; lon: number }> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return new Map();
    const saved = window.localStorage.getItem('savedUnitPositions');
    if (saved) {
      const data = JSON.parse(saved) as Record<string, { lat: number; lon: number }>;
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.warn('Fout bij laden opgeslagen unit posities:', error);
  }
  return new Map();
}

/**
 * Sla unit posities op in localStorage
 */
function saveUnitPositions(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const positions: Record<string, { lat: number; lon: number }> = {};
    voertuigMarkers.forEach((marker, roepnummer) => {
      const pos = marker.getLatLng();
      positions[roepnummer] = { lat: pos.lat, lon: pos.lng };
    });
    window.localStorage.setItem('savedUnitPositions', JSON.stringify(positions));
  } catch (error) {
    console.warn('Fout bij opslaan unit posities:', error);
  }
}

/**
 * Verplaats een voertuig naar een nieuwe locatie
 * MARKER IS DE BRON VAN WAARHEID - unit.lat/lng worden afgeleid van marker positie
 */
export function moveEenheid(roepnummer: string, newLat: number, newLon: number): void {
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  const marker = voertuigMarkers.get(normalizedRoepnummer);
  if (marker) {
    // Marker is de bron van waarheid - verplaats marker
    marker.setLatLng([newLat, newLon]);
    
    // Update data op basis van marker positie (afgeleid)
    const voertuig = voertuigData.get(normalizedRoepnummer);
    if (voertuig) {
      const pos = marker.getLatLng();
      voertuig.lat = pos.lat;
      voertuig.lon = pos.lng;
    }
    
    // Sla positie op voor persistentie
    saveUnitPositions();
    
    console.log(`✅ Voertuig ${normalizedRoepnummer} verplaatst naar ${newLat}, ${newLon}`);
  } else {
    console.warn(`⚠️ Marker niet gevonden voor voertuig ${normalizedRoepnummer} (origineel: ${roepnummer})`);
    // Probeer alle keys om te zien welke er zijn
    const alleRoepnummers = Array.from(voertuigMarkers.keys());
    console.log(`   Beschikbare roepnummers: ${alleRoepnummers.slice(0, 10).join(', ')}${alleRoepnummers.length > 10 ? '...' : ''}`);
  }
}

/**
 * Update de status van een voertuig (en daarmee de kleur van de marker)
 */
export function updateEenheidStatus(roepnummer: string, status: string): void {
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  const marker = voertuigMarkers.get(normalizedRoepnummer);
  const voertuig = voertuigData.get(normalizedRoepnummer);
  
  if (marker && voertuig) {
    // Update status in data
    voertuig.status = status;
    
    // Maak nieuwe icon met nieuwe statuskleur
    const newIcon = createUnitIcon(voertuig);
    
    // Update marker icon
    marker.setIcon(newIcon);
    
    // Update popup met nieuwe status
    const popup = marker.getPopup();
    if (popup) {
      const kazerneNaam = voertuig.kazerneNaam || 'Onbekend';
      popup.setContent(`
        <b>Roepnummer:</b> ${voertuig.roepnummer}<br>
        <b>Type:</b> ${voertuig.type || 'Onbekend'}<br>
        <b>Functie:</b> ${voertuig.functie || 'Onbekend'}<br>
        <b>Status:</b> ${status}<br>
        <b>Kazerne:</b> ${kazerneNaam}
      `);
    }
    
    console.log(`✅ Status van voertuig ${normalizedRoepnummer} bijgewerkt naar: ${status}`);
  } else {
    console.warn(`⚠️ Marker of voertuig niet gevonden voor ${normalizedRoepnummer} (origineel: ${roepnummer})`);
    // Probeer alle keys om te zien welke er zijn
    const alleRoepnummers = Array.from(voertuigMarkers.keys());
    console.log(`   Beschikbare roepnummers: ${alleRoepnummers.slice(0, 10).join(', ')}${alleRoepnummers.length > 10 ? '...' : ''}`);
  }
}

/**
 * Verwijder alle voertuig markers van de kaart
 */
export function clearEenheden(): void {
  voertuigMarkers.forEach((marker) => {
    marker.remove();
  });
  voertuigMarkers.clear();
  voertuigData.clear();
  console.log('✅ Alle voertuig markers verwijderd');
}

/**
 * Haal alle voertuig markers op
 */
export function getVoertuigMarkers(): Map<string, L.Marker> {
  return voertuigMarkers;
}

/**
 * Haal alle beschikbare roepnummers op (voor debugging)
 */
export function getBeschikbareRoepnummers(): string[] {
  return Array.from(voertuigMarkers.keys()).sort();
}

/**
 * Check of een roepnummer bestaat op de kaart
 */
export function heeftRoepnummer(roepnummer: string): boolean {
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  return voertuigMarkers.has(normalizedRoepnummer);
}

/**
 * Interface voor een melding/incident
 */
interface Melding {
  lat: number;
  lon: number;
  id?: number | string;
  nr?: number;
  [key: string]: any;
}

/**
 * Bereken afstand tussen twee punten in kilometers (Haversine formule)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Aardstraal in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Haal route op van voertuig naar melding via OSRM API
 */
async function getRoute(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.routes && data.routes.length > 0) {
      // OSRM geeft coördinaten als [lon, lat], converteren naar [lat, lon] voor Leaflet
      const coordinates = data.routes[0].geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
      console.log(`✅ Route gevonden: ${coordinates.length} punten`);
      return coordinates;
    }
    
    console.warn('⚠️ Geen route gevonden in OSRM response');
    return [];
  } catch (error) {
    console.error('❌ Fout bij ophalen route:', error);
    return [];
  }
}

/**
 * Laat een voertuig realistisch via de weg naar een melding rijden
 */
export async function rijdNaarMelding(
  roepnummer: string, 
  melding: Melding, 
  map: L.Map,
  options?: {
    snelheid?: number; // km/u, standaard 80
    updateInterval?: number; // ms, standaard 100
    toonRoute?: boolean; // Of de route moet worden getekend, standaard true
    retryCount?: number; // Aantal retries als marker nog niet geladen is
  }
): Promise<void> {
  // Bewaar origineel roepnummer voor events
  const origineelRoepnummer = roepnummer;
  // Normaliseer roepnummer voor interne matching
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  
  // Stop eventuele bestaande animatie voor dit voertuig
  stopRit(normalizedRoepnummer);
  
  const marker = voertuigMarkers.get(normalizedRoepnummer);
  const voertuig = voertuigData.get(normalizedRoepnummer);
  
  if (!marker || !voertuig) {
    // Als markers nog niet geladen zijn, probeer opnieuw na korte delay
    const retryCount = (options?.retryCount || 0) + 1;
    if (retryCount < 10) { // Max 10 retries (tot 5 seconden)
      console.log(`⏳ Marker voor ${normalizedRoepnummer} nog niet geladen, retry ${retryCount}/10...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wacht 500ms
      return rijdNaarMelding(roepnummer, melding, map, { ...options, retryCount });
    }
    
    console.warn(`⚠️ Voertuig ${normalizedRoepnummer} niet gevonden na ${retryCount} pogingen (origineel: ${roepnummer})`);
    // Probeer alle keys om te zien welke er zijn
    const alleRoepnummers = Array.from(voertuigMarkers.keys()).sort();
    console.log(`   Totaal ${alleRoepnummers.length} markers geladen`);
    console.log(`   Beschikbare roepnummers (eerste 30): ${alleRoepnummers.slice(0, 30).join(', ')}`);
    
    // Probeer verschillende matching strategieën
    // 1. Directe match zonder normalisatie
    const directMatch = voertuigMarkers.get(roepnummer.toLowerCase());
    if (directMatch) {
      console.log(`   ✅ Directe match gevonden zonder normalisatie voor: ${roepnummer}`);
      const directVoertuig = voertuigData.get(roepnummer.toLowerCase());
      if (directVoertuig) {
        voertuigMarkers.set(normalizedRoepnummer, directMatch);
        voertuigData.set(normalizedRoepnummer, directVoertuig);
        voertuigMarkers.delete(roepnummer.toLowerCase());
        voertuigData.delete(roepnummer.toLowerCase());
        console.log(`   ✅ Roepnummer genormaliseerd: ${roepnummer.toLowerCase()} → ${normalizedRoepnummer}`);
        return rijdNaarMelding(roepnummer, melding, map, { ...options, retryCount: 0 });
      }
    }
    
    // 2. Probeer partial match (bijv. "17-2631" matcht met "17-2631" of "172631")
    const partialMatches = alleRoepnummers.filter(rn => 
      rn.includes(normalizedRoepnummer) || normalizedRoepnummer.includes(rn) ||
      rn.replace(/-/g, '') === normalizedRoepnummer.replace(/-/g, '')
    );
    if (partialMatches.length > 0) {
      console.log(`   🔍 Partial matches gevonden: ${partialMatches.join(', ')}`);
      const bestMatch = partialMatches[0];
      const matchedMarker = voertuigMarkers.get(bestMatch);
      const matchedVoertuig = voertuigData.get(bestMatch);
      if (matchedMarker && matchedVoertuig) {
        console.log(`   ✅ Gebruik best match: ${bestMatch} voor ${normalizedRoepnummer}`);
        // Update met genormaliseerd roepnummer
        voertuigMarkers.set(normalizedRoepnummer, matchedMarker);
        voertuigData.set(normalizedRoepnummer, matchedVoertuig);
        voertuigMarkers.delete(bestMatch);
        voertuigData.delete(bestMatch);
        return rijdNaarMelding(roepnummer, melding, map, { ...options, retryCount: 0 });
      }
    }
    
    console.error(`   ❌ Geen match gevonden voor ${normalizedRoepnummer} (origineel: ${roepnummer})`);
    return;
  }
  
  // Check of eenheid verborgen is (VP eenheden)
  if (voertuig.hiddenFromMap) {
    console.log(`🚫 VP eenheid ${normalizedRoepnummer} overgeslagen (niet zichtbaar op kaart)`);
    return;
  }
  
  // MARKER IS DE BRON VAN WAARHEID - haal coördinaten van marker
  const markerPos = marker.getLatLng();
  if (!markerPos || !markerPos.lat || !markerPos.lng) {
    console.warn(`⚠️ Voertuig ${normalizedRoepnummer} marker heeft geen geldige coördinaten`);
    return;
  }
  
  // Update voertuig data op basis van marker (afgeleid)
  voertuig.lat = markerPos.lat;
  voertuig.lon = markerPos.lng;
  
  if (!melding.lat || !melding.lon) {
    console.warn(`⚠️ Melding heeft geen geldige coördinaten`);
    return;
  }
  
  // Opties
  const snelheidKmh = options?.snelheid || 80; // km/u
  const updateInterval = options?.updateInterval || 100; // ms
  const toonRoute = options?.toonRoute !== false; // standaard true
  
  // Statusflow volgens uitrukvolgorde:
  // 1. Eenheid gekoppeld → "ov" (opdracht verstrekt) - al gebeurd bij koppelen
  // 2. Eenheid gaat rijden → "ut" (uitgerukt, getoond als "ar" in UI)
  // 3. Eenheid ter plaatse → "tp"
  
  // Start met status "ut" (uitgerukt) wanneer eenheid begint te rijden
  // Check of status al OV is (van koppelen), anders zet OV eerst
  const { getUnitPosition } = await import('../services/globalUnitMovement');
  let unitPosition = getUnitPosition(roepnummer);
  
  // Als status nog niet OV is, zet OV eerst (normaal al gebeurd bij koppelen)
  if (!unitPosition || unitPosition.statusCode !== 'ov') {
    const { assignVehicleToIncident } = await import('../services/globalUnitMovement');
    assignVehicleToIncident(roepnummer, melding.id || '');
    // Herhaal unitPosition na assignVehicleToIncident
    unitPosition = getUnitPosition(roepnummer);
  }
  
  // Zorg dat target is gezet in globalUnitMovement service
  // De movement loop zal automatisch de status van OV naar UT zetten wanneer beweging start
  if (unitPosition) {
    const { startMovement } = await import('../services/globalUnitMovement');
    // Start beweging via globalUnitMovement service (dit zet target en status OV)
    await startMovement(roepnummer, melding.lat, melding.lon, 'incident', melding.id);
  }
  
  // De movement loop zal automatisch de status van OV naar UT zetten
  // updateEenheidStatus wordt aangeroepen via unitStatusChanged event listener
  
  console.log(`🚗 ${normalizedRoepnummer} start rit naar melding ${melding.id || melding.nr || 'onbekend'}`);
  
  // Haal route op (gebruik marker positie als startpunt)
  const startPos = marker.getLatLng();
  const route = await getRoute(
    { lat: startPos.lat, lon: startPos.lng },
    { lat: melding.lat, lon: melding.lon }
  );
  
  if (route.length === 0) {
    console.warn(`⚠️ Geen route gevonden voor ${normalizedRoepnummer}`);
    return;
  }
  
  // Teken route lijn op kaart (optioneel)
  let routeLine: L.Polyline | null = null;
  if (toonRoute) {
    routeLine = L.polyline(route, {
      color: '#ef4444', // Rood
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 5'
    }).addTo(map);
    actieveRoutes.set(normalizedRoepnummer, routeLine);
  }
  
  // Bereken snelheid in m/s
  const snelheidMs = (snelheidKmh / 3.6);
  
  // Bereken afstand tussen routepunten en totale afstand
  let totaleAfstand = 0;
  const afstanden: number[] = [0];
  
  for (let i = 1; i < route.length; i++) {
    const [lat1, lon1] = route[i - 1];
    const [lat2, lon2] = route[i];
    
    // Haversine formule voor afstand tussen twee punten
    const R = 6371000; // Aardstraal in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const afstand = R * c;
    
    totaleAfstand += afstand;
    afstanden.push(totaleAfstand);
  }
  
  // Bereken tijd per update interval
  const afstandPerUpdate = (snelheidMs * updateInterval) / 1000; // meters per update
  const totaleTijd = (totaleAfstand / snelheidMs) / 1000; // totale tijd in seconden
  
  console.log(`📍 Route: ${totaleAfstand.toFixed(0)}m, geschatte tijd: ${(totaleTijd / 60).toFixed(1)} minuten`);
  
  // Animatielogica
  let huidigeAfstand = 0;
  let routeIndex = 0;
  let lastSaveTime = Date.now();
  
  const interval = setInterval(() => {
    // Update huidige afstand
    huidigeAfstand += afstandPerUpdate;
    
    // Vind huidige positie op route
    while (routeIndex < afstanden.length - 1 && huidigeAfstand > afstanden[routeIndex + 1]) {
      routeIndex++;
    }
    
    // Check of we bij het einde zijn
    if (routeIndex >= route.length - 1 || huidigeAfstand >= totaleAfstand) {
      // Bij eindpunt
      const [eindLat, eindLon] = route[route.length - 1];
      marker.setLatLng([eindLat, eindLon]);
      
      // Update voertuig data op basis van marker positie (afgeleid)
      const pos = marker.getLatLng();
      voertuig.lat = pos.lat;
      voertuig.lon = pos.lng;
      
      // Sla positie op voor persistentie
      saveUnitPositions();
      
      // Update status naar "tp" (ter plaatse) - gebruik centrale statusmodule
      setUnitStatusCentral(voertuig, 'tp', {
        incidentId: melding.id,
        coordinates: [eindLat, eindLon]
      });
      updateEenheidStatus(normalizedRoepnummer, 'ter plaatse'); // Voor kaartweergave
      
      // Dispatch event voor GMS2 status update (TP - Ter plaatse)
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        console.log(`📡 Dispatch unitArrival event: roepnummer=${origineelRoepnummer}, status=tp, incidentId=${melding.id}`);
        window.dispatchEvent(new CustomEvent('unitArrival', {
          detail: {
            roepnummer: origineelRoepnummer, // Gebruik origineel roepnummer voor matching
            status: 'tp', // Ter plaatse
            coordinates: [eindLat, eindLon],
            incidentId: melding.id
          }
        }));
      }
      
      // Update route lijn naar groen
      if (routeLine) {
        routeLine.setStyle({ color: '#10b981', dashArray: null }); // Groen, geen streepjes
      }
      
      // Stop animatie
      clearInterval(interval);
      actieveAnimaties.delete(normalizedRoepnummer);
      
      console.log(`✅ ${normalizedRoepnummer} is ter plaatse bij melding ${melding.id || melding.nr || 'onbekend'}`);
      return;
    }
    
    // Interpoleer tussen huidige en volgende routepunt
    const [lat1, lon1] = route[routeIndex];
    const [lat2, lon2] = route[routeIndex + 1];
    
    const afstandTotVolgende = afstanden[routeIndex + 1] - afstanden[routeIndex];
    const afstandInSegment = huidigeAfstand - afstanden[routeIndex];
    const ratio = afstandInSegment / afstandTotVolgende;
    
    // Lineaire interpolatie
    const lat = lat1 + (lat2 - lat1) * ratio;
    const lon = lon1 + (lon2 - lon1) * ratio;
    
    // Update marker positie (marker is de bron van waarheid)
    marker.setLatLng([lat, lon]);
    
    // Update voertuig data op basis van marker positie (afgeleid)
    const pos = marker.getLatLng();
    voertuig.lat = pos.lat;
    voertuig.lon = pos.lng;
    
    // Sla positie op voor persistentie (throttled - elke 5 seconden)
    const now = Date.now();
    if (now - lastSaveTime > 5000) {
      saveUnitPositions();
      lastSaveTime = now;
    }
    
    // Dispatch movement event voor status updates
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('unitMoved', {
        detail: {
          roepnummer: origineelRoepnummer,
          normalizedRoepnummer: normalizedRoepnummer,
          position: { lat: pos.lat, lng: pos.lng },
          incidentId: melding.id,
          targetType: 'incident'
        }
      }));
    }
    
    // Bereken afstand tot incident voor status updates
    const distanceToIncident = calculateDistance(pos.lat, pos.lng, melding.lat, melding.lon);
    
    // Update status naar "tp" (ter plaatse) bij <50m van incident
    if (distanceToIncident < 0.05 && voertuig.status === 'onderweg') { // 0.05 km = 50m
      setUnitStatusCentral(voertuig, 'tp', {
        incidentId: melding.id,
        coordinates: [pos.lat, pos.lng]
      });
      updateEenheidStatus(normalizedRoepnummer, 'ter plaatse'); // Voor kaartweergave
      
      // Dispatch event voor GMS2 status update (TP - Ter plaatse)
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        console.log(`📡 Dispatch unitArrival event: roepnummer=${origineelRoepnummer}, status=tp, incidentId=${melding.id}`);
        window.dispatchEvent(new CustomEvent('unitArrival', {
          detail: {
            roepnummer: origineelRoepnummer,
            status: 'tp',
            coordinates: [pos.lat, pos.lng],
            incidentId: melding.id
          }
        }));
      }
    }
    
  }, updateInterval);
  
  // Sla animatie op
  actieveAnimaties.set(normalizedRoepnummer, interval);
}

/**
 * Stop de rit van een voertuig
 */
export function stopRit(roepnummer: string): void {
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  const interval = actieveAnimaties.get(normalizedRoepnummer);
  if (interval) {
    clearInterval(interval);
    actieveAnimaties.delete(normalizedRoepnummer);
    console.log(`🛑 Rit van ${normalizedRoepnummer} gestopt`);
  }
  
  const routeLine = actieveRoutes.get(normalizedRoepnummer);
  if (routeLine) {
    routeLine.remove();
    actieveRoutes.delete(normalizedRoepnummer);
  }
}

/**
 * Stop alle actieve ritten
 */
export function stopAlleRitten(): void {
  actieveAnimaties.forEach((interval, roepnummer) => {
    clearInterval(interval);
    stopRit(roepnummer);
  });
  console.log('🛑 Alle ritten gestopt');
}

/**
 * Laat een voertuig terugrijden naar zijn kazerne
 */
export async function rijdTerugNaarKazerne(
  roepnummer: string,
  map: L.Map,
  options?: {
    snelheid?: number; // km/u, standaard 80
    updateInterval?: number; // ms, standaard 100
    toonRoute?: boolean; // Of de route moet worden getekend, standaard true
  }
): Promise<void> {
  // Normaliseer roepnummer
  const normalizedRoepnummer = normalizeRoepnummer(roepnummer);
  
  const marker = voertuigMarkers.get(normalizedRoepnummer);
  const voertuig = voertuigData.get(normalizedRoepnummer);
  
  if (!marker || !voertuig) {
    console.warn(`⚠️ Voertuig ${normalizedRoepnummer} niet gevonden (origineel: ${roepnummer})`);
    return;
  }
  
  // Check of eenheid verborgen is (VP eenheden)
  if (voertuig.hiddenFromMap) {
    console.log(`🚫 VP eenheid ${normalizedRoepnummer} overgeslagen (niet zichtbaar op kaart)`);
    return;
  }
  
  // Check of er originele kazerne coördinaten zijn
  if (!voertuig.origineleLat || !voertuig.origineleLon) {
    console.warn(`⚠️ Voertuig ${normalizedRoepnummer} heeft geen originele kazerne coördinaten`);
    return;
  }
  
  // MARKER IS DE BRON VAN WAARHEID - haal coördinaten van marker
  const markerPos = marker.getLatLng();
  if (!markerPos || !markerPos.lat || !markerPos.lng) {
    console.warn(`⚠️ Voertuig ${normalizedRoepnummer} marker heeft geen geldige coördinaten`);
    return;
  }
  
  // Update voertuig data op basis van marker (afgeleid)
  voertuig.lat = markerPos.lat;
  voertuig.lon = markerPos.lng;
  
  // Opties
  const snelheidKmh = options?.snelheid || 80; // km/u
  const updateInterval = options?.updateInterval || 100; // ms
  const toonRoute = options?.toonRoute !== false; // standaard true
  
  console.log(`🏠 ${normalizedRoepnummer} rijdt terug naar kazerne ${voertuig.kazerneNaam || 'onbekend'}`);
  
  // Update status naar "bs" (beschikbaar retour) zodra retour-rit start
  // Check of status IR is (van vrijgave), anders zet IR eerst
  const { getUnitPosition } = await import('../services/globalUnitMovement');
  const unitPosition = getUnitPosition(roepnummer);
  
  // Als status nog niet IR is, zet IR eerst (normaal al gebeurd bij vrijgave)
  if (!unitPosition || unitPosition.statusCode !== 'ir') {
    const { releaseVehicleFromIncident } = await import('../services/globalUnitMovement');
    await releaseVehicleFromIncident(roepnummer);
  }
  
  // Zet status BS zodra retour-rit start
  setUnitStatusCentral(voertuig, 'bs', {
    coordinates: [markerPos.lat, markerPos.lng]
  });
  updateEenheidStatus(normalizedRoepnummer, 'onderweg'); // Voor kaartweergave
  
  // Haal route op (gebruik marker positie als startpunt)
  const startPos = marker.getLatLng();
  const route = await getRoute(
    { lat: startPos.lat, lon: startPos.lng },
    { lat: voertuig.origineleLat, lon: voertuig.origineleLon }
  );
  
  if (route.length === 0) {
    console.warn(`⚠️ Geen route gevonden voor terugrijden ${normalizedRoepnummer}`);
    return;
  }
  
  // Teken route lijn op kaart (optioneel)
  let routeLine: L.Polyline | null = null;
  if (toonRoute) {
    routeLine = L.polyline(route, {
      color: '#3b82f6', // Blauw voor terugrit
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 5'
    }).addTo(map);
    actieveRoutes.set(normalizedRoepnummer, routeLine);
  }
  
  // Bereken snelheid in m/s
  const snelheidMs = (snelheidKmh / 3.6);
  
  // Bereken afstand tussen routepunten en totale afstand
  let totaleAfstand = 0;
  const afstanden: number[] = [0];
  
  for (let i = 1; i < route.length; i++) {
    const [lat1, lon1] = route[i - 1];
    const [lat2, lon2] = route[i];
    
    // Haversine formule voor afstand tussen twee punten
    const R = 6371000; // Aardstraal in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const afstand = R * c;
    
    totaleAfstand += afstand;
    afstanden.push(totaleAfstand);
  }
  
  // Bereken tijd per update interval
  const afstandPerUpdate = (snelheidMs * updateInterval) / 1000; // meters per update
  const totaleTijd = (totaleAfstand / snelheidMs) / 1000; // totale tijd in seconden
  
  console.log(`📍 Terugrit naar kazerne: ${totaleAfstand.toFixed(0)}m, geschatte tijd: ${(totaleTijd / 60).toFixed(1)} minuten`);
  
  // Animatielogica
  let huidigeAfstand = 0;
  let routeIndex = 0;
  let lastSaveTime = Date.now();
  
  const interval = setInterval(() => {
    // Update huidige afstand
    huidigeAfstand += afstandPerUpdate;
    
    // Vind huidige positie op route
    while (routeIndex < afstanden.length - 1 && huidigeAfstand > afstanden[routeIndex + 1]) {
      routeIndex++;
    }
    
    // Check of we bij het einde zijn
    if (routeIndex >= route.length - 1 || huidigeAfstand >= totaleAfstand) {
      // Bij eindpunt (kazerne)
      const [eindLat, eindLon] = route[route.length - 1];
      marker.setLatLng([eindLat, eindLon]);
      
      // Update voertuig data op basis van marker positie (afgeleid)
      const pos = marker.getLatLng();
      voertuig.lat = pos.lat;
      voertuig.lon = pos.lng;
      
      // Sla positie op voor persistentie
      saveUnitPositions();
      
      // Update status naar "kz" (op kazerne) - gebruik centrale statusmodule
      setUnitStatusCentral(voertuig, 'kz', {
        coordinates: [eindLat, eindLon]
      });
      updateEenheidStatus(normalizedRoepnummer, 'beschikbaar'); // Voor kaartweergave
      
      // Update route lijn naar groen
      if (routeLine) {
        routeLine.setStyle({ color: '#10b981', dashArray: null }); // Groen, geen streepjes
      }
      
      // Stop animatie
      clearInterval(interval);
      actieveAnimaties.delete(normalizedRoepnummer);
      
      console.log(`✅ ${normalizedRoepnummer} is terug bij kazerne ${voertuig.kazerneNaam || 'onbekend'}`);
      return;
    }
    
    // Interpoleer tussen huidige en volgende routepunt
    const [lat1, lon1] = route[routeIndex];
    const [lat2, lon2] = route[routeIndex + 1];
    
    const afstandTotVolgende = afstanden[routeIndex + 1] - afstanden[routeIndex];
    const afstandInSegment = huidigeAfstand - afstanden[routeIndex];
    const ratio = afstandInSegment / afstandTotVolgende;
    
    // Lineaire interpolatie
    const lat = lat1 + (lat2 - lat1) * ratio;
    const lon = lon1 + (lon2 - lon1) * ratio;
    
    // Update marker positie (marker is de bron van waarheid)
    marker.setLatLng([lat, lon]);
    
    // Update voertuig data op basis van marker positie (afgeleid)
    const pos = marker.getLatLng();
    voertuig.lat = pos.lat;
    voertuig.lon = pos.lng;
    
    // Sla positie op voor persistentie (throttled - elke 5 seconden)
    const now = Date.now();
    if (now - lastSaveTime > 5000) {
      saveUnitPositions();
      lastSaveTime = now;
    }
    
    // Dispatch movement event voor status updates
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('unitMoved', {
        detail: {
          roepnummer: roepnummer,
          normalizedRoepnummer: normalizedRoepnummer,
          position: { lat: pos.lat, lng: pos.lng },
          targetType: 'kazerne'
        }
      }));
    }
    
    // Update status naar "bs" (beschikbaar) bij 90% van de route (vrij onderweg)
    const progress = (huidigeAfstand / totaleAfstand) * 100;
    if (progress >= 90 && voertuig.status !== 'beschikbaar') {
      setUnitStatusCentral(voertuig, 'bs', {
        coordinates: [pos.lat, pos.lng]
      });
    }
    if (progress >= 90 && voertuig.status === 'onderweg') {
      updateEenheidStatus(normalizedRoepnummer, 'beschikbaar');
    }
    
  }, updateInterval);
  
  // Sla animatie op
  actieveAnimaties.set(normalizedRoepnummer, interval);
}

/**
 * Laat meerdere voertuigen terugrijden naar hun kazernes
 */
export async function rijdAlleTerugNaarKazerne(
  roepnummers: string[],
  map: L.Map,
  options?: {
    snelheid?: number;
    updateInterval?: number;
    toonRoute?: boolean;
  }
): Promise<void> {
  console.log(`🏠 ${roepnummers.length} voertuigen rijden terug naar hun kazernes...`);
  
  // Rij alle voertuigen parallel terug
  const promises = roepnummers.map(roepnummer => 
    rijdTerugNaarKazerne(roepnummer, map, options).catch(error => {
      console.error(`❌ Fout bij terugrijden ${roepnummer}:`, error);
    })
  );
  
  await Promise.all(promises);
  console.log(`✅ Alle voertuigen zijn teruggereden naar hun kazernes`);
}

