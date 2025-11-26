# SQL Templates voor Supabase Management

## 📋 Kazernes - SELECT queries

### Alle kazernes ophalen
```sql
SELECT * FROM kazernes ORDER BY type, naam;
```

### Kazernes per type
```sql
SELECT * FROM kazernes WHERE type = 'Brandweer';
SELECT * FROM kazernes WHERE type = 'Politie';
SELECT * FROM kazernes WHERE type = 'Ambulance';
```

### Kazernes per plaats
```sql
SELECT * FROM kazernes WHERE plaats = 'Rotterdam';
```

### Actieve kazernes
```sql
SELECT * FROM kazernes WHERE actief = true;
```

### Kazerne details met coordinaten
```sql
SELECT naam, adres, postcode, plaats, type, 
       latitude, longitude, capaciteit 
FROM kazernes 
WHERE latitude IS NOT NULL;
```

### Statistieken
```sql
SELECT 
  type, 
  COUNT(*) as aantal,
  SUM(capaciteit) as totale_capaciteit,
  AVG(capaciteit) as gemiddelde_capaciteit,
  COUNT(*) FILTER (WHERE actief = true) as aantal_actief
FROM kazernes 
GROUP BY type;
```

## ➕ Kazernes - INSERT

### Nieuwe brandweerkazerne toevoegen
```sql
INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio)
VALUES (
  'Brandweerkazerne Nieuwe Locatie',
  'Nieuwe Straat 100',
  '3000 AA',
  'Rotterdam',
  'Brandweer',
  '010-1234567',
  30,
  true,
  51.9225,
  4.4792,
  'Rotterdam-Rijnmond'
);
```

### Nieuw politiebureau toevoegen
```sql
INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, email, capaciteit, actief, regio)
VALUES (
  'Politiebureau Nieuwe Wijk',
  'Hoofdstraat 50',
  '3100 BB',
  'Schiedam',
  'Politie',
  '0900-8844',
  'info@politie.nl',
  40,
  true,
  'Rotterdam-Rijnmond'
);
```

### Nieuwe ambulancepost toevoegen
```sql
INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio)
VALUES (
  'Ambulancepost Nieuw',
  'Ziekenhuis Straat 1',
  '3200 CC',
  'Vlaardingen',
  'Ambulance',
  '010-2345678',
  20,
  true,
  51.9122,
  4.3897,
  'Rotterdam-Rijnmond'
);
```

## ✏️ Kazernes - UPDATE

### Kazerne actief/inactief maken
```sql
UPDATE kazernes 
SET actief = false 
WHERE id = 'UUID-HIER';
```

### Telefoonnummer updaten
```sql
UPDATE kazernes 
SET telefoonnummer = '010-9876543' 
WHERE naam = 'Brandweerkazerne Rotterdam Centrum';
```

### Capaciteit aanpassen
```sql
UPDATE kazernes 
SET capaciteit = 35 
WHERE id = 'UUID-HIER';
```

### Email toevoegen
```sql
UPDATE kazernes 
SET email = 'contact@kazerne.nl' 
WHERE naam = 'Politiebureau Rotterdam Centrum';
```

### Coordinaten toevoegen
```sql
UPDATE kazernes 
SET latitude = 51.9225, longitude = 4.4792 
WHERE naam = 'Brandweerkazerne Rotterdam Centrum';
```

### Adres wijzigen
```sql
UPDATE kazernes 
SET adres = 'Nieuwe Adres 123', 
    postcode = '3000 DD' 
WHERE id = 'UUID-HIER';
```

## 🗑️ Kazernes - DELETE

### Specifieke kazerne verwijderen
```sql
DELETE FROM kazernes WHERE id = 'UUID-HIER';
```

### Kazernes verwijderen op naam
```sql
DELETE FROM kazernes WHERE naam = 'Test Kazerne';
```

### Alle inactieve kazernes verwijderen (VOORZICHTIG!)
```sql
DELETE FROM kazernes WHERE actief = false;
```

### Alle testdata verwijderen (VOORZICHTIG!)
```sql
TRUNCATE kazernes CASCADE;
```

## 🔍 Handige queries

### Zoek kazerne op naam (partial match)
```sql
SELECT * FROM kazernes WHERE naam ILIKE '%rotterdam%';
```

### Kazernes zonder coordinaten
```sql
SELECT naam, adres, plaats 
FROM kazernes 
WHERE latitude IS NULL OR longitude IS NULL;
```

### Kazernes met email
```sql
SELECT naam, email, type 
FROM kazernes 
WHERE email IS NOT NULL;
```

### Grootste kazernes (top 5 op capaciteit)
```sql
SELECT naam, type, capaciteit 
FROM kazernes 
ORDER BY capaciteit DESC 
LIMIT 5;
```

### Kazernes per regio met totalen
```sql
SELECT 
  COALESCE(regio, 'Onbekend') as regio,
  type,
  COUNT(*) as aantal,
  SUM(capaciteit) as totale_capaciteit
FROM kazernes 
GROUP BY regio, type
ORDER BY regio, type;
```

## 🛠️ Database Management

### Tabel structuur bekijken
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'kazernes'
ORDER BY ordinal_position;
```

### Indexen bekijken
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'kazernes';
```

### Laatste 10 toegevoegde kazernes
```sql
SELECT naam, type, plaats, created_at
FROM kazernes
ORDER BY created_at DESC
LIMIT 10;
```

### Recent gewijzigde kazernes
```sql
SELECT naam, type, plaats, updated_at
FROM kazernes
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

