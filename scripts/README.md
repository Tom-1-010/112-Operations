# Database Setup Scripts

Deze folder bevat scripts om automatisch database tabellen aan te maken in Supabase.

## Kazernes Table Setup

Het script `setup-kazernes-table.ts` maakt automatisch de kazernes tabel aan met alle benodigde:
- Enum types
- Indexes
- Triggers
- RLS policies
- Sample data (17 kazernes: 5 brandweer, 6 politie, 6 ambulance)

### Gebruik

```bash
npm run db:setup-kazernes
```

### Wat doet het script?

1. ✅ Maakt de `update_updated_at_column()` trigger function aan
2. ✅ Maakt de `kazerne_type` enum aan (Brandweer, Politie, Ambulance)
3. ✅ Maakt de `kazernes` tabel aan met alle velden
4. ✅ Maakt indexes aan voor betere performance
5. ✅ Maakt een trigger voor automatische `updated_at` updates
6. ✅ Schakelt Row Level Security (RLS) in
7. ✅ Maakt RLS policy aan (allow all)
8. ✅ Voegt sample data toe (alleen als tabel leeg is)
9. ✅ Toont een overzicht van de aangemaakte kazernes

### Output voorbeeld

```
🚀 Starting kazernes table setup...
📝 Creating trigger function...
✅ Trigger function created
📝 Creating kazerne_type enum...
✅ Enum type created
📝 Creating kazernes table...
✅ Table created
📝 Creating indexes...
✅ Indexes created
📝 Creating trigger...
✅ Trigger created
📝 Enabling Row Level Security...
✅ RLS enabled
📝 Creating RLS policy...
✅ RLS policy created
📝 Inserting sample data...
✅ Sample data inserted

✅ Setup complete! Kazernes table has 17 records

📊 Kazernes breakdown:
   Ambulance: 6
   Brandweer: 5
   Politie: 6

🎉 Kazernes table setup completed successfully!
```

### Vereisten

- Node.js geinstalleerd
- `.env` bestand met Supabase database credentials
- Database connection configuratie in `server/db.ts`

### Troubleshooting

Als het script faalt:
1. Controleer of je database credentials kloppen in `.env`
2. Controleer of je database verbinding werkt
3. Kijk naar de error messages voor specifieke details

Het script is **idempotent**, wat betekent dat je het meerdere keren kunt uitvoeren zonder problemen. Het zal:
- Bestaande objecten hergebruiken (IF NOT EXISTS)
- Triggers en policies vervangen indien nodig
- Sample data alleen invoegen als de tabel leeg is

