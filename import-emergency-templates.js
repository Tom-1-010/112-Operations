import { db } from './server/db.ts';
import { emergencyTemplates } from './shared/schema.ts';
import fs from 'fs';
import path from 'path';

async function importEmergencyTemplates() {
  try {
    console.log('Loading emergency templates from JSON file...');
    
    const filePath = path.join(process.cwd(), 'attached_assets', 'meldingen_diefstal_ai_locatie_1752334523367.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const templates = JSON.parse(data);
    
    console.log(`Found ${templates.length} emergency templates to import`);
    
    // Process templates in batches to avoid memory issues
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      
      const processedBatch = batch.map(template => ({
        meldingId: template.melding_id,
        categorie: template.categorie,
        subcategorie: template.subcategorie,
        classificatie: template.classificatie,
        spoed: template.spoed,
        melderType: template.melder.type,
        melderTelefoon: template.melder.telefoon,
        locatieContextPrompt: template.locatie.context_prompt,
        situatie: template.situatie,
        intakeVragen: template.intake
      }));
      
      await db.insert(emergencyTemplates).values(processedBatch).onConflictDoNothing();
      imported += processedBatch.length;
      
      console.log(`Imported batch ${Math.ceil(i / batchSize) + 1}: ${imported}/${templates.length} templates`);
    }
    
    console.log(`Successfully imported ${imported} emergency templates`);
    
    // Also load and store the configuration rules
    const configPath = path.join(process.cwd(), 'attached_assets', 'standaardregels_meldkamersimulator_rotterdam_rijnmond_1752334525964.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    console.log('Configuration loaded:', config.beschrijving);
    console.log('Veiligheidsregio:', config.veiligheidsregio);
    console.log('Gemeenten:', Object.keys(config.gemeenten).length);
    
  } catch (error) {
    console.error('Error importing emergency templates:', error);
  }
}

importEmergencyTemplates();