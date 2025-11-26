#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  const result = await response.json();
  return result;
}

async function importVoertuigen() {
  console.log('🚀 Starting voertuigen import...\n');

  try {
    // Lees SQL bestand
    const sqlFile = join(process.cwd(), 'scripts', 'voertuigen-data.sql');
    let sql = readFileSync(sqlFile, 'utf8');
    
    // Verwijder alle kazerne_id waarden en zet ze op NULL
    sql = sql.replace(/kazerne_id,/g, 'kazerne_id,')
             .replace(/'[a-f0-9-]{36}'/g, 'NULL')  // Vervang alle UUID's met NULL
             .replace(/DROP TABLE.*?;/gs, '')      // Verwijder DROP TABLE statements
             .replace(/CREATE TABLE.*?;/gs, '');    // Verwijder CREATE TABLE statements
    
    console.log('📝 Inserting all voertuigen (without kazerne links)...\n');
    
    // Split op INSERT statements en voer ze uit
    const inserts = sql.match(/INSERT INTO Voertuigen[\s\S]*?;/g) || [];
    
    console.log(`Found ${inserts.length} INSERT statements\n`);
    
    for (let i = 0; i < inserts.length; i++) {
      console.log(`[${i + 1}/${inserts.length}] Executing batch...`);
      await runSQL(inserts[i]);
    }
    
    console.log('\n✅ All voertuigen inserted!\n');
    
    // Tel voertuigen
    const count = await runSQL('SELECT COUNT(*) as aantal FROM Voertuigen');
    console.log(`📊 Total voertuigen: ${count.data?.[0]?.aantal || 'unknown'}\n`);
    
    console.log('🔗 Now linking voertuigen to kazernes...\n');
    
    // Mapping: roepnummer prefix naar kazerne naam
    const mapping = {
      '17-01': 'Kazerne Hoek van Holland',
      '17-02': 'Kazerne Maassluis',
      '17-03': 'Kazerne Vlaardingen',
      '17-04': 'Kazerne Schiedam',
      '17-05': 'Kazerne Rotterdam Frobenstraat',
      '17-06': 'Kazerne Rotterdam Baan',
      '17-07': 'Kazerne Berkel en Rodenrijs',
      '17-08': 'Kazerne Bleiswijk',
      '17-09': 'Kazerne Rotterdam Bosland',
      '17-10': 'Kazerne Rotterdam Metaalhof',
      '17-11': 'Kazerne Capelle aan den IJssel',
      '17-12': 'Kazerne Krimpen aan den IJssel',
      '17-13': 'Gezamenlijke Brandweer - Maximaweg',
      '17-14': 'Gezamenlijke Brandweer - Coloradoweg',
      '17-15': 'Gezamenlijke Brandweer - Elbeweg',
      '17-17': 'Gezamenlijke Brandweer - Rozenburg',
      '17-19': 'Gezamenlijke Brandweer - Merseyweg',
      '17-20': 'Gezamenlijke Brandweer - Botlekweg',
      '17-21': 'Gezamenlijke Brandweer - Butaanweg',
      '17-22': 'Gezamenlijke Brandweer - Hoogvliet',
      '17-23': 'Kazerne Rockanje',
      '17-24': 'Kazerne Oostvoorne',
      '17-25': 'Kazerne Hellevoetsluis',
      '17-26': 'Kazerne Brielle',
      '17-27': 'Kazerne Zwartewaal',
      '17-28': 'Kazerne Oudenhoorn',
      '17-29': 'Kazerne Heenvliet',
      '17-30': 'Kazerne Zuidland',
      '17-31': 'Kazerne Spijkenisse',
      '17-32': 'Kazerne Albrandswaard',
      '17-33': 'Kazerne Rotterdam Keijenburg',
      '17-34': 'Kazerne Rotterdam Mijnsherenlaan',
      '17-35': 'Kazerne Rotterdam Albert Plesmanweg',
      '17-36': 'Kazerne Barendrecht',
      '17-37': 'Kazerne Rotterdam Groene Tuin',
      '17-38': 'Kazerne Ridderkerk',
      '17-39': 'Kazerne Ouddorp',
      '17-40': 'Kazerne Goedereede',
      '17-41': 'Kazerne Stellendam',
      '17-42': 'Kazerne Melissant',
      '17-43': 'Kazerne Dirksland',
      '17-44': 'Kazerne Herkingen',
      '17-45': 'Kazerne Olympiaweg',
      '17-46': 'Kazerne Nieuwe Tonge',
      '17-47': 'Kazerne Stad aan het Haringvliet',
      '17-48': 'Kazerne Oude Tonge',
      '17-49': 'Kazerne Den Bommel',
      '17-50': 'Kazerne Ooltgensplaat',
      '17-89': 'Rotterdam The Hague Airport',
    };
    
    // Koppel voertuigen aan kazernes op basis van roepnummer prefix
    for (const [prefix, kazerneNaam] of Object.entries(mapping)) {
      console.log(`Linking ${prefix}xx to ${kazerneNaam}...`);
      
      const updateSQL = `
        UPDATE Voertuigen 
        SET kazerne_id = (SELECT id FROM kazernes WHERE naam = '${kazerneNaam}' LIMIT 1)
        WHERE Roepnummer LIKE '${prefix}%'
      `;
      
      await runSQL(updateSQL);
    }
    
    console.log('\n✅ All voertuigen linked to kazernes!\n');
    
    // Statistieken
    const stats = await runSQL(`
      SELECT 
        COUNT(*) as totaal,
        COUNT(*) FILTER (WHERE kazerne_id IS NOT NULL) as gekoppeld,
        COUNT(*) FILTER (WHERE kazerne_id IS NULL) as ongekoppeld
      FROM Voertuigen
    `);
    
    console.log('📊 Statistics:');
    console.table(stats.data);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

importVoertuigen()
  .then(() => {
    console.log('\n🎉 Import completed!');
    process.exit(0);
  })
  .catch(() => process.exit(1));

