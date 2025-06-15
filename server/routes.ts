import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { gmsIncidents, insertGmsIncidentSchema } from "@shared/schema";
import { desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve GMS dispatch page
  app.get("/gms", (req, res) => {
    res.sendFile("gms-dispatch.html", { root: "." });
  });

  // GMS Incident routes
  app.post("/api/gms-incidents", async (req, res) => {
    try {
      const validatedData = insertGmsIncidentSchema.parse(req.body);
      const [incident] = await db
        .insert(gmsIncidents)
        .values(validatedData)
        .returning();
      res.json(incident);
    } catch (error) {
      console.error("Error creating GMS incident:", error);
      res.status(400).json({ error: "Invalid incident data" });
    }
  });

  app.get("/api/gms-incidents", async (req, res) => {
    try {
      const incidents = await db
        .select()
        .from(gmsIncidents)
        .orderBy(desc(gmsIncidents.aangemaaktOp));
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching GMS incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
