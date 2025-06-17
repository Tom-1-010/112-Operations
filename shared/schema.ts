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

// GMS incidents table for the dispatch simulator
export const gmsIncidents = pgTable("gms_incidents", {
  id: serial("id").primaryKey(),
  
  // Meldergegevens
  melderNaam: text("melder_naam"),
  melderAdres: text("melder_adres"),
  telefoonnummer: text("telefoonnummer"),
  
  // Meldingslocatie
  straatnaam: text("straatnaam"),
  huisnummer: text("huisnummer"),
  toevoeging: text("toevoeging"),
  postcode: text("postcode"),
  plaatsnaam: text("plaatsnaam"),
  gemeente: text("gemeente"),
  
  // Classificaties
  mc1: text("mc1"),
  mc2: text("mc2"),
  mc3: text("mc3"),
  
  // Tijdstip en prioriteit
  tijdstip: text("tijdstip").notNull(),
  prioriteit: integer("prioriteit").notNull().default(3),
  
  // Status en logging
  status: text("status").notNull().default("Nieuw"),
  meldingslogging: text("meldingslogging"),
  notities: text("notities"),
  
  // Metadata
  aangemaaktOp: timestamp("aangemaakt_op").notNull().defaultNow(),
  afgesloten: timestamp("afgesloten"),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  timestamp: true,
});

export const insertUnitSchema = createInsertSchema(units);

export const insertGmsIncidentSchema = createInsertSchema(gmsIncidents).omit({
  id: true,
  aangemaaktOp: true,
  afgesloten: true,
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertGmsIncident = z.infer<typeof insertGmsIncidentSchema>;
export type GmsIncident = typeof gmsIncidents.$inferSelect;
