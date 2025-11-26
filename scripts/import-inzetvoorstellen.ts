/**
 * Script om inzetvoorstellen te importeren naar mar_mappings.json
 * 
 * Ondersteunt verschillende input formaten:
 * - CSV bestand
 * - JSON bestand (array of object)
 * - Directe toevoeging aan bestaand bestand
 * 
 * Gebruik:
 *   npx tsx scripts/import-inzetvoorstellen.ts <input-bestand> [--format csv|json] [--output <output-bestand>]
 */

import * as fs from 'fs';
import * as path from 'path';

interface InzetvoorstelEntry {
  Code?: string;
  MC1?: string;
  MC2?: string;
  MC3?: string;
  ktNaam?: string;
  ktCode?: string;
  ktWaarde?: string;
  ktParser?: string;
  baseInzet: string[];
  extraInzet?: string[];
  toelichting?: string;
  prioriteit?: number;
}

/**
 * Parse CSV regel naar InzetvoorstelEntry
 * Verwacht format: MC1,MC2,MC3,baseInzet,extraInzet,toelichting
 * Of: Code,MC1,MC2,MC3,baseInzet,extraInzet,toelichting
 */
function parseCSVLine(line: string, headers: string[]): InzetvoorstelEntry | null {
  const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
  
  if (values.length < headers.length) {
    return null;
  }

  const entry: InzetvoorstelEntry = {
    baseInzet: [],
    extraInzet: []
  };

  headers.forEach((header, index) => {
    const value = values[index] || '';
    
    switch (header.toLowerCase()) {
      case 'code':
        if (value) entry.Code = value;
        break;
      case 'mc1':
        if (value) entry.MC1 = value;
        break;
      case 'mc2':
        if (value) entry.MC2 = value;
        break;
      case 'mc3':
        if (value) entry.MC3 = value;
        break;
      case 'ktnaam':
      case 'kt_naam':
        if (value) entry.ktNaam = value;
        break;
      case 'ktcode':
      case 'kt_code':
        if (value) entry.ktCode = value;
        break;
      case 'ktwaarde':
      case 'kt_waarde':
        if (value) entry.ktWaarde = value;
        break;
      case 'ktparser':
      case 'kt_parser':
        if (value) entry.ktParser = value;
        break;
      case 'baseinzet':
      case 'base_inzet':
        if (value) {
          // Split op ; of | voor meerdere eenheden
          entry.baseInzet = value.split(/[;|]/).map(v => v.trim()).filter(v => v);
        }
        break;
      case 'extrainzet':
      case 'extra_inzet':
        if (value) {
          entry.extraInzet = value.split(/[;|]/).map(v => v.trim()).filter(v => v);
        }
        break;
      case 'toelichting':
        if (value) entry.toelichting = value;
        break;
      case 'prioriteit':
        if (value) entry.prioriteit = parseInt(value, 10);
        break;
    }
  });

  // Valideer dat er minimaal baseInzet is
  if (!entry.baseInzet || entry.baseInzet.length === 0) {
    entry.baseInzet = []; // Geen standaard fallback
  }

  // Valideer dat het een classificatie OF karakteristiek mapping is
  const hasMC1 = !!entry.MC1;
  const hasKarakteristiek = !!(entry.ktCode || entry.ktNaam);
  
  if (!hasMC1 && !hasKarakteristiek) {
    console.warn(`⚠️ Regel overgeslagen: geen MC1 of karakteristiek gevonden: ${line}`);
    return null;
  }

  return entry;
}

/**
 * Lees CSV bestand en converteer naar InzetvoorstelEntry[]
 */
function readCSV(filePath: string): InzetvoorstelEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  if (lines.length === 0) {
    throw new Error('CSV bestand is leeg');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const entries: InzetvoorstelEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const entry = parseCSVLine(lines[i], headers);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Lees JSON bestand en converteer naar InzetvoorstelEntry[]
 */
function readJSON(filePath: string): InzetvoorstelEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  if (Array.isArray(data)) {
    return data as InzetvoorstelEntry[];
  } else if (typeof data === 'object') {
    return [data as InzetvoorstelEntry];
  } else {
    throw new Error('JSON bestand moet een array of object bevatten');
  }
}

/**
 * Laad bestaand mar_mappings.json bestand
 */
function loadExistingMappings(outputPath: string): InzetvoorstelEntry[] {
  if (!fs.existsSync(outputPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(content) as InzetvoorstelEntry[];
  } catch (error) {
    console.warn(`⚠️ Kon bestaand bestand niet lezen: ${error}`);
    return [];
  }
}

/**
 * Merge nieuwe entries met bestaande, voorkom duplicaten
 */
function mergeEntries(existing: InzetvoorstelEntry[], newEntries: InzetvoorstelEntry[]): InzetvoorstelEntry[] {
  const merged = [...existing];
  const seen = new Set<string>();

  // Maak keys van bestaande entries
  existing.forEach(entry => {
    const key = createKey(entry);
    seen.add(key);
  });

  // Voeg nieuwe entries toe die nog niet bestaan
  newEntries.forEach(entry => {
    const key = createKey(entry);
    if (!seen.has(key)) {
      merged.push(entry);
      seen.add(key);
      console.log(`✅ Toegevoegd: ${key}`);
    } else {
      console.log(`⏭️  Overgeslagen (duplicaat): ${key}`);
    }
  });

  return merged;
}

/**
 * Maak unieke key voor entry
 */
function createKey(entry: InzetvoorstelEntry): string {
  if (entry.Code) {
    return `code:${entry.Code}`;
  }
  
  if (entry.MC1) {
    const parts = [entry.MC1, entry.MC2, entry.MC3].filter(Boolean);
    return `mc:${parts.join('|')}`;
  }
  
  if (entry.ktCode || entry.ktNaam) {
    const parts = [
      entry.ktCode,
      entry.ktNaam,
      entry.ktWaarde
    ].filter(Boolean);
    return `kt:${parts.join('|')}`;
  }
  
  return `unknown:${JSON.stringify(entry)}`;
}

/**
 * Valideer entry
 */
function validateEntry(entry: InzetvoorstelEntry): boolean {
  if (!entry.baseInzet || entry.baseInzet.length === 0) {
    console.warn(`⚠️ Entry heeft geen baseInzet: ${JSON.stringify(entry)}`);
    return false;
  }

  const hasMC1 = !!entry.MC1;
  const hasKarakteristiek = !!(entry.ktCode || entry.ktNaam);
  
  if (!hasMC1 && !hasKarakteristiek) {
    console.warn(`⚠️ Entry heeft geen MC1 of karakteristiek: ${JSON.stringify(entry)}`);
    return false;
  }

  return true;
}

/**
 * Main functie
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📘 Inzetvoorstellen Importer

Gebruik:
  npx tsx scripts/import-inzetvoorstellen.ts <input-bestand> [opties]

Opties:
  --format <csv|json>     Bestandsformaat (auto-detect als niet opgegeven)
  --output <pad>          Output bestand (default: client/public/mar_mappings.json)
  --merge                 Merge met bestaand bestand (default: true)
  --overwrite             Overschrijf bestaand bestand (in plaats van merge)
  --validate              Alleen valideer, schrijf niet weg

Voorbeelden:
  # Importeer CSV bestand
  npx tsx scripts/import-inzetvoorstellen.ts inzetvoorstellen.csv --format csv

  # Importeer JSON bestand
  npx tsx scripts/import-inzetvoorstellen.ts inzetvoorstellen.json --format json

  # Valideer zonder weg te schrijven
  npx tsx scripts/import-inzetvoorstellen.ts inzetvoorstellen.csv --validate

CSV Format (met header):
  Code,MC1,MC2,MC3,baseInzet,extraInzet,toelichting
  brgb,Brand,Gebouw,,1 TS-6,1 RV,Brand gebouw: 1 TS-6 + 1 RV

Of voor karakteristieken:
  ktCode,ktNaam,ktWaarde,baseInzet,extraInzet,toelichting,prioriteit
  ibfunc,Inzet Brw functie,Off. van Dienst,1 DA-OD,,Inzet BRW off van dienst,10
    `);
    process.exit(0);
  }

  const inputFile = args[0];
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Bestand niet gevonden: ${inputFile}`);
    process.exit(1);
  }

  // Parse opties
  const formatIndex = args.indexOf('--format');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : null;
  
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 
    ? args[outputIndex + 1]
    : path.join(process.cwd(), 'client', 'public', 'mar_mappings.json');
  
  const merge = !args.includes('--overwrite');
  const validateOnly = args.includes('--validate');

  // Detecteer format
  let detectedFormat = format;
  if (!detectedFormat) {
    if (inputFile.endsWith('.csv')) {
      detectedFormat = 'csv';
    } else if (inputFile.endsWith('.json')) {
      detectedFormat = 'json';
    } else {
      console.error('❌ Kon bestandsformaat niet detecteren. Gebruik --format csv of --format json');
      process.exit(1);
    }
  }

  console.log(`📂 Lees bestand: ${inputFile} (format: ${detectedFormat})`);

  // Lees input
  let newEntries: InzetvoorstelEntry[];
  try {
    if (detectedFormat === 'csv') {
      newEntries = readCSV(inputFile);
    } else {
      newEntries = readJSON(inputFile);
    }
    console.log(`✅ ${newEntries.length} entries gelezen`);
  } catch (error) {
    console.error(`❌ Fout bij lezen bestand: ${error}`);
    process.exit(1);
  }

  // Valideer entries
  const validEntries = newEntries.filter(validateEntry);
  console.log(`✅ ${validEntries.length} van ${newEntries.length} entries zijn geldig`);

  if (validEntries.length === 0) {
    console.error('❌ Geen geldige entries gevonden');
    process.exit(1);
  }

  if (validateOnly) {
    console.log('✅ Validatie geslaagd! Gebruik zonder --validate om weg te schrijven.');
    process.exit(0);
  }

  // Laad bestaande mappings
  let existingEntries: InzetvoorstelEntry[] = [];
  if (merge && fs.existsSync(outputPath)) {
    existingEntries = loadExistingMappings(outputPath);
    console.log(`📋 ${existingEntries.length} bestaande entries geladen`);
  }

  // Merge entries
  const finalEntries = merge ? mergeEntries(existingEntries, validEntries) : validEntries;

  // Schrijf weg
  try {
    // Zorg dat directory bestaat
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(finalEntries, null, 2), 'utf-8');
    console.log(`✅ ${finalEntries.length} entries opgeslagen naar: ${outputPath}`);
    console.log(`   (${validEntries.length} nieuw, ${existingEntries.length} bestaand)`);
  } catch (error) {
    console.error(`❌ Fout bij wegschrijven: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

