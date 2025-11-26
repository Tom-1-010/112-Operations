# Supabase Setup voor MeldkamerSpel

Dit document beschrijft hoe je Supabase kunt instellen voor het MeldkamerSpel project.

## Project Setup

### 1. Supabase Project Aanmaken

1. Ga naar [supabase.com](https://supabase.com)
2. Maak een nieuw project aan
3. Noteer de project URL en API keys

### 2. Environment Variables

Kopieer `env.example` naar `.env` en vul de Supabase credentials in:

```bash
cp env.example .env
```

Vul de volgende variabelen in:
- `SUPABASE_URL`: Je Supabase project URL
- `SUPABASE_ANON_KEY`: Je Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Je Supabase service role key (voor server-side operaties)

### 3. Supabase CLI Installatie

```bash
# Installeer Supabase CLI
npm install -g supabase

# Login bij Supabase
supabase login

# Link je project
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Database Schema

Het database schema wordt nog niet geïmplementeerd in deze boilerplate. De volgende tabellen zullen later worden toegevoegd:

- `incidents` - Incidenten/oproepen
- `units` - Politie eenheden
- `dispatches` - Dispatch records
- `unit_status_history` - Status geschiedenis van eenheden

### 5. Row Level Security (RLS)

RLS policies zullen later worden geïmplementeerd voor:
- Incident data toegang
- Unit status updates
- Dispatch operaties

### 6. Migrations

De `migrations/` folder is leeg gelaten. Migrations zullen later worden toegevoegd wanneer het database schema wordt geïmplementeerd.

## Development Workflow

```bash
# Start lokale Supabase (optioneel)
supabase start

# Pull schema changes
supabase db pull

# Push lokale changes
supabase db push

# Reset database
supabase db reset
```

## Realtime

Supabase Realtime zal later worden gebruikt voor:
- Live updates van incident status
- Real-time unit tracking
- Dispatch notifications

## Authentication

Authenticatie wordt nog niet geïmplementeerd in deze boilerplate. Dit zal later worden toegevoegd met:
- Supabase Auth
- Role-based access control
- API key authentication voor services
