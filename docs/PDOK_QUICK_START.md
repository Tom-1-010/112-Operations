# PDOK API Quick Start Guide

Deze gids helpt je snel aan de slag te gaan met de PDOK API integratie in de MeldkamerSimulator.

## Wat is PDOK?

PDOK (Publieke Dienstverlening Op de Kaart) is de centrale voorziening voor geo-informatie van de Nederlandse overheid. Het biedt toegang tot:

- **Adresgegevens**: Zoeken naar adressen, postcodes, plaatsen
- **Geocoding**: Coördinaten omzetten naar adressen
- **Reverse Geocoding**: Adressen omzetten naar coördinaten
- **Bestuurlijke grenzen**: Gemeenten, provincies, wijken
- **Wegennetwerk**: Rijkswaterstaat data

## Snel Starten

### 1. Environment Setup

Voeg de volgende variabelen toe aan je `.env` bestand:

```env
# PDOK API Configuration
PDOK_BASE_URL=https://api.pdok.nl
PDOK_TIMEOUT=10000
PDOK_MAX_RETRIES=3
PDOK_USER_AGENT=MeldkamerSimulator/1.0
```

### 2. Test de API

Test of de PDOK API werkt:

```bash
# Test de verbinding
curl http://localhost:5000/api/pdok/test

# Zoek naar een adres
curl "http://localhost:5000/api/pdok/search?q=Rotterdam%20Kleiweg%20500"
```

### 3. Gebruik in Frontend

```typescript
import { pdokClient } from '../lib/pdok-client';

// Zoek adressen
const result = await pdokClient.searchAddresses({
  query: 'Rotterdam Kleiweg 500',
  limit: 10
});

if (result.success) {
  console.log('Gevonden adressen:', result.data);
}
```

### 4. Gebruik React Hooks

```typescript
import { useAddressSearch } from '../hooks/use-pdok';

function AddressSearchComponent() {
  const { query, setQuery, results, loading, error } = useAddressSearch({
    debounceMs: 300,
    minQueryLength: 2
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek adres..."
      />
      {loading && <div>Zoeken...</div>}
      {error && <div>Fout: {error}</div>}
      {results.map(address => (
        <div key={address.id}>{address.weergavenaam}</div>
      ))}
    </div>
  );
}
```

## Veelgebruikte API Endpoints

### Adres Zoeken
```bash
GET /api/pdok/search?q=Rotterdam%20Kleiweg&limit=10
```

### Reverse Geocoding
```bash
GET /api/pdok/reverse-geocode?lat=51.9123&lon=4.4567&radius=100
```

### Adres Validatie
```bash
POST /api/pdok/validate-address
Content-Type: application/json

{
  "straatnaam": "Kleiweg",
  "huisnummer": "500",
  "postcode": "3072 GK",
  "plaatsnaam": "Rotterdam"
}
```

### Autocomplete Suggesties
```bash
GET /api/pdok/suggest?q=Rotterdam%20Klei&limit=5
```

## Voorbeelden

### Basis Adres Zoeken

```typescript
// Zoek naar adressen
const searchResult = await pdokClient.searchAddresses({
  query: 'Amsterdam Damrak 1',
  limit: 5,
  type: 'adres'
});

if (searchResult.success) {
  searchResult.data?.forEach(address => {
    console.log(`${address.weergavenaam} - ${address.coordinates}`);
  });
}
```

### Reverse Geocoding

```typescript
// Krijg adres van coördinaten
const reverseResult = await pdokClient.reverseGeocode({
  lat: 52.3731,
  lon: 4.8922,
  radius: 50
});

if (reverseResult.success) {
  const nearestAddress = reverseResult.data?.[0];
  console.log(`Dichtstbijzijnde adres: ${nearestAddress?.weergavenaam}`);
}
```

### Adres Validatie

```typescript
// Valideer adresgegevens
const validation = await pdokClient.validateAddress({
  straatnaam: 'Kleiweg',
  huisnummer: '500',
  postcode: '3072 GK',
  plaatsnaam: 'Rotterdam'
});

if (validation.success) {
  console.log(`Adres is ${validation.data?.isValid ? 'geldig' : 'ongeldig'}`);
  if (validation.data?.errors.length > 0) {
    console.log('Fouten:', validation.data.errors);
  }
}
```

### Autocomplete

```typescript
// Krijg suggesties voor autocomplete
const suggestions = await pdokClient.getSuggestions('Rotterdam Klei', 5);

if (suggestions.success) {
  suggestions.data?.forEach(suggestion => {
    console.log(`${suggestion.text} (${suggestion.score})`);
  });
}
```

## React Component Voorbeeld

```typescript
import React from 'react';
import { useAddressSearch } from '../hooks/use-pdok';

export function AddressSearch() {
  const { query, setQuery, results, loading, error } = useAddressSearch();

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek adres..."
        className="w-full p-2 border rounded"
      />
      
      {loading && <div className="text-blue-600">Zoeken...</div>}
      {error && <div className="text-red-600">Fout: {error}</div>}
      
      <div className="mt-2">
        {results.map(address => (
          <div
            key={address.id}
            className="p-2 border-b cursor-pointer hover:bg-gray-100"
            onClick={() => console.log('Geselecteerd:', address)}
          >
            {address.weergavenaam}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Foutafhandeling

```typescript
const result = await pdokClient.searchAddresses({ query: 'test' });

if (!result.success) {
  console.error('PDOK API fout:', result.error);
  // Toon gebruiksvriendelijke foutmelding
  alert('Kon geen adressen vinden. Probeer het opnieuw.');
} else {
  // Verwerk resultaten
  console.log('Gevonden adressen:', result.data);
}
```

## Performance Tips

### 1. Debouncing
Gebruik altijd debouncing voor zoekopdrachten:

```typescript
const { setQuery } = useAddressSearch({ debounceMs: 300 });
```

### 2. Minimum Query Length
Stel een minimum query length in:

```typescript
const { setQuery } = useAddressSearch({ minQueryLength: 2 });
```

### 3. Limiteer Resultaten
Gebruik een redelijke limit:

```typescript
const result = await pdokClient.searchAddresses({
  query: 'test',
  limit: 10 // Niet te hoog
});
```

### 4. Cache Resultaten
Cache veelgebruikte zoekopdrachten:

```typescript
const cache = new Map();

const getCachedResult = (key: string) => {
  return cache.get(key);
};

const setCachedResult = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

## Troubleshooting

### Geen Resultaten
- Controleer spelling van zoekterm
- Probeer meer algemene termen
- Controleer of type parameter correct is

### Langzame Response
- Controleer netwerkverbinding
- Implementeer caching
- Gebruik batch requests voor meerdere zoekopdrachten

### API Fouten
- Controleer PDOK service status
- Controleer rate limiting
- Controleer network connectivity

## Meer Informatie

- [Volledige PDOK API Documentatie](./PDOK_API_INTEGRATION.md)
- [PDOK Officiële Website](https://www.pdok.nl/)
- [PDOK API Documentatie](https://www.pdok.nl/geo-services/-/article/locatieserver)

## Support

Voor vragen of problemen:

1. Controleer deze documentatie
2. Bekijk de server logs
3. Test de `/api/pdok/test` endpoint
4. Controleer PDOK service status






































