# 🗄️ Supabase Database Management via Terminal

Deze scripts geven je volledige controle over de Supabase database via de terminal.

## 🚀 Beschikbare Commands

### 1. **Algemene Query Tool** - `npm run db:query`

Voer elke SQL query uit direct vanuit de terminal:

```bash
# SELECT queries
npm run db:query -- "SELECT * FROM kazernes LIMIT 5"
npm run db:query -- "SELECT COUNT(*) FROM kazernes"
npm run db:query -- "SELECT * FROM kazernes WHERE type = 'Brandweer'"

# INSERT queries
npm run db:query -- "INSERT INTO kazernes (naam, adres, postcode, plaats, type, capaciteit) VALUES ('Test', 'Straat 1', '3000AA', 'Rotterdam', 'Politie', 30)"

# UPDATE queries
npm run db:query -- "UPDATE kazernes SET actief = false WHERE naam = 'Test'"

# DELETE queries
npm run db:query -- "DELETE FROM kazernes WHERE naam = 'Test'"
```

### 2. **Kazernes Lijst** - `npm run db:kazernes:list`

Toon alle kazernes met overzicht:

```bash
npm run db:kazernes:list
```

Output:
```
📋 Fetching all kazernes...

Found 17 kazernes:
┌─────┬────────────────────┬────────────┬────────────┬───────────┬────────┐
│ id  │ naam               │ type       │ plaats     │ capaciteit│ actief │
├─────┼────────────────────┼────────────┼────────────┼───────────┼────────┤
│ ... │ Ambulancepost...   │ Ambulance  │ Rotterdam  │ 30        │ true   │
└─────┴────────────────────┴────────────┴────────────┴───────────┴────────┘

📊 Summary by type:
┌────────────┬────────┬──────────────────┬──────────────┐
│ type       │ aantal │ totale_capaciteit│ actief_aantal│
├────────────┼────────┼──────────────────┼──────────────┤
│ Ambulance  │ 6      │ 113              │ 6            │
│ Brandweer  │ 5      │ 100              │ 5            │
│ Politie    │ 6      │ 221              │ 6            │
└────────────┴────────┴──────────────────┴──────────────┘
```

### 3. **Kazerne Toevoegen** - `npm run db:kazernes:add`

Voeg een nieuwe kazerne toe (bewerk het script eerst):

```bash
npm run db:kazernes:add
```

## 📖 SQL Query Voorbeelden

### SELECT Queries

```bash
# Alle kazernes ophalen
npm run db:query -- "SELECT * FROM kazernes"

# Alleen brandweer
npm run db:query -- "SELECT * FROM kazernes WHERE type = 'Brandweer'"

# Kazernes in Rotterdam
npm run db:query -- "SELECT * FROM kazernes WHERE plaats = 'Rotterdam'"

# Actieve kazernes
npm run db:query -- "SELECT * FROM kazernes WHERE actief = true"

# Zoeken op naam
npm run db:query -- "SELECT * FROM kazernes WHERE naam ILIKE '%centrum%'"

# Top 5 grootste kazernes
npm run db:query -- "SELECT naam, capaciteit FROM kazernes ORDER BY capaciteit DESC LIMIT 5"

# Statistieken per type
npm run db:query -- "SELECT type, COUNT(*) as aantal, SUM(capaciteit) as totaal FROM kazernes GROUP BY type"
```

### INSERT Queries

```bash
# Nieuwe brandweerkazerne
npm run db:query -- "INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief, latitude, longitude, regio) VALUES ('Brandweerkazerne Test', 'Teststraat 1', '3000 AA', 'Rotterdam', 'Brandweer', '010-1234567', 25, true, 51.9225, 4.4792, 'Rotterdam-Rijnmond')"

# Nieuw politiebureau
npm run db:query -- "INSERT INTO kazernes (naam, adres, postcode, plaats, type, capaciteit, actief) VALUES ('Politiebureau Test', 'Politiestraat 50', '3100 BB', 'Schiedam', 'Politie', 40, true)"

# Nieuwe ambulancepost
npm run db:query -- "INSERT INTO kazernes (naam, adres, postcode, plaats, type, telefoonnummer, capaciteit, actief) VALUES ('Ambulancepost Test', 'Ziekenhuisstraat 10', '3200 CC', 'Vlaardingen', 'Ambulance', '010-9876543', 20, true)"
```

### UPDATE Queries

```bash
# Kazerne deactiveren
npm run db:query -- "UPDATE kazernes SET actief = false WHERE naam = 'Test Kazerne'"

# Telefoonnummer wijzigen
npm run db:query -- "UPDATE kazernes SET telefoonnummer = '010-9999999' WHERE id = 'uuid-hier'"

# Capaciteit aanpassen
npm run db:query -- "UPDATE kazernes SET capaciteit = 50 WHERE naam = 'Politiebureau Rotterdam Centrum'"

# Email toevoegen
npm run db:query -- "UPDATE kazernes SET email = 'info@kazerne.nl' WHERE id = 'uuid-hier'"

# Meerdere velden tegelijk
npm run db:query -- "UPDATE kazernes SET capaciteit = 35, telefoonnummer = '010-1111111', email = 'contact@test.nl' WHERE naam = 'Test Kazerne'"
```

### DELETE Queries

```bash
# Specifieke kazerne verwijderen
npm run db:query -- "DELETE FROM kazernes WHERE naam = 'Test Kazerne'"

# Verwijderen op ID
npm run db:query -- "DELETE FROM kazernes WHERE id = 'uuid-hier'"

# Alle inactieve kazernes verwijderen
npm run db:query -- "DELETE FROM kazernes WHERE actief = false"
```

## 🔧 Geavanceerde Queries

### Joins & Aggregaties

```bash
# Statistieken per plaats
npm run db:query -- "SELECT plaats, type, COUNT(*) as aantal FROM kazernes GROUP BY plaats, type ORDER BY plaats, type"

# Gemiddelde capaciteit per type
npm run db:query -- "SELECT type, ROUND(AVG(capaciteit)) as gem_capaciteit FROM kazernes GROUP BY type"

# Kazernes zonder GPS coordinaten
npm run db:query -- "SELECT naam, adres, plaats FROM kazernes WHERE latitude IS NULL"
```

### Database Metadata

```bash
# Tabel structuur bekijken
npm run db:query -- "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'kazernes'"

# Alle tabellen tonen
npm run db:query -- "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"

# Indexen bekijken
npm run db:query -- "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'kazernes'"
```

## 💡 Tips & Tricks

### 1. **Query output naar file**

```bash
npm run db:query -- "SELECT * FROM kazernes" > kazernes-export.txt
```

### 2. **Quotes escapen**

Voor quotes in je query, gebruik enkele quotes dubbel:

```bash
npm run db:query -- "SELECT * FROM kazernes WHERE naam = ''Test''"
```

Of gebruik dubbele quotes buiten en enkele binnen:

```bash
npm run db:query -- "SELECT * FROM kazernes WHERE naam = 'Test'"
```

### 3. **Lange queries**

Voor complexe queries, maak een .sql bestand en voer uit via pgcli of een SQL client.

### 4. **Backup maken**

```bash
# Export alle kazernes
npm run db:query -- "SELECT * FROM kazernes" > backup-kazernes.json
```

## ⚠️ Veiligheid

- **ALTIJD** een WHERE clause gebruiken bij UPDATE en DELETE!
- Test eerst met SELECT voordat je UPDATE/DELETE uitvoert
- Maak backups voor grote wijzigingen
- Gebruik transactions voor meerdere gerelateerde queries

## 📚 Meer SQL Templates

Zie `scripts/sql-templates.md` voor een complete lijst van SQL query voorbeelden.

## 🆘 Troubleshooting

### "DATABASE_URL not found"
- Controleer of `.env` bestand bestaat
- Controleer of `DATABASE_URL` ingesteld is in `.env`

### "Connection timeout"
- Controleer je internet connectie
- Controleer of Supabase project actief is
- Kijk of de credentials nog geldig zijn

### "Syntax error"
- Controleer de SQL syntax
- Let op quotes (gebruik enkele quotes voor strings)
- Test in Supabase SQL Editor eerst

