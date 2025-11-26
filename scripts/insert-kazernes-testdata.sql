-- Insert testdata voor kazernes in Rotterdam-Rijnmond regio

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

-- Toon resultaat
SELECT 
  type, 
  COUNT(*) as aantal,
  STRING_AGG(naam, ', ' ORDER BY naam) as kazernes
FROM kazernes 
GROUP BY type 
ORDER BY type;

