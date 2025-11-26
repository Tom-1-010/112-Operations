#!/usr/bin/env tsx

/**
 * Script om coördinaten van kazernes te verifiëren en indien nodig opnieuw te geocoderen
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

async function verifyAndFixCoordinates() {
  console.log('🔍 Verifying and fixing kazerne coordinates...\n');

  try {
    // Haal kazernes op van de API
    const response = await fetch('http://localhost:5000/api/kazernes');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const kazernes: Kazerne[] = await response.json();
    console.log(`📊 Found ${kazernes.length} kazernes to verify\n`);

    const suspiciousKazernes: Kazerne[] = [];
    const validKazernes: Kazerne[] = [];

    // Categoriseer kazernes
    for (const kazerne of kazernes) {
      if (!kazerne.latitude || !kazerne.longitude) {
        suspiciousKazernes.push(kazerne);
        continue;
      }

      const lat = parseFloat(kazerne.latitude);
      const lng = parseFloat(kazerne.longitude);
      
      // Check of coördinaten geldig zijn voor Nederland
      if (isNaN(lat) || isNaN(lng) || lat < 50 || lat > 54 || lng < 3 || lng > 8) {
        suspiciousKazernes.push(kazerne);
      } else {
        validKazernes.push(kazerne);
      }
    }

    console.log(`✅ Valid coordinates: ${validKazernes.length}`);
    console.log(`⚠️  Suspicious coordinates: ${suspiciousKazernes.length}\n`);

    if (suspiciousKazernes.length === 0) {
      console.log('🎉 All kazernes have valid coordinates!');
      return;
    }

    // Toon verdachte kazernes
    console.log('⚠️  Kazernes with suspicious coordinates:');
    suspiciousKazernes.forEach((kazerne, index) => {
      console.log(`${index + 1}. ${kazerne.naam}`);
      console.log(`   Address: ${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`);
      console.log(`   Current coords: ${kazerne.latitude || 'N/A'}, ${kazerne.longitude || 'N/A'}`);
    });

    // Geocode verdachte kazernes
    console.log('\n🔍 Re-geocoding suspicious kazernes...\n');
    
    const fixedKazernes: Array<{
      kazerne: Kazerne;
      oldCoordinates?: [number, number];
      newCoordinates: [number, number];
      success: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < suspiciousKazernes.length; i++) {
      const kazerne = suspiciousKazernes[i];
      console.log(`[${i + 1}/${suspiciousKazernes.length}] Fixing: ${kazerne.naam}`);

      const oldLat = kazerne.latitude ? parseFloat(kazerne.latitude) : null;
      const oldLng = kazerne.longitude ? parseFloat(kazerne.longitude) : null;
      const oldCoordinates = (oldLat && oldLng && !isNaN(oldLat) && !isNaN(oldLng)) 
        ? [oldLat, oldLng] as [number, number] 
        : undefined;

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
            const [newLat, newLng] = address.coordinates;
            console.log(`  ✅ New coordinates: ${newLat}, ${newLng}`);
            
            if (oldCoordinates) {
              const distance = calculateDistance(oldLat!, oldLng!, newLat, newLng);
              console.log(`  📏 Distance from old: ${distance.toFixed(0)}m`);
            }

            fixedKazernes.push({
              kazerne,
              oldCoordinates,
              newCoordinates: address.coordinates,
              success: true
            });
          } else {
            console.log(`  ❌ No coordinates in result`);
            fixedKazernes.push({
              kazerne,
              oldCoordinates,
              newCoordinates: [0, 0],
              success: false,
              error: 'Geen coördinaten gevonden in PDOK resultaat'
            });
          }
        } else {
          console.log(`  ❌ No results found: ${searchResult.error || 'Unknown error'}`);
          fixedKazernes.push({
            kazerne,
            oldCoordinates,
            newCoordinates: [0, 0],
            success: false,
            error: searchResult.error || 'Geen resultaten gevonden in PDOK'
          });
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        fixedKazernes.push({
          kazerne,
          oldCoordinates,
          newCoordinates: [0, 0],
          success: false,
          error: error instanceof Error ? error.message : 'Onbekende fout bij geocoding'
        });
      }

      // Kleine pauze tussen requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Samenvatting
    const successfulFixes = fixedKazernes.filter(f => f.success);
    const failedFixes = fixedKazernes.filter(f => !f.success);

    console.log('\n📊 Fix Results Summary:');
    console.log(`✅ Successfully fixed: ${successfulFixes.length}`);
    console.log(`❌ Failed to fix: ${failedFixes.length}`);

    if (successfulFixes.length > 0) {
      console.log('\n✅ Successfully fixed kazernes:');
      successfulFixes.forEach((fix, index) => {
        const [lat, lng] = fix.newCoordinates;
        console.log(`${index + 1}. ${fix.kazerne.naam}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        if (fix.oldCoordinates) {
          const [oldLat, oldLng] = fix.oldCoordinates;
          const distance = calculateDistance(oldLat, oldLng, lat, lng);
          console.log(`   Old: ${oldLat.toFixed(6)}, ${oldLng.toFixed(6)} (${distance.toFixed(0)}m difference)`);
        }
      });
    }

    if (failedFixes.length > 0) {
      console.log('\n❌ Failed to fix kazernes:');
      failedFixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix.kazerne.naam}: ${fix.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verifying coordinates:', error);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return distance in meters
}

// Run the verification
verifyAndFixCoordinates().catch(console.error);






































