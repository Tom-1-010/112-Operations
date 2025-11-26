#!/usr/bin/env tsx

/**
 * Test script for PDOK API integration
 * 
 * Usage: npx tsx scripts/test-pdok-api.ts
 */

import { pdokService } from '../server/lib/pdok-service';

async function testPDOKAPI() {
  console.log('🧪 Testing PDOK API Integration...\n');

  // Test 1: Connection test
  console.log('1️⃣ Testing connection...');
  const connectionTest = await pdokService.testConnection();
  if (connectionTest.success) {
    console.log('✅ Connection successful');
    console.log(`   Version: ${connectionTest.data?.version}`);
    console.log(`   Timestamp: ${connectionTest.data?.timestamp}\n`);
  } else {
    console.log('❌ Connection failed:', connectionTest.error);
    return;
  }

  // Test 2: Address search
  console.log('2️⃣ Testing address search...');
  const searchResult = await pdokService.searchAddresses({
    query: 'Rotterdam Kleiweg 500',
    limit: 5,
    type: 'adres'
  });

  if (searchResult.success && searchResult.data) {
    console.log(`✅ Found ${searchResult.data.length} addresses`);
    searchResult.data.forEach((addr, index) => {
      console.log(`   ${index + 1}. ${pdokService.formatAddress(addr, 'full')}`);
      if (addr.coordinates) {
        console.log(`      Coordinates: ${addr.coordinates[0]}, ${addr.coordinates[1]}`);
      }
    });
    console.log(`   Execution time: ${searchResult.metadata?.executionTime}ms\n`);
  } else {
    console.log('❌ Address search failed:', searchResult.error);
  }

  // Test 3: Reverse geocoding
  console.log('3️⃣ Testing reverse geocoding...');
  const reverseResult = await pdokService.reverseGeocode({
    lat: 51.9123,
    lon: 4.4567,
    radius: 100
  });

  if (reverseResult.success && reverseResult.data) {
    console.log(`✅ Found ${reverseResult.data.length} nearby addresses`);
    reverseResult.data.forEach((addr, index) => {
      console.log(`   ${index + 1}. ${pdokService.formatAddress(addr, 'short')}`);
      console.log(`      Distance: ${addr.distance}m`);
    });
    console.log(`   Execution time: ${reverseResult.metadata?.executionTime}ms\n`);
  } else {
    console.log('❌ Reverse geocoding failed:', reverseResult.error);
  }

  // Test 4: Address validation
  console.log('4️⃣ Testing address validation...');
  const testAddress = {
    straatnaam: 'Kleiweg',
    huisnummer: '500',
    postcode: '3072 GK',
    plaatsnaam: 'Rotterdam',
    gemeentenaam: 'Rotterdam'
  };

  const validation = pdokService.validateAddress(testAddress);
  console.log(`✅ Validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`);
  if (validation.errors.length > 0) {
    console.log('   Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.log('   Warnings:', validation.warnings);
  }
  console.log();

  // Test 5: Address formatting
  console.log('5️⃣ Testing address formatting...');
  if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
    const address = searchResult.data[0];
    const formats = ['full', 'short', 'street'] as const;
    
    formats.forEach(format => {
      const formatted = pdokService.formatAddress(address, format);
      console.log(`   ${format}: ${formatted}`);
    });
    console.log();
  }

  // Test 6: Get address by ID
  console.log('6️⃣ Testing get address by ID...');
  if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
    const addressId = searchResult.data[0].id;
    const addressById = await pdokService.getAddressById(addressId);
    
    if (addressById.success && addressById.data) {
      console.log(`✅ Retrieved address by ID: ${addressId}`);
      console.log(`   Address: ${pdokService.formatAddress(addressById.data, 'full')}`);
    } else {
      console.log('❌ Get address by ID failed:', addressById.error);
    }
  }

  console.log('\n🎉 PDOK API testing completed!');
}

// Run the test
testPDOKAPI().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});





































