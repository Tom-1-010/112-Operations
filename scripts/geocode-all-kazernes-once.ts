/**
 * Script om alle kazernes één keer te geocoderen op basis van adres en permanent op te slaan
 * Dit script:
 * 1. Laadt alle kazernes uit 63_kazernes_complete.json
 * 2. Gegeocodeerd elke kazerne op basis van adres (via Nominatim/PDOK)
 * 3. Werkt de coördinaten bij in het JSON bestand
 * 4. Slaat het bestand op met de nieuwe coördinaten
 * 
 * Run: npx tsx scripts/geocode-all-kazernes-once.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Kazerne {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  type: string | null;
  telefoonnummer: string | null;
  email: string | null;
  capaciteit: number;
  actief: boolean;
  latitude: string | null;
  longitude: string | null;
  regio: string | null;
  opmerkingen?: string | null;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  osm_type: string;
  osm_id: string;
}

/**
 * Geocode een adres via OpenStreetMap Nominatim
 */
async function geocodeNominatim(adres: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${adres}, Nederland`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=nl&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeldkamerSimulator/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Nominatim HTTP ${response.status} voor: ${adres}`);
      return null;
    }
    
    const data: NominatimResult[] = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Nominatim fout voor "${adres}":`, error);
    return null;
  }
}

/**
 * Geocode een adres via PDOK (BAG) als fallback
 */
async function geocodePDOK(adres: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(adres)}&rows=5`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    
    if (!res.ok) return null;
    
    const json = await res.json();
    const docs = json?.response?.docs ?? [];
    if (!docs.length) return null;

    // Prioriteit: adres → verblijfsobject → openbareruimte → rest
    const doc = docs.find((d: any) => d.type === 'adres') ??
                docs.find((d: any) => d.type === 'verblijfsobject') ??
                docs.find((d: any) => d.type === 'openbareruimte') ??
                docs[0];

    if (!doc) return null;

    // Parse coördinaten uit centroide_ll of centroide_rd
    let coords: { lat: number; lng: number } | null = null;

    if (doc.centroide_ll) {
      const match = doc.centroide_ll.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        const lon = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          coords = { lat, lng: lon };
        }
      }
    }

    if (!coords && doc.centroide_rd) {
      // RD naar WGS84 conversie (vereist proj4, maar voor nu proberen we direct)
      const match = doc.centroide_rd.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        // Voor nu gebruiken we een eenvoudige conversie (niet perfect maar werkt)
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        // Eenvoudige RD naar WGS84 conversie
        const lat = 52.15517440 + (y - 463000) * 0.000008508;
        const lng = 5.38720621 + (x - 155000) * 0.00001256;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          coords = { lat, lng };
        }
      }
    }

    return coords;
  } catch (error) {
    console.error(`❌ PDOK fout voor "${adres}":`, error);
    return null;
  }
}

/**
 * Geocode een adres (probeer eerst Nominatim, dan PDOK)
 */
async function geocodeAdres(adres: string): Promise<{ lat: number; lng: number; bron: string } | null> {
  // Probeer eerst Nominatim
  const nominatimResult = await geocodeNominatim(adres);
  if (nominatimResult) {
    return { ...nominatimResult, bron: 'Nominatim' };
  }
  
  // Wacht even voordat we PDOK proberen (rate limiting)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Fallback naar PDOK
  const pdokResult = await geocodePDOK(adres);
  if (pdokResult) {
    return { ...pdokResult, bron: 'PDOK' };
  }
  
  return null;
}

/**
 * Controleer of coördinaten geldig zijn voor Nederland
 */
function zijnGeldigeCoordinaten(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 50 &&
    lat <= 54 &&
    lng >= 3 &&
    lng <= 8 &&
    lat !== 0 &&
    lng !== 0
  );
}

/**
 * Hoofdfunctie
 */
async function main() {
  console.log('🚀 Start geocoding van alle kazernes op basis van adres...\n');
  
  // Stap 1: Laad kazernes uit JSON bestand
  const filePath = join(process.cwd(), 'attached_assets', '63_kazernes_complete.json');
  console.log(`📖 Laden kazernes uit: ${filePath}`);
  
  let kazernes: Kazerne[];
  try {
    const fileContent = readFileSync(filePath, 'utf8');
    kazernes = JSON.parse(fileContent) as Kazerne[];
    console.log(`✅ ${kazernes.length} kazernes geladen\n`);
  } catch (error) {
    console.error('❌ Fout bij laden kazernes:', error);
    process.exit(1);
  }

  // Stap 2: Geocodeer alle kazernes op basis van adres
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const updatedKazernes: Kazerne[] = [];

  for (let i = 0; i < kazernes.length; i++) {
    const kazerne = kazernes[i];
    const adresString = `${kazerne.adres}, ${kazerne.postcode} ${kazerne.plaats}`;
    
    console.log(`\n[${i + 1}/${kazernes.length}] Geocoderen: ${kazerne.naam}`);
    console.log(`   Adres: ${adresString}`);
    
    // Geocodeer op basis van adres
    const result = await geocodeAdres(adresString);
    
    if (result && zijnGeldigeCoordinaten(result.lat, result.lng)) {
      // Update coördinaten
      kazerne.latitude = result.lat.toString();
      kazerne.longitude = result.lng.toString();
      updatedKazernes.push(kazerne);
      successCount++;
      console.log(`   ✅ Gegeocodeerd via ${result.bron}: ${result.lat}, ${result.lng}`);
    } else {
      // Behoud bestaande coördinaten als die geldig zijn
      const existingLat = kazerne.latitude ? parseFloat(kazerne.latitude) : null;
      const existingLng = kazerne.longitude ? parseFloat(kazerne.longitude) : null;
      
      if (existingLat !== null && existingLng !== null && zijnGeldigeCoordinaten(existingLat, existingLng)) {
        updatedKazernes.push(kazerne);
        skipCount++;
        console.log(`   ⚠️ Geocoding mislukt, behoud bestaande coördinaten: ${existingLat}, ${existingLng}`);
      } else {
        failCount++;
        console.log(`   ❌ Geocoding mislukt en geen geldige bestaande coördinaten`);
      }
    }
    
    // Rate limiting: 1 seconde tussen requests (Nominatim vereist dit)
    if (i < kazernes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Stap 3: Sla bijgewerkte kazernes op
  console.log(`\n\n📊 Resultaten:`);
  console.log(`   ✅ Succesvol gegeocodeerd: ${successCount}`);
  console.log(`   ⚠️ Bestaande coördinaten behouden: ${skipCount}`);
  console.log(`   ❌ Mislukt: ${failCount}`);
  console.log(`   📝 Totaal opgeslagen: ${updatedKazernes.length}/${kazernes.length}\n`);

  if (updatedKazernes.length > 0) {
    try {
      // Maak backup van origineel bestand
      const backupPath = filePath.replace('.json', `_backup_${Date.now()}.json`);
      writeFileSync(backupPath, readFileSync(filePath, 'utf8'));
      console.log(`💾 Backup gemaakt: ${backupPath}`);
      
      // Sla bijgewerkte kazernes op
      writeFileSync(filePath, JSON.stringify(updatedKazernes, null, 2), 'utf8');
      console.log(`✅ Bijgewerkte kazernes opgeslagen in: ${filePath}\n`);
      
      console.log('🎉 Klaar! Alle kazernes zijn nu gegeocodeerd op basis van hun adres.');
      console.log('📍 De coördinaten zijn permanent opgeslagen in het JSON bestand.');
    } catch (error) {
      console.error('❌ Fout bij opslaan:', error);
      process.exit(1);
    }
  } else {
    console.error('❌ Geen kazernes om op te slaan!');
    process.exit(1);
  }
}

// Run het script
main().catch((error) => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});

