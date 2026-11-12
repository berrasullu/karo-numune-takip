import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. Can be null for email/password auth. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Inventory samples table
export const samples = mysqlTable("samples", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  species: mysqlEnum("species", ["TOPAZ", "PLACCO"]).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  size: varchar("size", { length: 255 }).notNull(),
  finish: varchar("finish", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  quantity: int("quantity").default(0).notNull(),
  minimumQuantity: int("minimumQuantity").default(5).notNull(),
  notes: text("notes"),
  photoUri: text("photoUri"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sample = typeof samples.$inferSelect;
export type InsertSample = typeof samples.$inferInsert;

// Stock movements table
export const movements = mysqlTable("movements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  sampleId: varchar("sampleId", { length: 64 }).notNull(),
  sampleName: varchar("sampleName", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["in", "out", "count", "gönderim"]).notNull(),
  quantityDelta: int("quantityDelta").notNull(),
  resultingQuantity: int("resultingQuantity").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Movement = typeof movements.$inferSelect;
export type InsertMovement = typeof movements.$inferInsert;

// Sample shipments table
export const shipments = mysqlTable("shipments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  sampleIds: text("sampleIds").notNull(), // JSON array as string
  employeeName: varchar("employeeName", { length: 255 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  shippingMethod: mysqlEnum("shippingMethod", ["kargo", "müşteri_alması", "kargo_ve_müşteri"]).default("kargo").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

// Sample code metadata table
export const sampleCodeMetadata = mysqlTable("sampleCodeMetadata", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  species: mysqlEnum("species", ["TOPAZ", "PLACCO"]).notNull(),
  color: varchar("color", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SampleCodeMetadata = typeof sampleCodeMetadata.$inferSelect;
export type InsertSampleCodeMetadata = typeof sampleCodeMetadata.$inferInsert;
