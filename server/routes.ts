import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { phoneNumbers, insertPhoneNumberSchema, gmsIncidents, insertGmsIncidentSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}