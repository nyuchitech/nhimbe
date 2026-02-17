/**
 * MongoDB Atlas Client
 *
 * Primary data store for nhimbe. Uses connection pooling with a singleton
 * MongoClient instance. Collections are typed to schema.org interfaces.
 *
 * Required env vars:
 *   MONGODB_URI - MongoDB Atlas connection string
 */

import { MongoClient, ServerApiVersion, type Db, type Collection } from "mongodb";
import type {
  SchemaEvent,
  SchemaPerson,
  SchemaReview,
  SchemaRegistration,
  SchemaReferral,
  UserReferralCode,
  HostStats,
  SupportTicket,
  SupportMessage,
  AnalyticsEvent,
  Follow,
} from "./schema.js";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get a connected MongoDB database instance (singleton).
 * Reuses the same connection across requests.
 */
export async function getMongoDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing required env var: MONGODB_URI");
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db("nhimbe");
  return db;
}

/**
 * Close the MongoDB connection (for graceful shutdown).
 */
export async function closeMongoDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

// ── Typed Collection Accessors ──────────────────────────────────────

export function events(database: Db): Collection<SchemaEvent> {
  return database.collection<SchemaEvent>("events");
}

export function persons(database: Db): Collection<SchemaPerson> {
  return database.collection<SchemaPerson>("persons");
}

export function reviews(database: Db): Collection<SchemaReview> {
  return database.collection<SchemaReview>("reviews");
}

export function registrations(database: Db): Collection<SchemaRegistration> {
  return database.collection<SchemaRegistration>("registrations");
}

export function referrals(database: Db): Collection<SchemaReferral> {
  return database.collection<SchemaReferral>("referrals");
}

export function userReferralCodes(database: Db): Collection<UserReferralCode> {
  return database.collection<UserReferralCode>("userReferralCodes");
}

export function hostStats(database: Db): Collection<HostStats> {
  return database.collection<HostStats>("hostStats");
}

export function supportTickets(database: Db): Collection<SupportTicket> {
  return database.collection<SupportTicket>("supportTickets");
}

export function supportMessages(database: Db): Collection<SupportMessage> {
  return database.collection<SupportMessage>("supportMessages");
}

export function analyticsEvents(database: Db): Collection<AnalyticsEvent> {
  return database.collection<AnalyticsEvent>("analyticsEvents");
}

export function follows(database: Db): Collection<Follow> {
  return database.collection<Follow>("follows");
}
