/**
 * Script om kazernes data te laden uit JSON bestand
 * Dit script laadt de kazernes data en toont deze op de kaart
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Kazerne {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string;
  telefoonnummer?: string;
  email?: string;
  capaciteit: number;
  actief: boolean;
  latitude: string;
  longitude: string;
  regio: string;
  opmerkingen?: string;
}

/**
 * Laad kazernes data uit JSON bestand
 */
function loadKazernesData(): Kazerne[] {
  try {
    const filePath = join(process.cwd(), 'attached_assets', 'kazernes_nederland.json');
    const jsonData = readFileSync(filePath, 'utf8');
    const kazernes = JSON.parse(jsonData) as Kazerne[];
    
    console.log(`✅ ${kazernes.length} kazernes geladen uit JSON bestand`);
    return kazernes;
  } catch (error) {
    console.error('❌ Fout bij laden kazernes data:', error);
    return [];
  }
}

/**
 * Toon statistieken van kazernes
 */
function showKazernesStats(kazernes: Kazerne[]) {
  console.log('\n📊 Kazernes Statistieken:');
  
  // Groepeer per type
  const byType = kazernes.reduce((acc, k) => {
    acc[k.type] = (acc[k.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📋 Breakdown per type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} kazernes`);
  });
  
  // Groepeer per regio
  const byRegio = kazernes.reduce((acc, k) => {
    acc[k.regio] = (acc[k.regio] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n🗺️  Breakdown per regio:');
  Object.entries(byRegio).forEach(([regio, count]) => {
    console.log(`   ${regio}: ${count} kazernes`);
  });
  
  // Totaal capaciteit
  const totaalCapaciteit = kazernes.reduce((acc, k) => acc + k.capaciteit, 0);
  console.log(`\n👥 Totaal capaciteit: ${totaalCapaciteit} personen`);
  
  // Actieve kazernes
  const actieveKazernes = kazernes.filter(k => k.actief).length;
  console.log(`✅ Actieve kazernes: ${actieveKazernes}/${kazernes.length}`);
}

/**
 * Toon alle kazernes met details
 */
function showKazernesDetails(kazernes: Kazerne[]) {
  console.log('\n📋 Alle Kazernes:');
  console.log('=' .repeat(80));
  
  kazernes.forEach((kazerne, index) => {
    console.log(`\n${index + 1}. ${kazerne.naam}`);
    console.log(`   Type: ${kazerne.type}`);
    console.log(`   Adres: ${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`);
    console.log(`   Regio: ${kazerne.regio}`);
    console.log(`   Capaciteit: ${kazerne.capaciteit} personen`);
    console.log(`   Status: ${kazerne.actief ? 'Actief' : 'Inactief'}`);
    console.log(`   Coördinaten: ${kazerne.latitude}, ${kazerne.longitude}`);
    if (kazerne.telefoonnummer) {
      console.log(`   Telefoon: ${kazerne.telefoonnummer}`);
    }
    if (kazerne.email) {
      console.log(`   Email: ${kazerne.email}`);
    }
    if (kazerne.opmerkingen) {
      console.log(`   Opmerkingen: ${kazerne.opmerkingen}`);
    }
  });
}

/**
 * Exporteer kazernes data voor gebruik in applicatie
 */
function exportKazernesForApp(kazernes: Kazerne[]) {
  // Voeg mock voertuigen toe voor demonstratie
  const kazernesWithVoertuigen = kazernes.map(kazerne => ({
    ...kazerne,
    voertuigen: [
      {
        roepnummer: `${kazerne.id}-TS-01`,
        roepnummer_interregionaal: `${kazerne.id}-TS-01`,
        type: 'TS',
        functie: 'Tankautospuit',
        bemanning: 3,
        typenummer_lrnp: 1,
        gms_omschrijving: 'Tankautospuit 2000L',
        criteria: 'Basisuitrusting',
        opmerking: null
      },
      {
        roepnummer: `${kazerne.id}-RV-01`,
        roepnummer_interregionaal: `${kazerne.id}-RV-01`,
        type: 'RV',
        functie: 'Reddingsvoertuig',
        bemanning: 2,
        typenummer_lrnp: 2,
        gms_omschrijving: 'Reddingsvoertuig',
        criteria: 'Redding',
        opmerking: null
      }
    ]
  }));
  
  return kazernesWithVoertuigen;
}

/**
 * Hoofdfunctie
 */
function main() {
  console.log('🚀 Laden van kazernes data...\n');
  
  // Laad kazernes data
  const kazernes = loadKazernesData();
  
  if (kazernes.length === 0) {
    console.log('❌ Geen kazernes data gevonden');
    return;
  }
  
  // Toon statistieken
  showKazernesStats(kazernes);
  
  // Toon details
  showKazernesDetails(kazernes);
  
  // Export voor applicatie
  const kazernesForApp = exportKazernesForApp(kazernes);
  
  console.log('\n🎉 Kazernes data succesvol geladen!');
  console.log(`📊 ${kazernes.length} kazernes met ${kazernesForApp.reduce((acc, k) => acc + k.voertuigen.length, 0)} voertuigen`);
  console.log('\n💡 Deze data kan nu gebruikt worden in de kaart applicatie.');
}

// Run het script
main();
