# MeldkamerSpel Web API

Dit is de web API voor MeldkamerSpel - een politie dispatch simulatie spel.

## Geen UI door ontwerp

Deze applicatie bevat **geen gebruikersinterface** door ontwerp. Het is een pure API server die:

- REST endpoints biedt voor incidenten, eenheden en dispatch operaties
- Supabase gebruikt als backend platform
- TypeScript gebruikt voor type safety
- Zod gebruikt voor request validatie

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/version` - Versie informatie
- `GET /api/incidents` - Lijst van incidenten (stub)
- `POST /api/incidents` - Maak nieuw incident (stub)
- `GET /api/units` - Lijst van eenheden (stub)
- `POST /api/units` - Maak nieuwe eenheid (stub)
- `POST /api/dispatch` - Dispatch eenheden naar incident (stub)

## Ontwikkeling

```bash
# Start development server
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Toekomstige uitbreidingen

- Database schema implementatie
- Authenticatie en autorisatie
- Real-time updates via Supabase Realtime
- Externe routing service integratie (OSRM/Valhalla)
- UI applicatie (separate frontend)
