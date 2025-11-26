-- Alle voertuigen met automatische kazerne koppeling via subqueries
-- De kazerne_id wordt automatisch opgehaald op basis van de kazerne naam

-- Kazerne Hoek van Holland (01)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0131', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland' LIMIT 1), '170131', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0141', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland' LIMIT 1), '170141', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0181', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland' LIMIT 1), '170181', 'DAT', 'Dienstauto Strand-Officier', 1, 0, 'Dienstauto Terreinvaardig', 'Een terreinvaardige versie van de Dienstauto (DA).', 'DAT-SO'),
('17-0182', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland' LIMIT 1), '170182', 'DAT', 'Dienstauto Strand-Officier', 1, 0, 'Dienstauto Terreinvaardig', 'Een terreinvaardige versie van de Dienstauto (DA).', 'DAT-SO');

-- Kazerne Maassluis (02)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0231', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis' LIMIT 1), '170231', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0232', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis' LIMIT 1), '170232', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0251', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis' LIMIT 1), '170251', 'HW', 'Hoogwerker', 2, 5, 'Redvoertuig Hoogwerker', 'Een hoogwerker van elke armlengte.', NULL);

-- Kazerne Vlaardingen (03)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0311', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '170311', 'DB', 'Dienstbus Vakbekwaamheid', 1, 0, 'Dienstbus', 'Een voertuig ingericht voor het vervoer van meer dan 5 personen.', 'DB-VKB'),
('17-0331', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '170331', 'TS', 'Tankautospuit', 8, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS8'),
('17-0332', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '170332', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0371', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '170371', 'HV', 'Hulpverleningsvoertuig', 2, 7, 'Hulpverleningsvoertuig', 'Een branche conform uitgevoerd voertuig primair bedoeld voor technische hulpverlening.', 'HV-B'),
('17-0381', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '170381', 'HA', 'Haakarmvoertuig', 1, 8, 'Haakarmvoertuig', 'Een vrachtwagen voorzien van een haakarm-installatie.', NULL),
('17-9262', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '179262', 'SLH', 'Slangenhaakarmbak', NULL, 6, 'Haakarmbak slangen grootschalige waterwinning', 'Een haakarmbak met slangen t.b.v. grootschalig watertransport.', NULL),
('17-9171', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2' LIMIT 1), '179171', 'HVH-RTV', 'Hulpverleningshaakarmbak Rampterreinverlichting', NULL, 7, 'Haakarmbak Hulpverlening', 'Een haakarmbak met materieel voor (technische) hulpverlening.', NULL);

-- Kazerne Schiedam (04)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0411', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '170411', 'DB', 'Dienstbus Vakbekwaamheid', 1, 0, 'Dienstbus', 'Een voertuig ingericht voor het vervoer van meer dan 5 personen.', 'DB-VKB'),
('17-0431', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '170431', 'TS', 'Tankautospuit', 8, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS8'),
('17-0432', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '170432', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0451', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '170451', 'HW', 'Hoogwerker', 2, 5, 'Redvoertuig Hoogwerker', 'Een hoogwerker van elke armlengte.', NULL),
('17-0481', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '170481', 'HA', 'Haakarmvoertuig', 1, 8, 'Haakarmvoertuig', 'Een vrachtwagen voorzien van een haakarm-installatie.', NULL),
('17-9161', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '179161', 'DPH', 'Dompelpomphaakarmbak', NULL, 6, 'Haakarmbak Dompelpomp', 'Een haakarmbak met daarin een dompelpompunit.', NULL),
('17-9287', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam' LIMIT 1), '179287', 'VZH', 'Verzorgingshaakarmbak', NULL, 0, 'Haakarmbak Verzorging', 'Een haakarmbak met materieel voor de verzorging van personeel.', NULL);

-- Zie voertuigen-complete.sql voor ALLE voertuigen
-- Dit is te groot om via terminal in één keer te doen

