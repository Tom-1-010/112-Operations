/**
 * Script om de 63 kazernes uit bulk-insert-kazernes.sql te importeren
 * en deze te geocoderen met PDOK API
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

// Helper function to execute SQL via Supabase REST API
async function executeSupabaseSQL(sql: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase query failed: ${errorText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Query failed');
  }
  
  return result.data || [];
}

interface PDOKResult {
  id: string;
  weergavenaam: string;
  straatnaam: string;
  huisnummer: string;
  postcode: string;
  plaatsnaam: string;
  gemeentenaam: string;
  provincienaam: string;
  coordinates?: [number, number];
  score: number;
  type: string;
}

interface PDOKResponse {
  response: {
    docs: PDOKResult[];
    numFound: number;
  };
}

/**
 * Geocode een adres met PDOK API
 */
async function geocodeAddress(address: string): Promise<PDOKResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodedAddress}&rows=1&fq=type:adres&fl=id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll&sort=score desc`;

    console.log(`🔍 Geocoding: "${address}"`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MeldkamerSimulator/1.0',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data: PDOKResponse = await response.json();
    
    if (!data.response?.docs || data.response.docs.length === 0) {
      console.log(`⚠️  Geen resultaten gevonden voor: "${address}"`);
      return null;
    }

    const result = data.response.docs[0];
    
    // Parse coordinates from centroide_ll
    let coordinates: [number, number] | undefined;
    if (result.centroide_ll) {
      const coords = result.centroide_ll.split(',');
      if (coords.length === 2) {
        coordinates = [parseFloat(coords[1]), parseFloat(coords[0])]; // [lat, lon]
      }
    }

    const geocodedResult: PDOKResult = {
      ...result,
      coordinates
    };

    console.log(`✅ Gevonden: ${geocodedResult.weergavenaam} (score: ${geocodedResult.score})`);
    if (coordinates) {
      console.log(`📍 Coördinaten: ${coordinates[0]}, ${coordinates[1]}`);
    }

    return geocodedResult;
  } catch (error) {
    console.error(`❌ Fout bij geocoding van "${address}":`, error);
    return null;
  }
}

/**
 * Parse kazernes uit het SQL bestand
 */
function parseKazernesFromSQL(): Array<{
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string;
  telefoonnummer: string;
  actief: boolean;
}> {
  try {
    const filePath = join(process.cwd(), 'scripts', 'bulk-insert-kazernes.sql');
    const sqlContent = readFileSync(filePath, 'utf8');
    
    // Extract VALUES clause
    const valuesMatch = sqlContent.match(/VALUES\s+(.+);/s);
    if (!valuesMatch) {
      throw new Error('Could not find VALUES clause in SQL file');
    }
    
    const valuesString = valuesMatch[1];
    
    // Parse each row
    const kazernes: any[] = [];
    const rows = valuesString.split('),(');
    
    rows.forEach((row, index) => {
      // Clean up the row
      let cleanRow = row;
      if (index === 0) cleanRow = cleanRow.replace(/^\(/, '');
      if (index === rows.length - 1) cleanRow = cleanRow.replace(/\);$/, '');
      cleanRow = cleanRow.replace(/^\(|\)$/, '');
      
      // Parse the values (simple approach)
      const values = cleanRow.split(',').map(v => v.trim());
      
      if (values.length >= 7) {
        const kazerne = {
          naam: values[0].replace(/'/g, ''),
          adres: values[1].replace(/'/g, ''),
          postcode: values[2].replace(/'/g, ''),
          plaats: values[3].replace(/'/g, ''),
          type: values[4].replace(/'/g, ''),
          telefoonnummer: values[5].replace(/'/g, ''),
          actief: values[6] === 'TRUE'
        };
        
        // Skip entries without proper address
        if (kazerne.adres && kazerne.adres !== 'NULL' && kazerne.postcode && kazerne.postcode !== 'NULL') {
          kazernes.push(kazerne);
        }
      }
    });
    
    console.log(`📋 ${kazernes.length} kazernes geparsed uit SQL bestand`);
    return kazernes;
  } catch (error) {
    console.error('❌ Fout bij parsen van SQL bestand:', error);
    return [];
  }
}

/**
 * Importeer kazernes in Supabase
 */
async function importKazernesToSupabase(kazernes: any[]): Promise<void> {
  try {
    console.log('🗑️  Leegmaken van bestaande kazernes...');
    await executeSupabaseSQL('DELETE FROM kazernes');
    
    console.log('📥 Importeren van kazernes...');
    
    for (let i = 0; i < kazernes.length; i++) {
      const kazerne = kazernes[i];
      
      // Geocode het adres
      const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
      const geocodedResult = await geocodeAddress(addressString);
      
      let latitude = null;
      let longitude = null;
      
      if (geocodedResult && geocodedResult.coordinates) {
        [latitude, longitude] = geocodedResult.coordinates;
      }
      
      // Insert kazerne
      const sql = `
        INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, actief, latitude, longitude, capaciteit, regio)
        VALUES (
          '${kazerne.naam.replace(/'/g, "''")}',
          '${kazerne.adres.replace(/'/g, "''")}',
          '${kazerne.postcode}',
          '${kazerne.plaats.replace(/'/g, "''")}',
          '${kazerne.type}',
          '${kazerne.telefoonnummer}',
          ${kazerne.actief},
          ${latitude ? `'${latitude}'` : 'NULL'},
          ${longitude ? `'${longitude}'` : 'NULL'},
          20,
          'Zuid-Holland'
        )
      `;
      
      await executeSupabaseSQL(sql);
      
      console.log(`✅ [${i + 1}/${kazernes.length}] ${kazerne.naam} - ${geocodedResult ? 'Gegeocodeerd' : 'Geen coördinaten'}`);
      
      // Kleine pauze tussen requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`🎉 ${kazernes.length} kazernes geïmporteerd!`);
  } catch (error) {
    console.error('❌ Fout bij importeren kazernes:', error);
    throw error;
  }
}

/**
 * Hoofdfunctie
 */
async function main() {
  console.log('🚀 Importeren van 63 kazernes uit SQL bestand...\n');
  
  try {
    // Parse kazernes uit SQL bestand
    const kazernes = parseKazernesFromSQL();
    
    if (kazernes.length === 0) {
      console.log('❌ Geen kazernes gevonden in SQL bestand');
      return;
    }
    
    console.log(`📊 ${kazernes.length} kazernes gevonden om te importeren\n`);
    
    // Importeer kazernes
    await importKazernesToSupabase(kazernes);
    
    // Verificeer import
    const importedKazernes = await executeSupabaseSQL('SELECT COUNT(*) as count FROM kazernes');
    const count = importedKazernes[0]?.count || 0;
    
    console.log(`\n✅ Import voltooid! ${count} kazernes in database.`);
    console.log('🗺️  De kazernes zijn nu beschikbaar op de kaart!');
    
  } catch (error) {
    console.error('❌ Onverwachte fout:', error);
    process.exit(1);
  }
}

// Run het script
main();






































