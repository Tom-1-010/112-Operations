import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

interface KazerneInput {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: 'Brandweer' | 'Politie' | 'Ambulance';
  telefoonnummer?: string;
  email?: string;
  capaciteit?: number;
  latitude?: number;
  longitude?: number;
  regio?: string;
}

async function addKazerne(data: KazerneInput) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('➕ Adding new kazerne...\n');
    console.log('Data:', data);
    
    const result = await pool.query(`
      INSERT INTO kazernes (
        naam, adres, postcode, plaats, type, 
        telefoonnummer, email, capaciteit, 
        latitude, longitude, regio, actief
      ) VALUES (
        $1, $2, $3, $4, $5::kazerne_type, 
        $6, $7, $8, 
        $9, $10, $11, true
      )
      RETURNING *
    `, [
      data.naam,
      data.adres,
      data.postcode,
      data.plaats,
      data.type,
      data.telefoonnummer || null,
      data.email || null,
      data.capaciteit || 20,
      data.latitude || null,
      data.longitude || null,
      data.regio || null
    ]);
    
    console.log('\n✅ Kazerne added successfully:\n');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Example usage - you can modify this or pass via args
const exampleKazerne: KazerneInput = {
  naam: 'Test Kazerne',
  adres: 'Teststraat 1',
  postcode: '3000 AA',
  plaats: 'Rotterdam',
  type: 'Politie',
  telefoonnummer: '010-1234567',
  capaciteit: 25,
  regio: 'Rotterdam-Rijnmond'
};

// If command line args provided, use those
if (process.argv[2]) {
  console.log('Usage: Edit the script to add a kazerne, or use db:query for custom inserts');
  process.exit(1);
}

addKazerne(exampleKazerne)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

