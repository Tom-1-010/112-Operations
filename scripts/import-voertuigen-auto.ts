#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';

async function runSQL(sql: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  return await response.json();
}

async function importVoertuigen() {
  console.log('🚀 Starting automatic voertuigen import...\n');

  try {
    // Lees het originele bestand
    const sqlContent = readFileSync('C:\\Users\\Gebruiker\\Desktop\\roepnamem.txt', 'utf8');
    
    // Mapping van kazerne nummer naar naam
    const kazerneMapping: Record<string, string> = {
      '01': 'Kazerne Hoek van Holland',
      '02': 'Kazerne Maassluis',
      '03': 'Kazerne Vlaardingen',
      '04': 'Kazerne Schiedam',
      '05': 'Kazerne Rotterdam Frobenstraat',
      '06': 'Kazerne Rotterdam Baan',
      '07': 'Kazerne Berkel en Rodenrijs',
      '08': 'Kazerne Bleiswijk',
      '09': 'Kazerne Rotterdam Bosland',
      '10': 'Kazerne Rotterdam Metaalhof',
      '11': 'Kazerne Capelle aan den IJssel',
      '12': 'Kazerne Krimpen aan den IJssel',
      '13': 'Gezamenlijke Brandweer - Maximaweg',
      '14': 'Gezamenlijke Brandweer - Coloradoweg',
      '15': 'Gezamenlijke Brandweer - Elbeweg',
      '17': 'Gezamenlijke Brandweer - Rozenburg',
      '19': 'Gezamenlijke Brandweer - Merseyweg',
      '20': 'Gezamenlijke Brandweer - Botlekweg',
      '21': 'Gezamenlijke Brandweer - Butaanweg',
      '22': 'Gezamenlijke Brandweer - Hoogvliet',
      '23': 'Kazerne Rockanje',
      '24': 'Kazerne Oostvoorne',
      '25': 'Kazerne Hellevoetsluis',
      '26': 'Kazerne Brielle',
      '27': 'Kazerne Zwartewaal',
      '28': 'Kazerne Oudenhoorn',
      '29': 'Kazerne Heenvliet',
      '30': 'Kazerne Zuidland',
      '31': 'Kazerne Spijkenisse',
      '32': 'Kazerne Albrandswaard',
      '33': 'Kazerne Rotterdam Keijenburg',
      '34': 'Kazerne Rotterdam Mijnsherenlaan',
      '35': 'Kazerne Rotterdam Albert Plesmanweg',
      '36': 'Kazerne Barendrecht',
      '37': 'Kazerne Rotterdam Groene Tuin',
      '38': 'Kazerne Ridderkerk',
      '39': 'Kazerne Ouddorp',
      '40': 'Kazerne Goedereede',
      '41': 'Kazerne Stellendam',
      '42': 'Kazerne Melissant',
      '43': 'Kazerne Dirksland',
      '44': 'Kazerne Herkingen',
      '45': 'Kazerne Olympiaweg',
      '46': 'Kazerne Nieuwe Tonge',
      '47': 'Kazerne Stad aan het Haringvliet',
      '48': 'Kazerne Oude Tonge',
      '49': 'Kazerne Den Bommel',
      '50': 'Kazerne Ooltgensplaat',
      '89': 'Rotterdam The Hague Airport',
      '90': 'Leiding en Coordinatie',
      '91': 'Regionaal',
      '92': 'Logistiek',
      '99': 'Multidisciplinair',
    };
    
    console.log('📝 Processing SQL file...\n');
    
    // Extract INSERT statements
    const inserts = sqlContent.match(/INSERT INTO Voertuigen[\s\S]*?;/g) || [];
    
    console.log(`Found ${inserts.length} INSERT statements\n`);
    
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < inserts.length; i++) {
      let insert = inserts[i];
      
      // Vervang alle UUID's door NULL eerst
      insert = insert.replace(/'[a-f0-9-]{36}'/g, 'NULL');
      
      // Fix typo: kzerne_id -> kazerne_id
      insert = insert.replace(/kzerne_id/g, 'kazerne_id');
      
      try {
        console.log(`[${i + 1}/${inserts.length}] Inserting batch...`);
        const result = await runSQL(insert);
        
        if (result.success) {
          imported++;
        } else {
          console.error(`  ❌ Error: ${result.error}`);
          errors++;
        }
      } catch (error: any) {
        console.error(`  ❌ Failed: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Errors: ${errors}\n`);
    
    // Tel voertuigen
    const count = await runSQL('SELECT COUNT(*) as totaal FROM Voertuigen');
    console.log(`📊 Total voertuigen in database: ${count.data?.[0]?.totaal || 0}\n`);
    
    // Nu koppelingen maken op basis van roepnummer
    console.log('🔗 Linking voertuigen to kazernes based on roepnummer...\n');
    
    for (const [kazerneNr, kazerneNaam] of Object.entries(kazerneMapping)) {
      const prefix = `17-${kazerneNr.padStart(2, '0')}`;
      
      console.log(`  Linking ${prefix}xx to ${kazerneNaam}...`);
      
      const updateSQL = `
        UPDATE Voertuigen 
        SET kazerne_id = (SELECT id FROM kazernes WHERE naam = '${kazerneNaam}' LIMIT 1)
        WHERE Roepnummer LIKE '${prefix}%' AND kazerne_id IS NULL
      `;
      
      await runSQL(updateSQL);
    }
    
    console.log('\n✅ All voertuigen linked!\n');
    
    // Statistieken
    const stats = await runSQL(`
      SELECT 
        COUNT(*) as totaal,
        COUNT(*) FILTER (WHERE kazerne_id IS NOT NULL) as gekoppeld,
        COUNT(*) FILTER (WHERE kazerne_id IS NULL) as ongekoppeld
      FROM Voertuigen
    `);
    
    console.log('📊 Final statistics:');
    console.table(stats.data);
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  }
}

importVoertuigen()
  .then(() => {
    console.log('\n🎉 Voertuigen import completed successfully!');
    process.exit(0);
  })
  .catch(() => process.exit(1));

