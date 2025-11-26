/**
 * Hook voor het geocoderen van kazernes met PDOK API
 */

import { useState, useCallback } from 'react';
import { pdokClient, type AddressResult } from '../lib/pdok-client';

export interface KazerneGeocodingResult {
  kazerneId: string;
  success: boolean;
  coordinates?: [number, number];
  address?: AddressResult;
  error?: string;
}

export interface UseKazerneGeocodingResult {
  geocodingResults: KazerneGeocodingResult[];
  isGeocoding: boolean;
  geocodeKazernes: (kazernes: any[]) => Promise<void>;
  clearResults: () => void;
}

export function useKazerneGeocoding(): UseKazerneGeocodingResult {
  const [geocodingResults, setGeocodingResults] = useState<KazerneGeocodingResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeKazernes = useCallback(async (kazernes: any[]) => {
    setIsGeocoding(true);
    setGeocodingResults([]);

    const results: KazerneGeocodingResult[] = [];

    for (const kazerne of kazernes) {
      // Skip kazernes die al geldige coördinaten hebben
      if (kazerne.latitude && kazerne.longitude) {
        const lat = parseFloat(kazerne.latitude);
        const lng = parseFloat(kazerne.longitude);
        
        // Check of coördinaten geldig zijn (Nederland ligt tussen 50-54°N en 3-8°E)
        if (!isNaN(lat) && !isNaN(lng) && lat >= 50 && lat <= 54 && lng >= 3 && lng <= 8) {
          results.push({
            kazerneId: kazerne.id,
            success: true,
            coordinates: [lat, lng],
            address: {
              id: 'existing',
              weergavenaam: `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`,
              straatnaam: kazerne.adres,
              huisnummer: '',
              postcode: kazerne.postcode,
              plaatsnaam: kazerne.plaats,
              gemeentenaam: kazerne.plaats,
              provincienaam: '',
              coordinates: [lat, lng],
              score: 100,
              type: 'existing'
            }
          });
          continue;
        }
      }

      // Geocode kazernes zonder geldige coördinaten
      try {
        const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
        const searchResult = await pdokClient.searchAddresses({
          query: addressString,
          limit: 1,
          type: 'adres'
        });

        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          const address = searchResult.data[0];
          if (address.coordinates) {
            results.push({
              kazerneId: kazerne.id,
              success: true,
              coordinates: address.coordinates,
              address: address
            });
          } else {
            results.push({
              kazerneId: kazerne.id,
              success: false,
              error: 'Geen coördinaten gevonden in PDOK resultaat'
            });
          }
        } else {
          results.push({
            kazerneId: kazerne.id,
            success: false,
            error: searchResult.error || 'Geen resultaten gevonden in PDOK'
          });
        }
      } catch (error) {
        results.push({
          kazerneId: kazerne.id,
          success: false,
          error: error instanceof Error ? error.message : 'Onbekende fout bij geocoding'
        });
      }

      // Kleine pauze tussen requests om PDOK API niet te overbelasten
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setGeocodingResults(results);
    setIsGeocoding(false);
  }, []);

  const clearResults = useCallback(() => {
    setGeocodingResults([]);
  }, []);

  return {
    geocodingResults,
    isGeocoding,
    geocodeKazernes,
    clearResults
  };
}






































