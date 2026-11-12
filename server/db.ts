import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, samples, InsertSample, Sample, movements, InsertMovement, Movement, shipments, InsertShipment, Shipment, sampleCodeMetadata, InsertSampleCodeMetadata, SampleCodeMetadata } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // For OAuth users
    if (user.openId) {
      const values: InsertUser = {
        openId: user.openId,
        name: user.name || "",
        email: user.email || "",
        loginMethod: user.loginMethod || "oauth",
        lastSignedIn: user.lastSignedIn || new Date(),
      };
      const updateSet: Record<string, unknown> = {
        lastSignedIn: new Date(),
      };

      if (user.name) updateSet.name = user.name;
      if (user.email) updateSet.email = user.email;
      if (user.role) updateSet.role = user.role;

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
    }
    // For email/password users
    else if (user.email && user.password) {
      const values: InsertUser = {
        name: user.name || "",
        email: user.email,
        password: user.password,
        loginMethod: "email",
        lastSignedIn: user.lastSignedIn || new Date(),
      };

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: {
          lastSignedIn: new Date(),
        },
      });
    } else {
      throw new Error("Either openId or email+password is required");
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Sample queries
export async function getAllSamples(): Promise<Sample[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(samples);
}

export async function getSampleById(id: string): Promise<Sample | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(samples).where(eq(samples.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSample(data: InsertSample): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(samples).values(data);
  return data.id;
}

export async function updateSample(id: string, data: Partial<InsertSample>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(samples).set(data).where(eq(samples.id, id));
}

export async function deleteSample(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(samples).where(eq(samples.id, id));
}

// Movement queries
export async function getAllMovements(): Promise<Movement[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movements);
}

export async function getMovementsBySampleId(sampleId: string): Promise<Movement[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movements).where(eq(movements.sampleId, sampleId));
}

export async function createMovement(data: InsertMovement): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(movements).values(data);
  return data.id;
}

// Shipment queries
export async function getAllShipments(): Promise<Shipment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shipments);
}

export async function createShipment(data: InsertShipment): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(shipments).values(data);
  return data.id;
}

// Sample code metadata queries
export async function getSampleCodeMetadata(code: string, species: "TOPAZ" | "PLACCO"): Promise<SampleCodeMetadata | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sampleCodeMetadata).where(and(eq(sampleCodeMetadata.code, code), eq(sampleCodeMetadata.species, species))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSampleCodeMetadata(data: InsertSampleCodeMetadata): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sampleCodeMetadata).values(data);
  return data.id;
}
