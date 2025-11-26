#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

async function executeSqlFile(filename: string) {
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
  
  try {
    // Read SQL file
    const sqlPath = join(process.cwd(), 'scripts', filename);
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log(`🔍 Executing SQL file: ${filename}\n`);
    console.log('SQL Preview:', sql.substring(0, 200) + '...\n');
    console.log('='.repeat(80) + '\n');
    
    // Execute via API
    const response = await fetch(`${SERVER_URL}/api/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ SQL executed successfully!`);
      console.log(`   Rows affected: ${result.rowCount}`);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`\n📊 Results (${result.rows.length} rows):\n`);
        console.table(result.rows.slice(0, 20)); // Show max 20 rows
      }
    } else {
      console.error('❌ Query failed:', result.error);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Dev server is running: npm run dev');
    console.log('   2. SQL file exists in scripts/ folder');
    console.log(`   3. Server is accessible at ${SERVER_URL}`);
    process.exit(1);
  }
}

// Get filename from args
const filename = process.argv[2];

if (!filename) {
  console.log('Usage: npm run db:exec -- create-test-table.sql');
  console.log('\nAvailable SQL files:');
  console.log('  - create-test-table.sql');
  console.log('  - insert-kazernes-testdata.sql');
  process.exit(1);
}

executeSqlFile(filename)
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));

