import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { 
  incidents, 
  insertIncidentSchema, 
  gmsIncidents, 
  insertGmsIncidentSchema,
  phoneNumbers,
  insertPhoneNumberSchema,
  karakteristieken,
  insertKarakteristiekSchema,
  policeUnits
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
      const gmsIncidentData = insertGmsIncidentSchema.parse(req.body);
      const [updatedGmsIncident] = await db
        .update(gmsIncidents)
        .set(gmsIncidentData)
        .where(eq(gmsIncidents.id, id))
        .returning();
      if (!updatedGmsIncident) {
        return res.status(404).json({ error: "GMS incident not found" });
      }
      res.json(updatedGmsIncident);
    } catch (error) {
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
      const [updatedUnit] = await db
        .update(policeUnits)
        .set({ ...body, updatedAt: new Date() })
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

  const httpServer = createServer(app);

  return httpServer;
}