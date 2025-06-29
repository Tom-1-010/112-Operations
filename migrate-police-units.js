
const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Default police units data (from the original file)
const defaultPoliceUnitsData = [
  {
    roepnummer: "RT 11.01",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.02",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.03",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.04",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.05",
    aantal_mensen: 2,
    rollen: ["Noodhulp"],
    soort_auto: "BPV - bus",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.09",
    aantal_mensen: 1,
    rollen: ["Senior", "ACO"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.10",
    aantal_mensen: 1,
    rollen: ["Opr. Expert", "OPCO"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.16",
    aantal_mensen: 2,
    rollen: ["Noodhulp", "Onopvallend"],
    soort_auto: "BPV-onopvallend",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.21",
    aantal_mensen: 1,
    rollen: ["Noodhulp", "Motor"],
    soort_auto: "BPV-motor",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.26",
    aantal_mensen: 2,
    rollen: ["Voet/fiets"],
    soort_auto: "Fiets",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.34",
    aantal_mensen: 3,
    rollen: ["Noodhulp", "Studenten"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.50",
    aantal_mensen: 1,
    rollen: ["Opsporing"],
    soort_auto: "BPV-onopvallend",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.60",
    aantal_mensen: 1,
    rollen: ["Wijkagent"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.95",
    aantal_mensen: 1,
    rollen: ["Reisnummer"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  },
  {
    roepnummer: "RT 11.99",
    aantal_mensen: 1,
    rollen: ["teamchef"],
    soort_auto: "BPV-auto",
    team: "Basisteam Waterweg (A1)",
    status: "5 - Afmelden"
  }
];

async function migratePoliceUnits() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_units (
        id SERIAL PRIMARY KEY,
        roepnummer TEXT UNIQUE NOT NULL,
        aantal_mensen INTEGER NOT NULL DEFAULT 2,
        rollen JSONB NOT NULL,
        soort_auto TEXT NOT NULL,
        team TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '5 - Afmelden',
        locatie TEXT,
        incident TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Clear existing data
    await pool.query('DELETE FROM police_units');

    // Insert default data
    for (const unit of defaultPoliceUnitsData) {
      await pool.query(`
        INSERT INTO police_units (roepnummer, aantal_mensen, rollen, soort_auto, team, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (roepnummer) DO NOTHING
      `, [
        unit.roepnummer,
        unit.aantal_mensen,
        JSON.stringify(unit.rollen),
        unit.soort_auto,
        unit.team,
        unit.status
      ]);
    }

    console.log(`✅ Successfully migrated ${defaultPoliceUnitsData.length} police units to database`);
    
    // Verify migration
    const result = await pool.query('SELECT COUNT(*) FROM police_units');
    console.log(`📊 Total units in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migratePoliceUnits();
