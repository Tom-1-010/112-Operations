#!/usr/bin/env tsx

/**
 * Script om Supabase database te inspecteren via REST API
 */

const SUPABASE_URL = 'https://dptbjvhmsiytfybqhngz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdGJqdmhtc2l5dGZ5YnFobmd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUxOTU5NSwiZXhwIjoyMDc4MDk1NTk1fQ.2d0ctDk9r6R_P0WxqRKoW3Mxo290SU_n4OmyZ3gAD2A';

async function executeSQL(sql: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    // Als exec_sql niet bestaat, probeer direct via REST API
    console.log(`⚠️  exec_sql niet beschikbaar: ${error.message}`);
    return null;
  }
}

async function checkTable(tableName: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { exists: true, count: Array.isArray(data) ? data.length : 0 };
    } else if (response.status === 404) {
      return { exists: false };
    } else {
      const errorText = await response.text();
      return { exists: false, error: errorText };
    }
  } catch (error: any) {
    return { exists: false, error: error.message };
  }
}

async function getTableColumns(tableName: string) {
  const sql = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;

  const result = await executeSQL(sql);
  return result;
}

async function main() {
  console.log('🔍 Supabase Project Inspectie\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  // Bekende tabellen checken
  const knownTables = [
    'kazernes',
    'karakteristieken',
    'units',
    'incidents',
    'dispatches',
    'unit_status_history',
    'voertuigen',
    'basisteams',
  ];

  console.log('📊 Database Tabellen:\n');

  for (const table of knownTables) {
    const info = await checkTable(table);
    if (info.exists) {
      console.log(`✅ ${table} - bestaat`);
      
      // Probeer kolommen op te halen
      const columns = await getTableColumns(table);
      if (columns && Array.isArray(columns) && columns.length > 0) {
        console.log(`   Kolommen: ${columns.map((c: any) => c.column_name).join(', ')}`);
      }
    } else {
      console.log(`❌ ${table} - bestaat niet`);
    }
  }

  // Probeer alle tabellen op te halen via SQL
  console.log('\n📋 Alle Public Tabellen:\n');
  const allTablesSQL = `
    SELECT 
      table_name,
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE columns.table_schema = 'public' 
       AND columns.table_name = tables.table_name) as column_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const allTables = await executeSQL(allTablesSQL);
  if (allTables && Array.isArray(allTables)) {
    if (allTables.length > 0) {
      console.table(allTables);
    } else {
      console.log('Geen tabellen gevonden in public schema');
    }
  } else {
    console.log('⚠️  Kon tabellen niet ophalen via SQL (exec_sql functie mogelijk niet beschikbaar)');
  }

  console.log('\n✅ Inspectie voltooid!\n');
}

main().catch(console.error);














