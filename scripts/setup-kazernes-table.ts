import { pool } from '../server/db';

async function setupKazernesTable() {
  console.log('🚀 Starting kazernes table setup...');

  try {
    // 1. Create trigger function if not exists
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

    // 8. Check if table has data
    const countResult = await pool.query('SELECT COUNT(*) FROM kazernes');
    const count = parseInt(countResult.rows[0].count);

    if (count === 0) {
      console.log('📝 Inserting sample data...');
      await pool.query(`
        INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio) VALUES
          -- Brandweer kazernes
          ('Brandweerkazerne Rotterdam Centrum', 'Baan 150', '3011 CD', 'Rotterdam', 'Brandweer', '010-4468800', 25, true, 51.9225, 4.4792, 'Rotterdam-Rijnmond'),
          ('Brandweerkazerne Schiedam', 'Industrieweg 80', '3044 AS', 'Schiedam', 'Brandweer', '010-4468850', 20, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
          ('Brandweerkazerne Vlaardingen', 'Kethelweg 21', '3134 KG', 'Vlaardingen', 'Brandweer', '010-4468870', 18, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
          ('Brandweerkazerne Hoek van Holland', 'Stationsweg 20', '3151 HR', 'Hoek van Holland', 'Brandweer', '010-4468890', 15, true, 51.9770, 4.1350, 'Rotterdam-Rijnmond'),
          ('Brandweerkazerne Capelle aan den IJssel', 'Rivium Boulevard 201', '2909 LK', 'Capelle aan den IJssel', 'Brandweer', '010-4468895', 22, true, 51.9293, 4.5773, 'Rotterdam-Rijnmond'),
          
          -- Politie bureaus
          ('Politiebureau Rotterdam Centrum', 'Boezemlaan 15', '3031 BB', 'Rotterdam', 'Politie', '0900-8844', 50, true, 51.9244, 4.5833, 'Rotterdam-Rijnmond'),
          ('Politiebureau Schiedam', 'Gerrit Verboonstraat 1', '3121 PB', 'Schiedam', 'Politie', '0900-8844', 40, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
          ('Politiebureau Vlaardingen', 'Marathonweg 6', '3133 KV', 'Vlaardingen', 'Politie', '0900-8844', 35, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
          ('Politiebureau Maassluis', 'Maasboulevard 10', '3142 AJ', 'Maassluis', 'Politie', '0900-8844', 30, true, 51.9266, 4.2527, 'Rotterdam-Rijnmond'),
          ('Politiebureau Spijkenisse', 'Hoogstraat 100', '3201 CJ', 'Spijkenisse', 'Politie', '0900-8844', 38, true, 51.8440, 4.3500, 'Rotterdam-Rijnmond'),
          ('Politiebureau Barendrecht', 'Middenbaan 35', '2991 CV', 'Barendrecht', 'Politie', '0900-8844', 28, true, 51.8550, 4.5400, 'Rotterdam-Rijnmond'),
          
          -- Ambulance posten
          ('Ambulancepost Rotterdam', 'Maasstadweg 100', '3079 DZ', 'Rotterdam', 'Ambulance', '010-4061500', 30, true, 51.9080, 4.4920, 'Rotterdam-Rijnmond'),
          ('Ambulancepost Schiedam', 'Parallelweg 101', '3112 NA', 'Schiedam', 'Ambulance', '010-4061510', 20, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
          ('Ambulancepost Vlaardingen', 'Smitsweg 2', '3135 KV', 'Vlaardingen', 'Ambulance', '010-4061520', 15, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
          ('Ambulancepost Capelle aan den IJssel', 'Rivium Boulevard 150', '2909 LC', 'Capelle aan den IJssel', 'Ambulance', '010-4061530', 18, true, 51.9293, 4.5773, 'Rotterdam-Rijnmond'),
          ('Ambulancepost Spijkenisse', 'Keenenburgweg 1', '3201 AK', 'Spijkenisse', 'Ambulance', '010-4061540', 16, true, 51.8440, 4.3500, 'Rotterdam-Rijnmond'),
          ('Ambulancepost Ridderkerk', 'Rijksstraatweg 215', '2987 CE', 'Ridderkerk', 'Ambulance', '010-4061550', 14, true, 51.8721, 4.6042, 'Rotterdam-Rijnmond');
      `);
      console.log('✅ Sample data inserted');
    } else {
      console.log(`ℹ️  Table already contains ${count} records, skipping sample data`);
    }

    // 9. Verify setup
    const finalCount = await pool.query('SELECT COUNT(*) FROM kazernes');
    console.log(`\n✅ Setup complete! Kazernes table has ${finalCount.rows[0].count} records`);

    // Show breakdown by type
    const breakdown = await pool.query(`
      SELECT type, COUNT(*) as count 
      FROM kazernes 
      GROUP BY type 
      ORDER BY type
    `);
    
    console.log('\n📊 Kazernes breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error setting up kazernes table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupKazernesTable()
  .then(() => {
    console.log('\n🎉 Kazernes table setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });

