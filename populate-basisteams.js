import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { basisteams } from './shared/schema.js';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function populateBasisteams() {
  console.log('🚀 Populating basisteams...');

  try {
    // Define standard basisteams based on Rotterdam police structure
    const defaultBasisteams = [
      {
        id: 'A1',
        naam: 'Basisteam Waterweg (A1)',
        adres: 'Coolhaven 200, 3024 AN Rotterdam',
        polygon: [
          [51.9225, 4.4792],
          [51.9205, 4.4826],
          [51.9185, 4.4810],
          [51.9195, 4.4776],
          [51.9225, 4.4792]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 15,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'A2',
        naam: 'Basisteam Schiedam (A2)',
        adres: 'Hargalaan 4, 3118 JA Schiedam',
        polygon: [
          [51.9177, 4.3892],
          [51.9157, 4.3926],
          [51.9137, 4.3910],
          [51.9147, 4.3876],
          [51.9177, 4.3892]
        ],
        gemeentes: ['Schiedam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 12,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'A3',
        naam: 'Basisteam Midden-Schieland (A3)',
        adres: 'Westvest 5, 2641 AX Pijnacker',
        polygon: [
          [52.0177, 4.4292],
          [52.0157, 4.4326],
          [52.0137, 4.4310],
          [52.0147, 4.4276],
          [52.0177, 4.4292]
        ],
        gemeentes: ['Pijnacker-Nootdorp', 'Lansingerland'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 10,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'B1',
        naam: 'Basisteam Delfshaven (B1)',
        adres: 'Schiedamseweg 110, 3025 AG Rotterdam',
        polygon: [
          [51.9277, 4.4692],
          [51.9257, 4.4726],
          [51.9237, 4.4710],
          [51.9247, 4.4676],
          [51.9277, 4.4692]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 18,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'B2',
        naam: 'Basisteam Centrum (B2)',
        adres: 'Doelwater 2, 3011 TA Rotterdam',
        polygon: [
          [51.9225, 4.4792],
          [51.9205, 4.4826],
          [51.9185, 4.4810],
          [51.9195, 4.4776],
          [51.9225, 4.4792]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 20,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'DISTRICT_STAD',
        naam: 'District Stad',
        adres: 'Doelwater 2, 3011 TA Rotterdam',
        polygon: [
          [51.9325, 4.4892],
          [51.9305, 4.4926],
          [51.9285, 4.4910],
          [51.9295, 4.4876],
          [51.9325, 4.4892]
        ],
        gemeentes: ['Rotterdam'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 5,
          zichtbaar_op_kaart: true
        }
      },
      {
        id: 'DISTRICT_RIJNMOND_NOORD',
        naam: 'District Rijnmond-Noord',
        adres: 'Stationsplein 1, 3111 CB Schiedam',
        polygon: [
          [51.9577, 4.4292],
          [51.9557, 4.4326],
          [51.9537, 4.4310],
          [51.9547, 4.4276],
          [51.9577, 4.4292]
        ],
        gemeentes: ['Schiedam', 'Vlaardingen', 'Maassluis'],
        actief: true,
        instellingen: {
          kan_inzetten_buiten_gebied: true,
          max_aantal_eenheden: 8,
          zichtbaar_op_kaart: true
        }
      }
    ];

    // Insert basisteams
    for (const basisteam of defaultBasisteams) {
      try {
        await pool.query(`
          INSERT INTO basisteams (id, naam, adres, polygon, gemeentes, actief, instellingen, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (id) 
          DO UPDATE SET 
            naam = EXCLUDED.naam,
            adres = EXCLUDED.adres,
            polygon = EXCLUDED.polygon,
            gemeentes = EXCLUDED.gemeentes,
            actief = EXCLUDED.actief,
            instellingen = EXCLUDED.instellingen,
            updated_at = NOW()
        `, [
          basisteam.id,
          basisteam.naam,
          basisteam.adres,
          JSON.stringify(basisteam.polygon),
          basisteam.gemeentes,
          basisteam.actief,
          JSON.stringify(basisteam.instellingen)
        ]);

        console.log(`✅ Added/updated basisteam: ${basisteam.naam} (${basisteam.id})`);
      } catch (error) {
        console.error(`❌ Error with basisteam ${basisteam.id}:`, error);
      }
    }

    // Verify insertion
    const result = await pool.query('SELECT COUNT(*) FROM basisteams');
    console.log(`✅ Total basisteams in database: ${result.rows[0].count}`);

    console.log('🎉 Basisteams population complete!');

  } catch (error) {
    console.error('❌ Error populating basisteams:', error);
  } finally {
    await pool.end();
  }
}

populateBasisteams();