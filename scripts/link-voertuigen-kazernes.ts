/**
 * Script om voertuigen uit BRW eenheden.json te koppelen aan kazernes uit 63_kazernes_complete.json
 * op basis van postnamen.
 * 
 * Voorbeeld: 17-0231 = post Maassluis = kazerne-002
 */

import * as fs from 'fs';
import * as path from 'path';

interface Voertuig {
  roepnummer: string;
  roepnummer_interregionaal: string;
  post: string;
  type?: string;
  functie?: string;
  [key: string]: any;
}

interface Kazerne {
  id: string;
  naam: string;
  plaats: string;
  [key: string]: any;
}

/**
 * Normaliseer plaatsnamen voor matching
 */
function normalizePlaatsnaam(naam: string): string {
  return naam
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Verwijder speciale tekens
    .replace(/^kazerne\s*/i, '') // Verwijder "Kazerne" prefix
    .replace(/^gezamenlijke\s*brandweer\s*-\s*/i, '') // Verwijder "Gezamenlijke Brandweer -" prefix
    .replace(/\s+/g, ''); // Verwijder spaties
}

/**
 * Maak mapping tussen postnamen en kazerne IDs
 */
function createPostnaamMapping(kazernes: Kazerne[]): Map<string, string> {
  const mapping = new Map<string, string>();
  
  // Directe mapping: plaatsnaam -> kazerne ID
  for (const kazerne of kazernes) {
    const genormaliseerd = normalizePlaatsnaam(kazerne.plaats);
    if (genormaliseerd) {
      mapping.set(genormaliseerd, kazerne.id);
    }
    
    // Ook proberen met kazerne naam (zonder "Kazerne" prefix)
    const naamGenormaliseerd = normalizePlaatsnaam(kazerne.naam);
    if (naamGenormaliseerd && naamGenormaliseerd !== genormaliseerd) {
      mapping.set(naamGenormaliseerd, kazerne.id);
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
    'nieuwe-tonge': 'kazerne-046',
    'stadaanhetharingvliet': 'kazerne-047',
    'stada/haringvliet': 'kazerne-047',
    'stada/hharingvliet': 'kazerne-047',
    'stadaharingvliet': 'kazerne-047',
    'oudetonge': 'kazerne-048',
    'oude-tonge': 'kazerne-048',
    'denbommel': 'kazerne-049',
    'ooltgensplaat': 'kazerne-050',
    'rotterdamportauthority': 'kazerne-051',
    'portauthority': 'kazerne-051',
    'prorail': 'kazerne-052',
    'rotterdamthehagueairport': 'kazerne-053',
    'rotterdam-thehagueairport': 'kazerne-053',
    'leiding': 'kazerne-054',
    'regionaal': 'kazerne-055',
    'logistiek': 'kazerne-056',
    'vakbekwaamheid': 'kazerne-057',
    'multidisciplinair': 'kazerne-058',
    'meldkamer': 'kazerne-059',
    'gemeenschappelijkemeldkamer': 'kazerne-059',
    'transport': 'kazerne-060',
    'dienstbussen': 'kazerne-060',
    'specialistisch': 'kazerne-061',
    'vakbekwaamheidunits': 'kazerne-061',
    // Cluster en andere speciale gevallen
    'cluster': 'kazerne-054', // Cluster commandanten gaan naar Leiding
    'rpa/dhmr/hbr': 'kazerne-055', // Regionaal
    'rotterdamrijnmondleidingcoördinatie': 'kazerne-054',
    'rotterdamrijnmondregio': 'kazerne-055',
    'rotterdamrijnmondlogistiek': 'kazerne-056',
    'rotterdamrijnmondvakbekwaamheid': 'kazerne-057',
    'rotterdamrijnmondmulti': 'kazerne-058',
    'moezelweghoofdkantoor': 'kazerne-016',
    'gb-moezelweghoofdkantoor': 'kazerne-016',
    'gbmoezelweghoofdkantoor': 'kazerne-016',
    'schiedamboothuis': 'kazerne-004',
    'bpraffinerijrotterdam-europoort': 'kazerne-021',
    'bpraffinerijrotterdameuropoort': 'kazerne-021',
    'vrr-adviesgevaarlijkestoffen': 'kazerne-055', // Regionaal
    'vrradviesgevaarlijkestoffen': 'kazerne-055', // Regionaal
  };
  
  for (const [key, value] of Object.entries(specialeMappings)) {
    mapping.set(key, value);
  }
  
  return mapping;
}

/**
 * Parse BRW eenheden bestand (tab-gescheiden)
 */
function parseBRWEenheden(filePath: string): Voertuig[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const voertuigen: Voertuig[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const cols = trimmed.split('\t');
    if (cols.length < 2) continue;
    
    const roepnummer_interregionaal = cols[0]?.trim();
    const roepnummer = cols[1]?.trim();
    const post = cols[cols.length - 1]?.trim(); // Laatste kolom is postnaam
    
    if (!roepnummer && !roepnummer_interregionaal) continue;
    if (!post) continue;
    
    // Extract type en functie uit de kolommen
    const type = cols[2]?.trim() || undefined;
    const functie = cols[3]?.trim() || undefined;
    
    voertuigen.push({
      roepnummer: roepnummer || roepnummer_interregionaal,
      roepnummer_interregionaal: roepnummer_interregionaal || roepnummer,
      post,
      type,
      functie,
    });
  }
  
  return voertuigen;
}

/**
 * Hoofdfunctie
 */
function main() {
  console.log('🚀 Start koppelen voertuigen aan kazernes...\n');
  
  // Bestandspaden
  const brwEenhedenPath = path.join(process.cwd(), 'client', 'public', 'data', 'BRW eenheden.json');
  const kazernesPath = path.join(process.cwd(), 'attached_assets', '63_kazernes_complete.json');
  const outputPath = path.join(process.cwd(), 'attached_assets', 'voertuigen_kazernes_mapping.json');
  
  // Lees bestanden
  console.log('📖 Lezen bestanden...');
  if (!fs.existsSync(brwEenhedenPath)) {
    console.error(`❌ Bestand niet gevonden: ${brwEenhedenPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(kazernesPath)) {
    console.error(`❌ Bestand niet gevonden: ${kazernesPath}`);
    process.exit(1);
  }
  
  const kazernes: Kazerne[] = JSON.parse(fs.readFileSync(kazernesPath, 'utf-8'));
  const voertuigen = parseBRWEenheden(brwEenhedenPath);
  
  console.log(`✅ ${kazernes.length} kazernes geladen`);
  console.log(`✅ ${voertuigen.length} voertuigen geladen\n`);
  
  // Maak mapping
  const postnaamMapping = createPostnaamMapping(kazernes);
  
  // Koppel voertuigen aan kazernes
  const result: Array<{
    voertuig: Voertuig;
    kazerne_id: string | null;
    kazerne_naam: string | null;
    match_type: string;
  }> = [];
  
  const unmatched: Voertuig[] = [];
  
  for (const voertuig of voertuigen) {
    const postGenormaliseerd = normalizePlaatsnaam(voertuig.post);
    const kazerne_id = postnaamMapping.get(postGenormaliseerd);
    
    if (kazerne_id) {
      const kazerne = kazernes.find(k => k.id === kazerne_id);
      result.push({
        voertuig,
        kazerne_id,
        kazerne_naam: kazerne?.naam || null,
        match_type: 'postnaam',
      });
    } else {
      unmatched.push(voertuig);
      result.push({
        voertuig,
        kazerne_id: null,
        kazerne_naam: null,
        match_type: 'geen_match',
      });
    }
  }
  
  // Statistieken
  const matched = result.filter(r => r.kazerne_id !== null).length;
  const unmatchedCount = unmatched.length;
  
  console.log('📊 Resultaten:');
  console.log(`   ✅ Gekoppeld: ${matched}`);
  console.log(`   ❌ Niet gekoppeld: ${unmatchedCount}\n`);
  
  if (unmatchedCount > 0) {
    console.log('⚠️  Niet gekoppelde voertuigen:');
    const uniquePosts = [...new Set(unmatched.map(v => v.post))];
    uniquePosts.slice(0, 20).forEach(post => {
      console.log(`   - ${post}`);
    });
    if (uniquePosts.length > 20) {
      console.log(`   ... en ${uniquePosts.length - 20} meer`);
    }
    console.log();
  }
  
  // Schrijf resultaat
  const output = {
    metadata: {
      totaal_voertuigen: voertuigen.length,
      gekoppeld: matched,
      niet_gekoppeld: unmatchedCount,
      datum: new Date().toISOString(),
    },
    mapping: result,
    unmatched_posts: [...new Set(unmatched.map(v => v.post))],
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ Resultaat opgeslagen in: ${outputPath}\n`);
  
  // Toon voorbeelden
  console.log('📋 Voorbeelden van gekoppelde voertuigen:');
  result
    .filter(r => r.kazerne_id !== null)
    .slice(0, 10)
    .forEach(r => {
      console.log(`   ${r.voertuig.roepnummer} (${r.voertuig.post}) -> ${r.kazerne_naam} (${r.kazerne_id})`);
    });
  
  console.log('\n✅ Klaar!');
}

main();

