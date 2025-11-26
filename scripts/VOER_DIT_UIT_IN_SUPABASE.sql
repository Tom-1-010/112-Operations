-- VOER DIT BESTAND UIT IN SUPABASE SQL EDITOR
-- Dit voegt ALLE voertuigen toe met 100% correcte kazerne koppelingen
-- De kazerne_id wordt automatisch opgehaald via subqueries

-- Kazerne Hoek van Holland (01) - 4 voertuigen
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0131', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170131', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Branche conform uitgevoerd', 'TS6'),
('17-0141', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170141', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Branche conform uitgevoerd', 'TS6'),
('17-0181', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170181', 'DAT', 'Dienstauto Strand-Officier', 1, 0, 'Dienstauto Terreinvaardig', 'Terreinvaardige DA', 'DAT-SO'),
('17-0182', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170182', 'DAT', 'Dienstauto Strand-Officier', 1, 0, 'Dienstauto Terreinvaardig', 'Terreinvaardige DA', 'DAT-SO');

-- Kazerne Maassluis (02) - 3 voertuigen
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0231', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170231', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Branche conform', 'TS6'),
('17-0232', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170232', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Branche conform', 'TS6'),
('17-0251', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170251', 'HW', 'Hoogwerker', 2, 5, 'Redvoertuig Hoogwerker', 'Hoogwerker', NULL);

-- Kazerne Vlaardingen (03) - 7 voertuigen  
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0311', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170311', 'DB', 'Dienstbus Vakbekwaamheid', 1, 0, 'Dienstbus', 'Vervoer personeel', 'DB-VKB'),
('17-0331', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170331', 'TS', 'Tankautospuit', 8, 3, 'Tankautospuit', 'Branche conform', 'TS8'),
('17-0332', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170332', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Branche conform', 'TS6'),
('17-0371', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170371', 'HV', 'Hulpverleningsvoertuig', 2, 7, 'Hulpverleningsvoertuig', 'Technische hulp', 'HV-B'),
('17-0381', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170381', 'HA', 'Haakarmvoertuig', 1, 8, 'Haakarmvoertuig', 'Haakarm', NULL),
('17-9262', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '179262', 'SLH', 'Slangenhaakarmbak', NULL, 6, 'Haakarmbak slangen grootschalige waterwinning', 'Slangen', NULL),
('17-9171', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '179171', 'HVH-RTV', 'Hulpverleningshaakarmbak Rampterreinverlichting', NULL, 7, 'Haakarmbak Hulpverlening', 'Verlichting', NULL);

-- Toon resultaat
SELECT 
  COUNT(*) as totaal_voertuigen,
  COUNT(DISTINCT kazerne_id) as aantal_kazernes_met_voertuigen,
  COUNT(*) FILTER (WHERE kazerne_id IS NOT NULL) as gekoppeld
FROM Voertuigen;

