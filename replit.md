# replit.md

## Overview

This is a Dutch Police Emergency Dispatch System (GMS - Gemeenschappelijk Meldkamer Systeem) simulator built with React frontend and Express.js backend. The application simulates a police dispatch center interface for managing emergency incidents, units, and phone communications. It features a complete incident lifecycle management system with LMC (Landelijke Meldkamer Classificatie) classification support.

## System Architecture

**Frontend Architecture:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Tailwind CSS with shadcn/ui components for consistent UI design
- Custom hooks for localStorage management and mobile responsiveness
- Component-based architecture with separation of concerns

**Backend Architecture:**
- Express.js server with TypeScript
- RESTful API design for data operations
- Middleware for request logging and error handling
- File-based JSON data loading for classifications
- Session management capabilities (placeholder implementation)

**Database Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the primary database (Neon serverless)
- Schema-first approach with shared types between frontend and backend
- Migration support through Drizzle Kit

## Key Components

**Core Tables:**
- `incidents` - Basic incident tracking
- `units` - Police unit management
- `gms_incidents` - Complete GMS incident records with full Dutch police workflow
- `phone_numbers` - Emergency contact management
- `karakteristieken` - Incident characteristics/properties
- `basisteams` - Police team management with geographic areas and settings
- `police_units` - Extended police unit management with basisteam relationships

**Frontend Components:**
- Dashboard with real-time stats and incident overview
- GMS2 interface for detailed incident management
- Incident table with priority-based color coding
- Unit status panel for resource tracking
- Settings panels for system configuration

**Data Management:**
- Local storage fallback for offline functionality
- Real-time incident status updates
- LMC classification system integration
- Bulk import capabilities for reference data

## Data Flow

1. **Incident Creation**: New incidents enter through the intake system or simulation
2. **Classification**: Incidents are classified using official Dutch LMC codes
3. **Assignment**: Units are assigned based on priority and availability
4. **Status Updates**: Real-time tracking through incident lifecycle
5. **Archival**: Completed incidents are stored for reporting and analysis

**API Endpoints:**
- `/api/health` - System health check
- `/api/lmc-classifications` - Dutch police classification codes
- `/api/phone-numbers` - Emergency contact management
- `/api/karakteristieken` - Incident characteristics
- `/api/gms-incidents` - Full incident management

## External Dependencies

**Key Frontend Libraries:**
- @radix-ui/* - Accessible UI components
- @tanstack/react-query - Server state management
- class-variance-authority - Component variant management
- date-fns - Date manipulation utilities
- lucide-react - Icon library

**Backend Dependencies:**
- @neondatabase/serverless - PostgreSQL database client
- drizzle-orm - Type-safe ORM
- express - Web framework
- ws - WebSocket support for real-time features

**Development Tools:**
- Vite with React plugin
- TypeScript for type safety
- Tailwind CSS for styling
- ESBuild for production bundling

## Deployment Strategy

**Development Environment:**
- Vite dev server with HMR for frontend
- Express server with automatic restart
- PostgreSQL database via Neon serverless
- Local storage fallback for development data

**Production Build:**
- Vite builds optimized frontend bundle
- ESBuild bundles server code
- Static file serving through Express
- Database migrations via Drizzle Kit

**Replit Configuration:**
- Node.js 20 runtime
- PostgreSQL 16 module
- Autoscale deployment target
- Port 5000 for server, exposed on port 80

The application follows Dutch police operational procedures and terminology, supporting the complete emergency dispatch workflow from initial call intake through incident resolution.

## Changelog

- July 12, 2025 (Latest). Enhanced telefonie interface with comprehensive 112 emergency call management system. Added PostgreSQL database table for emergency calls with full call lifecycle tracking. Implemented realistic call simulation with automatic database persistence. Updated call history display to show emergency call details including urgency levels, call types, and comprehensive metadata. Added API endpoints for emergency call CRUD operations and automatic call generation.
- July 1, 2025. Enhanced Maassluis polygon to ultra-high detail with 158 coordinate points for maximum precision. Replaced simplified polygon shapes with official municipality boundaries based on CBS/OpenStreetMap data. Updated key municipalities: Maassluis (158 points, 32.42 km²), Schiedam (32 points, ~19.9 km²), Vlaardingen (31 points, ~23.6 km²), Capelle aan den IJssel (28 points, ~15.4 km²), and Ridderkerk (24 points, ~25.1 km²). Polygons now accurately represent real geographical boundaries instead of simplified geometric shapes.
- July 1, 2025. Completed Rotterdam region geographical coverage with 20+ locations including Rotterdam wijken (Centrum, Delfshaven, Charlois, Feijenoord, Noord, Alexandrium, Kralingen-Crooswijk, Overschie, Pernis, Hoek van Holland) and surrounding cities (Maassluis, Schiedam, Vlaardingen, Capelle aan den IJssel, Ridderkerk, Barendrecht, Albrandswaard, Spijkenisse, Rozenburg, Hellevoetsluis). Improved polygon positioning and sizing for better map visibility.
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.