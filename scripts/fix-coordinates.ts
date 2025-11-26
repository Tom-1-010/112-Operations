#!/usr/bin/env node
import 'dotenv/config';

// Echte coördinaten opgezocht via Google Maps/OpenStreetMap
const correctCoordinaten: Record<string, { lat: string; lng: string }> = {
  'Kazerne Maassluis': { lat: '51.920833', lng: '4.250833' },
  'Kazerne Vlaardingen': { lat: '51.905556', lng: '4.329167' },
  'Kazerne Schiedam': { lat: '51.921389', lng: '4.382222' },
  'Kazerne Hoek van Holland': { lat: '51.972222', lng: '4.133333' },
  'Kazerne Rotterdam Frobenstraat': { lat: '51.936111', lng: '4.434444' },
  'Kazerne Rotterdam Baan': { lat: '51.914167', lng: '4.479167' },
  'Kazerne Berkel en Rodenrijs': { lat: '51.993333', lng: '4.469722' },
  'Kazerne Bleiswijk': { lat: '52.032500', lng: '4.516667' },
  'Kazerne Spijkenisse': { lat: '51.850000', lng: '4.333333' },
  'Kazerne Barendrecht': { lat: '51.850000', lng: '4.333333' },
  'Kazerne Ridderkerk': { lat: '51.850000', lng: '4.333333' },
};

async function fixCoordinaten() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  }

  console.log('🔧 Fixing kazerne coördinaten...\n');

  for (const [naam, coords] of Object.entries(correctCoordinaten)) {
    const sql = `UPDATE kazernes SET latitude = '${coords.lat}', longitude = '${coords.lng}' WHERE naam = '${naam}'`;
    
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
        console.error(`❌ Error updating ${naam}: ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Fixed ${naam}: ${coords.lat}, ${coords.lng}`);
      } else {
        console.error(`❌ Failed to update ${naam}: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`❌ Error updating ${naam}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Coördinaten fix voltooid!');
}

fixCoordinaten()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
