
const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function importNewBasisteams() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🚀 Starting import of new basisteam units...');

    // Read the JSON file
    const jsonData = fs.readFileSync('./attached_assets/basisteams_eenheden_4_1751399478214.json', 'utf8');
    const basisteamsData = JSON.parse(jsonData);

    // First create the police_units table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_units (
        id SERIAL PRIMARY KEY,
        roepnummer TEXT UNIQUE NOT NULL,
        aantal_mensen INTEGER NOT NULL DEFAULT 2,
        rollen JSONB NOT NULL,
        soort_auto TEXT NOT NULL,
        team TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '1 - Beschikbaar/vrij',
        locatie TEXT,
        incident TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Police units table created/verified');

    // Process each basisteam and its units
    let totalUnitsAdded = 0;
    
    // Sort teams in the order: A1, A2, A3, then others
    const teamOrder = [
      'Basisteam Waterweg (A1)',
      'Basisteam Schiedam (A2)', 
      'Basisteam Midden-Schieland (A3)',
      'District Rijnmond-Noord'
    ];

    for (const teamName of teamOrder) {
      if (basisteamsData[teamName]) {
        const units = basisteamsData[teamName];
        console.log(`\n📋 Processing ${teamName}: ${units.length} units`);

        for (const unit of units) {
          try {
            // Determine status based on kans_in_dienst percentage
            let status = '5 - Afmelden'; // Default off-duty
            if (unit.kans_in_dienst >= 70) {
              status = '1 - Beschikbaar/vrij';
            } else if (unit.kans_in_dienst >= 40) {
              status = '1 - Beschikbaar/vrij'; // Still available but lower chance
            } else if (unit.kans_in_dienst > 0) {
              status = '4 - Niet inzetbaar'; // Limited availability
            }

            await pool.query(`
              INSERT INTO police_units (roepnummer, aantal_mensen, rollen, soort_auto, team, status)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (roepnummer) 
              DO UPDATE SET 
                aantal_mensen = EXCLUDED.aantal_mensen,
                rollen = EXCLUDED.rollen,
                soort_auto = EXCLUDED.soort_auto,
                team = EXCLUDED.team,
                status = EXCLUDED.status,
                updated_at = NOW()
            `, [
              unit.roepnummer,
              unit.aantal_mensen,
              JSON.stringify(unit.rollen),
              unit.soort_auto,
              teamName,
              status
            ]);
            totalUnitsAdded++;
          } catch (error) {
            console.error(`❌ Error importing unit ${unit.roepnummer}:`, error);
          }
        }
        console.log(`✅ Added ${units.length} units for ${teamName}`);
      }
    }

    console.log(`\n✅ Successfully migrated ${totalUnitsAdded} police units to database`);
    
    // Verify migration
    const result = await pool.query('SELECT COUNT(*) FROM police_units');
    console.log(`📊 Total units in database: ${result.rows[0].count}`);

    // Show breakdown by team in the requested order
    const teamBreakdown = await pool.query(`
      SELECT team, COUNT(*) as count 
      FROM police_units 
      GROUP BY team 
      ORDER BY 
        CASE 
          WHEN team = 'Basisteam Waterweg (A1)' THEN 1
          WHEN team = 'Basisteam Schiedam (A2)' THEN 2
          WHEN team = 'Basisteam Midden-Schieland (A3)' THEN 3
          WHEN team = 'District Rijnmond-Noord' THEN 4
          ELSE 5
        END,
        team
    `);
    
    console.log('\n📈 Units by team (sorted A1, A2, A3, District):');
    teamBreakdown.rows.forEach(row => {
      console.log(`  ${row.team}: ${row.count} units`);
    });

    // Show status breakdown
    const statusBreakdown = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM police_units 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📊 Units by status:');
    statusBreakdown.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} units`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

importNewBasisteams();
