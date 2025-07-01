import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { policeUnits } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function importRoosterEenheden() {
  console.log('📋 Importing rooster eenheden from detailed file...');

  try {
    // Load the rooster data
    const roosterData = JSON.parse(
      readFileSync('./attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json', 'utf8')
    );

    console.log(`📊 Found ${Object.keys(roosterData).length} teams in rooster data`);

    // Team to basisteam mapping
    const teamToBasisteamMapping = {
      'Basisteam Waterweg (A1)': 'A1',
      'Basisteam Schiedam (A2)': 'A2', 
      'Basisteam Midden-Schieland (A3)': 'A3',
      'Basisteam Delfshaven (B1)': 'B1',
      'Basisteam Centrum (B2)': 'B2',
      'District Stad': 'DISTRICT_STAD',
      'District Rijnmond-Noord': 'DISTRICT_RIJNMOND_NOORD',
    };

    let totalImported = 0;
    let totalSkipped = 0;

    for (const [teamName, eenheden] of Object.entries(roosterData)) {
      console.log(`\n🔍 Processing team: ${teamName} (${eenheden.length} eenheden)`);
      
      const basisteamId = teamToBasisteamMapping[teamName];
      if (!basisteamId) {
        console.log(`⚠️  No basisteam mapping found for team: ${teamName}`);
        continue;
      }

      for (const eenheid of eenheden) {
        try {
          // Check if unit already exists
          const existingUnit = await db
            .select()
            .from(policeUnits)
            .where(eq(policeUnits.roepnummer, eenheid.roepnummer))
            .limit(1);

          if (existingUnit.length > 0) {
            console.log(`⏭️  Unit ${eenheid.roepnummer} already exists, skipping`);
            totalSkipped++;
            continue;
          }

          // Create new unit
          const newUnit = {
            roepnummer: eenheid.roepnummer,
            aantal_mensen: eenheid.aantal_mensen || 2,
            rollen: eenheid.rollen || ['Noodhulp'],
            soort_auto: eenheid.soort_auto || 'BPV - bus',
            team: teamName,
            basisteam_id: basisteamId,
            status: '1 - Beschikbaar/vrij',
            locatie: '',
            incident: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await db.insert(policeUnits).values(newUnit);
          console.log(`✅ Imported ${eenheid.roepnummer} → ${basisteamId}`);
          totalImported++;

        } catch (error) {
          console.error(`❌ Error importing unit ${eenheid.roepnummer}:`, error);
        }
      }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Imported: ${totalImported} new units`);
    console.log(`⏭️  Skipped: ${totalSkipped} existing units`);

    // Show final stats
    const allUnits = await db.select().from(policeUnits);
    const unitsByBasisteam = {};
    
    allUnits.forEach(unit => {
      if (!unitsByBasisteam[unit.basisteam_id]) {
        unitsByBasisteam[unit.basisteam_id] = 0;
      }
      unitsByBasisteam[unit.basisteam_id]++;
    });

    console.log('\n📊 Final distribution:');
    Object.entries(unitsByBasisteam).forEach(([basisteamId, count]) => {
      console.log(`  ${basisteamId}: ${count} units`);
    });

  } catch (error) {
    console.error('❌ Error importing rooster eenheden:', error);
  } finally {
    await pool.end();
  }
}

importRoosterEenheden();