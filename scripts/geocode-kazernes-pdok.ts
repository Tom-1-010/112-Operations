/**
 * Script om alle kazernes te geocoderen met PDOK API
 * Dit script haalt alle kazernes op uit de database en gebruikt PDOK om de juiste coördinaten te vinden
 */

import { config } from 'dotenv';

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

interface Kazerne {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string;
  latitude: string | null;
  longitude: string | null;
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
    console.log(`📡 URL: ${url}`);

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
 * Update kazerne coördinaten in database
 */
async function updateKazerneCoordinates(kazerneId: string, latitude: number, longitude: number): Promise<boolean> {
  try {
    const sql = `UPDATE kazernes SET latitude = '${latitude}', longitude = '${longitude}', updated_at = NOW() WHERE id = '${kazerneId}'`;
    await executeSupabaseSQL(sql);

    console.log(`✅ Kazerne ${kazerneId} geüpdatet met coördinaten: ${latitude}, ${longitude}`);
    return true;
  } catch (error) {
    console.error(`❌ Fout bij updaten kazerne ${kazerneId}:`, error);
    return false;
  }
}

/**
 * Haal alle kazernes op uit de database
 */
async function getAllKazernes(): Promise<Kazerne[]> {
  try {
    const sql = 'SELECT id, naam, adres, postcode, plaats, type, latitude, longitude FROM kazernes ORDER BY naam';
    const data = await executeSupabaseSQL(sql);

    console.log(`📋 ${data.length} kazernes gevonden in database`);
    return data || [];
  } catch (error) {
    console.error('❌ Fout bij ophalen kazernes:', error);
    return [];
  }
}

/**
 * Hoofdfunctie
 */
async function main() {
  console.log('🚀 Start geocoding van kazernes met PDOK API...\n');

  // Haal alle kazernes op
  const kazernes = await getAllKazernes();
  
  if (kazernes.length === 0) {
    console.log('❌ Geen kazernes gevonden in database');
    return;
  }

  // Filter kazernes die nog geen coördinaten hebben of ongeldige coördinaten
  const kazernesToGeocode = kazernes.filter(k => {
    if (!k.latitude || !k.longitude) {
      return true; // Geen coördinaten
    }
    
    const lat = parseFloat(k.latitude);
    const lng = parseFloat(k.longitude);
    
    // Check of coördinaten geldig zijn (Nederland ligt tussen 50-54°N en 3-8°E)
    if (isNaN(lat) || isNaN(lng) || lat < 50 || lat > 54 || lng < 3 || lng > 8) {
      return true; // Ongeldige coördinaten
    }
    
    return false;
  });

  console.log(`📍 ${kazernesToGeocode.length} kazernes hebben geen geldige coördinaten en worden gegeocodeerd\n`);

  let successCount = 0;
  let errorCount = 0;

  // Geocode elke kazerne
  for (let i = 0; i < kazernesToGeocode.length; i++) {
    const kazerne = kazernesToGeocode[i];
    console.log(`\n[${i + 1}/${kazernesToGeocode.length}] Verwerken: ${kazerne.naam}`);
    console.log(`📍 Adres: ${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`);

    // Bouw adres string voor geocoding
    const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
    
    // Geocode het adres
    const geocodedResult = await geocodeAddress(addressString);
    
    if (geocodedResult && geocodedResult.coordinates) {
      const [latitude, longitude] = geocodedResult.coordinates;
      
      // Update database
      const success = await updateKazerneCoordinates(kazerne.id, latitude, longitude);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } else {
      console.log(`❌ Kon geen coördinaten vinden voor: ${kazerne.naam}`);
      errorCount++;
    }

    // Kleine pauze tussen requests om PDOK API niet te overbelasten
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Samenvatting:');
  console.log(`✅ Succesvol gegeocodeerd: ${successCount}`);
  console.log(`❌ Fouten: ${errorCount}`);
  console.log(`📋 Totaal verwerkt: ${kazernesToGeocode.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Geocoding voltooid! De kazernes zijn nu beschikbaar op de kaart.');
  }
}

// Run het script
main().catch(error => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});
