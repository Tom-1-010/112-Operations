import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Support DATABASE_URL (Neon)
let pool: Pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  // Temporary fallback for development - create a mock pool
  console.warn("⚠️  No database configured - using mock database for development");
  pool = {
    query: async (text: string, params?: any[]) => {
      console.log(`Mock DB Query: ${text}`);
      return { rows: [] };
    }
  } as any;
}

export { pool };
export const db = drizzle({ client: pool, schema });