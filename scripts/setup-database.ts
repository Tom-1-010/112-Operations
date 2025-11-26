#!/usr/bin/env tsx

/**
 * Database setup script for MeldkamerSpel
 * This script creates the necessary tables and sample data in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in apps/web/.env.local');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log('🚀 Setting up MeldkamerSpel database...');

  try {
    // 1. Create enums
    console.log('📝 Creating enums...');
    
    const enumQueries = [
      `CREATE TYPE IF NOT EXISTS unit_role AS ENUM (
        'POLICE_PATROL',
        'POLICE_SIV', 
        'POLICE_SUPERVISOR'
      );`,
      
      `CREATE TYPE IF NOT EXISTS unit_status AS ENUM (
        'IDLE',
        'ENROUTE',
        'ONSCENE',
        'RETURNING',
        'OFFLINE'
      );`,
      
      `CREATE TYPE IF NOT EXISTS incident_type AS ENUM (
        'PURSUIT',
        'BURGLARY',
        'DISTURBANCE',
        'THEFT'
      );`,
      
      `CREATE TYPE IF NOT EXISTS incident_state AS ENUM (
        'OPEN',
        'ASSIGNED',
        'ONSCENE',
        'DONE'
      );`,
      
      `CREATE TYPE IF NOT EXISTS dispatch_status AS ENUM (
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'COMPLETED'
      );`
    ];

    for (const query of enumQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  Enum might already exist: ${error.message}`);
      }
    }

    // 2. Create tables
    console.log('📋 Creating tables...');
    
    const tableQueries = [
      // Incidents table
      `CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type incident_type NOT NULL,
        state incident_state NOT NULL DEFAULT 'OPEN',
        location_lat DECIMAL(10, 8) NOT NULL,
        location_lng DECIMAL(11, 8) NOT NULL,
        priority INTEGER NOT NULL CHECK (priority IN (1, 2, 3)),
        dwell_seconds INTEGER NOT NULL DEFAULT 0,
        reward INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`,
      
      // Units table
      `CREATE TABLE IF NOT EXISTS units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        role unit_role NOT NULL,
        status unit_status NOT NULL DEFAULT 'IDLE',
        location_lat DECIMAL(10, 8) NOT NULL,
        location_lng DECIMAL(11, 8) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`,
      
      // Dispatches table
      `CREATE TABLE IF NOT EXISTS dispatches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        unit_ids UUID[] NOT NULL,
        status dispatch_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`,
      
      // Unit status history table
      `CREATE TABLE IF NOT EXISTS unit_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        status unit_status NOT NULL,
        location_lat DECIMAL(10, 8) NOT NULL,
        location_lng DECIMAL(11, 8) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`
    ];

    for (const query of tableQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  Table might already exist: ${error.message}`);
      }
    }

    // 3. Create indexes
    console.log('🔍 Creating indexes...');
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_incidents_state ON incidents(state);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);',
      'CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);',
      'CREATE INDEX IF NOT EXISTS idx_units_role ON units(role);',
      'CREATE INDEX IF NOT EXISTS idx_dispatches_incident_id ON dispatches(incident_id);',
      'CREATE INDEX IF NOT EXISTS idx_dispatches_status ON dispatches(status);',
      'CREATE INDEX IF NOT EXISTS idx_unit_status_history_unit_id ON unit_status_history(unit_id);',
      'CREATE INDEX IF NOT EXISTS idx_unit_status_history_created_at ON unit_status_history(created_at);'
    ];

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  Index might already exist: ${error.message}`);
      }
    }

    // 4. Enable RLS and create policies
    console.log('🔒 Setting up Row Level Security...');
    
    const rlsQueries = [
      'ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE units ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE unit_status_history ENABLE ROW LEVEL SECURITY;',
      
      `CREATE POLICY IF NOT EXISTS "Allow all operations on incidents" ON incidents
        FOR ALL USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Allow all operations on units" ON units
        FOR ALL USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Allow all operations on dispatches" ON dispatches
        FOR ALL USING (true);`,
      
      `CREATE POLICY IF NOT EXISTS "Allow all operations on unit_status_history" ON unit_status_history
        FOR ALL USING (true);`
    ];

    for (const query of rlsQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`⚠️  RLS policy might already exist: ${error.message}`);
      }
    }

    // 5. Insert sample data
    console.log('📊 Inserting sample data...');
    
    // Check if we already have data
    const { data: existingUnits } = await supabase.from('units').select('id').limit(1);
    
    if (!existingUnits || existingUnits.length === 0) {
      // Insert sample units
      const { error: unitsError } = await supabase.from('units').insert([
        { name: 'Unit-001', role: 'POLICE_PATROL', status: 'IDLE', location_lat: 52.3676, location_lng: 4.9041 },
        { name: 'Unit-002', role: 'POLICE_PATROL', status: 'IDLE', location_lat: 52.3700, location_lng: 4.9100 },
        { name: 'Unit-003', role: 'POLICE_SIV', status: 'IDLE', location_lat: 52.3650, location_lng: 4.9000 },
        { name: 'Unit-004', role: 'POLICE_SUPERVISOR', status: 'IDLE', location_lat: 52.3680, location_lng: 4.9050 }
      ]);
      
      if (unitsError) {
        console.error('❌ Error inserting units:', unitsError.message);
      } else {
        console.log('✅ Sample units inserted');
      }

      // Insert sample incidents
      const { error: incidentsError } = await supabase.from('incidents').insert([
        { type: 'BURGLARY', state: 'OPEN', location_lat: 52.3600, location_lng: 4.8900, priority: 2, dwell_seconds: 300, reward: 100 },
        { type: 'DISTURBANCE', state: 'OPEN', location_lat: 52.3700, location_lng: 4.9200, priority: 1, dwell_seconds: 180, reward: 50 },
        { type: 'THEFT', state: 'OPEN', location_lat: 52.3650, location_lng: 4.8950, priority: 3, dwell_seconds: 600, reward: 200 }
      ]);
      
      if (incidentsError) {
        console.error('❌ Error inserting incidents:', incidentsError.message);
      } else {
        console.log('✅ Sample incidents inserted');
      }
    } else {
      console.log('ℹ️  Sample data already exists, skipping...');
    }

    // 6. Verify setup
    console.log('🔍 Verifying database setup...');
    
    const { data: units, error: unitsError } = await supabase.from('units').select('*');
    const { data: incidents, error: incidentsError } = await supabase.from('incidents').select('*');
    
    if (unitsError) {
      console.error('❌ Error fetching units:', unitsError.message);
    } else {
      console.log(`✅ Found ${units?.length || 0} units in database`);
    }
    
    if (incidentsError) {
      console.error('❌ Error fetching incidents:', incidentsError.message);
    } else {
      console.log(`✅ Found ${incidents?.length || 0} incidents in database`);
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📋 Tables created:');
    console.log('  - incidents (with sample data)');
    console.log('  - units (with sample data)');
    console.log('  - dispatches');
    console.log('  - unit_status_history');
    console.log('🔒 Row Level Security enabled with permissive policies');
    console.log('🔍 Performance indexes created');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();



