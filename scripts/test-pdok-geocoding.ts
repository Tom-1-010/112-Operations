#!/usr/bin/env tsx

/**
 * Test script om PDOK geocoding te testen voor alle kazernes
 */

import { pdokClient } from '../client/src/lib/pdok-client';

interface Kazerne {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  latitude?: string;
  longitude?: string;
}

async function testGeocoding() {
  console.log('🔍 Testing PDOK geocoding for kazernes...\n');

  try {
    // Haal kazernes op van de API
    const response = await fetch('http://localhost:5000/api/kazernes');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const kazernes: Kazerne[] = await response.json();
    console.log(`📊 Found ${kazernes.length} kazernes to test\n`);

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{
      kazerne: Kazerne;
      success: boolean;
      coordinates?: [number, number];
      error?: string;
    }> = [];

    // Test elke kazerne
    for (let i = 0; i < kazernes.length; i++) {
      const kazerne = kazernes[i];
      console.log(`[${i + 1}/${kazernes.length}] Testing: ${kazerne.naam}`);

      // Skip kazernes die al geldige coördinaten hebben
      if (kazerne.latitude && kazerne.longitude) {
        const lat = parseFloat(kazerne.latitude);
        const lng = parseFloat(kazerne.longitude);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= 50 && lat <= 54 && lng >= 3 && lng <= 8) {
          console.log(`  ✅ Already has valid coordinates: ${lat}, ${lng}`);
          results.push({
            kazerne,
            success: true,
            coordinates: [lat, lng]
          });
          successCount++;
          continue;
        }
      }

      // Geocode kazernes zonder geldige coördinaten
      try {
        const addressString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
        console.log(`  🔍 Geocoding: ${addressString}`);

        const searchResult = await pdokClient.searchAddresses({
          query: addressString,
          limit: 1,
          type: 'adres'
        });

        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          const address = searchResult.data[0];
          if (address.coordinates) {
            console.log(`  ✅ Found coordinates: ${address.coordinates[0]}, ${address.coordinates[1]}`);
            results.push({
              kazerne,
              success: true,
              coordinates: address.coordinates
            });
            successCount++;
          } else {
            console.log(`  ❌ No coordinates in result`);
            results.push({
              kazerne,
              success: false,
              error: 'Geen coördinaten gevonden in PDOK resultaat'
            });
            errorCount++;
          }
        } else {
          console.log(`  ❌ No results found: ${searchResult.error || 'Unknown error'}`);
          results.push({
            kazerne,
            success: false,
            error: searchResult.error || 'Geen resultaten gevonden in PDOK'
          });
          errorCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          kazerne,
          success: false,
          error: error instanceof Error ? error.message : 'Onbekende fout bij geocoding'
        });
        errorCount++;
      }

      // Kleine pauze tussen requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Samenvatting
    console.log('\n📊 Geocoding Results Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / kazernes.length) * 100).toFixed(1)}%\n`);

    // Toon gefaalde kazernes
    const failedKazernes = results.filter(r => !r.success);
    if (failedKazernes.length > 0) {
      console.log('❌ Failed kazernes:');
      failedKazernes.forEach((result, index) => {
        console.log(`${index + 1}. ${result.kazerne.naam} (${result.kazerne.adres}, ${result.kazerne.postcode} ${result.kazerne.plaats})`);
        console.log(`   Error: ${result.error}`);
      });
    }

    // Toon succesvolle kazernes met nieuwe coördinaten
    const newGeocodedKazernes = results.filter(r => r.success && r.coordinates);
    if (newGeocodedKazernes.length > 0) {
      console.log('\n✅ Successfully geocoded kazernes:');
      newGeocodedKazernes.slice(0, 10).forEach((result, index) => {
        const [lat, lng] = result.coordinates!;
        console.log(`${index + 1}. ${result.kazerne.naam}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
      if (newGeocodedKazernes.length > 10) {
        console.log(`   ... and ${newGeocodedKazernes.length - 10} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing geocoding:', error);
  }
}

// Run the test
testGeocoding().catch(console.error);






































