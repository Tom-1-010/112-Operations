
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function migrateNewTeams() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🚀 Starting migration of police units...');

    // First create the police_units table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_units (
        id SERIAL PRIMARY KEY,
        roepnummer TEXT UNIQUE NOT NULL,
        aantal_mensen INTEGER NOT NULL DEFAULT 2,
        rollen JSONB NOT NULL,
        soort_auto TEXT NOT NULL,
        team TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '5 - Afmelden',
        locatie TEXT,
        incident TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Police units table created/verified');

    // Load the new teams data
    const filePath = path.join(process.cwd(), 'attached_assets', 'rooster_eenheden_per_team_detailed_1751227112307.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('Teams data file not found, using default data instead');
      
      // Use default police units data if file doesn't exist
      const defaultData = [
        {
          roepnummer: "RT 11.01",
          aantal_mensen: 2,
          rollen: ["Noodhulp"],
          soort_auto: "BPV - bus",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.02",
          aantal_mensen: 2,
          rollen: ["Noodhulp"],
          soort_auto: "BPV - bus",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.03",
          aantal_mensen: 2,
          rollen: ["Noodhulp"],
          soort_auto: "BPV - bus",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.04",
          aantal_mensen: 2,
          rollen: ["Noodhulp"],
          soort_auto: "BPV - bus",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.05",
          aantal_mensen: 2,
          rollen: ["Noodhulp"],
          soort_auto: "BPV - bus",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.09",
          aantal_mensen: 1,
          rollen: ["Senior", "ACO"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.10",
          aantal_mensen: 1,
          rollen: ["Opr. Expert", "OPCO"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.16",
          aantal_mensen: 2,
          rollen: ["Noodhulp", "Onopvallend"],
          soort_auto: "BPV-onopvallend",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.21",
          aantal_mensen: 1,
          rollen: ["Noodhulp", "Motor"],
          soort_auto: "BPV-motor",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.26",
          aantal_mensen: 2,
          rollen: ["Voet/fiets"],
          soort_auto: "Fiets",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.34",
          aantal_mensen: 3,
          rollen: ["Noodhulp", "Studenten"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.50",
          aantal_mensen: 1,
          rollen: ["Opsporing"],
          soort_auto: "BPV-onopvallend",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.60",
          aantal_mensen: 1,
          rollen: ["Wijkagent"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.95",
          aantal_mensen: 1,
          rollen: ["Reisnummer"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        },
        {
          roepnummer: "RT 11.99",
          aantal_mensen: 1,
          rollen: ["teamchef"],
          soort_auto: "BPV-auto",
          team: "Basisteam Waterweg (A1)",
          status: "1 - Beschikbaar/vrij"
        }
      ];

      // Insert default data
      let totalUnitsAdded = 0;
      for (const unit of defaultData) {
        try {
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
            unit.team,
            unit.status
          ]);
          totalUnitsAdded++;
        } catch (error) {
          console.error(`❌ Error inserting unit ${unit.roepnummer}:`, error.message);
        }
      }

      console.log(`✅ Successfully migrated ${totalUnitsAdded} default police units to database`);
    } else {
      // Load and process the teams data file
      const teamsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let totalUnitsAdded = 0;

      // Process each team
      for (const [teamName, units] of Object.entries(teamsData)) {
        console.log(`📋 Processing team: ${teamName}`);
        
        for (const unit of units) {
          // Determine status based on primair field
          const status = unit.primair ? "1 - Beschikbaar/vrij" : "5 - Afmelden";
          
          try {
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
            
            if (totalUnitsAdded % 50 === 0) {
              console.log(`📥 Processed ${totalUnitsAdded} units...`);
            }
            
          } catch (error) {
            console.error(`❌ Error inserting unit ${unit.roepnummer}:`, error.message);
          }
        }
        
        console.log(`✅ Completed team ${teamName}`);
      }

      console.log(`✅ Successfully migrated ${totalUnitsAdded} police units to database`);
    }
    
    // Verify migration
    const result = await pool.query('SELECT COUNT(*) FROM police_units');
    console.log(`📊 Total units in database: ${result.rows[0].count}`);

    // Show breakdown by team
    const teamBreakdown = await pool.query(`
      SELECT team, COUNT(*) as count 
      FROM police_units 
      GROUP BY team 
      ORDER BY team
    `);
    
    console.log('\n📈 Units by team:');
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

migrateNewTeams();
