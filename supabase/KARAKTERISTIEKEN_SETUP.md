# Karakteristieken Setup Instructies

## Probleem
De karakteristieken functionaliteit in GMS2 werkt niet omdat de database tabel ontbreekt.

## Oplossing

### Stap 1: Maak de tabel aan in Supabase

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard
2. Selecteer je project
3. Ga naar **SQL Editor**
4. Kopieer de volledige inhoud van `supabase/migrations/003_karakteristieken_table.sql`
5. Plak deze in de SQL Editor
6. Klik op **RUN** om de migratie uit te voeren

### Stap 2: Importeer de karakteristieken data

**Optie A: Via TypeScript script (aanbevolen)**

```bash
npx tsx scripts/import-karakteristieken-from-json.ts
```

Dit script:
- Leest de volledige karakteristieken data uit `attached_assets/karakteristieken_volledig_1750374985513.json`
- Verwijdert oude data
- Importeert alle ~500+ karakteristieken in de database

**Optie B: Handmatige verificatie**

Test of de API werkt:
```bash
curl http://localhost:5000/api/karakteristieken
```

Je zou een JSON array met karakteristieken moeten zien.

### Stap 3: Test in de applicatie

1. Start de applicatie: `npm run dev`
2. Ga naar GMS2 pagina
3. Klik op het 📋 knopje naast de MC3 dropdown
4. Zoek naar "aanh", "pol", "gewond" etc.
5. Probeer in het kladblok: `-aanh 2` en druk op Enter
6. De karakteristiek zou automatisch toegevoegd moeten worden!

## Wat doet de karakteristieken tabel?

De tabel slaat eigenschappen op die aan incidenten gekoppeld kunnen worden:

- **kt_naam**: Naam (bijv. "Aantal aanhoudingen")
- **kt_type**: Type (Getal, Vrije tekst, Ja/Nee, etc.)
- **kt_waarde**: Standaard waarde
- **kt_code**: Korte code (bijv. "aanh")
- **kt_parser**: Shortcode voor kladblok (bijv. "-aanh")

## Kladblok shortcuts

Na setup werken deze shortcuts automatisch:

```
-aanh 2          → Aantal aanhoudingen: 2
-gewond 1        → Aantal gewonden: 1
-inzet pol at    → Inzet Pol algemeen: at
-ovdp            → Overval/Diefstal/Poging
-vuurwapen       → Vuurwapen aanwezig
-nzrz            → Niet zelfredding
```

## Troubleshooting

**API geeft lege array terug:**
- Controleer of de tabel bestaat in Supabase
- Voer het import script opnieuw uit

**Import script faalt:**
- Controleer of het JSON bestand bestaat: `attached_assets/karakteristieken_volledig_1750374985513.json`
- Controleer database connectie in `.env`

**Zoekknop werkt niet:**
- Open browser console voor error messages
- Controleer of `/api/karakteristieken` bereikbaar is

