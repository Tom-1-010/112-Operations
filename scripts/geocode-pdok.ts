#!/usr/bin/env node
import 'dotenv/config';

// OpenStreetMap Nominatim API voor geocoding
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

interface NominatimResponse {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  osm_type: string;
  osm_id: string;
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_API}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=nl`;
    console.log(`🔍 Geocoding: ${query}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeldkamerSimulator/1.0'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ HTTP ${response.status}: ${errorText}`);
      return null;
    }
    
    const data: NominatimResponse[] = await response.json();
    
    if (data.length === 0) {
      console.log(`❌ Geen resultaat voor: ${query}`);
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    console.log(`✅ ${query} -> ${lat}, ${lng} (${result.display_name})`);
    return { lat, lng };
    
  } catch (error: any) {
    console.error(`❌ Error geocoding ${query}: ${error.message}`);
    return null;
  }
}

async function geocodeKazernes() {
  const kazernes = [
    { naam: 'Kazerne Maassluis', adres: 'Elektraweg 3 Maassluis' },
    { naam: 'Kazerne Vlaardingen', adres: 'George Stephensonweg 2 Vlaardingen' },
    { naam: 'Kazerne Schiedam', adres: 'Gravelandseweg 551 Schiedam' },
    { naam: 'Kazerne Hoek van Holland', adres: 'Planciushof 80 Hoek van Holland' },
    { naam: 'Kazerne Rotterdam Frobenstraat', adres: 'Frobenstraat 8 Rotterdam' },
    { naam: 'Kazerne Rotterdam Baan', adres: 'Baan 170 Rotterdam' },
    { naam: 'Kazerne Berkel en Rodenrijs', adres: 'Berkelse Poort 25 Berkel en Rodenrijs' },
    { naam: 'Kazerne Bleiswijk', adres: 'Jan van der Heydenstraat 6 Bleiswijk' },
  ];

  console.log('🗺️ Geocoding kazernes met PDOK API...\n');

  const results: Array<{ naam: string; lat: number; lng: number; adres: string }> = [];

  for (const kazerne of kazernes) {
    const coords = await geocodeAddress(kazerne.adres);
    if (coords) {
      results.push({
        naam: kazerne.naam,
        lat: coords.lat,
        lng: coords.lng,
        adres: kazerne.adres
      });
    }
    
    // Wacht even tussen requests om rate limiting te voorkomen
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Geocoding resultaten:');
  console.table(results);

  // Update database
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('\n⚠️ Supabase credentials niet gevonden, alleen geocoding resultaten getoond.');
    return;
  }

  console.log('\n🔧 Updating database...');

  for (const result of results) {
    const sql = `UPDATE kazernes SET latitude = '${result.lat}', longitude = '${result.lng}' WHERE naam = '${result.naam}'`;
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error updating ${result.naam}: ${errorText}`);
        continue;
      }
      
      const dbResult = await response.json();
      
      if (dbResult.success) {
        console.log(`✅ Updated ${result.naam}: ${result.lat}, ${result.lng}`);
      } else {
        console.error(`❌ Failed to update ${result.naam}: ${dbResult.error}`);
      }
    } catch (error: any) {
      console.error(`❌ Error updating ${result.naam}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Geocoding en database update voltooid!');
}

geocodeKazernes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
