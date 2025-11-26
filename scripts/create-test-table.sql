-- Test tabel aanmaken in Supabase
-- Deze tabel demonstreert hoe ik tabellen kan aanmaken

-- Create test table
CREATE TABLE IF NOT EXISTS test_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  naam VARCHAR(255) NOT NULL,
  beschrijving TEXT,
  nummer INTEGER,
  actief BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_test_table_naam ON test_table(naam);
CREATE INDEX IF NOT EXISTS idx_test_table_actief ON test_table(actief);

-- Create trigger for updated_at (reuse existing function)
DROP TRIGGER IF EXISTS update_test_table_updated_at ON test_table;
CREATE TRIGGER update_test_table_updated_at 
  BEFORE UPDATE ON test_table 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Allow all operations on test_table" ON test_table;
CREATE POLICY "Allow all operations on test_table" ON test_table
  FOR ALL USING (true);

-- Insert testdata
INSERT INTO test_table (naam, beschrijving, nummer, actief, metadata) VALUES
  ('Test Item 1', 'Dit is het eerste test item', 100, true, '{"color": "red", "priority": "high"}'::jsonb),
  ('Test Item 2', 'Dit is het tweede test item', 200, true, '{"color": "blue", "priority": "medium"}'::jsonb),
  ('Test Item 3', 'Dit is het derde test item', 300, false, '{"color": "green", "priority": "low"}'::jsonb),
  ('Test Item 4', 'Nog een test', 150, true, '{"color": "yellow", "priority": "high"}'::jsonb),
  ('Test Item 5', 'Laatste test item', 250, true, '{"color": "purple", "priority": "medium"}'::jsonb);

-- Show result
SELECT 
  id,
  naam,
  nummer,
  actief,
  metadata->>'color' as kleur,
  metadata->>'priority' as prioriteit,
  created_at
FROM test_table 
ORDER BY naam;

-- Statistics
SELECT 
  COUNT(*) as totaal,
  COUNT(*) FILTER (WHERE actief = true) as actief,
  COUNT(*) FILTER (WHERE actief = false) as inactief,
  AVG(nummer) as gemiddeld_nummer
FROM test_table;

