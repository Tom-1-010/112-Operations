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
  insertPoliceUnitSchema,
  insertBasisteamSchema
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
  app.get('/api/police-units', async (c) => {
    try {
      const units = await db.select().from(policeUnits).orderBy(policeUnits.roepnummer);
      return c.json(units);
    } catch (error) {
      console.error('Error fetching police units:', error);
      return c.json({ error: 'Failed to fetch police units' }, 500);
    }
  });

  app.post('/api/police-units', async (c) => {
    try {
      const unitData = await c.req.json();
      console.log('📝 Creating/updating police unit:', unitData);

      // Check if unit already exists
      const existingUnit = await db.select().from(policeUnits).where(eq(policeUnits.roepnummer, unitData.roepnummer)).limit(1);

      if (existingUnit.length > 0) {
        // Update existing unit
        const updated = await db.update(policeUnits)
          .set({
            aantal_mensen: unitData.aantal_mensen,
            rollen: unitData.rollen,
            soort_auto: unitData.soort_auto,
            team: unitData.team,
            status: unitData.status,
            locatie: unitData.locatie,
            incident: unitData.incident,
            basisteam_id: unitData.basisteam_id,
            updated_at: new Date()
          })
          .where(eq(policeUnits.roepnummer, unitData.roepnummer))
          .returning();

        console.log('✅ Updated police unit:', updated[0]);
        return c.json(updated[0]);
      } else {
        // Insert new unit
        const newUnit = await db.insert(policeUnits).values({
          roepnummer: unitData.roepnummer,
          aantal_mensen: unitData.aantal_mensen,
          rollen: unitData.rollen,
          soort_auto: unitData.soort_auto,
          team: unitData.team,
          status: unitData.status,
          locatie: unitData.locatie || '',
          incident: unitData.incident || '',
          basisteam_id: unitData.basisteam_id,
          created_at: new Date(),
          updated_at: new Date()
        }).returning();

        console.log('✅ Created police unit:', newUnit[0]);
        return c.json(newUnit[0]);
      }
    } catch (error) {
      console.error('Error creating/updating police unit:', error);
      return c.json({ error: 'Failed to create/update police unit' }, 500);
    }
  });

  // Basisteams routes
  app.get('/api/basisteams', async (c) => {
    try {
      const teams = await db.select().from(basisteams);
      return c.json(teams);
    } catch (error) {
      console.error('Error fetching basisteams:', error);
      return c.json({ error: 'Failed to fetch basisteams' }, 500);
    }
  });

  app.post('/api/basisteams', async (c) => {
    try {
      const teamData = await c.req.json();
      console.log('📝 Creating basisteam:', teamData);

      // Check if basisteam already exists
      const existingTeam = await db.select().from(basisteams).where(eq(basisteams.naam, teamData.naam)).limit(1);

      if (existingTeam.length > 0) {
        console.log('⚠️ Basisteam already exists:', existingTeam[0]);
        return c.json(existingTeam[0]);
      }

      // Insert new basisteam
      const newTeam = await db.insert(basisteams).values({
        naam: teamData.naam,
        code: teamData.code,
        kan_inzetten_buiten_gebied: teamData.kan_inzetten_buiten_gebied,
        max_aantal_eenheden: teamData.max_aantal_eenheden,
        zichtbaar_op_kaart: teamData.zichtbaar_op_kaart,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();

      console.log('✅ Created basisteam:', newTeam[0]);
      return c.json(newTeam[0]);
    } catch (error) {
      console.error('Error creating basisteam:', error);
      return c.json({ error: 'Failed to create basisteam' }, 500);
    }
  });

  app.put('/api/basisteams/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const teamData = await c.req.json();
      console.log('📝 Updating basisteam:', id, teamData);

      const updated = await db.update(basisteams)
        .set({
          naam: teamData.naam,
          code: teamData.code,
          kan_inzetten_buiten_gebied: teamData.kan_inzetten_buiten_gebied,
          max_aantal_eenheden: teamData.max_aantal_eenheden,
          zichtbaar_op_kaart: teamData.zichtbaar_op_kaart,
          updated_at: new Date()
        })
        .where(eq(basisteams.id, id))
        .returning();

      if (updated.length === 0) {
        return c.json({ error: 'Basisteam not found' }, 404);
      }

      console.log('✅ Updated basisteam:', updated[0]);
      return c.json(updated[0]);
    } catch (error) {
      console.error('Error updating basisteam:', error);
      return c.json({ error: 'Failed to update basisteam' }, 500);
    }
  });

  // Incidents routes
  app.get('/api/incidents', async (c) => {

  const httpServer = createServer(app);

  return httpServer;
}
```

Refactored code to include basisteam_id in police units and implemented basisteams API routes.