
import fs from 'fs';
import path from 'path';

// Read the karakteristieken JSON file
const karakteristiekenPath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750367007045.json');
const karakteristiekenData = JSON.parse(fs.readFileSync(karakteristiekenPath, 'utf8'));

// Transform the data to match our database schema
const transformedData = karakteristiekenData.map(item => ({
  ktNaam: item['kt-naam'],
  ktType: item['kt-type'],
  ktWaarde: item['kt-waarde'] === null || isNaN(item['kt-waarde']) ? null : String(item['kt-waarde']),
  ktCode: item['kt-code'] === null || isNaN(item['kt-code']) ? null : item['kt-code'],
  ktPaser: item['kt-paser']
}));

// Post the data to the API
async function importKarakteristieken() {
  try {
    console.log(`Importing ${transformedData.length} karakteristieken...`);
    
    const response = await fetch('http://localhost:5000/api/karakteristieken/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`Successfully imported ${result.length} karakteristieken!`);
    } else {
      console.error('Failed to import karakteristieken:', response.statusText);
    }
  } catch (error) {
    console.error('Error importing karakteristieken:', error);
  }
}

// Check if server is running and import
console.log('Starting karakteristieken import...');
importKarakteristieken();
