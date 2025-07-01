import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { policeUnits } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function importRemainingUnits() {
  console.log('📋 Importing remaining units...');

  try {
    const roosterData = JSON.parse(
      readFileSync('./attached_assets/rooster_eenheden_per_team_detailed_1751227112307.json', 'utf8')
    );

    const teamToBasisteamMapping = {
      'Basisteam Waterweg (A1)': 'A1',
      'Basisteam Schiedam (A2)': 'A2', 
      'Basisteam Midden-Schieland (A3)': 'A3',
      'Basisteam Delfshaven (B1)': 'B1',
      'Basisteam Centrum (B2)': 'B2',
      'District Stad': 'DISTRICT_STAD',
      'District Rijnmond-Noord': 'DISTRICT_RIJNMOND_NOORD',
    };

    // Get all existing roepnummers to avoid duplicates
    const existingUnits = await db.select({ roepnummer: policeUnits.roepnummer }).from(policeUnits);
    const existingRoepnummers = new Set(existingUnits.map(u => u.roepnummer));

    let imported = 0;
    const newUnits = [];

    for (const [teamName, eenheden] of Object.entries(roosterData)) {
      const basisteamId = teamToBasisteamMapping[teamName];
      if (!basisteamId) continue;

      for (const eenheid of eenheden) {
        if (!existingRoepnummers.has(eenheid.roepnummer)) {
          newUnits.push({
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
          });
        }
      }
    }

    // Batch insert for efficiency
    if (newUnits.length > 0) {
      await db.insert(policeUnits).values(newUnits);
      console.log(`✅ Imported ${newUnits.length} new units`);
    }

    // Final count by team
    const finalStats = await db
      .select()
      .from(policeUnits);

    const statsByTeam = {};
    finalStats.forEach(unit => {
      if (!statsByTeam[unit.basisteam_id]) {
        statsByTeam[unit.basisteam_id] = 0;
      }
      statsByTeam[unit.basisteam_id]++;
    });

    console.log('\n📊 Final distribution:');
    Object.entries(statsByTeam).forEach(([basisteamId, count]) => {
      console.log(`  ${basisteamId}: ${count} units`);
    });

    console.log(`\nTotal units: ${finalStats.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

importRemainingUnits();