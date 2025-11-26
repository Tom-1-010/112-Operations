/**
 * Service voor het laden en gebruiken van Inzetvoorstellen RT basis.json
 * 
 * Deze service laadt het JSON-bestand en biedt functies om de juiste inzetrollen
 * te bepalen op basis van meldingsclassificatie, karakteristieken en voertuigtype.
 */

export interface InzetvoorstelRTEntry {
  LABEL: string;
  MC1?: string;
  MC2?: string;
  NIVO1?: string; // Alternatief voor MC1
  NIVO2?: string; // Alternatief voor MC2
  NIVO3?: string; // Alternatief voor MC3
  NAAM_KARAKTERISTIEK: string;
  TYPE_KARAKTERISTIEK: string;
  MOGELIJKE_KAR_WAARDE: string;
  KARAKTERISTIEKEN: string;
  PRIORITEIT: string;
  VOERTUIGSOORTEN: string;
}

let inzetvoorstellenCache: InzetvoorstelRTEntry[] | null = null;

/**
 * Laad het Inzetvoorstellen RT basis.json bestand
 */
export async function loadInzetvoorstellen(): Promise<InzetvoorstelRTEntry[]> {
  if (inzetvoorstellenCache) {
    return inzetvoorstellenCache;
  }

  try {
    const response = await fetch('/data/Inzetvoorstellen RT basis.json');
    if (!response.ok) {
      console.warn('⚠️ Inzetvoorstellen RT basis.json niet gevonden');
      return [];
    }
    
    const data = await response.json();
    inzetvoorstellenCache = data;
    console.log(`✅ ${data.length} inzetvoorstellen RT basis entries geladen`);
    return data;
  } catch (error) {
    console.error('❌ Fout bij laden Inzetvoorstellen RT basis.json:', error);
    return [];
  }
}

/**
 * Normaliseer een string voor vergelijking (lowercase, trim, verwijder extra spaties)
 */
function normalizeString(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract basis voertuigtype van een voertuigtype string
 * Bijvoorbeeld: "TS-6" -> "TS", "Tankautospuit" -> "TS", "DV-OVD" -> "DV-OVD"
 */
function extractBasisVoertuigType(voertuigtype: string): string | null {
  if (!voertuigtype) return null;
  
  const normalized = normalizeString(voertuigtype);
  
  // Check op bekende afkortingen eerst
  if (normalized.startsWith('ts') || normalized.includes('tankautospuit')) {
    return 'TS';
  }
  if (normalized.startsWith('rv') || normalized.includes('redvoertuig')) {
    return 'RV';
  }
  if (normalized.startsWith('wo') || normalized.includes('waterongeval')) {
    return 'WO';
  }
  if (normalized.startsWith('hv') || normalized.includes('hulpverlening')) {
    return 'HV';
  }
  // DA-OD en DV-OVD zijn hetzelfde - gebruik DV-OVD (zoals in JSON gebruikt)
  if (normalized.includes('officier van dienst') || normalized.includes('ovd') || 
      normalized.includes('da-od') || normalized.includes('dv-ovd')) {
    return 'DV-OVD';
  }
  if (normalized.startsWith('si') || normalized.includes('snel interventie')) {
    return 'SI';
  }
  if (normalized.startsWith('mp') || normalized.includes('motorpomp')) {
    return 'MP';
  }
  if (normalized.startsWith('al') || normalized.includes('autoladder')) {
    return 'AL';
  }
  if (normalized.startsWith('sb') || normalized.includes('schuimblus')) {
    return 'SB';
  }
  
  // Als het een afkorting met streepje is (bijv. "DV-OVD", "TS-6"), return alles voor het streepje
  const dashIndex = normalized.indexOf('-');
  if (dashIndex > 0) {
    const beforeDash = normalized.substring(0, dashIndex).trim();
    // Voor DV-* varianten, return volledige code
    if (beforeDash === 'dv' || beforeDash === 'hb') {
      return voertuigtype.split('-').slice(0, 2).join('-').toUpperCase();
    }
    // Voor DA-* varianten (zoals DA-OD), map naar DV-OVD
    if (beforeDash === 'da') {
      const fullCode = voertuigtype.split('-').slice(0, 2).join('-').toUpperCase();
      if (fullCode === 'DA-OD') {
        return 'DV-OVD';
      }
      return fullCode;
    }
    // Voor andere varianten, return alleen basis
    return beforeDash.toUpperCase();
  }
  
  // Geen match gevonden, return origineel (geüppercase)
  return voertuigtype.toUpperCase();
}

/**
 * Check of een karakteristiek matcht met een entry
 */
function matchesKarakteristiek(
  entry: InzetvoorstelRTEntry,
  karakteristieken: Array<{
    ktNaam?: string;
    ktCode?: string;
    ktWaarde?: string;
    ktParser?: string;
  }>
): boolean {
  // Als entry geen karakteristiek heeft, matcht het altijd (fallback)
  if (!entry.NAAM_KARAKTERISTIEK || entry.NAAM_KARAKTERISTIEK.trim() === '') {
    return true;
  }

  const entryNaam = normalizeString(entry.NAAM_KARAKTERISTIEK);
  const entryWaarde = normalizeString(entry.MOGELIJKE_KAR_WAARDE);
  const entryKarakteristieken = normalizeString(entry.KARAKTERISTIEKEN || '');

  // Check of een van de karakteristieken matcht
  for (const kar of karakteristieken) {
    const karNaam = normalizeString(kar.ktNaam || '');
    const karWaarde = normalizeString(kar.ktWaarde || '');
    const karParser = normalizeString(kar.ktParser || '');

    // Match op naam (bijv. "Ops Br" matcht met "Ops Br")
    if (karNaam && entryNaam) {
      const naamMatch = karNaam.includes(entryNaam) || entryNaam.includes(karNaam);
      
      if (naamMatch) {
        // Als er een specifieke waarde is in de entry, moet die ook matchen
        if (entryWaarde && entryWaarde !== '') {
          // Check of waarde matcht (bijv. "Zeer groot" matcht met "Zeer groot")
          const waardeMatch = karWaarde && (karWaarde.includes(entryWaarde) || entryWaarde.includes(karWaarde));
          if (waardeMatch) {
            return true;
          }
          
          // Check ook in parser (bijv. "Ops Br Zeer groot" in parser)
          if (karParser && (karParser.includes(entryWaarde) || entryWaarde.includes(karParser))) {
            return true;
          }
          
          // Check ook in KARAKTERISTIEKEN veld (bijv. "Ops Br Zeer groot")
          if (entryKarakteristieken && (entryKarakteristieken.includes(karWaarde) || karWaarde.includes(entryWaarde))) {
            return true;
          }
        } else {
          // Geen specifieke waarde vereist, naam match is genoeg
          return true;
        }
      }
    }
    
    // Match op parser (bijv. "-ops br zeer groot" matcht met "Ops Br Zeer groot")
    if (karParser && entryKarakteristieken) {
      // Verwijder eventuele prefixen zoals "-" of "-inzet brw" uit parser
      const cleanParser = karParser.replace(/^[-]?\s*(inzet\s+brw\s+)?/i, '').trim();
      if (cleanParser && entryKarakteristieken.includes(cleanParser)) {
        return true;
      }
    }
    
    // Match op volledige KARAKTERISTIEKEN string (bijv. "Ops Br Zeer groot")
    if (entryKarakteristieken) {
      // Check of karNaam + karWaarde samen matcht met entryKarakteristieken
      const karCombinatie = `${karNaam} ${karWaarde}`.trim();
      if (karCombinatie && entryKarakteristieken.includes(karCombinatie)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parse voertuigsoorten string naar array van voertuigtypes
 * Bijvoorbeeld: "1 DV-OVD | 1 Redvoertuig" -> ["DV-OVD", "Redvoertuig"]
 */
function parseVoertuigsoorten(voertuigsoorten: string): string[] {
  if (!voertuigsoorten || voertuigsoorten.trim() === '') {
    return [];
  }

  // Split op "|" en extract voertuigtype
  return voertuigsoorten
    .split('|')
    .map(part => {
      // Verwijder aantallen
      // Bijvoorbeeld: "1 DV-OVD" -> "DV-OVD"
      const cleaned = part
        .trim()
        .replace(/^\d+\s*/, '') // Verwijder aantal aan het begin
        .trim();
      return cleaned;
    })
    .filter(v => v !== '');
}

/**
 * Mapping van voertuigtype afkortingen naar volledige namen
 */
const VOERTUIGTYPE_MAPPINGS: Record<string, string[]> = {
  'ts': ['tankautospuit', 'ts-6', 'ts-4', 'ts-aed'],
  'rv': ['redvoertuig', 'red'],
  'wo': ['waterongevallen', 'waterongeval', 'wov', 'waterongevallen voertuig'],
  'hv': ['hulpverlening', 'hulpverleningsvoertuig'],
  'ovd': ['officier van dienst', 'dv-ovd', 'da-od'],
  'da-od': ['officier van dienst', 'dv-ovd'],
  'dv-ovd': ['officier van dienst', 'da-od'],
  'dv-pr': ['perslucht', 'persluchtvoertuig'],
  'dv-ags': ['adembescherming', 'ags'],
  'dv-hod': ['hoofd', 'hoofdofficier'],
  'dv-tbo': ['tactisch', 'tactisch bevelvoerder'],
  'dv-toa': ['toa', 'technisch officier'],
  'hb-ovd': ['hoofdbevelvoerder', 'hoofd officier'],
  'si-2': ['snel interventie', 'si'],
  'sk': ['specialistisch', 'specialist'],
  'mp': ['motorpomp'],
  'al': ['autoladder'],
  'dat': ['dienstauto tank'],
  'bv': ['brandweervoertuig'],
  'wov': ['waterongevallenvoertuig', 'waterongeval'],
};

/**
 * Check of een voertuigtype matcht met een entry
 */
function matchesVoertuigtype(
  entry: InzetvoorstelRTEntry,
  voertuigtype: string
): boolean {
  if (!entry.VOERTUIGSOORTEN || entry.VOERTUIGSOORTEN.trim() === '') {
    // Als entry geen voertuigsoorten heeft, matcht het altijd (fallback)
    return true;
  }

  const entryVoertuigen = parseVoertuigsoorten(entry.VOERTUIGSOORTEN);
  const normalizedType = normalizeString(voertuigtype);

  // Speciale mapping: DA-OD = DV-OVD
  const normalizedTypeMapped = normalizedType.replace(/da-od/g, 'dv-ovd');
  const normalizedTypeOriginal = normalizedType;

  // Check of voertuigtype matcht met een van de voertuigsoorten
  for (const entryVoertuig of entryVoertuigen) {
    const normalizedEntry = normalizeString(entryVoertuig);
    const normalizedEntryMapped = normalizedEntry.replace(/dv-ovd/g, 'da-od');
    
    // Exact match (met en zonder mapping)
    if (normalizedType === normalizedEntry || 
        normalizedTypeMapped === normalizedEntry ||
        normalizedType === normalizedEntryMapped) {
      return true;
    }
    
    // Partial match (bijvoorbeeld "TS" matcht "Tankautospuit")
    if (normalizedType.includes(normalizedEntry) || normalizedEntry.includes(normalizedType) ||
        normalizedTypeMapped.includes(normalizedEntry) || normalizedEntry.includes(normalizedTypeMapped)) {
      return true;
    }
    
    // Check op afkortingen en mappings
    for (const [abbrev, fullNames] of Object.entries(VOERTUIGTYPE_MAPPINGS)) {
      const normalizedAbbrev = normalizeString(abbrev);
      
      // Check of type matcht met afkorting
      if (normalizedType.includes(normalizedAbbrev) || normalizedAbbrev.includes(normalizedType) ||
          normalizedTypeMapped.includes(normalizedAbbrev) || normalizedAbbrev.includes(normalizedTypeMapped)) {
        // Check of entry matcht met een van de volledige namen
        if (fullNames.some(fn => {
          const normalizedFn = normalizeString(fn);
          return normalizedEntry.includes(normalizedFn) || normalizedFn.includes(normalizedEntry);
        })) {
          return true;
        }
      }
      
      // Check of entry matcht met afkorting en type matcht met volledige naam
      if (normalizedEntry.includes(normalizedAbbrev) || normalizedAbbrev.includes(normalizedEntry)) {
        if (fullNames.some(fn => {
          const normalizedFn = normalizeString(fn);
          return normalizedType.includes(normalizedFn) || normalizedFn.includes(normalizedType) ||
                 normalizedTypeMapped.includes(normalizedFn) || normalizedFn.includes(normalizedTypeMapped);
        })) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Bepaal de inzetrol voor een voertuig op basis van meldingsclassificatie, karakteristieken en voertuigtype
 * 
 * @param mc1 Meldingsclassificatie 1
 * @param mc2 Meldingsclassificatie 2 (optioneel)
 * @param karakteristieken Array van karakteristieken
 * @param voertuigtype Type van het voertuig (bijv. "TS-6", "RV", "Tankautospuit")
 * @returns De inzetrol string of null als geen match gevonden
 */
export async function getInzetrolForIncidentAndVehicle(
  mc1: string,
  mc2: string | undefined,
  karakteristieken: Array<{
    ktNaam?: string;
    ktCode?: string;
    ktWaarde?: string;
  }>,
  voertuigtype: string
): Promise<string | null> {
  const entries = await loadInzetvoorstellen();
  
  if (entries.length === 0) {
    console.warn('⚠️ Geen inzetvoorstellen geladen');
    return null;
  }

  const normalizedMc1 = normalizeString(mc1 || '');
  const normalizedMc2 = normalizeString(mc2 || '');

  // Zoek entries die matchen op:
  // 1. MC1 (exact match)
  // 2. MC2 (als opgegeven, exact match)
  // 3. Karakteristieken (als opgegeven)
  // 4. Voertuigtype (als opgegeven)
  
  // Prioriteit: specifieke matches eerst (met MC2 en karakteristieken), dan algemene matches
  
  // 1. Probeer exacte match met MC1, MC2, karakteristiek en voertuigtype
  for (const entry of entries) {
    const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
    const entryMc2 = normalizeString(entry.MC2 || entry.NIVO2 || '');
    
    // MC1 moet matchen (of entry heeft geen MC1)
    if (entryMc1 && entryMc1 !== '' && entryMc1 !== normalizedMc1) {
      continue;
    }
    
    // MC2 moet matchen (als beide opgegeven)
    if (normalizedMc2 && entryMc2 && entryMc2 !== '' && entryMc2 !== normalizedMc2) {
      continue;
    }
    
    // Karakteristiek moet matchen (als entry een karakteristiek heeft)
    if (!matchesKarakteristiek(entry, karakteristieken)) {
      continue;
    }
    
    // Voertuigtype moet matchen (als entry voertuigsoorten heeft)
    if (!matchesVoertuigtype(entry, voertuigtype)) {
      continue;
    }
    
    // Match gevonden! Gebruik het opgegeven voertuigtype als inzetrol (niet de variant uit de entry)
    // Dit zorgt ervoor dat "TS" wordt gebruikt in plaats van "TS-4" of "Tankautospuit"
    // Extract basis type van voertuigtype (bijv. "TS-6" -> "TS", "Tankautospuit" -> "TS")
    const basisType = extractBasisVoertuigType(voertuigtype);
    if (basisType) {
      return basisType;
    }
    
    // Fallback: gebruik eerste voertuigsoort uit entry
    const voertuigen = parseVoertuigsoorten(entry.VOERTUIGSOORTEN);
    if (voertuigen.length > 0) {
      // Extract basis type van eerste voertuigsoort
      return extractBasisVoertuigType(voertuigen[0]) || voertuigen[0];
    }
  }
  
  // 2. Fallback: probeer match zonder karakteristiek (alleen MC1/MC2 en voertuigtype)
  for (const entry of entries) {
    const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
    const entryMc2 = normalizeString(entry.MC2 || entry.NIVO2 || '');
    
    // MC1 moet matchen (of entry heeft geen MC1)
    if (entryMc1 && entryMc1 !== '' && entryMc1 !== normalizedMc1) {
      continue;
    }
    
    // MC2 moet matchen (als beide opgegeven)
    if (normalizedMc2 && entryMc2 && entryMc2 !== '' && entryMc2 !== normalizedMc2) {
      continue;
    }
    
    // Skip entries met karakteristieken (die hebben we al geprobeerd)
    if (entry.NAAM_KARAKTERISTIEK && entry.NAAM_KARAKTERISTIEK.trim() !== '') {
      continue;
    }
    
    // Voertuigtype moet matchen
    if (!matchesVoertuigtype(entry, voertuigtype)) {
      continue;
    }
    
      // Match gevonden! Gebruik het opgegeven voertuigtype als inzetrol
      const basisType = extractBasisVoertuigType(voertuigtype);
      if (basisType) {
        return basisType;
      }
      
      // Fallback: gebruik eerste voertuigsoort uit entry
      const voertuigen = parseVoertuigsoorten(entry.VOERTUIGSOORTEN);
      if (voertuigen.length > 0) {
        return extractBasisVoertuigType(voertuigen[0]) || voertuigen[0];
      }
  }
  
  // 3. Laatste fallback: alleen MC1 match
  for (const entry of entries) {
    const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
    
    if (entryMc1 && entryMc1 !== '' && entryMc1 === normalizedMc1) {
      // Skip entries met MC2 of karakteristieken
      if (entry.MC2 && entry.MC2.trim() !== '') {
        continue;
      }
      if (entry.NAAM_KARAKTERISTIEK && entry.NAAM_KARAKTERISTIEK.trim() !== '') {
        continue;
      }
      
      // Voertuigtype moet matchen
      if (!matchesVoertuigtype(entry, voertuigtype)) {
        continue;
      }
      
      const voertuigen = parseVoertuigsoorten(entry.VOERTUIGSOORTEN);
      if (voertuigen.length > 0) {
        // Extract basis type van eerste voertuigsoort
        return extractBasisVoertuigType(voertuigen[0]) || voertuigen[0];
      }
    }
  }
  
  console.warn(`⚠️ Geen inzetrol gevonden voor MC1="${mc1}", MC2="${mc2}", voertuigtype="${voertuigtype}"`);
  return null;
}

/**
 * Haal voertuigen op uit Inzetvoorstellen RT basis.json op basis van MC1/MC2/MC3 en karakteristieken
 * 
 * @param mc1 Meldingsclassificatie 1
 * @param mc2 Meldingsclassificatie 2 (optioneel)
 * @param mc3 Meldingsclassificatie 3 (optioneel)
 * @param karakteristieken Array van karakteristieken
 * @returns Array van voertuigsoorten strings (bijv. ["1 TS[D]", "1 DV-OVD[D]"])
 */
export async function getVoertuigenFromInzetvoorstellenRT(
  mc1: string,
  mc2: string | undefined,
  mc3: string | undefined,
  karakteristieken: Array<{
    ktNaam?: string;
    ktCode?: string;
    ktWaarde?: string;
  }>
): Promise<string[]> {
  const entries = await loadInzetvoorstellen();
  
  if (entries.length === 0) {
    console.warn('⚠️ Geen inzetvoorstellen geladen');
    return [];
  }

  const normalizedMc1 = normalizeString(mc1 || '');
  const normalizedMc2 = normalizeString(mc2 || '');
  const normalizedMc3 = normalizeString(mc3 || '');
  
  const gevondenVoertuigen: string[] = [];
  const gevondenKeys = new Set<string>(); // Voorkom duplicaten

  // Prioriteit: specifieke matches eerst (met MC3, MC2, karakteristieken), dan algemene matches
  
  // 1. Probeer exacte match met MC1, MC2, MC3 en karakteristiek
  for (const entry of entries) {
    const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
    const entryMc2 = normalizeString(entry.MC2 || entry.NIVO2 || '');
    const entryMc3 = normalizeString(entry.NIVO3 || '');
    
    // MC1 moet matchen
    if (entryMc1 && entryMc1 !== '' && entryMc1 !== normalizedMc1) {
      continue;
    }
    
    // MC2 moet matchen (als beide opgegeven)
    if (normalizedMc2 && entryMc2 && entryMc2 !== '' && entryMc2 !== normalizedMc2) {
      continue;
    }
    
    // MC3 moet matchen (als beide opgegeven)
    if (normalizedMc3 && entryMc3 && entryMc3 !== '' && entryMc3 !== normalizedMc3) {
      continue;
    }
    
    // Karakteristiek moet matchen (als entry een karakteristiek heeft)
    if (entry.NAAM_KARAKTERISTIEK && entry.NAAM_KARAKTERISTIEK.trim() !== '') {
      if (!matchesKarakteristiek(entry, karakteristieken)) {
        continue;
      }
    }
    
    // Voeg voertuigen toe als er zijn
    if (entry.VOERTUIGSOORTEN && entry.VOERTUIGSOORTEN.trim() !== '') {
      const key = `${entryMc1}|${entryMc2}|${entryMc3}|${entry.NAAM_KARAKTERISTIEK}|${entry.MOGELIJKE_KAR_WAARDE}`;
      if (!gevondenKeys.has(key)) {
        gevondenKeys.add(key);
        // Parse voertuigsoorten en voeg toe (markers zijn al verwijderd uit JSON)
        const voertuigen = entry.VOERTUIGSOORTEN.split('|').map(v => v.trim()).filter(v => v !== '');
        gevondenVoertuigen.push(...voertuigen);
        console.log(`✅ Match gevonden: MC1="${entryMc1}", MC2="${entryMc2}", MC3="${entryMc3}", Karakteristiek="${entry.NAAM_KARAKTERISTIEK}", Voertuigen="${entry.VOERTUIGSOORTEN}"`);
      }
    }
  }
  
  // 2. Fallback: probeer match zonder karakteristiek (alleen MC1/MC2/MC3)
  if (gevondenVoertuigen.length === 0) {
    for (const entry of entries) {
      const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
      const entryMc2 = normalizeString(entry.MC2 || entry.NIVO2 || '');
      const entryMc3 = normalizeString(entry.NIVO3 || '');
      
      // MC1 moet matchen
      if (entryMc1 && entryMc1 !== '' && entryMc1 !== normalizedMc1) {
        continue;
      }
      
      // MC2 moet matchen (als beide opgegeven)
      if (normalizedMc2 && entryMc2 && entryMc2 !== '' && entryMc2 !== normalizedMc2) {
        continue;
      }
      
      // MC3 moet matchen (als beide opgegeven)
      if (normalizedMc3 && entryMc3 && entryMc3 !== '' && entryMc3 !== normalizedMc3) {
        continue;
      }
      
      // Skip entries met karakteristieken (die hebben we al geprobeerd)
      if (entry.NAAM_KARAKTERISTIEK && entry.NAAM_KARAKTERISTIEK.trim() !== '') {
        continue;
      }
      
      // Voeg voertuigen toe als er zijn
      if (entry.VOERTUIGSOORTEN && entry.VOERTUIGSOORTEN.trim() !== '') {
        const key = `${entryMc1}|${entryMc2}|${entryMc3}`;
        if (!gevondenKeys.has(key)) {
          gevondenKeys.add(key);
          // Parse voertuigsoorten (markers zijn al verwijderd uit JSON)
          const voertuigen = entry.VOERTUIGSOORTEN.split('|').map(v => v.trim()).filter(v => v !== '');
          gevondenVoertuigen.push(...voertuigen);
          console.log(`✅ Match gevonden (zonder karakteristiek): MC1="${entryMc1}", MC2="${entryMc2}", MC3="${entryMc3}", Voertuigen="${entry.VOERTUIGSOORTEN}"`);
        }
      }
    }
  }
  
  // 3. Voeg ook voertuigen toe op basis van alleen karakteristieken (zonder MC match)
  for (const kar of karakteristieken) {
    for (const entry of entries) {
      // Skip als entry al is gebruikt
      const entryMc1 = normalizeString(entry.MC1 || entry.NIVO1 || '');
      const entryMc2 = normalizeString(entry.MC2 || entry.NIVO2 || '');
      const entryMc3 = normalizeString(entry.NIVO3 || '');
      const key = `${entryMc1}|${entryMc2}|${entryMc3}|${entry.NAAM_KARAKTERISTIEK}|${entry.MOGELIJKE_KAR_WAARDE}`;
      if (gevondenKeys.has(key)) {
        continue;
      }
      
      // Check of karakteristiek matcht
      if (entry.NAAM_KARAKTERISTIEK && entry.NAAM_KARAKTERISTIEK.trim() !== '') {
        if (matchesKarakteristiek(entry, [kar])) {
          if (entry.VOERTUIGSOORTEN && entry.VOERTUIGSOORTEN.trim() !== '') {
            gevondenKeys.add(key);
            // Parse voertuigsoorten (markers zijn al verwijderd uit JSON)
            const voertuigen = entry.VOERTUIGSOORTEN.split('|').map(v => v.trim()).filter(v => v !== '');
            gevondenVoertuigen.push(...voertuigen);
            console.log(`✅ Karakteristiek match: "${entry.NAAM_KARAKTERISTIEK}" = "${entry.MOGELIJKE_KAR_WAARDE}", Voertuigen="${entry.VOERTUIGSOORTEN}"`);
          }
        }
      }
    }
  }
  
  // Verwijder duplicaten en return
  const uniekeVoertuigen = Array.from(new Set(gevondenVoertuigen));
  console.log(`📦 Totaal ${uniekeVoertuigen.length} unieke voertuigen gevonden:`, uniekeVoertuigen);
  return uniekeVoertuigen;
}

/**
 * Toewijs inzetrollen aan een eenheid
 * 
 * @param roepnummer Roepnummer van de eenheid
 * @param inzetrol De inzetrol om toe te wijzen
 */
export function assignInzetrollenToUnit(roepnummer: string, inzetrol: string | null): void {
  if (!inzetrol) {
    console.warn(`⚠️ Geen inzetrol om toe te wijzen aan ${roepnummer}`);
    return;
  }
  
  console.log(`✅ Inzetrol "${inzetrol}" toegewezen aan ${roepnummer}`);
}

