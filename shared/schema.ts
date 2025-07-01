import { pgTable, text, serial, integer, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  meldnummer: text("meldnummer").notNull(),
  prioriteit: text("prioriteit").notNull(),
  classificatie: text("classificatie").notNull(),
  omschrijving: text("omschrijving").notNull(),
  locatie: text("locatie").notNull(),
  melder: text("melder"),
  telefoon: text("telefoon"),
  toegewezen_eenheden: jsonb("toegewezen_eenheden").$type<string[]>().default([]),
  status: text("status").notNull().default("Open"),
  tijdstip: timestamp("tijdstip").defaultNow().notNull(),
  afgehandeld_op: timestamp("afgehandeld_op"),
  opmerkingen: text("opmerkingen"),
  kenmerken: jsonb("kenmerken").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const basisteams = pgTable("basisteams", {
  id: serial("id").primaryKey(),
  naam: text("naam").notNull(),
  code: text("code").notNull().unique(), // A1, A2, A3, B1, B2
  adres: text("adres"),
  polygon: jsonb("polygon").$type<[number, number][]>().notNull(),
  gemeentes: jsonb("gemeentes").$type<string[]>().default([]),
  actief: boolean("actief").default(true).notNull(),
  kan_inzetten_buiten_gebied: boolean("kan_inzetten_buiten_gebied").default(false).notNull(),
  max_aantal_eenheden: integer("max_aantal_eenheden").default(20).notNull(),
  zichtbaar_op_kaart: boolean("zichtbaar_op_kaart").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const policeUnits = pgTable("police_units", {
  id: serial("id").primaryKey(),
  roepnummer: text("roepnummer").notNull().unique(),
  aantal_mensen: integer("aantal_mensen").notNull().default(2),
  rollen: jsonb("rollen").$type<string[]>().notNull(),
  soort_auto: text("soort_auto").notNull(),
  team: text("team").notNull(),
  basisteam_id: integer("basisteam_id").references(() => basisteams.id),
  status: text("status").notNull().default("5 - Afmelden"),
  locatie: text("locatie"),
  incident: text("incident"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertIncidentSchema = createInsertSchema(incidents);
export const selectIncidentSchema = createSelectSchema(incidents);
export const insertBasisteamSchema = createInsertSchema(basisteams);
export const selectBasisteamSchema = createSelectSchema(basisteams);
export const insertPoliceUnitSchema = createInsertSchema(policeUnits);
export const selectPoliceUnitSchema = createSelectSchema(policeUnits);
export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertKarakteristiekSchema = createInsertSchema(karakteristieken).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = z.infer<typeof selectIncidentSchema>;
export type InsertBasisteam = z.infer<typeof insertBasisteamSchema>;
export type Basisteam = z.infer<typeof selectBasisteamSchema>;
export type InsertPoliceUnit = z.infer<typeof insertPoliceUnitSchema>;
export type PoliceUnit = z.infer<typeof selectPoliceUnitSchema>;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;
export type InsertKarakteristiek = z.infer<typeof insertKarakteristiekSchema>;
export type Karakteristiek = typeof karakteristieken.$inferSelect;