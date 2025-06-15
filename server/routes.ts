import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dutch address search proxy endpoint
  app.get("/api/address/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 3) {
        return res.json({ response: { docs: [] } });
      }

      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest?q=${encodeURIComponent(q)}&fq=type:adres&rows=8&fl=weergavenaam,id,score`
      );
      
      if (!response.ok) {
        throw new Error('PDOK API request failed');
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Address search error:', error);
      res.status(500).json({ error: 'Address search failed' });
    }
  });

  // Dutch address lookup proxy endpoint
  app.get("/api/address/lookup", async (req, res) => {
    try {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Address ID required' });
      }

      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup?id=${encodeURIComponent(id)}&fl=weergavenaam,postcode,woonplaatsnaam,straatnaam,huis_nlt`
      );
      
      if (!response.ok) {
        throw new Error('PDOK API lookup failed');
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Address lookup error:', error);
      res.status(500).json({ error: 'Address lookup failed' });
    }
  });
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });



  const httpServer = createServer(app);

  return httpServer;
}
