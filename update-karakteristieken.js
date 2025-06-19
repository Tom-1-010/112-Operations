import fs from 'fs';
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function updateKarakteristiekenData() {
  try {
    console.log('Reading updated karakteristieken data...');
    const data = JSON.parse(fs.readFileSync('./attached_assets/karakteristieken_aggregated_1750373092969.json', 'utf8'));
    
    console.log(`Found ${data.length} karakteristieken records`);
    
    // Clear existing data
    console.log('Clearing existing karakteristieken...');
    await db.execute(sql`TRUNCATE TABLE karakteristieken RESTART IDENTITY`);
    
    // Insert data in batches using raw SQL
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (const item of batch) {
        const parsersJson = JSON.stringify(item.kt_parsers || []);
        await db.execute(sql`
          INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_parsers)
          VALUES (${item.kt_naam}, ${item.kt_type}, ${item.kt_waarde || null}, ${item.kt_code || null}, ${parsersJson}::text)
        `);
        inserted++;
      }
      
      console.log(`Inserted ${inserted}/${data.length} records`);
    }
    
    console.log(`Successfully imported ${inserted} karakteristieken records`);
    
    // Test query to verify data
    const count = await db.execute(sql`SELECT kt_naam, kt_parsers FROM karakteristieken LIMIT 5`);
    console.log('Sample records:', count.rows.map(k => ({ 
      naam: k.kt_naam, 
      parsers: JSON.parse(k.kt_parsers) 
    })));
    
  } catch (error) {
    console.error('Error updating karakteristieken:', error);
  }
}

updateKarakteristiekenData();