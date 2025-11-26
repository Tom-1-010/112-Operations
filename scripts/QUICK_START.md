# 🚀 Quick Start: Supabase Kazernes Management

## ✅ Simpele methode (AANBEVOLEN)

### Stap 1: Tabel aanmaken
Ga naar **Supabase SQL Editor** en voer uit: `supabase/migrations/002_kazernes_table_fixed.sql`

### Stap 2: Testdata toevoegen
Ga naar **Supabase SQL Editor** en voer uit: `scripts/insert-kazernes-testdata.sql`

### Stap 3: Verifiëren
```sql
SELECT type, COUNT(*) as aantal FROM kazernes GROUP BY type;
```

Je zou moeten zien:
- Ambulance: 6
- Brandweer: 5  
- Politie: 6

## 🎯 Wat kan ik nu voor je doen?

Vanaf nu kan ik via SQL scripts:

### 1. **Data Ophalen**
Vraag me: "Laat alle brandweerkazernes zien"
→ Ik maak een SQL query en geef je het resultaat

### 2. **Data Toevoegen**
Vraag me: "Voeg een nieuwe kazerne toe in Ridderkerk"
→ Ik maak een INSERT query voor je

### 3. **Data Wijzigen**
Vraag me: "Wijzig de capaciteit van kazerne X naar 50"
→ Ik maak een UPDATE query voor je

### 4. **Data Verwijderen**
Vraag me: "Verwijder de test kazerne"
→ Ik maak een DELETE query voor je

### 5. **Tabellen Aanmaken**
Vraag me: "Maak een tabel voor meldingen aan"
→ Ik maak een complete CREATE TABLE migratie

## 📋 Handige Commands

```bash
# Controleer of server draait
curl http://localhost:5000/api/health

# Haal kazernes op via API
curl http://localhost:5000/api/kazernes

# Voeg kazerne toe via API
curl -X POST http://localhost:5000/api/kazernes \
  -H "Content-Type: application/json" \
  -d '{"naam":"Test","adres":"Straat 1","postcode":"3000AA","plaats":"Rotterdam","type":"Politie","capaciteit":30}'
```

## 🔧 Workflow voor toekomstige tabellen

Als je in de toekomst een nieuwe tabel wilt (bijv. "Meldingen"):

1. **Vraag me**: "Maak een tabel aan voor Meldingen"
2. **Ik geef je**:
   - SQL migratie bestand
   - Schema definitie (TypeScript)
   - API routes (CRUD)
   - Frontend pagina (optioneel)
3. **Jij voert uit**: De SQL in Supabase SQL Editor
4. **Klaar!** De tabel is beschikbaar via API en frontend

## 💡 Waarom werken de terminal scripts niet?

Je Supabase database gebruikt een **connection pooler** die niet compatible is met directe `pg` client verbindingen vanuit scripts. Daarom is de beste manier:

✅ **SQL Editor in Supabase Dashboard** - Altijd betrouwbaar  
✅ **Via API endpoints** - Als de server draait  
❌ Terminal scripts met pg client - Connection issues

## ✨ Wat is nu beschikbaar?

- ✅ Kazernes tabel in Supabase (leeg of met data)
- ✅ Complete CRUD API (`/api/kazernes`)
- ✅ Frontend pagina met filters en details
- ✅ SQL templates voor alle operaties
- ✅ Ik kan SQL queries voor je maken op aanvraag

**Vraag me gewoon wat je wilt doen en ik maak de SQL query voor je!**

