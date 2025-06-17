import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPhoneNumberSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Phone numbers API
  app.get("/api/phone-numbers", async (req, res) => {
    try {
      const phoneNumbers = await storage.getPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch phone numbers" });
    }
  });

  app.post("/api/phone-numbers", async (req, res) => {
    try {
      const validatedData = insertPhoneNumberSchema.parse(req.body);
      const phoneNumber = await storage.createPhoneNumber(validatedData);
      res.status(201).json(phoneNumber);
    } catch (error) {
      res.status(400).json({ error: "Invalid phone number data" });
    }
  });

  app.put("/api/phone-numbers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPhoneNumberSchema.partial().parse(req.body);
      const phoneNumber = await storage.updatePhoneNumber(id, validatedData);
      
      if (!phoneNumber) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      res.json(phoneNumber);
    } catch (error) {
      res.status(400).json({ error: "Invalid phone number data" });
    }
  });

  app.delete("/api/phone-numbers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePhoneNumber(id);
      
      if (!success) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
