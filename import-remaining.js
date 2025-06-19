import fs from 'fs';
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function importRemaining() {
  try {
    const data = JSON.parse(fs.readFileSync('./attached_assets/karakteristieken_aggregated_1750373092969.json', 'utf8'));
    
    // Check current count
    const currentResult = await db.execute(sql`SELECT COUNT(*) as count FROM karakteristieken`);
    const currentCount = parseInt(currentResult.rows[0].count);
    
    console.log(`Current count: ${currentCount}, Total to import: ${data.length}`);
    
    if (currentCount >= data.length) {
      console.log('Import already complete');
      return;
    }
    
    // Import remaining records in larger batches
    const remainingData = data.slice(currentCount);
    const batchSize = 50;
    
    for (let i = 0; i < remainingData.length; i += batchSize) {
      const batch = remainingData.slice(i, i + batchSize);
      
      // Build batch insert
      let values = [];
      let params = [];
      let paramIndex = 1;
      
      for (const item of batch) {
        values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
        params.push(item.kt_naam, item.kt_type, item.kt_waarde || null, item.kt_code || null, JSON.stringify(item.kt_parsers || []));
        paramIndex += 5;
      }
      
      const insertQuery = `INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_parsers) VALUES ${values.join(', ')}`;
      
      await db.execute(sql.raw(insertQuery, params));
      
      const newCount = currentCount + i + batch.length;
      console.log(`Progress: ${newCount}/${data.length}`);
    }
    
    console.log('Import completed successfully');
    
  } catch (error) {
    console.error('Error importing:', error);
  }
}

importRemaining();