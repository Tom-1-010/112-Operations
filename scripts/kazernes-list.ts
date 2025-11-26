import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// List all kazernes
async function listKazernes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📋 Fetching all kazernes...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        naam,
        type,
        plaats,
        capaciteit,
        actief,
        telefoonnummer,
        created_at
      FROM kazernes 
      ORDER BY type, naam
    `);
    
    console.log(`Found ${result.rows.length} kazernes:\n`);
    console.table(result.rows);
    
    // Summary by type
    const summary = await pool.query(`
      SELECT 
        type, 
        COUNT(*) as aantal,
        SUM(capaciteit) as totale_capaciteit,
        COUNT(*) FILTER (WHERE actief = true) as actief_aantal
      FROM kazernes 
      GROUP BY type 
      ORDER BY type
    `);
    
    console.log('\n📊 Summary by type:\n');
    console.table(summary.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

listKazernes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

