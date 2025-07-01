import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { policeUnits, basisteams } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function completeUnitLinking() {
  console.log('🔗 Completing police unit to basisteam linking...');

  try {
    // Enhanced mapping from team names to basisteam IDs
    const teamToBasisteamMapping = {
      'Basisteam Waterweg (A1)': 'A1',
      'Basisteam Schiedam (A2)': 'A2', 
      'Basisteam Midden-Schieland (A3)': 'A3',
      'Basisteam Delfshaven (B1)': 'B1',
      'Basisteam Centrum (B2)': 'B2',
      'District Stad': 'DISTRICT_STAD',
      'District Rijnmond-Noord': 'DISTRICT_RIJNMOND_NOORD',
      // Short codes
      'A1': 'A1',
      'A2': 'A2',
      'A3': 'A3',
      'B1': 'B1',
      'B2': 'B2'
    };

    // Get all police units that are not linked
    const unlinkedUnits = await db
      .select()
      .from(policeUnits)
      .where(eq(policeUnits.basisteam_id, null));

    console.log(`📋 Found ${unlinkedUnits.length} unlinked police units to process`);

    if (unlinkedUnits.length === 0) {
      console.log('✅ All units are already linked!');
      return;
    }

    let updated = 0;
    let unmapped = 0;

    for (const unit of unlinkedUnits) {
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

    console.log(`✅ Successfully linked ${updated} additional units to basisteams`);
    console.log(`⚠️  ${unmapped} units remain unmapped`);

    // Final verification - check all linkages
    const totalUnits = await db.select().from(policeUnits);
    const linkedUnits = totalUnits.filter(unit => unit.basisteam_id !== null);
    const stillUnlinked = totalUnits.filter(unit => unit.basisteam_id === null);

    console.log('\n📊 Final Status:');
    console.log(`Total units: ${totalUnits.length}`);
    console.log(`Linked units: ${linkedUnits.length}`);
    console.log(`Unlinked units: ${stillUnlinked.length}`);

    if (stillUnlinked.length > 0) {
      console.log('\n⚠️  Remaining unlinked units:');
      stillUnlinked.forEach(unit => {
        console.log(`  ${unit.roepnummer} (${unit.team})`);
      });
    }

    // Show distribution by basisteam
    const unitsByBasisteam = {};
    linkedUnits.forEach(unit => {
      if (!unitsByBasisteam[unit.basisteam_id]) {
        unitsByBasisteam[unit.basisteam_id] = 0;
      }
      unitsByBasisteam[unit.basisteam_id]++;
    });

    console.log('\n📋 Units per basisteam:');
    Object.entries(unitsByBasisteam).forEach(([basisteamId, count]) => {
      console.log(`  ${basisteamId}: ${count} units`);
    });

    console.log('\n🎉 Unit linking process complete!');

  } catch (error) {
    console.error('❌ Error completing unit linking:', error);
  } finally {
    await pool.end();
  }
}

completeUnitLinking();