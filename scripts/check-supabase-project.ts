#!/usr/bin/env tsx

/**
 * Script om Supabase project informatie op te halen
 * Dit script gebruikt de Supabase REST API om database informatie te krijgen
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://dptbjvhmsiytfybqhngz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY niet gevonden in .env');
  console.error('Zorg ervoor dat je .env bestand de juiste credentials bevat');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTableInfo() {
  console.log('\n📊 Database Tabellen:\n');
  
  try {
    // Probeer tabellen op te halen via PostgREST
    // We kunnen dit doen door te proberen een SELECT query uit te voeren op informatie_schema
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          table_schema,
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE columns.table_schema = tables.table_schema 
           AND columns.table_name = tables.table_name) as column_count
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name;
      `
    });

    if (error) {
      // Als exec_sql niet bestaat, probeer dan direct via REST API
      console.log('⚠️  exec_sql functie niet beschikbaar, probeer alternatieve methode...\n');
      
      // Probeer bekende tabellen te checken
      const knownTables = ['kazernes', 'karakteristieken', 'units', 'incidents', 'dispatches'];
      
      for (const table of knownTables) {
        const { data: testData, error: testError } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (!testError) {
          console.log(`✅ Tabel "${table}" bestaat`);
          
          // Haal kolom informatie op
          const { data: columns } = await supabase.rpc('exec_sql', {
            sql_query: `
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = '${table}'
              ORDER BY ordinal_position;
            `
          });
          
          if (columns) {
            console.log(`   Kolommen: ${columns.map((c: any) => c.column_name).join(', ')}`);
          }
        }
      }
      
      return;
    }

    if (data) {
      console.table(data);
    }
  } catch (err: any) {
    console.error('❌ Fout bij ophalen tabel informatie:', err.message);
  }
}

async function getMigrations() {
  console.log('\n📦 Migraties:\n');
  
  try {
    const { data, error } = await supabase
      .from('supabase_migrations')
      .select('*')
      .order('version', { ascending: false })
      .limit(10);

    if (error) {
      console.log('⚠️  Migraties tabel niet beschikbaar via REST API');
      console.log('   (Dit is normaal - migraties worden beheerd via Supabase CLI)');
      return;
    }

    if (data && data.length > 0) {
      console.table(data);
    } else {
      console.log('Geen migraties gevonden');
    }
  } catch (err: any) {
    console.log('⚠️  Kon migraties niet ophalen:', err.message);
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 Row Level Security (RLS) Status:\n');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (error) {
      console.log('⚠️  Kon RLS informatie niet ophalen');
      return;
    }

    if (data) {
      console.table(data);
    }
  } catch (err: any) {
    console.log('⚠️  Kon RLS status niet ophalen');
  }
}

async function getProjectInfo() {
  console.log('🔍 Supabase Project Informatie\n');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Service Role Key: ${supabaseServiceKey.substring(0, 20)}...`);
  console.log('');
}

async function main() {
  await getProjectInfo();
  await getTableInfo();
  await getMigrations();
  await checkRLSPolicies();
  
  console.log('\n✅ Klaar!\n');
}

main().catch(console.error);














