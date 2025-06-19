
const { neon } = require("@neondatabase/serverless");
const fs = require('fs');
const path = require('path');

async function importKarakteristieken() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🔄 Starting karakteristieken import with fixed filename...');
    
    // Use the correct filename that exists
    const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750369362301.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Karakteristieken file not found:', filePath);
      return;
    }
    
    const jsonData = fs.readFileSync(filePath, 'utf8');
    // Fix NaN values in JSON before parsing
    const fixedJsonData = jsonData.replace(/:\s*NaN/g, ': null');
    const karakteristiekenData = JSON.parse(fixedJsonData);
    
    console.log(`📊 Found ${karakteristiekenData.length} karakteristieken to import`);
    
    // Clear existing data
    await sql`DELETE FROM karakteristieken`;
    console.log('🗑️ Cleared existing karakteristieken');
    
    // Transform and insert data in batches
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < karakteristiekenData.length; i += batchSize) {
      const batch = karakteristiekenData.slice(i, i + batchSize);
      
      const transformedBatch = batch.map(item => ({
        kt_naam: item['kt-naam'],
        kt_type: item['kt-type'],
        kt_waarde: item['kt-waarde'] === null || item['kt-waarde'] === undefined || 
                   (typeof item['kt-waarde'] === 'number' && isNaN(item['kt-waarde'])) ? null : String(item['kt-waarde']),
        kt_code: item['kt-code'] === null || item['kt-code'] === undefined || 
                 (typeof item['kt-code'] === 'number' && isNaN(item['kt-code'])) ? null : String(item['kt-code']),
        kt_paser: item['kt-paser']
      }));
      
      // Insert batch using Neon SQL
      for (const item of transformedBatch) {
        await sql`
          INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_paser) 
          VALUES (${item.kt_naam}, ${item.kt_type}, ${item.kt_waarde}, ${item.kt_code}, ${item.kt_paser})
        `;
      }
      
      imported += transformedBatch.length;
      console.log(`📥 Imported ${imported}/${karakteristiekenData.length} karakteristieken`);
    }
    
    // Verify import
    const result = await sql`SELECT COUNT(*) FROM karakteristieken`;
    console.log(`✅ Successfully imported ${result[0].count} karakteristieken to database`);
    
  } catch (error) {
    console.error('❌ Error importing karakteristieken:', error);
  }
  
  process.exit(0);
}

importKarakteristieken();
