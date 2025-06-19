import fs from 'fs';
import { db } from './server/db.ts';
import { karakteristieken } from './shared/schema.ts';

async function importKarakteristiekenData() {
  try {
    console.log('Reading karakteristieken data...');
    const data = JSON.parse(fs.readFileSync('./attached_assets/karakteristieken_volledig_1750370961031.json', 'utf8'));
    
    console.log(`Found ${data.length} karakteristieken records`);
    
    // Transform the data to match our schema
    const karakteristiekenData = data.map(item => ({
      kt_naam: item.kt_naam,
      kt_type: item.kt_type,
      kt_waarde: item.kt_waarde,
      kt_code: item.kt_code,
      kt_parser: item.kt_parser
    }));
    
    // Clear existing data
    console.log('Clearing existing karakteristieken...');
    await db.delete(karakteristieken);
    
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < karakteristiekenData.length; i += batchSize) {
      const batch = karakteristiekenData.slice(i, i + batchSize);
      await db.insert(karakteristieken).values(batch);
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${karakteristiekenData.length} records`);
    }
    
    console.log(`Successfully imported ${inserted} karakteristieken records`);
    
    // Test query to verify data
    const count = await db.select().from(karakteristieken).limit(5);
    console.log('Sample records:', count.map(k => ({ naam: k.ktNaam, parser: k.ktParser })));
    
  } catch (error) {
    console.error('Error importing karakteristieken:', error);
  }
}

importKarakteristiekenData();