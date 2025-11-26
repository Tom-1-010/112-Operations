import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Volledige data array - alle items
const data = [
  {"LABEL":"A RT-BASIS MARR VOOR MC *","null":null,"MC1":"","MC2":"","NAAM_KARAKTERISTIEK":"Aantal te water","TYPE_KARAKTERISTIEK":"G","MOGELIJKE_KAR_WAARDE":"","KARAKTERISTIEKEN":"Aantal te water(1-999)","PRIORITEIT":"","VOERTUIGSOORTEN":"1 DV-OVD[D] | 1 Redvoertuig[D] | 1 Tankautospuit[D] | 1 Waterongevallen voertuig[D]"},
  {"LABEL":"A RT-BASIS MARR VOOR MC *","null":null,"MC1":"","MC2":"","NAAM_KARAKTERISTIEK":"Leeftijd","TYPE_KARAKTERISTIEK":"G","MOGELIJKE_KAR_WAARDE":"","KARAKTERISTIEKEN":"Leeftijd ","PRIORITEIT":"","VOERTUIGSOORTEN":""},
  {"LABEL":"A RT-BASIS MARR VOOR MC *","null":null,"MC1":"Alarm","MC2":"","NAAM_KARAKTERISTIEK":"Soort Br Beheerssyst","TYPE_KARAKTERISTIEK":"O","MOGELIJKE_KAR_WAARDE":"Gasblussysteem","KARAKTERISTIEKEN":"Soort Br Beheerssyst Gasblussysteem","PRIORITEIT":"","VOERTUIGSOORTEN":"1 DV-OVD[D] | 1 DV-PR[4]"}
];

// Schrijf naar bestand
const outputPath = path.join(__dirname, '..', 'client', 'public', 'data', 'Inzetvoorstellen RT basis.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Bestand aangemaakt: ${outputPath}`);
console.log(`📊 Aantal items: ${data.length}`);

