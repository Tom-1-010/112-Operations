import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  unitsAssigned: integer("units_assigned").notNull().default(1),
  priority: text("priority").notNull(), // 'low', 'medium', 'high'
  status: text("status").notNull().default("active"), // 'active', 'accepted', 'closed'
});

export const units = pgTable("units", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'patrol', 'motorcycle', 'dog', 'riot'
  status: text("status").notNull(), // 'active', 'inactive', 'busy'
  name: text("name").notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  timestamp: true,
});

export const insertUnitSchema = createInsertSchema(units);

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
