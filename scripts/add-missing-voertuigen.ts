#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';

async function runSQL(sql: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  return await response.json();
}

async function addMissingVoertuigen() {
  console.log('🚀 Adding missing voertuigen from roepnamem.txt...\n');

  try {
    // Lees bestand
    const content = readFileSync('C:\\Users\\Gebruiker\\Desktop\\roepnamem.txt', 'utf8');
    
    // Extract alle INSERT statements
    const inserts = content.match(/INSERT INTO Voertuigen[\s\S]*?;/g) || [];
    console.log(`📋 Found ${inserts.length} INSERT statements in file\n`);
    
    // Haal huidige voertuigen op
    const existing = await runSQL('SELECT Roepnummer FROM Voertuigen');
    const existingRoepnummers = new Set(
      existing.data?.[0]?.result?.map((v: any) => v.roepnummer) || []
    );
    
    console.log(`📊 Currently in database: ${existingRoepnummers.size} voertuigen\n`);
    
    let added = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < inserts.length; i++) {
      let insert = inserts[i];
      
      // Extract roepnummer from INSERT
      const roepMatch = insert.match(/'(17-\d+)'/);
      if (!roepMatch) continue;
      
      const roepnummer = roepMatch[1];
      
      // Skip als al exists
      if (existingRoepnummers.has(roepnummer)) {
        skipped++;
        continue;
      }
      
      // Vervang alle UUID's door NULL
      insert = insert.replace(/'[a-f0-9-]{36}'/g, 'NULL');
      
      // Fix typo
      insert = insert.replace(/kzerne_id/g, 'kazerne_id');
      
      try {
        console.log(`[${i + 1}/${inserts.length}] Adding ${roepnummer}...`);
        const result = await runSQL(insert);
        
        if (result.success) {
          added++;
          existingRoepnummers.add(roepnummer);
        } else {
          console.error(`  ❌ ${result.error}`);
          errors++;
        }
      } catch (error: any) {
        errors++;
      }
      
      // Small delay to avoid rate limiting
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Added: ${added}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}\n`);
    
    // Nu auto-koppeling maken voor NULL kazerne_ids
    console.log('🔗 Auto-linking voertuigen to kazernes...\n');
    
    const mapping: Record<string, string> = {
      '17-01': 'Hoek van Holland',
      '17-02': 'Maassluis',
      '17-05': 'Frobenstraat',
    };
    
    for (const [prefix, search] of Object.entries(mapping)) {
      const updateSQL = `
        UPDATE Voertuigen 
        SET kazerne_id = (SELECT id FROM kazernes WHERE naam LIKE '%${search}%' AND plaats != '-' LIMIT 1)
        WHERE Roepnummer LIKE '${prefix}%' AND kazerne_id IS NULL
      `;
      
      await runSQL(updateSQL);
      console.log(`  ✅ Linked ${prefix}xx to kazerne with '${search}'`);
    }
    
    // Final stats
    const stats = await runSQL(`
      SELECT 
        COUNT(*) as totaal,
        COUNT(*) FILTER (WHERE kazerne_id IS NOT NULL) as gekoppeld
      FROM Voertuigen
    `);
    
    console.log('\n📊 Final statistics:');
    console.table(stats.data?.[0]?.result || []);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addMissingVoertuigen()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));

