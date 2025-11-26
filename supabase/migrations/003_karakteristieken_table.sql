-- Create karakteristieken table
-- This table stores characteristics/properties that can be assigned to incidents

CREATE TABLE IF NOT EXISTS karakteristieken (
  id SERIAL PRIMARY KEY,
  kt_naam TEXT NOT NULL,
  kt_type TEXT NOT NULL,
  kt_waarde TEXT,
  kt_code TEXT,
  kt_parser TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_karakteristieken_code ON karakteristieken(kt_code);
CREATE INDEX IF NOT EXISTS idx_karakteristieken_naam ON karakteristieken(kt_naam);

-- Enable RLS
ALTER TABLE karakteristieken ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on karakteristieken" ON karakteristieken
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert some common karakteristieken
INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_parser) VALUES
  -- Aantallen
  ('Aantal aanhoudingen', 'Getal', '0', 'aanh', '-aanh'),
  ('Aantal daders', 'Getal', '0', 'ddrs', '-dader'),
  ('Aantal daders', 'Getal', '0', 'ddrs', '-ddrs'),
  ('Aantal doden', 'Getal', '0', 'dd', '-dood'),
  ('Aantal doden', 'Getal', '0', 'dd', '-dd'),
  ('Aantal gewonden', 'Getal', '0', 'gew', '-gewond'),
  ('Aantal gewonden', 'Getal', '0', 'gew', '-gew'),
  ('Aantal personen', 'Getal', '0', 'pers', '-personen'),
  ('Aantal personen', 'Getal', '0', 'pers', '-pers'),
  ('Aantal vermisten', 'Getal', '0', 'verm', '-vermist'),
  ('Aantal vermisten', 'Getal', '0', 'verm', '-verm'),
  
  -- Inzet
  ('Inzet Pol algemeen', 'Vrije tekst', '', 'ipa', '-inzet pol'),
  ('Inzet BRW', 'Vrije tekst', '', 'ibrw', '-inzet brw'),
  ('Inzet AMB', 'Vrije tekst', '', 'iamb', '-inzet amb'),
  ('Inzet AT', 'Ja/Nee', 'Nee', 'iat', '-inzet at'),
  ('Inzet DSI', 'Ja/Nee', 'Nee', 'idsi', '-inzet dsi'),
  ('Inzet heli', 'Ja/Nee', 'Nee', 'iheli', '-inzet heli'),
  ('Inzet ME', 'Ja/Nee', 'Nee', 'ime', '-inzet me'),
  
  -- Overval/Diefstal/Poging
  ('Overval/Diefstal/Poging', 'Enkelvoudige opsom', '', 'ovdp', '-ovdp'),
  
  -- Verkeer
  ('Afkruisen rijstrook', 'Enkelvoudige opsom', '', 'afkrrs', '-afkruisen rijstrook'),
  ('Spookrijder richting', 'Vrije tekst', '', 'spkrr', '-spookrijder richting'),
  
  -- Locatie specifiek
  ('In object', 'Ja/Nee', 'Nee', 'iobj', '-in object'),
  ('In object', 'Ja/Nee', 'Nee', 'iobj', '-iobj'),
  ('Te water', 'Ja/Nee', 'Nee', 'tewt', '-te water'),
  ('Te water', 'Ja/Nee', 'Nee', 'tewt', '-tewt'),
  ('Niet zelfredding', 'Ja/Nee', 'Nee', 'nzrz', '-nzrz'),
  
  -- Wapens
  ('Vuurwapen aanwezig', 'Ja/Nee', 'Nee', 'vwa', '-vuurwapen'),
  ('Steekwapen aanwezig', 'Ja/Nee', 'Nee', 'swa', '-steekwapen'),
  
  -- Gevaar
  ('Gevaarlijke stof', 'Vrije tekst', '', 'gevst', '-gevaarlijke stof'),
  ('Gevaarlijke stof', 'Vrije tekst', '', 'gevst', '-vtgs'),
  
  -- Status
  ('Opgelost/Opgelopen', 'Ja/Nee', 'Nee', 'opgelp', '-opgelost'),
  ('Opgelost/Opgelopen', 'Ja/Nee', 'Nee', 'opgelp', '-opgelp'),
  
  -- Betrokkenen
  ('Betreft', 'Vrije tekst', '', 'betr', '-betreft'),
  ('Betreft', 'Vrije tekst', '', 'betr', '-betr'),
  
  -- Voertuig
  ('Voertuig kenteken', 'Vrije tekst', '', 'vkt', '-kenteken'),
  ('Voertuig kleur', 'Vrije tekst', '', 'vkl', '-kleur'),
  ('Voertuig merk', 'Vrije tekst', '', 'vmk', '-merk'),
  
  -- Dieren
  ('Aantal dieren', 'Getal', '0', 'dier', '-dieren'),
  ('Aantal dieren', 'Getal', '0', 'dier', '-dier')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE karakteristieken IS 'Karakteristieken (eigenschappen) die aan incidenten kunnen worden gekoppeld';
COMMENT ON COLUMN karakteristieken.kt_naam IS 'Naam van de karakteristiek';
COMMENT ON COLUMN karakteristieken.kt_type IS 'Type: Vrije tekst, Getal, Ja/Nee, Enkelvoudige opsom, Meervoudige opsom';
COMMENT ON COLUMN karakteristieken.kt_waarde IS 'Standaard waarde';
COMMENT ON COLUMN karakteristieken.kt_code IS 'Korte code voor de karakteristiek';
COMMENT ON COLUMN karakteristieken.kt_parser IS 'Parser shortcode voor automatische detectie in kladblok';

