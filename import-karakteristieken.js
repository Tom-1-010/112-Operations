const fs = require('fs');
const path = require('path');

async function importKarakteristieken() {
  try {
    console.log('🔄 Starting karakteristieken import...');
    
    // Read the karakteristieken JSON file
    const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750367007045.json');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Karakteristieken file not found:', filePath);
      return;
    }
    
    const jsonData = fs.readFileSync(filePath, 'utf8');
    const karakteristiekenData = JSON.parse(jsonData);
    
    console.log(`📊 Found ${karakteristiekenData.length} karakteristieken to import`);
    
    // Post to API endpoint
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:5000/api/karakteristieken/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(karakteristiekenData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Successfully imported ${result.length} karakteristieken!`);
    } else {
      console.error('❌ Failed to import karakteristieken:', response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error importing karakteristieken:', error);
  }
  
  process.exit(0);
}

importKarakteristieken();