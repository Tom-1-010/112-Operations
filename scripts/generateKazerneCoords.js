import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Haalt geografische coördinaten op via PDOK/BAG API (eerste keuze)
 * @param {string} adres - Het adres om te geocoderen
 * @param {string} postcode - Optionele postcode
 * @param {string} plaats - Optionele plaatsnaam
 * @returns {Promise<{lat: number, lon: number, bron: string} | null>}
 */
async function getCoordsPDOK(adres, postcode = '', plaats = '') {
  // Bouw een volledig adres op
  let volledigAdres = adres;
  if (postcode) {
    volledigAdres += `, ${postcode}`;
  }
  if (plaats) {
    volledigAdres += `, ${plaats}`;
  }

  const encodedAddress = encodeURIComponent(volledigAdres);
  const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodedAddress}&rows=1&fq=type:adres&fl=id,weergavenaam,straatnaam,huisnummer,postcode,woonplaatsnaam,centroide_ll&sort=score desc`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MeldkamerSimulator/1.0',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    
    if (data.response?.docs && data.response.docs.length > 0) {
      const result = data.response.docs[0];
      
      // Parse coördinaten uit centroide_ll (format: "POINT(lon lat)" of "lon,lat")
      if (result.centroide_ll) {
        let lat, lon;
        
        // Probeer POINT(lon lat) formaat
        const pointMatch = result.centroide_ll.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (pointMatch) {
          lon = parseFloat(pointMatch[1]);
          lat = parseFloat(pointMatch[2]);
        } else {
          // Probeer "lon,lat" formaat
          const coords = result.centroide_ll.split(',');
          if (coords.length === 2) {
            lon = parseFloat(coords[0].trim());
            lat = parseFloat(coords[1].trim());
          }
        }
        
        if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
          return {
            lat: lat,
            lon: lon,
            bron: 'PDOK'
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Haalt geografische coördinaten op via OpenStreetMap Nominatim API (fallback)
 * @param {string} adres - Het adres om te geocoderen
 * @param {string} postcode - Optionele postcode
 * @param {string} plaats - Optionele plaatsnaam
 * @returns {Promise<{lat: number, lon: number, bron: string} | null>}
 */
async function getCoordsNominatim(adres, postcode = '', plaats = '') {
  // Bouw een volledig adres op
  let volledigAdres = adres;
  if (postcode) {
    volledigAdres += `, ${postcode}`;
  }
  if (plaats) {
    volledigAdres += `, ${plaats}`;
  }
  volledigAdres += ', Nederland';

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(volledigAdres)}&limit=1&countrycodes=nl`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MeldkamerSimulator/1.0 (Contact: brandweer@example.com)'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        bron: 'Nominatim'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Haalt geografische coördinaten op (probeert eerst PDOK, dan Nominatim)
 * @param {string} adres - Het adres om te geocoderen
 * @param {string} postcode - Optionele postcode
 * @param {string} plaats - Optionele plaatsnaam
 * @returns {Promise<{lat: number, lon: number, bron: string} | null>}
 */
async function getCoords(adres, postcode = '', plaats = '') {
  // Probeer eerst PDOK/BAG API
  const pdokResult = await getCoordsPDOK(adres, postcode, plaats);
  if (pdokResult) {
    return pdokResult;
  }
  
  // Fallback naar Nominatim/OSM
  const nominatimResult = await getCoordsNominatim(adres, postcode, plaats);
  if (nominatimResult) {
    return nominatimResult;
  }
  
  return null;
}

/**
 * Hoofdfunctie die alle kazernes bijwerkt met coördinaten
 * ALTIJD op basis van het adres, ongeacht of er al coördinaten zijn
 */
async function updateKazernes() {
  const filePath = join(__dirname, '../attached_assets/63_kazernes_complete.json');
  
  try {
    // Lees het JSON-bestand
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    if (!Array.isArray(jsonData)) {
      throw new Error('JSON-bestand bevat geen array van kazernes');
    }

    let updated = 0;
    let failed = 0;
    const total = jsonData.length;

    console.log(`\n🔍 Starten met bijwerken van ${total} kazernes...`);
    console.log(`📍 ALTIJD coördinaten ophalen op basis van adres (PDOK/BAG of OSM)\n`);

    // Loop door alle kazernes
    for (let i = 0; i < jsonData.length; i++) {
      const kazerne = jsonData[i];
      const nummer = `${i + 1}/${total}`;

      // Haal ALTIJD coördinaten op op basis van het adres
      const adres = kazerne.adres || '';
      const postcode = kazerne.postcode || '';
      const plaats = kazerne.plaats || '';

      if (!adres) {
        console.warn(`⚠️  [${nummer}] ${kazerne.naam || kazerne.id} heeft geen adres.`);
        failed++;
        continue;
      }

      // Toon welke kazerne wordt verwerkt
      const oudeLat = kazerne.latitude || 'geen';
      const oudeLon = kazerne.longitude || 'geen';
      console.log(`🔄 [${nummer}] ${kazerne.naam || kazerne.id}`);
      console.log(`   Adres: ${adres}, ${postcode} ${plaats}`);
      console.log(`   Oude coördinaten: ${oudeLat}, ${oudeLon}`);

      // Haal nieuwe coördinaten op via PDOK/BAG of OSM
      const coords = await getCoords(adres, postcode, plaats);

      if (coords) {
        // Overschrijf altijd met nieuwe coördinaten op basis van adres
        kazerne.latitude = coords.lat.toString();
        kazerne.longitude = coords.lon.toString();
        updated++;
        console.log(`   ✅ Nieuwe coördinaten (${coords.bron}): ${coords.lat}, ${coords.lon}`);
      } else {
        console.warn(`   ⚠️  Geen coördinaten gevonden voor: ${kazerne.naam || kazerne.id} (${adres})`);
        failed++;
      }

      console.log(''); // Lege regel voor leesbaarheid

      // Wacht tussen requests om rate limits te respecteren
      // PDOK heeft geen strikte rate limit, maar Nominatim vraagt minimaal 1 seconde
      if (i < jsonData.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Schrijf de geüpdatete gegevens terug naar het bestand
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');

    // Toon samenvatting
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Samenvatting:`);
    console.log(`   ✅ Bijgewerkt: ${updated}`);
    console.log(`   ⚠️  Mislukt: ${failed}`);
    console.log(`   📝 Totaal: ${total}`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`✨ Klaar! Bestand opgeslagen: ${filePath}`);
    console.log(`📍 Alle coördinaten zijn nu opgehaald op basis van het adres via PDOK/BAG of OSM API\n`);

  } catch (error) {
    console.error('❌ Fout bij bijwerken van kazernes:', error);
    process.exit(1);
  }
}

// Voer de functie uit
updateKazernes().catch(error => {
  console.error('❌ Onverwachte fout:', error);
  process.exit(1);
});

