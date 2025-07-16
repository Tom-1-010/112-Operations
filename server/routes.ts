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
  updateBasisteamSchema,
  emergencyCalls,
  insertEmergencyCallSchema,
  emergencyTemplates
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import openaiRoutes from "./openai-routes";

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
  // OpenAI routes
  app.use('/api/openai', openaiRoutes);

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

  // PDOK Locatieserver API proxy endpoint
  app.get('/api/bag/search', async (req, res) => {
    try {
      const query = String(req.query.q || '');
      const limit = String(req.query.limit || '20');

      if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const encodedQuery = encodeURIComponent(String(query));
      // Use the PDOK Locatieserver v3_1 endpoint with advanced search parameters
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodedQuery}&rows=${limit}&fq=type:adres&fl=id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll&sort=score desc`;

      console.log(`[PDOK Locatieserver] Searching for: "${query}" - URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        console.error(`[PDOK Locatieserver] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `PDOK Locatieserver returned status ${response.status}` });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error(`[PDOK Locatieserver] Non-JSON response: ${textResponse.substring(0, 200)}`);
        return res.status(500).json({ error: 'PDOK Locatieserver returned non-JSON response' });
      }

      const data = await response.json();

      console.log(`[PDOK Locatieserver] Found ${data.response?.docs?.length || 0} results`);

      // Transform PDOK Locatieserver response to match expected format
      const transformedData = {
        features: (data.response?.docs || []).map((doc: any) => {
          // Parse coordinates from centroide_ll if available
          let coordinates = null;
          if (doc.centroide_ll) {
            const coords = doc.centroide_ll.split(',');
            if (coords.length === 2) {
              coordinates = [parseFloat(coords[1]), parseFloat(coords[0])]; // [lat, lon]
            }
          }

          return {
            properties: {
              id: doc.id,
              weergavenaam: doc.weergavenaam,
              straatnaam: doc.straatnaam,
              huisnummer: doc.huisnummer,
              huisletter: doc.huisletter || '',
              huisnummertoevoeging: doc.huisnummertoevoeging || '',
              postcode: doc.postcode,
              plaatsnaam: doc.woonplaatsnaam,
              gemeentenaam: doc.gemeentenaam,
              provincienaam: doc.provincienaam,
              coordinates: coordinates,
              score: doc.score
            }
          };
        })
      };

      res.json(transformedData);
    } catch (error) {
      console.error('[PDOK Locatieserver] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch from PDOK Locatieserver' });
    }
  });

  // Test endpoint for PDOK Locatieserver debugging
  app.get('/api/bag/test', async (req, res) => {
    try {
      const testQuery = 'Rotterdam Kleiweg';
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(testQuery)}&rows=5&fq=type:adres&fl=id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,provincienaam,centroide_ll&sort=score desc`;

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
      } catch (parseError: any) {
        res.json({
          status: 'parse_error',
          url: url,
          responseStatus: response.status,
          responseText: responseText.substring(0, 1000),
          parseError: parseError?.message || 'Unknown parse error'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        status: 'fetch_error',
        error: error?.message || 'Unknown error'
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
        ktNaam: k.ktNaam || '',
        ktType: k.ktType || '', 
        ktWaarde: k.ktWaarde || '',
        ktCode: k.ktCode || '',
        ktParser: k.ktParser || ''
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
      const transformedData = karakteristiekenData.map((item: any) => ({
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
      const transformedData = karakteristiekenData.map((item: any) => ({
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

      const baseUrl = 'https://service.pdok.nl/kadaster/bestaster/bestuurlijkegebieden/wms/v1_0';
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

  // Route to load 112 script data
  app.get("/api/112-scripts", (req, res) => {
    try {
      // In een echte implementatie zou je hier je JSON-bestand laden
      // Voor nu returneren we een voorbeeldstructuur
      const scriptData = {
        scenarios: {
          afpersing: {
            category: "Bezitsaantasting",
            subcategory: "Diefstal",
            priority: 1,
            questions: [
              "Wat is er gebeurd?",
              "Waar bevindt u zich?", 
              "Bent u gewond geraakt?",
              "Zijn de daders nog in de buurt?"
            ]
          },
          beroving: {
            category: "Bezitsaantasting", 
            subcategory: "Diefstal",
            priority: 1,
            questions: [
              "Wat is er gestolen?",
              "Waar bent u nu?",
              "Welke kant zijn ze op gevlucht?",
              "Waren ze gewapend?"
            ]
          }
        }
      };
      
      res.json(scriptData);
    } catch (error) {
      console.error('Error loading 112 scripts:', error);
      res.status(500).json({ error: 'Failed to load 112 scripts' });
    }
  });

  // Emergency calls API routes
  app.get('/api/emergency-calls', async (req, res) => {
    try {
      const calls = await db.select().from(emergencyCalls).orderBy(desc(emergencyCalls.callStartTime));
      res.json(calls);
    } catch (error) {
      console.error('Error fetching emergency calls:', error);
      res.status(500).json({ error: 'Failed to fetch emergency calls' });
    }
  });

  app.post('/api/emergency-calls', async (req, res) => {
    try {
      const validatedData = insertEmergencyCallSchema.parse(req.body);
      const [call] = await db.insert(emergencyCalls).values(validatedData).returning();
      res.json(call);
    } catch (error) {
      console.error('Error creating emergency call:', error);
      res.status(500).json({ error: 'Failed to create emergency call' });
    }
  });

  app.put('/api/emergency-calls/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmergencyCallSchema.partial().parse(req.body);
      const [call] = await db.update(emergencyCalls)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(emergencyCalls.id, id))
        .returning();
      res.json(call);
    } catch (error) {
      console.error('Error updating emergency call:', error);
      res.status(500).json({ error: 'Failed to update emergency call' });
    }
  });

  // Generate realistic emergency call using LMC classifications
  app.post('/api/emergency-calls/generate', async (req, res) => {
    try {
      // Official LMC incident types - weighted distribution
      const lmcIncidents = [
        // POLITIE MELDINGEN (70% - most common)
        { code: 'bzdsbr', type: 'police', priority: 1, category: 'Beroving', situation: 'Er wordt iemand beroofd op straat met geweld of bedreiging', mc1: 'Bezitsaantasting', mc2: 'Diefstal', mc3: 'Beroving' },
        { code: 'bzovbi', type: 'police', priority: 1, category: 'Overval bedrijf', situation: 'Er is een overval gaande in een winkel of bedrijf', mc1: 'Bezitsaantasting', mc2: 'Overval', mc3: 'Bedrijf/Instelling' },
        { code: 'bzovwn', type: 'police', priority: 1, category: 'Woningoverval', situation: 'Er is een overval in een woning', mc1: 'Bezitsaantasting', mc2: 'Overval', mc3: 'Woning' },
        { code: 'bzibwn', type: 'police', priority: 2, category: 'Woninginbraak', situation: 'Er is ingebroken in een woning', mc1: 'Bezitsaantasting', mc2: 'Inbraak', mc3: 'Woning' },
        { code: 'bzibbi', type: 'police', priority: 2, category: 'Bedrijfsinbraak', situation: 'Er is ingebroken in een bedrijf', mc1: 'Bezitsaantasting', mc2: 'Inbraak', mc3: 'Bedrijf/Instelling' },
        { code: 'bzdswk', type: 'police', priority: 2, category: 'Winkeldiefstal', situation: 'Er is een winkeldiefstal gepleegd', mc1: 'Bezitsaantasting', mc2: 'Diefstal', mc3: 'Winkeldiefstal' },
        { code: 'bzdsvo', type: 'police', priority: 3, category: 'Voertuigdiefstal', situation: 'Er is een voertuig gestolen', mc1: 'Bezitsaantasting', mc2: 'Diefstal', mc3: 'Voertuig' },
        { code: 'bzvnvo', type: 'police', priority: 3, category: 'Vernieling voertuig', situation: 'Er is een auto beschadigd of vernield', mc1: 'Bezitsaantasting', mc2: 'Vernieling', mc3: 'Voertuig' },
        { code: 'bzvngf', type: 'police', priority: 3, category: 'Graffiti', situation: 'Er is graffiti aangebracht op een gebouw', mc1: 'Bezitsaantasting', mc2: 'Vernieling', mc3: 'Graffiti' },
        { code: 'gwpe', type: 'police', priority: 1, category: 'Geweld persoon', situation: 'Er is geweld gebruikt tegen een persoon', mc1: 'Geweld', mc2: 'Persoon', mc3: '' },
        { code: 'gwhu', type: 'police', priority: 2, category: 'Huiselijk geweld', situation: 'Er is huiselijk geweld aan de gang', mc1: 'Geweld', mc2: 'Huiselijk', mc3: '' },
        { code: 'gwdr', type: 'police', priority: 2, category: 'Dreiging', situation: 'Iemand wordt bedreigd', mc1: 'Geweld', mc2: 'Dreiging', mc3: '' },
        { code: 'vkaa', type: 'police', priority: 2, category: 'Verkeersongeval', situation: 'Er is een verkeersongeval gebeurd', mc1: 'Verkeer', mc2: 'Aanrijding', mc3: '' },
        { code: 'vkre', type: 'police', priority: 3, category: 'Verkeersobstakels', situation: 'Er staan obstakels op de weg', mc1: 'Verkeer', mc2: 'Reconstructie', mc3: '' },
        { code: 'oovi', type: 'police', priority: 3, category: 'Overlast', situation: 'Er is overlast van personen', mc1: 'Openbare orde', mc2: 'Overlast', mc3: 'Personen' },
        { code: 'oogt', type: 'police', priority: 3, category: 'Geluidsoverlast', situation: 'Er is geluidsoverlast', mc1: 'Openbare orde', mc2: 'Geluid', mc3: 'Overlast' },
        
        // BRANDWEER MELDINGEN (20%)
        { code: 'brgb', type: 'fire', priority: 1, category: 'Gebouwbrand', situation: 'Er is brand in een gebouw', mc1: 'Brand', mc2: 'Gebouw', mc3: '' },
        { code: 'brvo', type: 'fire', priority: 1, category: 'Voertuigbrand', situation: 'Er staat een voertuig in brand', mc1: 'Brand', mc2: 'Voertuig', mc3: '' },
        { code: 'brbu', type: 'fire', priority: 2, category: 'Buitenbrand', situation: 'Er is brand in de buitenlucht', mc1: 'Brand', mc2: 'Buiten', mc3: '' },
        { code: 'brsc', type: 'fire', priority: 2, category: 'Schoorsteenbrand', situation: 'Er is brand in een schoorsteen', mc1: 'Brand', mc2: 'Schoorsteen', mc3: '' },
        { code: 'alabab', type: 'fire', priority: 2, category: 'Automatisch brandalarm', situation: 'Er is een automatisch brandalarm afgegaan', mc1: 'Alarm', mc2: 'Automatisch brand', mc3: 'Automatisch brand OMS' },
        { code: 'allorm', type: 'fire', priority: 3, category: 'Rookmelder', situation: 'Er gaat een rookmelder af', mc1: 'Alarm', mc2: 'Luid/optisch alarm', mc3: 'Rookmelder' },
        
        // AMBULANCE MELDINGEN (10%)
        { code: 'amhu', type: 'medical', priority: 1, category: 'Medische hulp', situation: 'Er is medische hulp nodig', mc1: 'Ambulance', mc2: 'Hulp', mc3: '' },
        { code: 'amre', type: 'medical', priority: 1, category: 'Reanimatie', situation: 'Er moet gereanimeerd worden', mc1: 'Ambulance', mc2: 'Reanimatie', mc3: '' },
        { code: 'amov', type: 'medical', priority: 2, category: 'Medisch ongeval', situation: 'Er is een medisch ongeval gebeurd', mc1: 'Ambulance', mc2: 'Ongeval', mc3: '' },
        { code: 'amoo', type: 'medical', priority: 2, category: 'Medische noodsituatie', situation: 'Er is een medische noodsituatie', mc1: 'Ambulance', mc2: 'Noodsituatie', mc3: '' }
      ];

      // Weighted random selection (70% police, 20% fire, 10% medical)
      const weights = [
        ...Array(16).fill('police'),  // 70% police (16 out of 26 total)
        ...Array(6).fill('fire'),     // 20% fire (6 out of 26 total)
        ...Array(4).fill('medical')   // 10% medical (4 out of 26 total)
      ];
      
      const selectedType = weights[Math.floor(Math.random() * weights.length)];
      const typeIncidents = lmcIncidents.filter(inc => inc.type === selectedType);
      const selectedIncident = typeIncidents[Math.floor(Math.random() * typeIncidents.length)];

      // Generate realistic Rotterdam-area addresses
      const addresses = [
        'Lange Boonestraat 12, Maassluis',
        'Stationsplein 8, Rotterdam',
        'Marktplein 15, Schiedam',
        'Hoofdstraat 45, Vlaardingen',
        'Parkweg 22, Spijkenisse',
        'Centrumstraat 33, Capelle aan den IJssel',
        'Weena 505, Rotterdam',
        'Coolsingel 114, Rotterdam',
        'Wilhelminaplein 1, Vlaardingen',
        'Stadhuisplein 1, Ridderkerk',
        'Blaak 555, Rotterdam',
        'Lijnbaan 77, Rotterdam',
        'Karel Doormanstraat 15, Maassluis',
        'Nieuwe Binnenweg 300, Rotterdam',
        'Kleiweg 500, Rotterdam'
      ];

      // Generate realistic caller data
      const phoneNumbers = [
        '06-12345678', '06-87654321', '06-55566677', '06-99887766',
        '06-11223344', '06-44556677', '06-77889900', '06-33445566',
        '06-18872879', '06-23666977', '06-66909061', '06-55601889'
      ];
      
      const callerNames = [
        'Jan de Vries', 'Maria van der Berg', 'Peter Janssen', 'Karin Smit',
        'Dirk van Dam', 'Lisa Bakker', 'Tom de Groot', 'Sandra Mulder',
        'Ahmed Hassan', 'Fatima Al-Rashid', 'Chen Wei', 'Anna Kowalski',
        'Roberto Silva', 'Amara Okafor', 'Yasmin Patel', 'Erik Andersson'
      ];

      const randomCall = {
        phoneNumber: phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
        callerName: callerNames[Math.floor(Math.random() * callerNames.length)],
        callerLocation: addresses[Math.floor(Math.random() * addresses.length)],
        emergencyType: selectedIncident.type,
        urgencyLevel: selectedIncident.priority,
        description: selectedIncident.situation,
        address: addresses[Math.floor(Math.random() * addresses.length)],
        coordinates: JSON.stringify({
          lat: 51.9 + Math.random() * 0.2,
          lng: 4.3 + Math.random() * 0.4
        }),
        operatorId: 'OPERATOR_001',
        operatorNotes: `${selectedIncident.code} - ${selectedIncident.mc1}/${selectedIncident.mc2}/${selectedIncident.mc3}`.replace(/\/$/, '')
      };
      
      const [call] = await db.insert(emergencyCalls).values(randomCall).returning();
      
      // Return call with LMC data for realistic conversation
      res.json({
        ...call,
        templateData: {
          categorie: selectedIncident.mc1,
          subcategorie: selectedIncident.mc2,
          classificatie: selectedIncident.category,
          situatie: selectedIncident.situation,
          spoed: selectedIncident.priority <= 2,
          code: selectedIncident.code,
          type: selectedIncident.type
        }
      });
    } catch (error) {
      console.error('Error generating emergency call:', error);
      res.status(500).json({ error: 'Failed to generate emergency call' });
    }
  });

  // Get emergency templates
  app.get('/api/emergency-templates', async (req, res) => {
    try {
      const templates = await db.select().from(emergencyTemplates).limit(50);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching emergency templates:', error);
      res.status(500).json({ error: 'Failed to fetch emergency templates' });
    }
  });

  // AI Chat endpoint for emergency calls
  app.post('/api/emergency-calls/:callId/chat', async (req, res) => {
    try {
      const { callId } = req.params;
      const { message, conversationHistory } = req.body;
      
      // Get the emergency call details
      const [call] = await db.select().from(emergencyCalls).where(eq(emergencyCalls.id, parseInt(callId)));
      
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      // Get template for better context
      const template = await db.select().from(emergencyTemplates)
        .where(eq(emergencyTemplates.meldingId, call.operatorNotes?.split(' - ')[0] || ''))
        .limit(1);

      const templateData = template[0];

      // Professional 112 response system with comprehensive question handling
      const lowerMessage = message.toLowerCase();
      let response = "";

      // 🧍 ALGEMENE IDENTIFICATIE
      if (lowerMessage.includes('wat is uw naam') || lowerMessage.includes('uw naam') || lowerMessage.includes('hoe heet u')) {
        response = call.callerName || "Mijn naam is... eh... moet ik dat zeggen?";
      }
      else if (lowerMessage.includes('spellen') || lowerMessage.includes('kunt u dat spellen')) {
        const name = call.callerName || "Jan Janssen";
        response = `Ja, dat is ${name.split('').join(' - ')}.`;
      }
      else if (lowerMessage.includes('telefoonnummer') || lowerMessage.includes('uw nummer')) {
        response = call.phoneNumber || "Mijn nummer is... eh... dat weet ik niet uit mijn hoofd.";
      }
      else if (lowerMessage.includes('ter plaatse') || lowerMessage.includes('bent u daar')) {
        response = "Ja, ik ben hier ter plaatse.";
      }
      else if (lowerMessage.includes('namens uzelf') || lowerMessage.includes('namens iemand anders')) {
        response = "Ik bel voor mezelf.";
      }
      else if (lowerMessage.includes('eerder gemeld') || lowerMessage.includes('al gemeld')) {
        response = "Nee, ik heb dit nog niet eerder gemeld.";
      }
      else if (lowerMessage.includes('iemand anders al gebeld') || lowerMessage.includes('al andere hulp')) {
        response = "Nee, ik heb alleen jullie gebeld.";
      }

      // 📍 LOCATIE
      else if (lowerMessage.includes('exacte adres') || lowerMessage.includes('wat is het adres')) {
        response = call.address || "Ik weet het niet precies, maar ik ben op de hoofdstraat.";
      }
      else if (lowerMessage.includes('welke plaats') || lowerMessage.includes('in welke stad')) {
        const address = call.address || "";
        const city = address.split(',').pop()?.trim() || "Rotterdam";
        response = `Het gebeurt in ${city}.`;
      }
      else if (lowerMessage.includes('binnen of buiten') || lowerMessage.includes('gebeurt het binnen')) {
        response = templateData?.locatie?.includes('binnen') ? "Het gebeurt binnen." : "Het gebeurt buiten.";
      }
      else if (lowerMessage.includes('herkenningspunten') || lowerMessage.includes('punten noemen')) {
        response = "Ik zie een bushalte en een supermarkt in de buurt.";
      }
      else if (lowerMessage.includes('verkeer') || lowerMessage.includes('publiek in de buurt')) {
        response = "Ja, er zijn best veel mensen hier.";
      }
      else if (lowerMessage.includes('snelweg') || lowerMessage.includes('op de snelweg')) {
        response = "Nee, dit is niet op de snelweg.";
      }
      else if (lowerMessage.includes('kruispunt') || lowerMessage.includes('op een kruispunt')) {
        response = "Nee, het is niet op een kruispunt.";
      }
      else if (lowerMessage.includes('veilig voor hulpdiensten') || lowerMessage.includes('veilig om te stoppen')) {
        response = "Ja, het is veilig om hier te stoppen.";
      }

      // 🚨 AARD VAN HET INCIDENT
      else if (lowerMessage.includes('wat is er precies aan de hand') || lowerMessage.includes('wat gebeurt er')) {
        response = templateData?.situatie || "Er is iets gebeurd, maar ik kan het niet goed uitleggen.";
      }
      else if (lowerMessage.includes('misdrijf') || lowerMessage.includes('ongeluk') || lowerMessage.includes('gaat het om')) {
        response = templateData?.categorie || "Ik weet niet precies wat het is.";
      }
      else if (lowerMessage.includes('sprake van geweld') || lowerMessage.includes('geweld')) {
        response = templateData?.classificatie?.includes('geweld') ? "Ja, er is geweld." : "Nee, geen geweld.";
      }
      else if (lowerMessage.includes('medische noodsituatie') || lowerMessage.includes('medisch')) {
        response = call.emergencyType === 'medical' ? "Ja, het is medisch." : "Nee, niet medisch.";
      }
      else if (lowerMessage.includes('brand') || lowerMessage.includes('rook te zien')) {
        response = call.emergencyType === 'fire' ? "Ja, ik zie rook!" : "Nee, geen brand.";
      }
      else if (lowerMessage.includes('iemand in gevaar') || lowerMessage.includes('in gevaar')) {
        response = templateData?.spoed ? "Ja, er is gevaar!" : "Ik weet niet of er gevaar is.";
      }
      else if (lowerMessage.includes('bedreigd') || lowerMessage.includes('wordt bedreigd')) {
        response = templateData?.classificatie?.includes('bedreiging') ? "Ja, er wordt bedreigd." : "Nee, niemand wordt bedreigd.";
      }
      else if (lowerMessage.includes('nog gaande') || lowerMessage.includes('nog bezig')) {
        response = "Ja, het is nog gaande.";
      }
      else if (lowerMessage.includes('verdachte nog aanwezig') || lowerMessage.includes('verdachte er nog')) {
        response = "Ik weet niet of de verdachte er nog is.";
      }
      else if (lowerMessage.includes('zelf gewond') || lowerMessage.includes('bent u gewond')) {
        response = "Nee, ik ben niet gewond.";
      }

      // 👥 BETROKKENEN
      else if (lowerMessage.includes('hoeveel personen') || lowerMessage.includes('hoeveel mensen')) {
        response = "Ik zie ongeveer 2 of 3 personen.";
      }
      else if (lowerMessage.includes('volwassenen of kinderen') || lowerMessage.includes('kinderen')) {
        response = "Het zijn volwassenen, geen kinderen.";
      }
      else if (lowerMessage.includes('iemand gewond') || lowerMessage.includes('gewonden')) {
        response = templateData?.spoed ? "Ja, er is iemand gewond." : "Ik weet niet of er gewonden zijn.";
      }
      else if (lowerMessage.includes('bewusteloos') || lowerMessage.includes('bij bewustzijn')) {
        response = "Ik kan niet goed zien of iemand bewusteloos is.";
      }
      else if (lowerMessage.includes('verdachte personen') || lowerMessage.includes('verdachten')) {
        response = "Ik weet niet wie de verdachte is.";
      }
      else if (lowerMessage.includes('beschrijf de verdachte') || lowerMessage.includes('hoe ziet')) {
        response = "Ik kan de persoon niet goed beschrijven, het gaat te snel.";
      }
      else if (lowerMessage.includes('wat dragen zij') || lowerMessage.includes('kleding')) {
        response = "Ik kan niet goed zien wat ze aan hebben.";
      }
      else if (lowerMessage.includes('welke richting') || lowerMessage.includes('vertrokken')) {
        response = "Ik weet niet in welke richting ze zijn gegaan.";
      }
      else if (lowerMessage.includes('bekende persoon') || lowerMessage.includes('kent u')) {
        response = "Nee, ik ken deze personen niet.";
      }

      // 🩺 LETSEL
      else if (lowerMessage.includes('bloed te zien') || lowerMessage.includes('bloed')) {
        response = "Ik zie geen bloed.";
      }
      else if (lowerMessage.includes('kan de persoon nog praten') || lowerMessage.includes('praten')) {
        response = "Ja, de persoon kan nog praten.";
      }
      else if (lowerMessage.includes('ademt normaal') || lowerMessage.includes('ademhaling')) {
        response = "Ja, de persoon ademt normaal.";
      }
      else if (lowerMessage.includes('pijn op de borst') || lowerMessage.includes('borst')) {
        response = "Ik weet niet of er pijn op de borst is.";
      }
      else if (lowerMessage.includes('aanspreekbaar') || lowerMessage.includes('reageert')) {
        response = "Ja, de persoon is aanspreekbaar.";
      }
      else if (lowerMessage.includes('eerste hulp') || lowerMessage.includes('hulp verleend')) {
        response = "Nee, er is nog geen eerste hulp verleend.";
      }
      else if (lowerMessage.includes('reanimeren') || lowerMessage.includes('reanimatie')) {
        response = "Nee, niemand is aan het reanimeren.";
      }
      else if (lowerMessage.includes('aed') || lowerMessage.includes('defibrillator')) {
        response = "Ik weet niet of er een AED in de buurt is.";
      }
      else if (lowerMessage.includes('hoe oud') || lowerMessage.includes('leeftijd')) {
        response = "Ik schat ongeveer 30 tot 40 jaar.";
      }

      // 🚗 VERKEER / ONGEVAL
      else if (lowerMessage.includes('hoeveel voertuigen') || lowerMessage.includes('auto\'s')) {
        response = call.emergencyType === 'traffic' ? "Er zijn 2 auto's bij betrokken." : "Ik zie geen voertuigen.";
      }
      else if (lowerMessage.includes('verkeer geblokkeerd') || lowerMessage.includes('blokkade')) {
        response = "Ja, het verkeer staat vast.";
      }
      else if (lowerMessage.includes('beknelling') || lowerMessage.includes('beklemd')) {
        response = "Nee, niemand zit beklemd.";
      }
      else if (lowerMessage.includes('brandweer nodig') || lowerMessage.includes('brandweer')) {
        response = call.emergencyType === 'fire' ? "Ja, brandweer is nodig!" : "Ik denk niet dat brandweer nodig is.";
      }
      else if (lowerMessage.includes('alcohol') || lowerMessage.includes('dronken')) {
        response = "Ik ruik geen alcohol.";
      }

      // 🧠 GEDRAG & GEESTELIJKE TOESTAND
      else if (lowerMessage.includes('in paniek') || lowerMessage.includes('paniek')) {
        response = "Ja, de persoon is behoorlijk in paniek.";
      }
      else if (lowerMessage.includes('emotioneel stabiel') || lowerMessage.includes('kalm')) {
        response = "Nee, de persoon is niet kalm.";
      }
      else if (lowerMessage.includes('verward') || lowerMessage.includes('in de war')) {
        response = "Ja, de persoon lijkt verward.";
      }
      else if (lowerMessage.includes('suïcide') || lowerMessage.includes('zelfmoord')) {
        response = "Daar weet ik niks van.";
      }
      else if (lowerMessage.includes('onder invloed') || lowerMessage.includes('drugs')) {
        response = "Ik weet niet of de persoon onder invloed is.";
      }
      else if (lowerMessage.includes('agressie') || lowerMessage.includes('agressief')) {
        response = templateData?.classificatie?.includes('agressie') ? "Ja, er is agressie." : "Nee, geen agressie.";
      }

      // 🧾 VERVOLGVRAGEN
      else if (lowerMessage.includes('sinds wanneer') || lowerMessage.includes('hoe lang')) {
        response = "Dit is net begonnen, een paar minuten geleden.";
      }
      else if (lowerMessage.includes('eerder gebeurd') || lowerMessage.includes('vaker gebeurd')) {
        response = "Nee, dit is de eerste keer dat ik dit zie.";
      }
      else if (lowerMessage.includes('bewijs') || lowerMessage.includes('foto\'s')) {
        response = "Nee, ik heb geen foto's gemaakt.";
      }
      else if (lowerMessage.includes('videobeeld') || lowerMessage.includes('camera')) {
        response = "Ik weet niet of er camera's zijn.";
      }
      else if (lowerMessage.includes('zelf ingegrepen') || lowerMessage.includes('geholpen')) {
        response = "Nee, ik heb niet ingegrepen.";
      }
      else if (lowerMessage.includes('hulp onderweg') || lowerMessage.includes('al hulp')) {
        response = "Nee, ik zie nog geen hulp.";
      }
      else if (lowerMessage.includes('bekend op deze locatie') || lowerMessage.includes('kent u hier')) {
        response = "Ja, ik kom hier wel vaker.";
      }
      else if (lowerMessage.includes('hulp van omstanders') || lowerMessage.includes('helpen mensen')) {
        response = "Ja, er zijn mensen die proberen te helpen.";
      }
      else if (lowerMessage.includes('precies gezien') || lowerMessage.includes('wat zag u')) {
        response = templateData?.situatie || "Ik heb het incident zien gebeuren.";
      }
      else if (lowerMessage.includes('blijven tot') || lowerMessage.includes('kunt u wachten')) {
        response = "Ja, ik kan wachten tot jullie er zijn.";
      }

      // 🧭 AFHANDELING & AFRONDING
      else if (lowerMessage.includes('teruggebeld') || lowerMessage.includes('terug bellen')) {
        response = "Nee, dat hoeft niet.";
      }
      else if (lowerMessage.includes('aanvullende informatie') || lowerMessage.includes('nog iets')) {
        response = "Nee, ik denk dat ik alles heb verteld.";
      }
      else if (lowerMessage.includes('eerder meegemaakt') || lowerMessage.includes('ervaring')) {
        response = "Nee, dit heb ik nog nooit eerder meegemaakt.";
      }
      else if (lowerMessage.includes('veilig op dit moment') || lowerMessage.includes('bent u veilig')) {
        response = "Ja, ik ben veilig.";
      }
      else if (lowerMessage.includes('op afstand blijven') || lowerMessage.includes('afstand houden')) {
        response = "Ja, ik blijf op afstand.";
      }
      else if (lowerMessage.includes('anoniem') || lowerMessage.includes('naam niet noemen')) {
        response = "Nee, dat is niet nodig.";
      }
      else if (lowerMessage.includes('escalatie') || lowerMessage.includes('erger worden')) {
        response = "Ik weet niet of het erger wordt.";
      }
      else if (lowerMessage.includes('aan de lijn blijven') || lowerMessage.includes('blijven praten')) {
        response = "Ja, ik kan aan de lijn blijven.";
      }

      // DEFAULT FALLBACKS
      else if (lowerMessage.includes('hallo') || lowerMessage.includes('goedendag') || message.trim().length < 10) {
        response = "Hallo, ja ik heb dringend hulp nodig!";
      }
      else if (lowerMessage.includes('dank') || lowerMessage.includes('bedankt')) {
        response = "Graag gedaan, komen jullie snel?";
      }
      else {
        const defaultResponses = [
          "Dat weet ik niet precies.",
          "Ik kan het niet zo goed zien.",
          "Dat is moeilijk te zeggen.",
          "Daar ben ik niet zeker van."
        ];
        response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      }
      
      res.json({ 
        message: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });

  // RWS Nationaal Wegenbestand API endpoints
  app.get('/api/rws/highways', async (req, res) => {
    try {
      const { bbox, limit = '100' } = req.query;
      
      console.log(`[RWS NWB] Fetching highways data`);
      
      // Base URL for RWS NWB WFS service
      const baseUrl = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1/collections/wegvakken/items';
      const params = new URLSearchParams({
        f: 'json',
        limit: limit as string
      });
      
      // Add bbox if provided
      if (bbox) {
        params.append('bbox', bbox as string);
      }
      
      // Filter for highways (A-roads)
      params.append('filter', "eigenschappen.BST_CODE IN ('HR','ORG') AND eigenschappen.WGK_CODE = '1'");
      
      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[RWS NWB] URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[RWS NWB] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `RWS NWB API returned status ${response.status}` });
      }
      
      const data = await response.json();
      console.log(`[RWS NWB] Found ${data.features?.length || 0} highway segments`);
      
      // Transform data for easier use
      const transformedData = {
        type: 'FeatureCollection',
        features: (data.features || []).map((feature: any) => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            id: feature.properties?.identificatie,
            wegNummer: feature.properties?.eigenschappen?.WGK_NAAM,
            rijrichting: feature.properties?.eigenschappen?.RJR_CODE,
            wegType: feature.properties?.eigenschappen?.BST_CODE,
            wegCode: feature.properties?.eigenschappen?.WGK_CODE,
            hectometrering: {
              van: feature.properties?.eigenschappen?.BEGAFST,
              tot: feature.properties?.eigenschappen?.ENDAFST
            },
            geometry: feature.geometry
          }
        }))
      };
      
      res.json(transformedData);
      
    } catch (error) {
      console.error('[RWS NWB] Error fetching highways:', error);
      res.status(500).json({ error: 'Failed to fetch highways from RWS NWB API' });
    }
  });

  app.get('/api/rws/roads', async (req, res) => {
    try {
      const { bbox, roadType = 'all', limit = '100' } = req.query;
      
      console.log(`[RWS NWB] Fetching roads data for type: ${roadType}`);
      
      const baseUrl = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1/collections/wegvakken/items';
      const params = new URLSearchParams({
        f: 'json',
        limit: limit as string
      });
      
      if (bbox) {
        params.append('bbox', bbox as string);
      }
      
      // Filter based on road type
      let filter = "";
      switch (roadType) {
        case 'highway':
          filter = "eigenschappen.BST_CODE IN ('HR','ORG') AND eigenschappen.WGK_CODE = '1'";
          break;
        case 'provincial':
          filter = "eigenschappen.BST_CODE IN ('HR','ORG') AND eigenschappen.WGK_CODE = '2'";
          break;
        case 'municipal':
          filter = "eigenschappen.BST_CODE IN ('HR','ORG') AND eigenschappen.WGK_CODE = '3'";
          break;
        default:
          filter = "eigenschappen.BST_CODE IN ('HR','ORG')";
      }
      
      params.append('filter', filter);
      
      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[RWS NWB] URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[RWS NWB] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `RWS NWB API returned status ${response.status}` });
      }
      
      const data = await response.json();
      console.log(`[RWS NWB] Found ${data.features?.length || 0} road segments`);
      
      const transformedData = {
        type: 'FeatureCollection',
        features: (data.features || []).map((feature: any) => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            id: feature.properties?.identificatie,
            wegNummer: feature.properties?.eigenschappen?.WGK_NAAM,
            wegType: feature.properties?.eigenschappen?.BST_CODE,
            wegCode: feature.properties?.eigenschappen?.WGK_CODE,
            rijrichting: feature.properties?.eigenschappen?.RJR_CODE,
            hectometrering: {
              van: feature.properties?.eigenschappen?.BEGAFST,
              tot: feature.properties?.eigenschappen?.ENDAFST
            },
            geometry: feature.geometry
          }
        }))
      };
      
      res.json(transformedData);
      
    } catch (error) {
      console.error('[RWS NWB] Error fetching roads:', error);
      res.status(500).json({ error: 'Failed to fetch roads from RWS NWB API' });
    }
  });

  // Get highway information by name (A1, A2, etc.)
  app.get('/api/rws/highways/:roadName', async (req, res) => {
    try {
      const { roadName } = req.params;
      const { bbox, limit = '50' } = req.query;
      
      console.log(`[RWS NWB] Fetching highway info for: ${roadName}`);
      
      const baseUrl = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1/collections/wegvakken/items';
      const params = new URLSearchParams({
        f: 'json',
        limit: limit as string
      });
      
      if (bbox) {
        params.append('bbox', bbox as string);
      }
      
      // Filter for specific highway
      params.append('filter', `eigenschappen.WGK_NAAM = '${roadName.toUpperCase()}' AND eigenschappen.BST_CODE IN ('HR','ORG')`);
      
      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[RWS NWB] URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[RWS NWB] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `RWS NWB API returned status ${response.status}` });
      }
      
      const data = await response.json();
      console.log(`[RWS NWB] Found ${data.features?.length || 0} segments for ${roadName}`);
      
      res.json(data);
      
    } catch (error) {
      console.error(`[RWS NWB] Error fetching highway ${req.params.roadName}:`, error);
      res.status(500).json({ error: `Failed to fetch highway ${req.params.roadName} from RWS NWB API` });
    }
  });

  // Get road information near a specific location
  app.get('/api/rws/roads/near', async (req, res) => {
    try {
      const { lat, lon, radius = '1000', roadType = 'all' } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lon as string);
      const radiusMeters = parseInt(radius as string);
      
      // Calculate bbox around point (rough approximation)
      const latOffset = radiusMeters / 111000; // ~111km per degree
      const lonOffset = radiusMeters / (111000 * Math.cos(latitude * Math.PI / 180));
      
      const bbox = `${longitude - lonOffset},${latitude - latOffset},${longitude + lonOffset},${latitude + latOffset}`;
      
      console.log(`[RWS NWB] Fetching roads near ${lat},${lon} within ${radius}m`);
      
      const baseUrl = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1/collections/wegvakken/items';
      const params = new URLSearchParams({
        f: 'json',
        bbox: bbox,
        limit: '50'
      });
      
      let filter = "eigenschappen.BST_CODE IN ('HR','ORG')";
      if (roadType === 'highway') {
        filter += " AND eigenschappen.WGK_CODE = '1'";
      }
      params.append('filter', filter);
      
      const url = `${baseUrl}?${params.toString()}`;
      console.log(`[RWS NWB] URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[RWS NWB] HTTP Error: ${response.status} - ${response.statusText}`);
        return res.status(500).json({ error: `RWS NWB API returned status ${response.status}` });
      }
      
      const data = await response.json();
      console.log(`[RWS NWB] Found ${data.features?.length || 0} road segments near location`);
      
      res.json(data);
      
    } catch (error) {
      console.error('[RWS NWB] Error fetching roads near location:', error);
      res.status(500).json({ error: 'Failed to fetch nearby roads from RWS NWB API' });
    }
  });

  // Test endpoint for RWS NWB API
  app.get('/api/rws/test', async (req, res) => {
    try {
      console.log('[RWS NWB] Testing API connection...');
      
      const testUrl = 'https://api.pdok.nl/rws/nationaal-wegenbestand-wegen/ogc/v1/collections/wegvakken/items?f=json&limit=5&filter=eigenschappen.WGK_NAAM=\'A1\'';
      
      const response = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GMS2-Application/1.0'
        }
      });
      
      const responseText = await response.text();
      console.log(`[RWS NWB TEST] Response status: ${response.status}`);
      console.log(`[RWS NWB TEST] Response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`[RWS NWB TEST] Response body (first 500 chars):`, responseText.substring(0, 500));
      
      try {
        const data = JSON.parse(responseText);
        res.json({
          status: 'success',
          url: testUrl,
          responseStatus: response.status,
          data: data,
          features: data.features?.length || 0
        });
      } catch (parseError: any) {
        res.json({
          status: 'parse_error',
          url: testUrl,
          responseStatus: response.status,
          responseText: responseText.substring(0, 1000),
          parseError: parseError?.message || 'Unknown parse error'
        });
      }
    } catch (error: any) {
      res.status(500).json({
        status: 'fetch_error',
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);

  return httpServer;
}
