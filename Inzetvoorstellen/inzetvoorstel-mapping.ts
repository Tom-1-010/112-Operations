/**
 * Inzetvoorstel Mapping - MAR Standaard Brandweer Nederland
 * 
 * Dit bestand bevat de mapping van LMC classificaties (MC1/MC2/MC3) naar
 * initiële inzetvoorstellen volgens de MAR standaard (22-11-2019).
 * 
 * Elke classificatie combinatie kan een specifiek inzetvoorstel hebben.
 * De mapping wordt gebruikt in GMS2 om automatisch inzetvoorstellen te genereren.
 */

export interface InzetvoorstelMapping {
  mc1: string;
  mc2?: string;
  mc3?: string;
  baseInzet: string[];           // Standaard initiële inzet (bijv. ['1 TS-6'])
  extraInzet?: string[];         // Optionele extra inzet (bijv. ['1 RV'])
  toelichting?: string;          // Korte toelichting
  karakteristiekenModifiers?: {  // Karakteristieken die de inzet kunnen aanpassen
    [karakteristiekCode: string]: {
      addExtraInzet?: string[];
      replaceBaseInzet?: string[];
      toelichting?: string;
    };
  };
}

/**
 * Mapping van classificaties naar inzetvoorstellen
 * 
 * Deze mapping wordt geladen uit mar_mappings.json
 * Je kunt mappings toevoegen in dat JSON bestand in plaats van hier in de code.
 * 
 * Prioriteit van matching:
 * 1. Exacte match op Code (vanuit lmc_classifications.json)
 * 2. Exacte match op MC1 + MC2 + MC3
 * 3. Match op MC1 + MC2
 * 4. Match op MC1
 * 5. Fallback naar lege array (geen standaard waarde)
 * 
 * Voorbeeld structuur voor mar_mappings.json:
 * {
 *   "Code": "brwe",
 *   "MC1": "Brand",
 *   "MC2": "Wegvervoer",
 *   "MC3": "",
 *   "baseInzet": ["1 TS-6"],
 *   "extraInzet": [],
 *   "toelichting": "Brand wegvervoer: standaard 1 TS-6 volgens MAR"
 * }
 */
export let INZETVOORSTEL_MAPPING: InzetvoorstelMapping[] = [];

/**
 * Laad MAR mappings uit JSON bestand
 * Deze functie kan worden aangeroepen bij initialisatie van de applicatie
 * 
 * Ondersteunt twee typen mappings:
 * 1. Classificatie mappings: MC1/MC2/MC3 -> baseInzet
 * 2. Karakteristiek mappings: ktCode/ktNaam -> baseInzet (heeft prioriteit)
 */
export async function loadMarMappings(): Promise<void> {
  try {
    // Probeer eerst uit public folder (voor development/build)
    let response = await fetch('/mar_mappings.json');
    
    // Als dat niet werkt, probeer uit Inzetvoorstellen folder (alternatieve locatie)
    if (!response.ok) {
      response = await fetch('/Inzetvoorstellen/mar_mappings.json');
    }
    
    if (!response.ok) {
      console.warn('⚠️ mar_mappings.json niet gevonden, gebruik lege mapping');
      INZETVOORSTEL_MAPPING = [];
      return;
    }
    
    const data = await response.json();
    
    // Split data in classificatie mappings en karakteristiek mappings
    const classificatieData: any[] = [];
    const karakteristiekData: any[] = [];
    
    for (const item of data) {
      // Als het een karakteristiek mapping is (heeft ktCode of ktNaam maar geen MC1)
      if ((item.ktCode || item.ktNaam) && !item.MC1) {
        karakteristiekData.push(item);
      } else if (item.MC1 && item.MC1.trim() !== '') {
        // Classificatie mapping
        classificatieData.push(item);
      }
    }
    
    // Filter lege entries en transformeer classificatie mappings
    INZETVOORSTEL_MAPPING = classificatieData.map((item: any) => ({
      mc1: item.MC1 || '',
      mc2: (item.MC2 && item.MC2.trim() !== '') ? item.MC2 : undefined,
      mc3: (item.MC3 && item.MC3.trim() !== '') ? item.MC3 : undefined,
      baseInzet: item.baseInzet || [],
      extraInzet: item.extraInzet || [],
      toelichting: item.toelichting || ''
    }));
    
    // Laad karakteristiek base mappings
    for (const item of karakteristiekData) {
      // Maak unieke key door code, naam EN waarde te combineren
      // Dit voorkomt dat entries met dezelfde code/naam elkaar overschrijven
      const keyParts: string[] = [];
      if (item.ktCode) keyParts.push(item.ktCode.toLowerCase());
      if (item.ktNaam) keyParts.push(item.ktNaam.toLowerCase().replace(/\s+/g, '_'));
      if (item.ktWaarde) keyParts.push(item.ktWaarde.toLowerCase().replace(/[\.\s]+/g, '_'));
      const key = keyParts.join('_') || 'unknown';
      
      // Bouw lijst van codes en namen voor matching
      const codes: string[] = [];
      const names: string[] = [];
      
      if (item.ktCode) codes.push(item.ktCode);
      if (item.ktNaam) names.push(item.ktNaam);
      if (item.ktWaarde) names.push(item.ktWaarde);
      if (item.ktParser) names.push(item.ktParser);
      
      console.log(`📋 Laad karakteristiek mapping: key="${key}", waarde="${item.ktWaarde}", baseInzet=${JSON.stringify(item.baseInzet)}`);
      
      KARAKTERISTIEKEN_BASE_MAPPINGS[key] = {
        codes,
        names,
        baseInzet: item.baseInzet || [],
        extraInzet: item.extraInzet || [],
        toelichting: item.toelichting || '',
        prioriteit: item.prioriteit || 0
      };
    }
    
    console.log(`✅ ${INZETVOORSTEL_MAPPING.length} classificatie mappings geladen`);
    console.log(`✅ ${karakteristiekData.length} karakteristiek mappings geladen`);
  } catch (error) {
    console.error('❌ Fout bij laden MAR mappings:', error);
    INZETVOORSTEL_MAPPING = [];
  }
}

/**
 * Karakteristieken die extra inzet kunnen vereisen
 * Deze kunnen alleen extra inzet toevoegen aan bestaande baseInzet
 */
export const KARAKTERISTIEKEN_MODIFIERS: {
  [key: string]: {
    codes: string[];
    names: string[];
    extraInzet: string[];
    toelichting: string;
  };
} = {
  'werken_op_hoogte': {
    codes: ['woh', 'WOH'],
    names: ['hoogte', 'werk op hoogte'],
    extraInzet: ['1 RV'],
    toelichting: 'Werken op hoogte: extra 1 RV'
  },
  'vloeistofbrand': {
    codes: ['vlb', 'VLB'],
    names: ['vloeistof', 'olie', 'vloeistofbrand'],
    extraInzet: ['1 SB'],
    toelichting: 'Vloeistofbrand: extra 1 SB (schuimblusvoertuig)'
  },
  'bluswaterarm': {
    codes: ['bwa', 'BWA'],
    names: ['bluswater', 'bluswaterarm'],
    extraInzet: ['1 GW 1500'],
    toelichting: 'Bluswaterarm gebied: extra 1 GW 1500'
  },
  'zwaar_ongeval': {
    codes: ['zwo', 'ZWO'],
    names: ['zwaar', 'zwaar ongeval'],
    extraInzet: ['1 HV'],
    toelichting: 'Zwaar ongeval: extra 1 HV (hulpverlening)'
  }
};

/**
 * Karakteristieken die een volledig basisinzet kunnen bepalen
 * Deze hebben prioriteit over classificatie mappings
 * Als een karakteristiek hierin staat, wordt de baseInzet hiervan gebruikt
 */
export const KARAKTERISTIEKEN_BASE_MAPPINGS: {
  [key: string]: {
    codes: string[];
    names: string[];
    baseInzet: string[];
    extraInzet?: string[];
    toelichting: string;
    prioriteit?: number; // Hogere prioriteit = wordt eerder gebruikt (default: 0)
  };
} = {};

/**
 * Objectfuncties die extra inzet kunnen vereisen
 */
export const OBJECTFUNCTIE_MODIFIERS: {
  [key: string]: {
    patterns: string[];
    extraInzet: string[];
    toelichting: string;
  };
} = {
  'portiek_woning': {
    patterns: ['portiek', 'woongebouw', 'woonzorg'],
    extraInzet: ['1 RV'],
    toelichting: 'Portiek/woongebouw: extra 1 RV voor werken op hoogte'
  }
};

/**
 * Zoek een inzetvoorstel mapping op basis van Code of MC1, MC2 en MC3
 */
export function findInzetvoorstelMapping(
  mc1: string,
  mc2?: string,
  mc3?: string,
  code?: string
): InzetvoorstelMapping | null {
  if (!mc1) return null;
  
  // Probeer eerst match op Code (als beschikbaar)
  // Note: Code matching vereist dat de mapping ook Code bevat
  // Dit kan worden uitgebreid als we Code toevoegen aan InzetvoorstelMapping interface
  
  // Probeer exacte match (MC1 + MC2 + MC3)
  if (mc1 && mc2 && mc3) {
    const exactMatch = INZETVOORSTEL_MAPPING.find(
      m => m.mc1 === mc1 && m.mc2 === mc2 && m.mc3 === mc3
    );
    if (exactMatch) return exactMatch;
  }
  
  // Probeer match op MC1 + MC2
  if (mc1 && mc2) {
    const mc2Match = INZETVOORSTEL_MAPPING.find(
      m => m.mc1 === mc1 && m.mc2 === mc2 && !m.mc3
    );
    if (mc2Match) return mc2Match;
  }
  
  // Probeer match op alleen MC1
  const mc1Match = INZETVOORSTEL_MAPPING.find(
    m => m.mc1 === mc1 && !m.mc2 && !m.mc3
  );
  if (mc1Match) return mc1Match;
  
  return null;
}

/**
 * Controleer of een karakteristiek extra inzet vereist
 */
export function getKarakteristiekExtraInzet(karakteristiek: {
  ktNaam?: string;
  ktCode?: string;
}): { extraInzet: string[]; toelichting: string } | null {
  const ktNaam = karakteristiek.ktNaam?.toLowerCase() || '';
  const ktCode = karakteristiek.ktCode?.toLowerCase() || '';
  
  for (const [key, modifier] of Object.entries(KARAKTERISTIEKEN_MODIFIERS)) {
    const matchesCode = modifier.codes.some(c => c.toLowerCase() === ktCode);
    const matchesName = modifier.names.some(n => ktNaam.includes(n.toLowerCase()));
    
    if (matchesCode || matchesName) {
      return {
        extraInzet: modifier.extraInzet,
        toelichting: modifier.toelichting
      };
    }
  }
  
  return null;
}

/**
 * Controleer of een objectfunctie extra inzet vereist
 */
export function getObjectfunctieExtraInzet(functie?: string): {
  extraInzet: string[];
  toelichting: string;
} | null {
  if (!functie) return null;
  
  const functieLower = functie.toLowerCase();
  
  for (const [key, modifier] of Object.entries(OBJECTFUNCTIE_MODIFIERS)) {
    const matches = modifier.patterns.some(p => functieLower.includes(p));
    
    if (matches) {
      return {
        extraInzet: modifier.extraInzet,
        toelichting: modifier.toelichting
      };
    }
  }
  
  return null;
}

/**
 * Zoek alle karakteristieken die basisinzet bepalen (kan meerdere zijn!)
 * Retourneert een array van alle matches in plaats van alleen de hoogste prioriteit
 */
export function findAllKarakteristiekBaseMappings(
  karakteristieken: Array<{ 
    ktNaam?: string; 
    ktCode?: string;
    ktWaarde?: string;
    ktParser?: string;
  }>
): Array<{
  baseInzet: string[];
  extraInzet: string[];
  toelichting: string;
  prioriteit: number;
}> {
  if (!karakteristieken || karakteristieken.length === 0) return [];
  
  const matches: Array<{
    baseInzet: string[];
    extraInzet: string[];
    toelichting: string;
    prioriteit: number;
  }> = [];
  const foundKeys = new Set<string>(); // Voorkom duplicaten van dezelfde mapping key
  
  for (const kar of karakteristieken) {
    const ktNaam = (kar.ktNaam || '').toLowerCase();
    const ktCode = (kar.ktCode || '').toLowerCase();
    const ktWaarde = (kar.ktWaarde || '').toLowerCase();
    const ktParser = (kar.ktParser || '').toLowerCase();
    
    console.log(`🔍 Check karakteristiek: naam="${ktNaam}", code="${ktCode}", waarde="${ktWaarde}", parser="${ktParser}"`);
    
    for (const [key, mapping] of Object.entries(KARAKTERISTIEKEN_BASE_MAPPINGS)) {
      // Skip als deze mapping al is toegevoegd
      if (foundKeys.has(key)) {
        console.log(`  ⏭️  Skip key "${key}" (al gevonden)`);
        continue;
      }
      
      // Voor karakteristieken met ktCode, moet de code matchen EN de waarde moet ook matchen (als mapping een specifieke waarde heeft)
      let matchesCode = false;
      if (mapping.codes.length > 0) {
        const codeMatch = mapping.codes.some(c => c.toLowerCase() === ktCode);
        if (codeMatch) {
          // Code matcht, check nu of er een specifieke waarde is die ook moet matchen
          // Namen die niet de ktNaam of ktParser zijn, zijn waarschijnlijk waarde-specifiek
          const mappingWaardeNames = mapping.names.filter(n => {
            const nLower = n.toLowerCase().trim();
            const ktNaamLower = ktNaam.toLowerCase().trim();
            const ktParserLower = ktParser.toLowerCase().trim();
            // Een naam is waarde-specifiek als het niet matcht met ktNaam of ktParser
            const isNotNaam = !ktNaamLower.includes(nLower) && !nLower.includes(ktNaamLower);
            const isNotParser = !ktParserLower.includes(nLower) && !nLower.includes(ktParserLower);
            // Ook checken dat het niet "-inzet brw" bevat (dat is de parser)
            const isNotParserPrefix = !nLower.includes('-inzet brw');
            return isNotNaam && isNotParser && isNotParserPrefix;
          });
          
          if (mappingWaardeNames.length > 0) {
            // Er is een specifieke waarde in de mapping, check of die matcht met karakteristiek waarde
            if (ktWaarde) {
              const waardeMatch = mappingWaardeNames.some(mwn => {
                const mwnLower = mwn.toLowerCase().trim();
                const ktWaardeLower = ktWaarde.toLowerCase().trim();
                // Normaliseer voor vergelijking (verwijder punten en extra spaties)
                const normalizedMwn = mwnLower.replace(/[\.\s]+/g, ' ').trim();
                const normalizedKtWaarde = ktWaardeLower.replace(/[\.\s]+/g, ' ').trim();
                // Exact match heeft voorkeur
                if (normalizedMwn === normalizedKtWaarde) return true;
                // Substring match als fallback
                return normalizedMwn.includes(normalizedKtWaarde) || normalizedKtWaarde.includes(normalizedMwn);
              });
              matchesCode = waardeMatch;
              console.log(`  🔍 Code match: waarde check voor "${ktWaarde}" tegen mapping waarden: ${JSON.stringify(mappingWaardeNames)}, resultaat: ${waardeMatch}`);
            } else {
              // Mapping verwacht een waarde maar karakteristiek heeft geen waarde
              console.log(`  ⚠️  Code match maar mapping heeft waarde-specificatie en karakteristiek heeft geen waarde`);
              matchesCode = false;
            }
          } else {
            // Geen specifieke waarde in mapping, code match is genoeg
            console.log(`  ✅ Code match: geen waarde-specificatie, match ok`);
            matchesCode = true;
          }
        }
      }
      
      // Check names (kan match zijn op ktNaam, ktWaarde of ktParser)
      const matchesName = mapping.names.some(n => {
        const nameLower = n.toLowerCase();
        // Check of de mapping name matcht met karakteristiek naam, waarde of parser
        const waardeMatch = ktWaarde && (ktWaarde.includes(nameLower) || nameLower.includes(ktWaarde));
        const parserMatch = ktParser && (ktParser.includes(nameLower) || nameLower.includes(ktParser));
        const nameMatch = ktNaam && (ktNaam.includes(nameLower) || nameLower.includes(ktNaam));
        
        // Voor waarde matches, zorg dat het echt matcht (niet alleen een deel)
        if (waardeMatch) {
          // Normaliseer voor vergelijking (verwijder punten en extra spaties)
          const normalizedWaarde = ktWaarde.replace(/[\.\s]+/g, ' ').trim().toLowerCase();
          const normalizedName = nameLower.replace(/[\.\s]+/g, ' ').trim().toLowerCase();
          return normalizedWaarde === normalizedName || normalizedWaarde.includes(normalizedName) || normalizedName.includes(normalizedWaarde);
        }
        
        return nameMatch || parserMatch;
      });
      
      if (matchesCode || matchesName) {
        console.log(`  ✅ Match gevonden voor key "${key}": matchesCode=${matchesCode}, matchesName=${matchesName}`);
        console.log(`     Mapping names: ${JSON.stringify(mapping.names)}`);
        console.log(`     Base inzet: ${JSON.stringify(mapping.baseInzet)}`);
        foundKeys.add(key); // Markeer als gevonden om duplicaten te voorkomen
        matches.push({
          baseInzet: [...mapping.baseInzet],
          extraInzet: mapping.extraInzet ? [...mapping.extraInzet] : [],
          toelichting: mapping.toelichting,
          prioriteit: mapping.prioriteit || 0
        });
      }
    }
  }
  
  console.log(`📊 Totaal ${matches.length} karakteristiek base mappings gevonden`);
  
  // Sorteer op prioriteit (hoogste eerst) voor consistente volgorde
  matches.sort((a, b) => b.prioriteit - a.prioriteit);
  
  return matches;
}

/**
 * @deprecated Gebruik findAllKarakteristiekBaseMappings in plaats daarvan
 * Deze functie blijft bestaan voor backwards compatibility maar retourneert alleen eerste match
 */
export function findKarakteristiekBaseMapping(
  karakteristieken: Array<{ 
    ktNaam?: string; 
    ktCode?: string;
    ktWaarde?: string;
    ktParser?: string;
  }>
): {
  baseInzet: string[];
  extraInzet: string[];
  toelichting: string;
  prioriteit: number;
} | null {
  const allMatches = findAllKarakteristiekBaseMappings(karakteristieken);
  return allMatches.length > 0 ? allMatches[0] : null;
}

/**
 * Tel het aantal eenheden op bij een eenheid string (bijv. "1 TS-6" + "1 TS-6" = "2 TS-6")
 * Of voeg beide toe als ze verschillend zijn
 */
function combineUnits(existing: string[], newUnit: string): string[] {
  // Extract unit type (bijv. "TS-6", "DA-OD") en aantal
  const extractUnit = (unitStr: string): { count: number; type: string } => {
    const match = unitStr.match(/^(\d+)\s*(.+)$/);
    if (match) {
      return { count: parseInt(match[1], 10), type: match[2].trim() };
    }
    // Als geen match, return als is
    return { count: 1, type: unitStr.trim() };
  };

  const newUnitExtracted = extractUnit(newUnit);
  
  // Zoek of deze unit type al bestaat
  const existingIndex = existing.findIndex(existingUnit => {
    const existingExtracted = extractUnit(existingUnit);
    return existingExtracted.type === newUnitExtracted.type;
  });

  if (existingIndex >= 0) {
    // Unit type bestaat al, tel op
    const existingExtracted = extractUnit(existing[existingIndex]);
    const totalCount = existingExtracted.count + newUnitExtracted.count;
    const updated = [...existing];
    updated[existingIndex] = `${totalCount} ${existingExtracted.type}`;
    return updated;
  } else {
    // Nieuwe unit type, voeg toe
    return [...existing, newUnit];
  }
}

/**
 * Genereer een inzetvoorstel op basis van classificatie, karakteristieken en functie
 */
export function generateInzetvoorstelFromMapping(
  mc1: string,
  mc2?: string,
  mc3?: string,
  karakteristieken: Array<{ 
    ktNaam?: string; 
    ktCode?: string;
    ktWaarde?: string;
    ktParser?: string;
  }> = [],
  functie?: string,
  extended: boolean = false
): {
  base: string[];
  extra: string[];
  totaal: string[];
  toelichting: string[];
  mapping: InzetvoorstelMapping | null;
  karakteristiekMapping?: boolean;
} {
  const toelichting: string[] = [];
  let baseInzet: string[] = [];
  let extraInzet: string[] = [];
  let mapping: InzetvoorstelMapping | null = null;
  let karakteristiekMapping = false;
  
  // 1. Zoek mapping voor classificatie
  mapping = findInzetvoorstelMapping(mc1, mc2, mc3);
  
  if (mapping) {
    baseInzet = [...mapping.baseInzet];
    if (mapping.extraInzet) {
      extraInzet = [...mapping.extraInzet];
    }
    if (mapping.toelichting) {
      toelichting.push(mapping.toelichting);
    }
  }
  
  // 2. Check of karakteristieken ook basisinzet bepalen (kan meerdere zijn!)
  const karBaseMappings = findAllKarakteristiekBaseMappings(karakteristieken);
  
  if (karBaseMappings.length > 0) {
    karakteristiekMapping = true;
    
    // Voeg alle karakteristiek base mappings toe (combinatie, tel duplicaten op)
    for (const karMapping of karBaseMappings) {
      // Voeg karakteristiek base inzet toe aan baseInzet
      for (const unit of karMapping.baseInzet) {
        baseInzet = combineUnits(baseInzet, unit);
      }
      // Voeg karakteristiek extra inzet toe aan extraInzet
      for (const unit of karMapping.extraInzet) {
        extraInzet = combineUnits(extraInzet, unit);
      }
      toelichting.push(`⚠️ Extra basisinzet door karakteristiek: ${karMapping.toelichting}`);
    }
  }
  
  // Als er helemaal geen mappings zijn gevonden, gebruik geen standaard (lege array)
  if (baseInzet.length === 0 && !mapping && karBaseMappings.length === 0) {
    toelichting.push(`⚠️ Geen specifieke mapping gevonden voor ${mc1} ${mc2 || ''} ${mc3 || ''}`);
  }
  
  // Voeg extra inzet toe op basis van karakteristieken (modifiers)
  for (const kar of karakteristieken) {
    const karExtra = getKarakteristiekExtraInzet(kar);
    if (karExtra) {
      for (const unit of karExtra.extraInzet) {
        extraInzet = combineUnits(extraInzet, unit);
      }
      toelichting.push(karExtra.toelichting);
    }
  }
  
  // Voeg extra inzet toe op basis van objectfunctie
  const functieExtra = getObjectfunctieExtraInzet(functie);
  if (functieExtra) {
    for (const unit of functieExtra.extraInzet) {
      extraInzet = combineUnits(extraInzet, unit);
    }
    toelichting.push(functieExtra.toelichting);
  }
  
  // Extended IV+ met opschalingsniveaus
  if (extended) {
    toelichting.push('');
    toelichting.push('📈 Opschaling mogelijkheden:');
    
    if (baseInzet.some(unit => unit.includes('TS'))) {
      toelichting.push('  • Middel: 2 TS + OvD');
      toelichting.push('  • Groot: 3 TS + OvD + HOvD');
      toelichting.push('  • Zeer groot: 4 TS + OvD + HOvD/TC');
    }
  }
  
  return {
    base: baseInzet,
    extra: extraInzet,
    totaal: [...baseInzet, ...extraInzet],
    toelichting,
    mapping,
    karakteristiekMapping
  };
}

