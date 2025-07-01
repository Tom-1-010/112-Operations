import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { policeUnits, basisteams } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function linkUnitsToBasisteams() {
  console.log('🔗 Linking police units to basisteams...');

  try {
    // Mapping from team names to basisteam IDs
    const teamToBasisteamMapping = {
      'Basisteam Waterweg (A1)': 'A1',
      'Basisteam Schiedam (A2)': 'A2', 
      'Basisteam Midden-Schieland (A3)': 'A3',
      'Basisteam Delfshaven (B1)': 'B1',
      'Basisteam Centrum (B2)': 'B2',
      'District Stad': 'DISTRICT_STAD',
      'District Rijnmond-Noord': 'DISTRICT_RIJNMOND_NOORD',
      // Additional mappings for variations
      'A1': 'A1',
      'A2': 'A2',
      'A3': 'A3',
      'B1': 'B1',
      'B2': 'B2'
    };

    // Get all police units
    const allUnits = await db.select().from(policeUnits);
    console.log(`📋 Found ${allUnits.length} police units to process`);

    let updated = 0;
    let unmapped = 0;

    for (const unit of allUnits) {
      const basisteamId = teamToBasisteamMapping[unit.team];
      
      if (basisteamId) {
        try {
          await db
            .update(policeUnits)
            .set({ basisteam_id: basisteamId })
            .where(eq(policeUnits.id, unit.id));
          
          console.log(`✅ Linked ${unit.roepnummer} (${unit.team}) → ${basisteamId}`);
          updated++;
        } catch (error) {
          console.error(`❌ Error updating unit ${unit.roepnummer}:`, error);
        }
      } else {
        console.log(`⚠️  No basisteam mapping found for team: ${unit.team} (unit: ${unit.roepnummer})`);
        unmapped++;
      }
    }

    console.log(`✅ Successfully linked ${updated} units to basisteams`);
    console.log(`⚠️  ${unmapped} units remain unmapped`);

    // Verify the linking by checking join results
    const linkedUnits = await db
      .select({
        unit_id: policeUnits.id,
        roepnummer: policeUnits.roepnummer,
        team: policeUnits.team,
        basisteam_id: policeUnits.basisteam_id,
        basisteam_naam: basisteams.naam
      })
      .from(policeUnits)
      .leftJoin(basisteams, eq(policeUnits.basisteam_id, basisteams.id))
      .limit(10);

    console.log('\n📊 Sample linked units:');
    linkedUnits.forEach(unit => {
      console.log(`  ${unit.roepnummer} (${unit.team}) → ${unit.basisteam_naam || 'NOT LINKED'}`);
    });

    console.log('\n🎉 Unit linking complete!');

  } catch (error) {
    console.error('❌ Error linking units to basisteams:', error);
  } finally {
    await pool.end();
  }
}

linkUnitsToBasisteams();