# MeldkamerSpel - Intake Screen Modal

A modern, dark-themed intake screen modal for the MeldkamerSpel dispatch simulation game. Opens as a popup when clicking "+ Melding aanmaken" in the main simulator interface.

## Features

### Left Panel - Chat/Logging
- **Real-time chat interface** between caller and dispatcher
- **System messages** for unit assignments and status updates
- **Message input** with keyboard shortcuts (Enter to send)
- **Role-based styling** with color-coded messages:
  - 🔴 Caller (red)
  - 🔵 Dispatcher (blue) 
  - ⚪ System (gray)

### Right Panel - Detail Panel
- **Address input** with geocoding button
- **Interactive map** (Leaflet + OpenStreetMap) with click-to-select location
- **MC Classification** (MeldingClassificatie):
  - Multi-select chips with color coding
  - Quick shortcuts (MC 1, MC 2, MC 3)
  - Full classification catalog
- **Priority slider** (1-5) with color-coded labels
- **Submit button** with validation

## Technical Implementation

### Components
- `IntakeHeader` - Top navigation with breadcrumbs
- `ChatPanel` - Left column chat interface
- `DetailPanel` - Right column form controls
- `MapView` - Leaflet map wrapper
- `ui/*` - Reusable UI primitives

### State Management
- Local React state (no backend calls)
- Strong TypeScript types for all data structures
- Form validation and real-time updates

### Styling
- Dark theme optimized for dispatch environments
- Tailwind CSS with custom dispatch color palette
- Responsive design with keyboard accessibility
- Custom scrollbars and focus states

## Usage

1. **Start the application**: `pnpm dev --filter web`
2. **Navigate to**: `http://localhost:3000`
3. **Open intake modal**: Click the "+ Melding aanmaken" button in the header
4. **Fill out the form**:
   - Enter address or click on map
   - Select MC classifications
   - Set priority level
   - Submit the incident
5. **Modal closes automatically** after successful submission

## Modal Features

- **Full-screen overlay** with backdrop blur
- **Keyboard accessible** (Escape key to close)
- **Responsive design** that works on different screen sizes
- **Auto-close** after successful form submission
- **Form validation** prevents submission of incomplete forms

## Domain Types

```typescript
type IntakeForm = {
  address: string;
  location?: LatLng;
  mc: MC[];               // multiple classification tags
  priority: 1|2|3|4|5;
};
```

## MC Classifications

- **MC 1**: Inbraak (Burglary)
- **MC 2**: Achtervolging (Pursuit) 
- **MC 3**: Conflict (Conflict)
- Additional: Diefstal, Verkeer, Brand, Medisch, Overlast
