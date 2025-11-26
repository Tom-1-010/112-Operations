-- Migration: Create kazernes (fire stations, police stations, ambulance posts) table
-- Created: 2025-10-01

-- First, create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create enum for kazerne types
DO $$ BEGIN
  CREATE TYPE kazerne_type AS ENUM (
    'Brandweer',
    'Politie',
    'Ambulance'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create kazernes table
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
  -- Geographical coordinates (lat, lng)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  -- Additional metadata
  regio VARCHAR(100),
  basisteam_id VARCHAR(50),
  opmerkingen TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Constraints
  CONSTRAINT kazernes_capaciteit_positive CHECK (capaciteit > 0),
  CONSTRAINT kazernes_coords_both_or_none CHECK (
    (latitude IS NULL AND longitude IS NULL) OR 
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kazernes_type ON kazernes(type);
CREATE INDEX IF NOT EXISTS idx_kazernes_actief ON kazernes(actief);
CREATE INDEX IF NOT EXISTS idx_kazernes_plaats ON kazernes(plaats);
CREATE INDEX IF NOT EXISTS idx_kazernes_regio ON kazernes(regio);
CREATE INDEX IF NOT EXISTS idx_kazernes_basisteam_id ON kazernes(basisteam_id);
CREATE INDEX IF NOT EXISTS idx_kazernes_coords ON kazernes(latitude, longitude) WHERE latitude IS NOT NULL;

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS update_kazernes_updated_at ON kazernes;
CREATE TRIGGER update_kazernes_updated_at 
  BEFORE UPDATE ON kazernes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE kazernes ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists, then create it
DROP POLICY IF EXISTS "Allow all operations on kazernes" ON kazernes;
CREATE POLICY "Allow all operations on kazernes" ON kazernes
  FOR ALL USING (true);

-- Insert sample data (only if table is empty)
INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio)
SELECT * FROM (VALUES
  -- Brandweer kazernes
  ('Brandweerkazerne Rotterdam Centrum', 'Baan 150', '3011 CD', 'Rotterdam', 'Brandweer'::kazerne_type, '010-4468800', 25, true, 51.9225, 4.4792, 'Rotterdam-Rijnmond'),
  ('Brandweerkazerne Schiedam', 'Industrieweg 80', '3044 AS', 'Schiedam', 'Brandweer'::kazerne_type, '010-4468850', 20, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
  ('Brandweerkazerne Vlaardingen', 'Kethelweg 21', '3134 KG', 'Vlaardingen', 'Brandweer'::kazerne_type, '010-4468870', 18, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
  ('Brandweerkazerne Hoek van Holland', 'Stationsweg 20', '3151 HR', 'Hoek van Holland', 'Brandweer'::kazerne_type, '010-4468890', 15, true, 51.9770, 4.1350, 'Rotterdam-Rijnmond'),
  ('Brandweerkazerne Capelle aan den IJssel', 'Rivium Boulevard 201', '2909 LK', 'Capelle aan den IJssel', 'Brandweer'::kazerne_type, '010-4468895', 22, true, 51.9293, 4.5773, 'Rotterdam-Rijnmond'),
  
  -- Politie bureaus
  ('Politiebureau Rotterdam Centrum', 'Boezemlaan 15', '3031 BB', 'Rotterdam', 'Politie'::kazerne_type, '0900-8844', 50, true, 51.9244, 4.5833, 'Rotterdam-Rijnmond'),
  ('Politiebureau Schiedam', 'Gerrit Verboonstraat 1', '3121 PB', 'Schiedam', 'Politie'::kazerne_type, '0900-8844', 40, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
  ('Politiebureau Vlaardingen', 'Marathonweg 6', '3133 KV', 'Vlaardingen', 'Politie'::kazerne_type, '0900-8844', 35, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
  ('Politiebureau Maassluis', 'Maasboulevard 10', '3142 AJ', 'Maassluis', 'Politie'::kazerne_type, '0900-8844', 30, true, 51.9266, 4.2527, 'Rotterdam-Rijnmond'),
  ('Politiebureau Spijkenisse', 'Hoogstraat 100', '3201 CJ', 'Spijkenisse', 'Politie'::kazerne_type, '0900-8844', 38, true, 51.8440, 4.3500, 'Rotterdam-Rijnmond'),
  ('Politiebureau Barendrecht', 'Middenbaan 35', '2991 CV', 'Barendrecht', 'Politie'::kazerne_type, '0900-8844', 28, true, 51.8550, 4.5400, 'Rotterdam-Rijnmond'),
  
  -- Ambulance posten
  ('Ambulancepost Rotterdam', 'Maasstadweg 100', '3079 DZ', 'Rotterdam', 'Ambulance'::kazerne_type, '010-4061500', 30, true, 51.9080, 4.4920, 'Rotterdam-Rijnmond'),
  ('Ambulancepost Schiedam', 'Parallelweg 101', '3112 NA', 'Schiedam', 'Ambulance'::kazerne_type, '010-4061510', 20, true, 51.9194, 4.4061, 'Rotterdam-Rijnmond'),
  ('Ambulancepost Vlaardingen', 'Smitsweg 2', '3135 KV', 'Vlaardingen', 'Ambulance'::kazerne_type, '010-4061520', 15, true, 51.9122, 4.3897, 'Rotterdam-Rijnmond'),
  ('Ambulancepost Capelle aan den IJssel', 'Rivium Boulevard 150', '2909 LC', 'Capelle aan den IJssel', 'Ambulance'::kazerne_type, '010-4061530', 18, true, 51.9293, 4.5773, 'Rotterdam-Rijnmond'),
  ('Ambulancepost Spijkenisse', 'Keenenburgweg 1', '3201 AK', 'Spijkenisse', 'Ambulance'::kazerne_type, '010-4061540', 16, true, 51.8440, 4.3500, 'Rotterdam-Rijnmond'),
  ('Ambulancepost Ridderkerk', 'Rijksstraatweg 215', '2987 CE', 'Ridderkerk', 'Ambulance'::kazerne_type, '010-4061550', 14, true, 51.8721, 4.6042, 'Rotterdam-Rijnmond')
) AS v(naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio)
WHERE NOT EXISTS (SELECT 1 FROM kazernes LIMIT 1);

-- Add comments to table
COMMENT ON TABLE kazernes IS 'Kazernes: brandweerkazernes, politiebureaus en ambulanceposten in de regio';
COMMENT ON COLUMN kazernes.type IS 'Type kazerne: Brandweer, Politie, of Ambulance';
COMMENT ON COLUMN kazernes.capaciteit IS 'Capaciteit in aantal personen die in de kazerne gestationeerd kunnen worden';
COMMENT ON COLUMN kazernes.basisteam_id IS 'Koppeling naar basisteam (optioneel, vooral voor politie)';

