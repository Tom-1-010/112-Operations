import { pgTable, text, serial, integer, timestamp, boolean, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
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

export interface AssignedUnit {
  roepnummer: string;
  soort_voertuig: string;
  ov_tijd?: string;
  ar_tijd?: string;
  tp_tijd?: string;
  nb_tijd?: string;
  am_tijd?: string;
  vr_tijd?: string;
  fd_tijd?: string;
  ga_tijd?: string;
}

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

  // Assigned units
  assignedUnits: jsonb("assigned_units").array().$type<AssignedUnit[]>(),
});

export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  functie: text("functie").notNull(),
  omschrijving: text("omschrijving").notNull(),
  telefoonnummer: text("telefoonnummer").notNull(),
  beginDienst: text("begin_dienst"),
  eindeDienst: text("einde_dienst"),
  bereikbaar24u: boolean("bereikbaar_24u").default(false),
  opmerkingen: text("opmerkingen"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Example table - you can modify or remove this
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Police units table for GMS-eenheden
export const policeUnits = pgTable("police_units", {
  id: serial("id").primaryKey(),
  roepnummer: text("roepnummer").notNull().unique(),
  aantal_mensen: integer("aantal_mensen").notNull().default(2),
  rollen: jsonb("rollen").notNull(),
  soort_auto: text("soort_auto").notNull(),
  team: text("team").notNull(),
  status: text("status").notNull().default("5 - Afmelden"),
  locatie: text("locatie"),
  incident: text("incident"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertPoliceUnitSchema = createInsertSchema(policeUnits);
export const selectPoliceUnitSchema = createSelectSchema(policeUnits);

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertGmsIncident = z.infer<typeof insertGmsIncidentSchema>;
export type GmsIncident = typeof gmsIncidents.$inferSelect;
export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export const karakteristieken = pgTable("karakteristieken", {
  id: serial("id").primaryKey(),
  ktNaam: text("kt_naam").notNull(),
  ktType: text("kt_type").notNull(),
  ktWaarde: text("kt_waarde"),
  ktCode: text("kt_code"),
  ktParser: text("kt_parser"), // Single parser per record
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKarakteristiekSchema = createInsertSchema(karakteristieken).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

export type InsertPoliceUnit = typeof policeUnits.$inferInsert;
export type SelectPoliceUnit = typeof policeUnits.$inferSelect;
export type InsertKarakteristiek = z.infer<typeof insertKarakteristiekSchema>;
export type Karakteristiek = typeof karakteristieken.$inferSelect;