import fs from 'fs';
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function importFinalKarakteristieken() {
  try {
    console.log('Reading new karakteristieken dataset...');
    const data = JSON.parse(fs.readFileSync('./attached_assets/karakteristieken_volledig_1750374985513.json', 'utf8'));
    
    console.log(`Found ${data.length} karakteristieken records to import`);
    
    // Import in batches for better performance
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (const item of batch) {
        await db.execute(sql`
          INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_parser)
          VALUES (${item.kt_naam}, ${item.kt_type}, ${item.kt_waarde || null}, ${item.kt_code || null}, ${item.kt_parser})
        `);
        imported++;
      }
      
      console.log(`Imported ${imported}/${data.length} records`);
      
      // Add small delay to prevent overwhelming the database
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Successfully imported ${imported} karakteristieken records`);
    
    // Verify import
    const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM karakteristieken`);
    console.log(`Database now contains ${countResult.rows[0].count} karakteristieken`);
    
  } catch (error) {
    console.error('Error importing karakteristieken:', error);
  }
}

importFinalKarakteristieken();