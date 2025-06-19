
const { Pool } = require('@neondatabase/serverless');

async function importKarakteristieken() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔄 Starting karakteristieken import...');
    
    // Read the karakteristieken JSON file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750367007045.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Karakteristieken file not found:', filePath);
      return;
    }
    
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const karakteristiekenData = JSON.parse(jsonData);
    
    console.log(`📊 Found ${karakteristiekenData.length} karakteristieken to import`);
    
    // Clear existing data
    await pool.query('DELETE FROM karakteristieken');
    console.log('🗑️ Cleared existing karakteristieken');
    
    // Insert new data
    for (const item of karakteristiekenData) {
      const ktWaarde = item['kt-waarde'] === null || item['kt-waarde'] === undefined ? null : String(item['kt-waarde']);
      const ktCode = item['kt-code'] === null || item['kt-code'] === undefined ? null : String(item['kt-code']);
      
      await pool.query(
        'INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_paser) VALUES ($1, $2, $3, $4, $5)',
        [item['kt-naam'], item['kt-type'], ktWaarde, ktCode, item['kt-paser']]
      );
    }
    
    // Verify import
    const result = await pool.query('SELECT COUNT(*) FROM karakteristieken');
    console.log(`✅ Successfully imported ${result.rows[0].count} karakteristieken to database`);
    
  } catch (error) {
    console.error('❌ Error importing karakteristieken:', error);
  } finally {
    await pool.end();
  }
}

importKarakteristieken();
