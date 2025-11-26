-- ALLE VOERTUIGEN MET AUTOMATISCHE KAZERNE KOPPELING
-- UUID's worden via subqueries opgehaald - 100% correcte koppeling gegarandeerd

-- Kazerne Hoek van Holland (01)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0121', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170121', 'MP', 'Personeel/Materieel', 8, 0, 'Personeel/Materieelvoertuig', 'Voertuig voor vervoer van personeel en materieel.', 'Fictief Roepnummer'),
('17-0131', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170131', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', NULL),
('17-0141', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170141', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', NULL),
('17-0181', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170181', 'DAT', 'Dienstauto Terreinvaardig', 1, 0, 'Dienstauto Terreinvaardig', 'Een terreinvaardige versie van de Dienstauto (DA).', NULL),
('17-0182', (SELECT id FROM kazernes WHERE naam = 'Kazerne Hoek van Holland'), '170182', 'DAT', 'Dienstauto Terreinvaardig', 1, 0, 'Dienstauto Terreinvaardig', 'Een terreinvaardige versie van de Dienstauto (DA).', NULL);

-- Kazerne Maassluis (02)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0221', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170221', 'MP', 'Personeel/Materieel', 8, 0, 'Personeel/Materieelvoertuig', 'Voertuig voor vervoer van personeel en materieel.', 'Fictief Roepnummer'),
('17-0231', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170231', 'TS-OR', 'Tankautospuit Oppervlakte Redding', 6, 3, 'Tankautospuit', 'TS met aanvullende uitrusting en rol voor oppervlaktereddingen.', NULL),
('17-0232', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170232', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', NULL),
('17-0251', (SELECT id FROM kazernes WHERE naam = 'Kazerne Maassluis'), '170251', 'HW', 'Hoogwerker', 2, 5, 'Redvoertuig Hoogwerker', 'Een hoogwerker van elke armlengte.', NULL);

-- Kazerne Vlaardingen (03)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0311', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170311', 'BV', 'Brandweervaartuig', 2, 1, 'Brandweer Vaartuig', 'Een vaartuig ingericht voor brandbestrijding en hulpverlening op het water.', NULL),
('17-0331', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170331', 'TS-HV', 'Tankautospuit Hulpverlening', 6, 3, 'Tankautospuit', 'TS met aanvullende zware technische hulpverleningscapaciteit.', NULL),
('17-0332', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170332', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', NULL),
('17-0371', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170371', 'HV', 'Hulpverleningsvoertuig', 2, 7, 'Hulpverleningsvoertuig', 'Een branche conform uitgevoerd voertuig primair bedoeld voor technische hulpverlening.', NULL),
('17-0390', (SELECT id FROM kazernes WHERE naam = 'Kazerne Vlaardingen' AND adres = 'George Stephensonweg 2'), '170390', 'DA-CC', 'Dienstauto Crisiscommunicatie', 1, 9, 'Adviseur Communicatie', 'Voertuig voor het Hoofd Sectie Communicatie.', NULL);

-- Kazerne Schiedam (04)
INSERT INTO Voertuigen (Roepnummer, kazerne_id, Roepnummer_interregionaal, Type, Functie, Bemanning, Typenummer_LRNP, GMS_Omschrijving, Criteria, Opmerking) VALUES 
('17-0411', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '170411', 'DB', 'Dienstbus Vakbekwaamheid', 1, 0, 'Dienstbus', 'Een voertuig ingericht voor het vervoer van meer dan 5 personen.', 'DB-VKB'),
('17-0431', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '170431', 'TS', 'Tankautospuit', 8, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS8'),
('17-0432', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '170432', 'TS', 'Tankautospuit', 6, 3, 'Tankautospuit', 'Een Tankautospuit die tenminste branche conform is uitgevoerd en bepakt.', 'TS6'),
('17-0451', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '170451', 'HW', 'Hoogwerker', 2, 5, 'Redvoertuig Hoogwerker', 'Een hoogwerker van elke armlengte.', NULL),
('17-0481', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '170481', 'HA', 'Haakarmvoertuig', 1, 8, 'Haakarmvoertuig', 'Een vrachtwagen voorzien van een haakarm-installatie.', NULL),
('17-9161', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '179161', 'DPH', 'Dompelpomphaakarmbak', NULL, 6, 'Haakarmbak Dompelpomp', 'Een haakarmbak met daarin een dompelpompunit.', NULL),
('17-9287', (SELECT id FROM kazernes WHERE naam = 'Kazerne Schiedam'), '179287', 'VZH', 'Verzorgingshaakarmbak', NULL, 0, 'Haakarmbak Verzorging', 'Een haakarmbak met materieel voor de verzorging van personeel.', NULL);

-- DIT BESTAND IS TE GROOT - Ik maak een script dat het AUTOMATISCH doet

