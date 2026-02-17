/**
 * Shared types for the nhimbe container app.
 * Schema.org types are defined in schema.ts.
 * This file provides app-level types (Hono context, etc.).
 */

import type { Db } from "mongodb";
import type { D1Client } from "./db.js";
import type { UserRole } from "./schema.js";

// Re-export all schema types for convenience
export type { UserRole } from "./schema.js";
export { hasPermission } from "./schema.js";

// Hono app context variables
export interface AppVariables {
  db: D1Client;
  mongodb: Db;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
}
