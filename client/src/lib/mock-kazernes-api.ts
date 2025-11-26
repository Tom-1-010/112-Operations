/**
 * Mock API voor kazernes data
 * Gebruikt lokale JSON data in plaats van Supabase
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

interface Voertuig {
  roepnummer: string;
  roepnummer_interregionaal: string;
  type: string;
  functie: string;
  bemanning: number | null;
  typenummer_lrnp: number | null;
  gms_omschrijving: string;
  criteria: string | null;
  opmerking: string | null;
}

interface KazerneWithVoertuigen extends Kazerne {
  voertuigen: Voertuig[];
}

/**
 * Laad kazernes data uit JSON bestand
 */
function loadKazernesData(): Kazerne[] {
  try {
    // Laad de complete dataset met 63 kazernes
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(process.cwd(), 'attached_assets', '63_kazernes_complete.json');
    
    if (fs.existsSync(filePath)) {
      const jsonData = fs.readFileSync(filePath, 'utf8');
      const kazernes = JSON.parse(jsonData) as Kazerne[];
      console.log(`✅ ${kazernes.length} kazernes geladen uit JSON bestand`);
      return kazernes;
    }
    
    // Fallback naar mock data als JSON bestand niet bestaat
    const mockKazernes: Kazerne[] = [
      {
        id: "kazerne-001",
        naam: "Brandweerkazerne Maassluis",
        adres: "Lange Boonestraat 12",
        postcode: "3141 AA",
        plaats: "Maassluis",
        type: "Beroeps",
        telefoonnummer: "010-5912345",
        email: "maassluis@brandweer.nl",
        capaciteit: 25,
        actief: true,
        latitude: "51.9208",
        longitude: "4.2508",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Maassluis"
      },
      {
        id: "kazerne-002",
        naam: "Brandweerkazerne Vlaardingen",
        adres: "Wilhelminaplein 1",
        postcode: "3132 AA",
        plaats: "Vlaardingen",
        type: "Beroeps",
        telefoonnummer: "010-5912346",
        email: "vlaardingen@brandweer.nl",
        capaciteit: 30,
        actief: true,
        latitude: "51.9056",
        longitude: "4.3292",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Vlaardingen"
      },
      {
        id: "kazerne-003",
        naam: "Brandweerkazerne Schiedam",
        adres: "Marktplein 15",
        postcode: "3111 AA",
        plaats: "Schiedam",
        type: "Beroeps",
        telefoonnummer: "010-5912347",
        email: "schiedam@brandweer.nl",
        capaciteit: 28,
        actief: true,
        latitude: "51.9194",
        longitude: "4.3889",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Schiedam"
      },
      {
        id: "kazerne-004",
        naam: "Brandweerkazerne Rotterdam Centrum",
        adres: "Stationsplein 8",
        postcode: "3013 AA",
        plaats: "Rotterdam",
        type: "Beroeps",
        telefoonnummer: "010-5912348",
        email: "rotterdam@brandweer.nl",
        capaciteit: 50,
        actief: true,
        latitude: "51.9225",
        longitude: "4.4792",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Rotterdam"
      },
      {
        id: "kazerne-005",
        naam: "Brandweerkazerne Spijkenisse",
        adres: "Parkweg 22",
        postcode: "3201 AA",
        plaats: "Spijkenisse",
        type: "Vrijwilligers",
        telefoonnummer: "010-5912349",
        email: "spijkenisse@brandweer.nl",
        capaciteit: 20,
        actief: true,
        latitude: "51.8450",
        longitude: "4.3292",
        regio: "Zuid-Holland",
        opmerkingen: "Vrijwilligerskazerne"
      },
      {
        id: "kazerne-006",
        naam: "Brandweerkazerne Capelle aan den IJssel",
        adres: "Centrumstraat 33",
        postcode: "2901 AA",
        plaats: "Capelle aan den IJssel",
        type: "Beroeps",
        telefoonnummer: "010-5912350",
        email: "capelle@brandweer.nl",
        capaciteit: 25,
        actief: true,
        latitude: "51.9292",
        longitude: "4.5781",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Capelle"
      },
      {
        id: "kazerne-007",
        naam: "Brandweerkazerne Ridderkerk",
        adres: "Stadhuisplein 1",
        postcode: "2981 AA",
        plaats: "Ridderkerk",
        type: "Vrijwilligers",
        telefoonnummer: "010-5912351",
        email: "ridderkerk@brandweer.nl",
        capaciteit: 18,
        actief: true,
        latitude: "51.8725",
        longitude: "4.6028",
        regio: "Zuid-Holland",
        opmerkingen: "Vrijwilligerskazerne"
      },
      {
        id: "kazerne-008",
        naam: "Brandweerkazerne Amsterdam Centrum",
        adres: "Damrak 1",
        postcode: "1012 AA",
        plaats: "Amsterdam",
        type: "Beroeps",
        telefoonnummer: "020-5912345",
        email: "amsterdam@brandweer.nl",
        capaciteit: 60,
        actief: true,
        latitude: "52.3676",
        longitude: "4.9041",
        regio: "Noord-Holland",
        opmerkingen: "Hoofdkazerne Amsterdam"
      },
      {
        id: "kazerne-009",
        naam: "Brandweerkazerne Den Haag",
        adres: "Spui 1",
        postcode: "2511 AA",
        plaats: "Den Haag",
        type: "Beroeps",
        telefoonnummer: "070-5912345",
        email: "denhaag@brandweer.nl",
        capaciteit: 45,
        actief: true,
        latitude: "52.0116",
        longitude: "4.3571",
        regio: "Zuid-Holland",
        opmerkingen: "Hoofdkazerne Den Haag"
      },
      {
        id: "kazerne-010",
        naam: "Brandweerkazerne Utrecht",
        adres: "Domplein 1",
        postcode: "3512 AA",
        plaats: "Utrecht",
        type: "Beroeps",
        telefoonnummer: "030-5912345",
        email: "utrecht@brandweer.nl",
        capaciteit: 40,
        actief: true,
        latitude: "52.0907",
        longitude: "5.1214",
        regio: "Utrecht",
        opmerkingen: "Hoofdkazerne Utrecht"
      },
      {
        id: "kazerne-011",
        naam: "Brandweerkazerne Eindhoven",
        adres: "Markt 1",
        postcode: "5611 AA",
        plaats: "Eindhoven",
        type: "Beroeps",
        telefoonnummer: "040-5912345",
        email: "eindhoven@brandweer.nl",
        capaciteit: 35,
        actief: true,
        latitude: "51.4416",
        longitude: "5.4697",
        regio: "Noord-Brabant",
        opmerkingen: "Hoofdkazerne Eindhoven"
      },
      {
        id: "kazerne-012",
        naam: "Brandweerkazerne Groningen",
        adres: "Grote Markt 1",
        postcode: "9712 AA",
        plaats: "Groningen",
        type: "Beroeps",
        telefoonnummer: "050-5912345",
        email: "groningen@brandweer.nl",
        capaciteit: 30,
        actief: true,
        latitude: "53.2194",
        longitude: "6.5665",
        regio: "Groningen",
        opmerkingen: "Hoofdkazerne Groningen"
      },
      {
        id: "kazerne-013",
        naam: "Brandweerkazerne Nijmegen",
        adres: "Grote Markt 1",
        postcode: "6511 AA",
        plaats: "Nijmegen",
        type: "Beroeps",
        telefoonnummer: "024-5912345",
        email: "nijmegen@brandweer.nl",
        capaciteit: 25,
        actief: true,
        latitude: "51.8426",
        longitude: "5.8597",
        regio: "Gelderland",
        opmerkingen: "Hoofdkazerne Nijmegen"
      },
      {
        id: "kazerne-014",
        naam: "Brandweerkazerne Arnhem",
        adres: "Markt 1",
        postcode: "6811 AA",
        plaats: "Arnhem",
        type: "Beroeps",
        telefoonnummer: "026-5912345",
        email: "arnhem@brandweer.nl",
        capaciteit: 28,
        actief: true,
        latitude: "51.9851",
        longitude: "5.8987",
        regio: "Gelderland",
        opmerkingen: "Hoofdkazerne Arnhem"
      },
      {
        id: "kazerne-015",
        naam: "Brandweerkazerne Enschede",
        adres: "Markt 1",
        postcode: "7511 AA",
        plaats: "Enschede",
        type: "Beroeps",
        telefoonnummer: "053-5912345",
        email: "enschede@brandweer.nl",
        capaciteit: 22,
        actief: true,
        latitude: "52.2215",
        longitude: "6.8937",
        regio: "Overijssel",
        opmerkingen: "Hoofdkazerne Enschede"
      }
    ];

    return mockKazernes;
  } catch (error) {
    console.error('❌ Fout bij laden kazernes data:', error);
    return [];
  }
}

/**
 * Genereer mock voertuigen voor een kazerne
 */
function generateMockVoertuigen(kazerneId: string): Voertuig[] {
  const voertuigen: Voertuig[] = [
    {
      roepnummer: `${kazerneId}-TS-01`,
      roepnummer_interregionaal: `${kazerneId}-TS-01`,
      type: 'TS',
      functie: 'Tankautospuit',
      bemanning: 3,
      typenummer_lrnp: 1,
      gms_omschrijving: 'Tankautospuit 2000L',
      criteria: 'Basisuitrusting',
      opmerking: null
    },
    {
      roepnummer: `${kazerneId}-RV-01`,
      roepnummer_interregionaal: `${kazerneId}-RV-01`,
      type: 'RV',
      functie: 'Reddingsvoertuig',
      bemanning: 2,
      typenummer_lrnp: 2,
      gms_omschrijving: 'Reddingsvoertuig',
      criteria: 'Redding',
      opmerking: null
    }
  ];

  // Voeg extra voertuigen toe voor grotere kazernes
  if (kazerneId.includes('rotterdam') || kazerneId.includes('amsterdam') || kazerneId.includes('denhaag')) {
    voertuigen.push(
      {
        roepnummer: `${kazerneId}-HTS-01`,
        roepnummer_interregionaal: `${kazerneId}-HTS-01`,
        type: 'HTS',
        functie: 'Hoogwerker',
        bemanning: 2,
        typenummer_lrnp: 3,
        gms_omschrijving: 'Hoogwerker 30m',
        criteria: 'Hoogwerker',
        opmerking: null
      },
      {
        roepnummer: `${kazerneId}-MP-01`,
        roepnummer_interregionaal: `${kazerneId}-MP-01`,
        type: 'MP',
        functie: 'Materieel/Personeel',
        bemanning: 4,
        typenummer_lrnp: 4,
        gms_omschrijving: 'Materieelwagen',
        criteria: 'Materieel',
        opmerking: null
      }
    );
  }

  return voertuigen;
}

/**
 * Haal alle kazernes op met hun voertuigen
 */
export function getKazernesWithVoertuigen(): KazerneWithVoertuigen[] {
  const kazernes = loadKazernesData();
  
  return kazernes.map(kazerne => ({
    ...kazerne,
    voertuigen: generateMockVoertuigen(kazerne.id)
  }));
}

/**
 * Haal een specifieke kazerne op
 */
export function getKazerneById(id: string): KazerneWithVoertuigen | null {
  const kazernes = getKazernesWithVoertuigen();
  return kazernes.find(k => k.id === id) || null;
}

/**
 * Haal kazernes op per type
 */
export function getKazernesByType(type: string): KazerneWithVoertuigen[] {
  const kazernes = getKazernesWithVoertuigen();
  return kazernes.filter(k => k.type === type);
}

/**
 * Haal kazernes op per regio
 */
export function getKazernesByRegio(regio: string): KazerneWithVoertuigen[] {
  const kazernes = getKazernesWithVoertuigen();
  return kazernes.filter(k => k.regio === regio);
}
