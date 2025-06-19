
const fs = require('fs');
const path = require('path');

// Read and parse the JSON file
const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750367007045.json');
const jsonData = fs.readFileSync(filePath, 'utf8');
const karakteristiekenData = JSON.parse(jsonData);

console.log('=== KARAKTERISTIEKEN DATA ===');
console.log(`Found ${karakteristiekenData.length} karakteristieken`);
console.log('\nSample records:');
karakteristiekenData.slice(0, 5).forEach((item, index) => {
  console.log(`${index + 1}. ${item['kt-naam']} | ${item['kt-paser']} | ${item['kt-waarde']}`);
});

console.log('\n=== SQL INSERT STATEMENTS ===');
console.log('Copy the following SQL statements and paste them into your database console:\n');

// Clear existing data first
console.log('-- Clear existing data');
console.log('DELETE FROM karakteristieken;\n');

// Generate INSERT statements
karakteristiekenData.forEach((item, index) => {
  const ktNaam = item['kt-naam']?.replace(/'/g, "''") || '';
  const ktType = item['kt-type']?.replace(/'/g, "''") || '';
  const ktWaarde = item['kt-waarde'] ? String(item['kt-waarde']).replace(/'/g, "''") : '';
  const ktCode = item['kt-code'] ? String(item['kt-code']).replace(/'/g, "''") : '';
  const ktPaser = item['kt-paser']?.replace(/'/g, "''") || '';
  
  console.log(`INSERT INTO karakteristieken (kt_naam, kt_type, kt_waarde, kt_code, kt_paser) VALUES ('${ktNaam}', '${ktType}', '${ktWaarde}', '${ktCode}', '${ktPaser}');`);
  
  if ((index + 1) % 100 === 0) {
    console.log(`-- Processed ${index + 1}/${karakteristiekenData.length} records\n`);
  }
});

console.log(`\n-- Total: ${karakteristiekenData.length} karakteristieken imported`);
