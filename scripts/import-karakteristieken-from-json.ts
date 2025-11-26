import { db } from '../server/db';
import { karakteristieken } from '../shared/schema';
import { readFileSync } from 'fs';
import { join } from 'path';

async function importKarakteristieken() {
  try {
    console.log('🔄 Starting karakteristieken import from JSON...');

    // Read the JSON file
    const jsonPath = join(process.cwd(), 'attached_assets', 'karakteristieken_volledig_1750374985513.json');
    const jsonData = readFileSync(jsonPath, 'utf-8');
    const karakteristiekenData = JSON.parse(jsonData);

    console.log(`📋 Found ${karakteristiekenData.length} karakteristieken in JSON file`);

    // Clear existing data
    console.log('🗑️ Clearing existing karakteristieken...');
    await db.delete(karakteristieken);

    // Prepare data for insertion
    const dataToInsert = karakteristiekenData.map((item: any) => ({
      ktNaam: item.kt_naam || '',
      ktType: item.kt_type || '',
      ktWaarde: item.kt_waarde || null,
      ktCode: item.kt_code || null,
      ktParser: item.kt_parser || null,
    }));

    console.log('💾 Inserting karakteristieken into database...');

    // Insert in batches of 100 to avoid query size limits
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      await db.insert(karakteristieken).values(batch);
      inserted += batch.length;
      console.log(`  ✅ Inserted ${inserted} / ${dataToInsert.length} karakteristieken`);
    }

    // Verify import
    const count = await db.select().from(karakteristieken);
    console.log(`\n✅ Import complete! Total karakteristieken in database: ${count.length}`);

    // Show some examples
    console.log('\n📋 Sample karakteristieken:');
    count.slice(0, 5).forEach((k) => {
      console.log(`  - ${k.ktNaam} (${k.ktType}) - Code: ${k.ktCode || 'N/A'} - Parser: ${k.ktParser || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing karakteristieken:', error);
    process.exit(1);
  }
}

importKarakteristieken();

