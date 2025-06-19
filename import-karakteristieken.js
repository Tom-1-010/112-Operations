
import { db } from './server/db.js';
import { karakteristieken } from './shared/schema.js';
import fs from 'fs';
import path from 'path';

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
    
    // Clear existing data
    await db.delete(karakteristieken);
    console.log('🗑️ Cleared existing karakteristieken');
    
    // Insert new data
    if (karakteristiekenData.length > 0) {
      await db.insert(karakteristieken).values(karakteristiekenData);
      console.log(`✅ Successfully imported ${karakteristiekenData.length} karakteristieken`);
    }
    
    // Verify import
    const count = await db.select().from(karakteristieken);
    console.log(`🔍 Verification: ${count.length} karakteristieken in database`);
    
  } catch (error) {
    console.error('❌ Error importing karakteristieken:', error);
  }
  
  process.exit(0);
}

importKarakteristieken();
