import type { Express } from "express";
import { createServer, type Server } from "http";
import { db, pool } from "./db";
import { 
  incidents, 
  insertIncidentSchema, 
  gmsIncidents, 
  insertGmsIncidentSchema,
  phoneNumbers,
  insertPhoneNumberSchema,
  karakteristieken,
  insertKarakteristiekSchema,
  policeUnits,
  basisteams,
  insertBasisteamSchema,
  updateBasisteamSchema
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  // Load LMC classifications from JSON file
  app.get("/api/lmc-classifications", (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'attached_assets', 'LMC_classificaties_1750171129152.json');
      const data = fs.readFileSync(filePath, 'utf8');
      const classifications = JSON.parse(data);
      res.json(classifications);
    } catch (error) {
      console.error('Error loading LMC classifications:', error);
      res.status(500).json({ error: 'Failed to load LMC classifications' });
    }
  });
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Phone numbers routes
  app.get("/api/phone-numbers", async (req, res) => {
    try {
      const allPhoneNumbers = await db.select().from(phoneNumbers);
      res.json(allPhoneNumbers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phone numbers" });
    }
  });

  app.post("/api/phone-numbers", async (req, res) => {
    try {
      const phoneNumberData = insertPhoneNumberSchema.parse(req.body);
      const [newPhoneNumber] = await db
        .insert(phoneNumbers)
        .values(phoneNumberData)
        .returning();
      res.json(newPhoneNumber);
    } catch (error) {
      res.status(400).json({ error: "Invalid phone number data" });
    }
  });

  app.delete("/api/phone-numbers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete phone number" });
    }
  });

  // GMS incidents routes
  // Get all GMS incidents
  app.get("/api/gms-incidents", async (req, res) => {
    try {
      const allGmsIncidents = await db.select().from(gmsIncidents).orderBy(desc(gmsIncidents.aangemaaktOp)).catch(() => []);
      res.json(allGmsIncidents);
    } catch (error) {
      console.error("Error fetching GMS incidents:", error);
      res.json([]); // Return empty array instead of error
    }
  });

  // Get single GMS incident
  app.get("/api/gms-incidents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid incident ID" });
      }

      const [gmsIncident] = await db
        .select()
        .from(gmsIncidents)
        .where(eq(gmsIncidents.id, id))
        .catch(() => []);

      if (!gmsIncident) {
        return res.status(404).json({ error: "GMS incident not found" });
      }
      res.json(gmsIncident);
    } catch (error) {
      console.error("Error fetching GMS incident:", error);
      res.status(500).json({ error: "Failed to fetch GMS incident" });
    }
  });

  // Create new GMS incident
  app.post("/api/gms-incidents", async (req, res) => {
    try {
      // Create incident with basic validation
      const incidentData = {
        melderNaam: req.body.melderNaam || "",
        melderAdres: req.body.melderAdres || "",
        telefoonnummer: req.body.telefoonnummer || "",
        straatnaam: req.body.straatnaam || "",
        huisnummer: req.body.huisnummer || "",
        toevoeging: req.body.toevoeging || "",
        postcode: req.body.postcode || "",
        plaatsnaam: req.body.plaatsnaam || "",
        gemeente: req.body.gemeente || "",
        mc1: req.body.mc1 || "",
        mc2: req.body.mc2 || "",
        mc3: req.body.mc3 || "",
        tijdstip: req.body.tijdstip || new Date().toISOString(),
        prioriteit: req.body.prioriteit || 3,
        status: req.body.status || "Nieuw",
        meldingslogging: req.body.meldingslogging || "",
        notities: req.body.notities || ""
      };

      const [newGmsIncident] = await db
        .insert(gmsIncidents)
        .values(incidentData)
        .returning()
        .catch((error) => {
          console.error("Database insert error:", error);
          throw error;
        });

      res.json(newGmsIncident);
    } catch (error) {
      console.error("Error creating GMS incident:", error);
      res.status(400).json({ error: "Failed to create GMS incident" });
    }
  });

  app.put("/api/gms-incidents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Handle the data more flexibly to support assigned units
      const incidentData = {
        melderNaam: req.body.melderNaam || "",
        melderAdres: req.body.melderAdres || "",
        telefoonnummer: req.body.telefoonnummer || "",
        straatnaam: req.body.straatnaam || "",
        huisnummer: req.body.huisnummer || "",
        toevoeging: req.body.toevoeging || "",
        postcode: req.body.postcode || "",
        plaatsnaam: req.body.plaatsnaam || "",
        gemeente: req.body.gemeente || "",
        mc1: req.body.mc1 || "",
        mc2: req.body.mc2 || "",
        mc3: req.body.mc3 || "",
        tijdstip: req.body.tijdstip || new Date().toISOString(),
        prioriteit: req.body.prioriteit || 3,
        status: req.body.status || "Nieuw",
        meldingslogging: req.body.meldingslogging || "",
        notities: req.body.notities || "",
        assignedUnits: req.body.assignedUnits || []
      };

      const [updatedGmsIncident] = await db
        .update(gmsIncidents)
        .set(incidentData)
        .where(eq(gmsIncidents.id, id))
        .returning();

      if (!updatedGmsIncident) {
        return res.status(404).json({ error: "GMS incident not found" });
      }

      console.log(`Updated incident ${id} with ${incidentData.assignedUnits.length} assigned units`);
      res.json(updatedGmsIncident);
    } catch (error) {
      console.error("Error updating GMS incident:", error);
      res.status(400).json({ error: "Failed to update GMS incident" });
    }
  });

  app.delete("/api/gms-incidents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(gmsIncidents).where(eq(gmsIncidents.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete GMS incident" });
    }
  });

  // BAG API proxy endpoint
  app.get('/api/bag/search', async (req, res) => {
    try {
      const query = req.query.q;
      const limit = req.query.limit || '20';

      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const encodedQuery = encodeURIComponent(query);
      // Use the correct PDOK Locatieserver endpoint for address search
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodedQuery}&rows=${limit}&fq=type:adres`;

      console.log(`[BAG API] Searching for: "${query}" - URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });

      if (!response.ok) {
        console.error(`[BAG API] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `BAG API returned status ${response.status}` });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`[BAG API] Non-JSON response: ${textResponse.substring(0, 200)}`);
        return res.status(500).json({ error: 'BAG API returned non-JSON response' });
      }

      const data = await response.json();

      console.log(`[BAG API] Found ${data.response?.docs?.length || 0} results`);

      // Transform PDOK response to match expected format
      const transformedData = {
        features: (data.response?.docs || []).map((doc: any) => ({
          properties: {
            straatnaam: doc.straatnaam,
            huisnummer: doc.huisnummer,
            huisletter: doc.huisletter || '',
            huisnummertoevoeging: doc.huisnummertoevoeging || '',
            postcode: doc.postcode,
            plaatsnaam: doc.woonplaatsnaam,
            gemeentenaam: doc.gemeentenaam
          }
        }))
      };

      res.json(transformedData);
    } catch (error) {
      console.error('[BAG API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch from BAG API' });
    }
  });

  // Test endpoint for BAG API debugging
  app.get('/api/bag/test', async (req, res) => {
    try {
      const testQuery = 'Rotterdam Kleiweg';
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(testQuery)}&rows=5&fq=type:adres`;

      console.log(`[BAG API TEST] Testing with URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });

      const responseText = await response.text();
      console.log(`[BAG API TEST] Response status: ${response.status}`);
      console.log(`[BAG API TEST] Response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`[BAG API TEST] Response body (first 500 chars):`, responseText.substring(0, 500));

      try {
        const data = JSON.parse(responseText);
        res.json({
          status: 'success',
          url: url,
          responseStatus: response.status,
          data: data,
          features: data.features?.length || 0
        });
      } catch (parseError) {
        res.json({
          status: 'parse_error',
          url: url,
          responseStatus: response.status,
          responseText: responseText.substring(0, 1000),
          parseError: parseError.message
        });
      }
    } catch (error) {
      res.status(500).json({
        status: 'fetch_error',
        error: error.message
      });
    }
  });

  // Karakteristieken endpoints
  app.get("/api/karakteristieken", async (req, res) => {
    try {
      console.log('Fetching karakteristieken from database...');
      const allKarakteristieken = await db.select().from(karakteristieken);
      console.log(`Found ${allKarakteristieken.length} karakteristieken in database`);

      // Transform to match expected format with proper field mapping
      const formattedKarakteristieken = allKarakteristieken.map(k => ({
        ktNaam: k.ktNaam || k.kt_naam || '',
        ktType: k.ktType || k.kt_type || '', 
        ktWaarde: k.ktWaarde || k.kt_waarde || '',
        ktCode: k.ktCode || k.kt_code || '',
        ktParser: k.ktParser || k.kt_paser || k.kt_parser || ''
      }));

      console.log(`Returning ${formattedKarakteristieken.length} formatted karakteristieken`);
      console.log('Sample karakteristiek:', formattedKarakteristieken[0] || 'No data');
      res.json(formattedKarakteristieken);
    } catch (error) {
      console.error("Error fetching karakteristieken:", error);
      res.status(500).json({ error: "Failed to fetch karakteristieken" });
    }
  });

  app.post("/api/karakteristieken", async (req, res) => {
    try {
      const karakteristiekData = insertKarakteristiekSchema.parse(req.body);
      const [newKarakteristiek] = await db.insert(karakteristieken).values(karakteristiekData).returning();
      res.json(newKarakteristiek);
    } catch (error) {
      res.status(400).json({ error: "Invalid karakteristiek data" });
    }
  });

  app.post("/api/karakteristieken/bulk", async (req, res) => {
    try {
      const karakteristiekenData = req.body;
      const newKarakteristieken = await db.insert(karakteristieken).values(karakteristiekenData).returning();
      res.json(newKarakteristieken);
    } catch (error) {
      console.error("Error creating karakteristieken:", error);
      res.status(400).json({ error: "Failed to create karakteristieken" });
    }
  });

  app.get("/api/import-karakteristieken", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      console.log('Starting karakteristieken import via GET API...');

      // Use the newest complete karakteristieken file
      const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_volledig_1750370790422.json');

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Karakteristieken file not found' });
      }

      const jsonData = fs.readFileSync(filePath, 'utf8');
      // Fix NaN values in JSON before parsing
      const fixedJsonData = jsonData.replace(/:\s*NaN/g, ': null');
      const karakteristiekenData = JSON.parse(fixedJsonData);

      console.log(`📊 Found ${karakteristiekenData.length} karakteristieken to import`);

      // Clear existing data
      await db.delete(karakteristieken);
      console.log('🗑️ Cleared existing karakteristieken');

      // Transform data to match schema
      const transformedData = karakteristiekenData.map(item => ({
        ktNaam: item['kt_naam'] || item['kt-naam'],
        ktType: item['kt_type'] || item['kt-type'],
        ktWaarde: item['kt_waarde'] === null || item['kt_waarde'] === undefined || 
                   (typeof item['kt_waarde'] === 'number' && isNaN(item['kt_waarde'])) ? null : String(item['kt_waarde']),
        ktCode: item['kt_code'] === null || item['kt_code'] === undefined || 
                (typeof item['kt_code'] === 'number' && isNaN(item['kt_code'])) ? null : String(item['kt_code']),
        ktParser: item['kt_parser'] || item['kt-paser']
      }));

      // Insert new data in batches
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        await db.insert(karakteristieken).values(batch);
        imported += batch.length;
        console.log(`📥 Imported ${imported}/${transformedData.length} karakteristieken`);
      }

      // Verify import
      const count = await db.select().from(karakteristieken);
      console.log(`✅ Successfully imported ${count.length} karakteristieken to database`);

      res.json({ 
        success: true, 
        imported: count.length,
        message: `Successfully imported ${count.length} karakteristieken` 
      });

    } catch (error) {
      console.error('Error importing karakteristieken:', error);
      res.status(500).json({ error: 'Failed to import karakteristieken' });
    }
  });

  app.post("/api/import-karakteristieken", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      console.log('Starting karakteristieken import via POST API...');

      // Use the newest complete karakteristieken file
      const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_volledig_1750370790422.json');

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Karakteristieken file not found' });
      }

      const jsonData = fs.readFileSync(filePath, 'utf8');
      // Fix NaN values in JSON before parsing  
      const fixedJsonData = jsonData.replace(/:\s*NaN/g, ': null');
      const karakteristiekenData = JSON.parse(fixedJsonData);

      console.log(`📊 Found ${karakteristiekenData.length} karakteristieken to import`);

      // Clear existing data
      await db.delete(karakteristieken);
      console.log('🗑️ Cleared existing karakteristieken');

      // Transform data to match schema
      const transformedData = karakteristiekenData.map(item => ({
        ktNaam: item['kt_naam'] || item['kt-naam'],
        ktType: item['kt_type'] || item['kt-type'],
        ktWaarde: item['kt_waarde'] === null || item['kt_waarde'] === undefined || 
                   (typeof item['kt_waarde'] === 'number' && isNaN(item['kt_waarde'])) ? null : String(item['kt_waarde']),
        ktCode: item['kt_code'] === null || item['kt_code'] === undefined || 
                (typeof item['kt_code'] === 'number' && isNaN(item['kt_code'])) ? null : String(item['kt_code']),
        ktParser: item['kt_parser'] || item['kt-paser']
      }));

      // Insert new data in batches
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        await db.insert(karakteristieken).values(batch);
        imported += batch.length;
        console.log(`Imported ${imported}/${transformedData.length} karakteristieken`);
      }

      // Verify import
      const count = await db.select().from(karakteristieken);
      console.log(`Successfully imported ${count.length} karakteristieken to database`);

      res.json({ 
        success: true, 
        imported: count.length,
        message: `Successfully imported ${count.length} karakteristieken` 
      });

    } catch (error) {
      console.error('Error importing karakteristieken:', error);
      res.status(500).json({ error: 'Failed to import karakteristieken' });
    }
  });

  // Create police units table
  app.post("/api/police-units/create-table", async (req, res) => {
    try {
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
      console.log('✅ Police units table created successfully');
      res.json({ success: true, message: 'Police units table created' });
    } catch (error) {
      console.error('Error creating police units table:', error);
      res.status(500).json({ error: 'Failed to create police units table' });
    }
  });

  // Police units routes
  app.get("/api/police-units", async (req, res) => {
    try {
      const units = await db.select().from(policeUnits).orderBy(policeUnits.roepnummer);
      return res.json(units);
    } catch (error) {
        console.error("Error fetching police units:", error);
        return res.status(500).json({ error: "Failed to fetch police units" });
    }
  });

  app.post("/api/police-units", async (req, res) => {
    try {
      const body = req.body;
      const [newUnit] = await db.insert(policeUnits).values(body).returning();
      return res.json(newUnit);
    } catch (error) {
        console.error("Error creating police unit:", error);
        return res.status(400).json({ error: "Invalid police unit data" });
    }
  });

  app.put("/api/police-units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;

      // Remove timestamp fields and let the database handle them
      const { createdAt, updatedAt, ...updateData } = body;

      const [updatedUnit] = await db
        .update(policeUnits)
        .set(updateData)
        .where(eq(policeUnits.id, id))
        .returning();
      return res.json(updatedUnit);
    } catch (error) {
        console.error("Error updating police unit:", error);
        return res.status(400).json({ error: "Failed to update police unit" });
    }
  });

  app.delete("/api/police-units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(policeUnits).where(eq(policeUnits.id, id));
      return res.json({ success: true });
    } catch (error) {
        console.error("Error deleting police unit:", error);
        return res.status(500).json({ error: "Failed to delete police unit" });
    }
  });

  // Import police units data
  app.post("/api/police-units/import", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      console.log('🚀 Starting import of police units...');

      // Load the team data from JSON file
      const filePath = path.join(process.cwd(), 'attached_assets', 'rooster_eenheden_per_team_detailed_1751227112307.json');

      let unitsToImport = [];

      if (fs.existsSync(filePath)) {
        const teamsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Process each team and convert to police units
        for (const [teamName, units] of Object.entries(teamsData)) {
          for (const unit of units) {
            let status = unit.primair ? "1 - Beschikbaar/vrij" : "5 - Afmelden";

            // Special handling for RT 11 team - only specific units are primair
            if (unit.roepnummer && unit.roepnummer.startsWith('RT 11.')) {
              const primairUnits = ['RT 11.01', 'RT 11.02', 'RT 11.03', 'RT 11.09'];
              status = primairUnits.includes(unit.roepnummer) ? "1 - Beschikbaar/vrij" : "5 - Afmelden";
            }

            unitsToImport.push({
              roepnummer: unit.roepnummer,
              aantal_mensen: unit.aantal_mensen,
              rollen: JSON.stringify(unit.rollen),
              soort_auto: unit.soort_auto,
              team: teamName,
              status: status
            });
          }
        }
      } else {
        // Use default data if file doesn't exist
        unitsToImport = [
          {
            roepnummer: "RT 11.01",
            aantal_mensen: 2,
            rollen: JSON.stringify(["Noodhulp"]),
            soort_auto: "BPV - bus",
            team: "Basisteam Waterweg (A1)",
            status: "1 - Beschikbaar/vrij"
          },
          {
            roepnummer: "RT 11.02", 
            aantal_mensen: 2,
            rollen: JSON.stringify(["Noodhulp"]),
            soort_auto: "BPV - bus",
            team: "Basisteam Waterweg (A1)",
            status: "1 - Beschikbaar/vrij"
          }
        ];
      }

      // Clear existing data
      await pool.query('DELETE FROM police_units');

      // Insert new data
      let imported = 0;
      for (const unit of unitsToImport) {
        try {
          await pool.query(`
            INSERT INTO police_units (roepnummer, aantal_mensen, rollen, soort_auto, team, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (roepnummer) 
            DO UPDATE SET 
              aantal_mensen = EXCLUDED.aantal_mensen,
              rollen = EXCLUDED.rollen,
              soort_auto = EXCLUDED.soort_auto,
              team = EXCLUDED.team,
              status = EXCLUDED.status,
              updated_at = NOW()
          `, [
            unit.roepnummer,
            unit.aantal_mensen,
            unit.rollen,
            unit.soort_auto,
            unit.team,
            unit.status
          ]);
          imported++;
        } catch (error) {
          console.error(`❌ Error importing unit ${unit.roepnummer}:`, error);
        }
      }

      // Verify import
      const result = await pool.query('SELECT COUNT(*) FROM police_units');
      console.log(`✅ Successfully imported ${imported} police units`);

      res.json({ 
        success: true, 
        imported: imported,
        total: result.rows[0].count,
        message: `Successfully imported ${imported} police units` 
      });

    } catch (error) {
      console.error('Error importing police units:', error);
      res.status(500).json({ error: 'Failed to import police units' });
    }
  });

  // Basisteams routes
  app.get("/api/basisteams", async (req, res) => {
    try {
      const allBasisteams = await db.select().from(basisteams);
      res.json(allBasisteams);
    } catch (error) {
      console.error('Error fetching basisteams:', error);
      res.status(500).json({ error: "Failed to fetch basisteams" });
    }
  });

  app.post("/api/basisteams", async (req, res) => {
    try {
      const basisteamData = insertBasisteamSchema.parse(req.body);
      const [newBasisteam] = await db.insert(basisteams).values(basisteamData).returning();
      res.status(201).json(newBasisteam);
    } catch (error) {
      console.error('Error creating basisteam:', error);
      res.status(500).json({ error: "Failed to create basisteam" });
    }
  });

  app.get("/api/basisteams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [basisteam] = await db.select().from(basisteams).where(eq(basisteams.id, id));
      if (!basisteam) {
        return res.status(404).json({ error: "Basisteam not found" });
      }
      res.json(basisteam);
    } catch (error) {
      console.error('Error fetching basisteam:', error);
      res.status(500).json({ error: "Failed to fetch basisteam" });
    }
  });

  app.put("/api/basisteams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const basisteamData = updateBasisteamSchema.parse(req.body);
      const [updatedBasisteam] = await db
        .update(basisteams)
        .set(basisteamData)
        .where(eq(basisteams.id, id))
        .returning();

      if (!updatedBasisteam) {
        return res.status(404).json({ error: "Basisteam not found" });
      }
      res.json(updatedBasisteam);
    } catch (error) {
      console.error('Error updating basisteam:', error);
      res.status(500).json({ error: "Failed to update basisteam" });
    }
  });

  app.delete("/api/basisteams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deletedBasisteam] = await db
        .delete(basisteams)
        .where(eq(basisteams.id, id))
        .returning();

      if (!deletedBasisteam) {
        return res.status(404).json({ error: "Basisteam not found" });
      }
      res.json({ message: "Basisteam deleted successfully" });
    } catch (error) {
      console.error('Error deleting basisteam:', error);
      res.status(500).json({ error: "Failed to delete basisteam" });
    }
  });

  // Route to get police units with their basisteam information
  app.get("/api/police-units-with-basisteam", async (req, res) => {
    try {
      const unitsWithBasisteam = await db
        .select({
          unit: policeUnits,
          basisteam: basisteams
        })
        .from(policeUnits)
        .leftJoin(basisteams, eq(policeUnits.basisteam_id, basisteams.id));

      res.json(unitsWithBasisteam);
    } catch (error) {
      console.error('Error fetching units with basisteam:', error);
      res.status(500).json({ error: "Failed to fetch units with basisteam" });
    }
  });

  // PDOK Bestuurlijke Gebieden WMS API
  app.get('/api/pdok/bestuurlijke-gebieden', async (req, res) => {
    try {
      const { 
        service = 'WMS',
        version = '1.3.0',
        request = 'GetMap',
        layers = 'bestuurlijkegebieden:gemeenten',
        styles = '',
        crs = 'EPSG:4326',
        bbox,
        width = '800',
        height = '600',
        format = 'image/png'
      } = req.query;

      console.log(`[PDOK WMS] Requesting ${layers} with bbox: ${bbox}`);

      const baseUrl = 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0';
      const params = new URLSearchParams({
        service: service as string,
        version: version as string,
        request: request as string,
        layers: layers as string,
        styles: styles as string,
        crs: crs as string,
        bbox: bbox as string || '-180,-90,180,90',
        width: width as string,
        height: height as string,
        format: format as string
      });

      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[PDOK WMS] Full URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GMS2-Application/1.0'
        }
      });

      if (!response.ok) {
        console.error(`[PDOK WMS] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `PDOK WMS API returned status ${response.status}` });
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('image/')) {
        // Return image data
        const imageBuffer = await response.arrayBuffer();
        res.set('Content-Type', contentType);
        res.send(Buffer.from(imageBuffer));
      } else {
        // Return text/XML data
        const data = await response.text();
        res.set('Content-Type', contentType || 'text/xml');
        res.send(data);
      }

    } catch (error) {
      console.error('[PDOK WMS] Error:', error);
      res.status(500).json({ error: 'Failed to fetch from PDOK WMS API' });
    }
  });

  // PDOK WMS GetCapabilities endpoint
  app.get('/api/pdok/capabilities', async (req, res) => {
    try {
      console.log('[PDOK WMS] Fetching capabilities...');

      const url = 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0?request=GetCapabilities&service=WMS';

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GMS2-Application/1.0'
        }
      });

      if (!response.ok) {
        console.error(`[PDOK WMS] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `PDOK WMS API returned status ${response.status}` });
      }

      const data = await response.text();
      console.log(`[PDOK WMS] Capabilities fetched successfully`);

      res.set('Content-Type', 'application/xml');
      res.send(data);

    } catch (error) {
      console.error('[PDOK WMS] Error fetching capabilities:', error);
      res.status(500).json({ error: 'Failed to fetch PDOK WMS capabilities' });
    }
  });

  // PDOK WMS GetFeatureInfo endpoint
  app.get('/api/pdok/feature-info', async (req, res) => {
    try {
      const { 
        layers = 'bestuurlijkegebieden:gemeenten',
        query_layers = 'bestuurlijkegebieden:gemeenten',
        bbox,
        width = '800',
        height = '600',
        x,
        y,
        info_format = 'application/json'
      } = req.query;

      console.log(`[PDOK WMS] GetFeatureInfo at ${x},${y} for ${layers}`);

      const baseUrl = 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0';
      const params = new URLSearchParams({
        service: 'WMS',
        version: '1.3.0',
        request: 'GetFeatureInfo',
        layers: layers as string,
        query_layers: query_layers as string,
        styles: '',
        crs: 'EPSG:4326',
        bbox: bbox as string || '-180,-90,180,90',
        width: width as string,
        height: height as string,
        format: 'image/png',
        info_format: info_format as string,
        i: x as string,
        j: y as string
      });

      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[PDOK WMS] GetFeatureInfo URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GMS2-Application/1.0'
        }
      });

      if (!response.ok) {
        console.error(`[PDOK WMS] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `PDOK WMS API returned status ${response.status}` });
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const data = await response.json();
        res.json(data);
      } else {
        const data = await response.text();
        res.set('Content-Type', contentType || 'text/xml');
        res.send(data);
      }

    } catch (error) {
      console.error('[PDOK WMS] Error getting feature info:', error);
      res.status(500).json({ error: 'Failed to get feature info from PDOK WMS API' });
    }
  });

  // PDOK WFS gemeente boundaries endpoint
  app.get('/api/pdok/gemeente-boundaries/:gemeente', async (req, res) => {
    try {
      const { gemeente } = req.params;
      console.log(`[PDOK WFS] Fetching boundaries for gemeente: ${gemeente}`);

      const baseUrl = 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0';
      const params = new URLSearchParams({
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'bestuurlijkegebieden:gemeenten',
        outputFormat: 'application/json',
        cql_filter: `gemeentenaam ILIKE '%${gemeente}%'`
      });

      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[PDOK WFS] URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GMS2-Application/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[PDOK WFS] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `PDOK WFS API returned status ${response.status}` });
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        return res.status(404).json({ error: `Gemeente '${gemeente}' niet gevonden` });
      }

      // Transform geometry to simple polygon coordinates
      const feature = data.features[0];
      const geometry = feature.geometry;
      
      let polygon: [number, number][] = [];
      
      if (geometry.type === 'Polygon') {
        // Simple polygon
        polygon = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
      } else if (geometry.type === 'MultiPolygon') {
        // Take the largest polygon from multipolygon
        let largestPolygon = geometry.coordinates[0][0];
        let maxArea = 0;
        
        for (const poly of geometry.coordinates) {
          const coords = poly[0];
          if (coords.length > largestPolygon.length) {
            largestPolygon = coords;
          }
        }
        
        polygon = largestPolygon.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
      }

      console.log(`[PDOK WFS] Found boundary for ${gemeente} with ${polygon.length} points`);

      res.json({
        gemeente: feature.properties.gemeentenaam,
        polygon: polygon,
        properties: feature.properties
      });

    } catch (error) {
      console.error('[PDOK WFS] Error fetching gemeente boundaries:', error);
      res.status(500).json({ error: 'Failed to fetch gemeente boundaries from PDOK WFS API' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}