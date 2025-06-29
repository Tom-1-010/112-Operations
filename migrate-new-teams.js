
const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function migrateNewTeams() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Load the new teams data
    const filePath = path.join(process.cwd(), 'attached_assets', 'rooster_eenheden_per_team_detailed_1751227112307.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('Teams data file not found');
      process.exit(1);
    }

    const teamsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log('🚀 Starting migration of new police teams...');

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

migrateNewTeams().catch(console.error);
