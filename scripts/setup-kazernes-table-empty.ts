import 'dotenv/config';
import { pool } from '../server/db';

async function setupEmptyKazernesTable() {
  console.log('🚀 Starting EMPTY kazernes table setup...');

  try {
    // 1. Create trigger function
    console.log('📝 Creating trigger function...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Trigger function created');

    // 2. Create enum type
    console.log('📝 Creating kazerne_type enum...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE kazerne_type AS ENUM (
          'Brandweer',
          'Politie',
          'Ambulance'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Enum type created');

    // 3. Create kazernes table
    console.log('📝 Creating kazernes table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kazernes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        naam VARCHAR(255) NOT NULL,
        adres VARCHAR(255) NOT NULL,
        postcode VARCHAR(10) NOT NULL,
        plaats VARCHAR(100) NOT NULL,
        type kazerne_type NOT NULL,
        telefoonnummer VARCHAR(20),
        email VARCHAR(255),
        capaciteit INTEGER NOT NULL DEFAULT 20,
        actief BOOLEAN NOT NULL DEFAULT true,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        regio VARCHAR(100),
        basisteam_id VARCHAR(50),
        opmerkingen TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT kazernes_capaciteit_positive CHECK (capaciteit > 0),
        CONSTRAINT kazernes_coords_both_or_none CHECK (
          (latitude IS NULL AND longitude IS NULL) OR 
          (latitude IS NOT NULL AND longitude IS NOT NULL)
        )
      );
    `);
    console.log('✅ Table created');

    // 4. Create indexes
    console.log('📝 Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_kazernes_type ON kazernes(type);
      CREATE INDEX IF NOT EXISTS idx_kazernes_actief ON kazernes(actief);
      CREATE INDEX IF NOT EXISTS idx_kazernes_plaats ON kazernes(plaats);
      CREATE INDEX IF NOT EXISTS idx_kazernes_regio ON kazernes(regio);
      CREATE INDEX IF NOT EXISTS idx_kazernes_basisteam_id ON kazernes(basisteam_id);
      CREATE INDEX IF NOT EXISTS idx_kazernes_coords ON kazernes(latitude, longitude) WHERE latitude IS NOT NULL;
    `);
    console.log('✅ Indexes created');

    // 5. Create trigger
    console.log('📝 Creating trigger...');
    await pool.query(`
      DROP TRIGGER IF EXISTS update_kazernes_updated_at ON kazernes;
      CREATE TRIGGER update_kazernes_updated_at 
        BEFORE UPDATE ON kazernes 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Trigger created');

    // 6. Enable RLS
    console.log('📝 Enabling Row Level Security...');
    await pool.query(`
      ALTER TABLE kazernes ENABLE ROW LEVEL SECURITY;
    `);
    console.log('✅ RLS enabled');

    // 7. Create RLS policy
    console.log('📝 Creating RLS policy...');
    await pool.query(`
      DROP POLICY IF EXISTS "Allow all operations on kazernes" ON kazernes;
      CREATE POLICY "Allow all operations on kazernes" ON kazernes
        FOR ALL USING (true);
    `);
    console.log('✅ RLS policy created');

    // 8. Verify setup
    const countResult = await pool.query('SELECT COUNT(*) FROM kazernes');
    console.log(`\n✅ Setup complete! Kazernes table is EMPTY (${countResult.rows[0].count} records)`);
    console.log('📋 You can now add kazernes via the web interface or API');

  } catch (error) {
    console.error('❌ Error setting up kazernes table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupEmptyKazernesTable()
  .then(() => {
    console.log('\n🎉 Empty kazernes table setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });

