# PDOK API Integration

Deze documentatie beschrijft de integratie van de PDOK (Publieke Dienstverlening Op de Kaart) API in de MeldkamerSimulator applicatie.

## Overzicht

PDOK is de centrale voorziening voor geo-informatie van de Nederlandse overheid. Deze integratie biedt toegang tot:

- **Locatieserver**: Adreszoeken, geocoding en reverse geocoding
- **WMS/WFS services**: Bestuurlijke grenzen, topografie, luchtfoto's
- **BAG data**: Basisregistratie Adressen en Gebouwen
- **RWS data**: Rijkswaterstaat wegennetwerk

## API Endpoints

### Adreszoeken

#### `GET /api/pdok/search`
Zoek naar adressen met behulp van de PDOK Locatieserver.

**Parameters:**
- `q` (vereist): Zoekterm
- `limit` (optioneel): Maximum aantal resultaten (standaard: 20)
- `type` (optioneel): Type object (`adres`, `woonplaats`, `gemeente`, `provincie`)
- `bbox` (optioneel): Bounding box voor geografische filtering
- `sort` (optioneel): Sorteer op `score` of `distance`

**Voorbeeld:**
```bash
GET /api/pdok/search?q=Rotterdam%20Kleiweg&limit=10&type=adres
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "adr-123456789",
      "weergavenaam": "Kleiweg 500, 3072 GK Rotterdam",
      "straatnaam": "Kleiweg",
      "huisnummer": "500",
      "postcode": "3072 GK",
      "plaatsnaam": "Rotterdam",
      "gemeentenaam": "Rotterdam",
      "provincienaam": "Zuid-Holland",
      "coordinates": [51.9123, 4.4567],
      "score": 0.95,
      "type": "adres"
    }
  ],
  "metadata": {
    "total": 1,
    "count": 1,
    "query": "Rotterdam Kleiweg",
    "executionTime": 245
  }
}
```

### Reverse Geocoding

#### `GET /api/pdok/reverse-geocode`
Verkrijg adresinformatie op basis van coördinaten.

**Parameters:**
- `lat` (vereist): Breedtegraad
- `lon` (vereist): Lengtegraad
- `radius` (optioneel): Zoekradius in meters (standaard: 50)

**Voorbeeld:**
```bash
GET /api/pdok/reverse-geocode?lat=51.9123&lon=4.4567&radius=100
```

### Adres Details

#### `GET /api/pdok/address/:id`
Verkrijg gedetailleerde informatie over een specifiek adres.

**Parameters:**
- `id` (vereist): PDOK adres ID

**Voorbeeld:**
```bash
GET /api/pdok/address/adr-123456789
```

### Adres Validatie

#### `POST /api/pdok/validate-address`
Valideer adresgegevens op volledigheid en formaat.

**Request Body:**
```json
{
  "straatnaam": "Kleiweg",
  "huisnummer": "500",
  "postcode": "3072 GK",
  "plaatsnaam": "Rotterdam"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": ["Gemeentenaam is missing"]
  }
}
```

### Adres Formattering

#### `POST /api/pdok/format-address`
Formatteer adres voor weergave.

**Request Body:**
```json
{
  "address": {
    "straatnaam": "Kleiweg",
    "huisnummer": "500",
    "postcode": "3072 GK",
    "plaatsnaam": "Rotterdam"
  },
  "format": "full"
}
```

**Formaat opties:**
- `full`: Volledig adres met provincie
- `short`: Straat + postcode + plaats
- `street`: Alleen straat en huisnummer

### Autocomplete Suggesties

#### `GET /api/pdok/suggest`
Verkrijg suggesties voor adres autocomplete.

**Parameters:**
- `q` (vereist): Zoekterm
- `limit` (optioneel): Maximum aantal suggesties (standaard: 10)

**Voorbeeld:**
```bash
GET /api/pdok/suggest?q=Rotterdam%20Klei&limit=5
```

### Batch Zoeken

#### `POST /api/pdok/batch-search`
Zoek meerdere adressen tegelijk (maximaal 10).

**Request Body:**
```json
{
  "queries": [
    "Rotterdam Kleiweg 500",
    "Amsterdam Damrak 1",
    "Den Haag Binnenhof 1"
  ],
  "options": {
    "limit": 3,
    "type": "adres"
  }
}
```

### Service Health

#### `GET /api/pdok/health`
Controleer de status van de PDOK service.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "pdok": {
      "connected": true,
      "version": "v3_1",
      "lastCheck": "2024-01-15T10:30:00.000Z"
    },
    "service": {
      "name": "PDOK Service",
      "version": "1.0.0",
      "uptime": 3600
    }
  }
}
```

### Verbinding Test

#### `GET /api/pdok/test`
Test de verbinding met de PDOK API.

## Configuratie

### Environment Variabelen

Voeg de volgende variabelen toe aan je `.env` bestand:

```env
# PDOK API Configuration
PDOK_BASE_URL=https://api.pdok.nl
PDOK_TIMEOUT=10000
PDOK_MAX_RETRIES=3
PDOK_USER_AGENT=MeldkamerSimulator/1.0
```

### Configuratie Opties

- `PDOK_BASE_URL`: Basis URL voor PDOK API (standaard: https://api.pdok.nl)
- `PDOK_TIMEOUT`: Timeout voor API requests in milliseconden (standaard: 10000)
- `PDOK_MAX_RETRIES`: Maximum aantal herhaalpogingen bij fouten (standaard: 3)
- `PDOK_USER_AGENT`: User-Agent header voor API requests

## Gebruik in Code

### TypeScript Service

```typescript
import { pdokService } from '../lib/pdok-service';

// Adres zoeken
const result = await pdokService.searchAddresses({
  query: 'Rotterdam Kleiweg',
  limit: 10,
  type: 'adres'
});

if (result.success) {
  console.log('Gevonden adressen:', result.data);
}

// Reverse geocoding
const reverseResult = await pdokService.reverseGeocode({
  lat: 51.9123,
  lon: 4.4567,
  radius: 100
});

// Adres validatie
const validation = pdokService.validateAddress({
  straatnaam: 'Kleiweg',
  huisnummer: '500',
  postcode: '3072 GK',
  plaatsnaam: 'Rotterdam'
});

// Adres formattering
const formatted = pdokService.formatAddress(address, 'full');
```

### Frontend Gebruik

```typescript
// Adres zoeken
const searchAddresses = async (query: string) => {
  const response = await fetch(`/api/pdok/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data;
};

// Autocomplete
const getSuggestions = async (query: string) => {
  const response = await fetch(`/api/pdok/suggest?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.data || [];
};

// Reverse geocoding
const getAddressFromCoords = async (lat: number, lon: number) => {
  const response = await fetch(`/api/pdok/reverse-geocode?lat=${lat}&lon=${lon}`);
  const data = await response.json();
  return data.data?.[0] || null;
};
```

## Foutafhandeling

De PDOK service implementeert uitgebreide foutafhandeling:

### HTTP Status Codes

- `200`: Succesvol
- `400`: Ongeldige parameters
- `404`: Adres niet gevonden
- `500`: Server fout of PDOK API niet beschikbaar

### Fout Response Format

```json
{
  "success": false,
  "error": "Beschrijving van de fout",
  "metadata": {
    "query": "Originele zoekterm",
    "executionTime": 150
  }
}
```

### Retry Logic

De service implementeert automatische herhaalpogingen met exponential backoff:

1. Eerste poging
2. Wacht 1 seconde, probeer opnieuw
3. Wacht 2 seconden, probeer opnieuw
4. Wacht 3 seconden, probeer opnieuw
5. Geef fout terug

## Performance Optimalisaties

### Caching

Voor productie gebruik wordt aanbevolen om caching te implementeren:

```typescript
// Voorbeeld cache implementatie
const cache = new Map();

const getCachedResult = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minuten
    return cached.data;
  }
  return null;
};
```

### Rate Limiting

PDOK API heeft geen expliciete rate limits, maar gebruik best practices:

- Implementeer client-side rate limiting
- Gebruik debouncing voor autocomplete
- Cache veelgebruikte zoekopdrachten

### Batch Requests

Voor meerdere adressen, gebruik de batch endpoint:

```typescript
const batchSearch = async (queries: string[]) => {
  const response = await fetch('/api/pdok/batch-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries, options: { limit: 5 } })
  });
  return response.json();
};
```

## Best Practices

### Adres Zoeken

1. **Gebruik specifieke zoektermen**: "Rotterdam Kleiweg 500" in plaats van "Kleiweg"
2. **Implementeer debouncing**: Wacht 300ms na laatste toetsaanslag
3. **Toon resultaten progressief**: Toon eerst de beste matches
4. **Valideer input**: Controleer op lege strings en speciale karakters

### Reverse Geocoding

1. **Gebruik geschikte radius**: 50-100 meter voor nauwkeurigheid
2. **Cache resultaten**: Coördinaten veranderen niet vaak
3. **Handleer geen resultaten**: Niet alle coördinaten hebben adressen

### Error Handling

1. **Toon gebruiksvriendelijke fouten**: "Adres niet gevonden" in plaats van HTTP 404
2. **Implementeer fallbacks**: Gebruik alternatieve geocoding services
3. **Log fouten**: Voor monitoring en debugging

## Monitoring

### Health Checks

Implementeer regelmatige health checks:

```typescript
const checkPDOKHealth = async () => {
  const response = await fetch('/api/pdok/health');
  const data = await response.json();
  
  if (!data.success || data.data.status !== 'healthy') {
    console.error('PDOK service is unhealthy');
    // Implementeer alerting
  }
};

// Check elke 5 minuten
setInterval(checkPDOKHealth, 5 * 60 * 1000);
```

### Metrics

Track de volgende metrics:

- Response times
- Success/failure rates
- Cache hit rates
- API usage patterns

## Troubleshooting

### Veelvoorkomende Problemen

1. **Geen resultaten gevonden**
   - Controleer spelling van zoekterm
   - Probeer meer algemene termen
   - Controleer of type parameter correct is

2. **Langzame response times**
   - Controleer netwerkverbinding
   - Implementeer caching
   - Gebruik batch requests voor meerdere zoekopdrachten

3. **API fouten**
   - Controleer PDOK service status
   - Controleer rate limiting
   - Controleer network connectivity

### Debug Informatie

Activeer debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('[PDOK Debug]', {
    url,
    params,
    responseTime,
    resultCount
  });
}
```

## Toekomstige Uitbreidingen

### Geplande Features

1. **Offline Caching**: Lokale cache voor veelgebruikte adressen
2. **Fuzzy Matching**: Intelligente zoekalgoritmes
3. **Batch Processing**: Bulk adres validatie
4. **Webhook Support**: Real-time updates van adreswijzigingen

### Integratie Mogelijkheden

1. **Map Services**: Integratie met Leaflet/OpenLayers
2. **Routing**: Combinatie met OSRM/Valhalla
3. **Analytics**: Gebruikspatronen en performance metrics
4. **Notifications**: Alerts bij service problemen

## Support

Voor vragen of problemen:

1. Controleer deze documentatie
2. Bekijk de server logs
3. Test de `/api/pdok/test` endpoint
4. Controleer PDOK service status op https://www.pdok.nl/

## Changelog

### v1.0.0 (2024-01-15)
- Initiële implementatie van PDOK API integratie
- Adres zoeken en reverse geocoding
- Adres validatie en formattering
- Batch processing support
- Comprehensive error handling
- TypeScript type definitions






































