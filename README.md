# MeldkamerSpel

Een politie dispatch simulatie spel gebouwd met TypeScript en Supabase.

## Overzicht

MeldkamerSpel is een monorepo project dat bestaat uit:

- **Web API** (`apps/web`) - Next.js API routes voor incidenten, eenheden en dispatch
- **Background Worker** (`apps/worker`) - Job scheduler voor incident generatie en cleanup
- **Shared Package** (`packages/shared`) - Gedeelde types en utilities

## Tech Stack

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces
- **Language**: TypeScript
- **Web Framework**: Next.js (App Router)
- **Backend**: Supabase (Auth & Database)
- **Validation**: Zod
- **Linting**: ESLint + Prettier
- **Testing**: Vitest (configured but not implemented yet)

## Project Structuur

```
meldkamerspel/
├── apps/
│   ├── web/                 # Next.js API server
│   │   ├── src/app/api/     # API routes
│   │   ├── src/lib/         # Utilities & Supabase client
│   │   └── package.json
│   └── worker/              # Background worker
│       ├── src/jobs/        # Job implementations
│       ├── src/lib/         # Utilities & Supabase client
│       └── package.json
├── packages/
│   └── shared/              # Shared types & utilities
│       ├── src/domain/      # Domain types & DTOs
│       ├── src/utils/       # Utility functions
│       └── package.json
├── supabase/                # Supabase configuration
│   ├── migrations/          # Database migrations (empty)
│   └── README.md
└── package.json             # Root package.json
```

## Quick Start

### 1. Installatie

```bash
# Clone repository
git clone <repository-url>
cd meldkamerspel

# Installeer dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Kopieer environment template
cp env.example .env

# Vul Supabase credentials in
# SUPABASE_URL=your-supabase-url
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Development

```bash
# Start beide services (web + worker)
pnpm dev

# Of start individueel:
pnpm --filter web dev      # Web API op http://localhost:3000
pnpm --filter worker dev   # Background worker
```

### 4. API Endpoints

- `GET /api/health` - Health check
- `GET /api/version` - Versie informatie
- `GET /api/incidents` - Lijst incidenten (stub)
- `POST /api/incidents` - Maak incident (stub)
- `GET /api/units` - Lijst eenheden (stub)
- `POST /api/units` - Maak eenheid (stub)
- `POST /api/dispatch` - Dispatch eenheden (stub)

## Domain Types

Het project gebruikt Nederlandse politie terminologie:

### Eenheid Rollen
- `POLICE_PATROL` - Patrouille eenheid
- `POLICE_SIV` - Surveillance eenheid
- `POLICE_SUPERVISOR` - Supervisie eenheid

### Eenheid Statussen
- `IDLE` - Beschikbaar
- `ENROUTE` - Onderweg
- `ONSCENE` - Ter plaatse
- `RETURNING` - Terugkerend
- `OFFLINE` - Offline

### Incident Types
- `PURSUIT` - Achtervolging
- `BURGLARY` - Inbraak
- `DISTURBANCE` - Overlast
- `THEFT` - Diefstal

### Incident Statussen
- `OPEN` - Open
- `ASSIGNED` - Toegewezen
- `ONSCENE` - Ter plaatse
- `DONE` - Afgerond

## Development Commands

```bash
# Development
pnpm dev                    # Start web + worker
pnpm --filter web dev       # Start alleen web
pnpm --filter worker dev    # Start alleen worker

# Building
pnpm build                  # Build alle packages
pnpm --filter web build     # Build alleen web

# Code Quality
pnpm typecheck              # TypeScript checking
pnpm lint                   # ESLint
pnpm format                 # Prettier formatting

# Testing (nog niet geïmplementeerd)
pnpm test                   # Run tests
```

## Statische hosting via GitHub Pages

- `npm run build:client` bouwt alleen de Vite client; `npm run build:gh-pages` voegt `VITE_BASE_URL=/112-Operations/` toe zodat de assets correct laden onder `https://Tom-1-010.github.io/112-Operations/`.
- De GitHub Actions workflow in `.github/workflows/deploy-gh-pages.yml` bouwt de client en publiceert `dist/public` naar de `gh-pages` branch. Stel GitHub Pages in op die branch (`/ (root)`).
- Wil je handmatig testen? Gebruik `npm install && npm run build:gh-pages` en serveer `dist/public` met een statische server (`npx serve dist/public`).

## Supabase Setup

Zie [supabase/README.md](./supabase/README.md) voor gedetailleerde Supabase setup instructies.

## Toekomstige Uitbreidingen

- [ ] Database schema implementatie
- [ ] Authenticatie en autorisatie
- [ ] Real-time updates via Supabase Realtime
- [ ] Externe routing service integratie (OSRM/Valhalla)
- [ ] UI applicatie (separate frontend)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline

## Contributing

1. Fork het project
2. Maak een feature branch
3. Commit je changes
4. Push naar de branch
5. Open een Pull Request

## License

Dit project is gelicenseerd onder de MIT License.
