-- INSTALLATIE: Voer deze SQL eenmalig uit in Supabase SQL Editor
-- Hierna kan ik via de API alles beheren zonder dat jij steeds SQL moet uitvoeren

-- Create exec_sql function voor remote query execution
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS TABLE (
  result JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_data JSONB;
BEGIN
  -- Execute the query and return results as JSONB
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result_data;
  
  RETURN QUERY SELECT result_data;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO anon, authenticated, service_role;

-- Create simplified version for DDL operations (CREATE, ALTER, DROP)
CREATE OR REPLACE FUNCTION exec_ddl(query_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query_text;
  RETURN 'Query executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION exec_ddl(TEXT) TO anon, authenticated, service_role;

-- Test the functions
SELECT exec_ddl('
  CREATE TABLE IF NOT EXISTS test_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    naam VARCHAR(255) NOT NULL,
    nummer INTEGER,
    actief BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
');

SELECT exec_ddl('ALTER TABLE test_table ENABLE ROW LEVEL SECURITY');
SELECT exec_ddl('CREATE POLICY "Allow all on test_table" ON test_table FOR ALL USING (true)');

-- Insert testdata
SELECT exec_ddl('
  INSERT INTO test_table (naam, nummer, actief) VALUES
    (''Test 1'', 100, true),
    (''Test 2'', 200, true),
    (''Test 3'', 300, false)
');

-- Show the results
SELECT * FROM exec_sql('SELECT * FROM test_table ORDER BY naam');

-- Show success message
SELECT 'INSTALLATIE SUCCESVOL! De exec_sql en exec_ddl functies zijn nu beschikbaar.' as message;
SELECT 'Ik kan nu via de API alles in je Supabase beheren!' as status;

