---
name: create-migration
description: Create a new database migration for the nhimbe backend (D1/SQLite or MongoDB)
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Grep, Glob
---

Create a database migration for: $ARGUMENTS

## Current State
- Existing migrations: !`ls worker/src/db/migrations/`
- Total migration count: !`ls worker/src/db/migrations/ | wc -l`
- Schema: !`head -50 worker/src/db/schema.sql`

## Determine Database Target

nhimbe uses **two databases**:
- **D1 (SQLite)** — primary relational store (events, users, registrations, etc.)
- **MongoDB Atlas** — document store (via `MONGODB_URI` secret)

Infer the target from $ARGUMENTS:
- If the migration involves relational tables (events, users, registrations, follows, themes) → **D1**
- If the migration involves document collections, embedded docs, or flexible schemas → **MongoDB**
- If unclear, **default to D1** and ask for clarification

## Steps — D1 (SQLite) Migration

1. **Determine the next migration number.** List all files in `worker/src/db/migrations/`. Count total files (both numbered and unnumbered legacy files). The next number is total count + 1, zero-padded to 3 digits. Format: `NNN_description.sql` (e.g., `006_add_notifications.sql`).

   Legacy SQL files (unnumbered) are treated as migrations 001-005 in chronological order. New migrations always get the next sequential number.

2. **Read existing schema** (`worker/src/db/schema.sql`) and recent migrations to understand current tables and columns.

3. **Write the migration SQL file** to `worker/src/db/migrations/NNN_description.sql`:
   ```sql
   -- Migration NNN: <description>

   -- Add new table / alter existing table
   CREATE TABLE IF NOT EXISTS new_table (
     id TEXT PRIMARY KEY,
     created_at TEXT DEFAULT (datetime('now')),
     updated_at TEXT DEFAULT (datetime('now'))
   );

   -- Add indexes
   CREATE INDEX IF NOT EXISTS idx_new_table_field ON new_table(field);
   ```

4. **Update `worker/src/db/schema.sql`** to include the new table/column definitions.

5. **Update `worker/src/types.ts`** if the migration adds or modifies fields that need TypeScript type changes.

6. **Report what was created** and the command to run it:
   ```bash
   cd worker && wrangler d1 execute mukoko-nhimbe-db --file=./src/db/migrations/NNN_description.sql
   ```

### D1 Conventions

- Migration files are plain SQL (`.sql` extension)
- D1 is SQLite — use SQLite syntax (e.g., `TEXT` not `VARCHAR`, `datetime('now')` not `NOW()`)
- `ALTER TABLE` in SQLite only supports `ADD COLUMN` and `RENAME` (no `DROP COLUMN`, `ALTER COLUMN`)
- IDs are `TEXT PRIMARY KEY` (application-generated UUIDs)
- Timestamps are `TEXT DEFAULT (datetime('now'))` (ISO 8601 strings)
- Booleans are `INTEGER` or `BOOLEAN` (0/1 in SQLite)
- JSON stored as `TEXT` (parsed with `JSON()` in queries or application-side)
- Use `CREATE INDEX IF NOT EXISTS` for idempotent migrations
- Index naming: `idx_tableName_field`
- Table names use snake_case (e.g., `event_views`, `ai_conversations`)
- Always add `IF NOT EXISTS` / `IF EXISTS` guards for idempotency

## Steps — MongoDB Migration

1. **Determine the next migration number.** Same numbering as D1 (they share the sequence). Format: `NNN_description.ts` (e.g., `006_add_notifications.ts`).

2. **Read existing migrations** to understand current collections, indexes, and data shapes.

3. **Write the migration TypeScript file** to `worker/src/db/migrations/NNN_description.ts`:
   ```typescript
   // Migration NNN: <description>
   import { Db } from "mongodb";

   export async function up(db: Db): Promise<void> {
     // Create collections, indexes, insert seed data
   }

   export async function down(db: Db): Promise<void> {
     // Reverse the up() changes
   }
   ```

4. **Update `worker/src/types.ts`** if the migration adds or modifies collections/fields that need TypeScript type changes.

5. **Report what was created** and any manual steps needed.

### MongoDB Conventions

- Migration files are TypeScript with `up()` and `down()` exports
- Every `up()` must have a corresponding `down()` for rollback
- IDs are `string` (application-generated UUIDs or MongoDB ObjectIds)
- Timestamps are `Date` objects (not ISO strings)
- Use `createIndex()` for new indexes, not `ensureIndex()` (deprecated)
- Index naming: `idx_collectionName_field`
- Collections use camelCase (e.g., `eventViews`, `aiConversations`)
- Embedded documents preferred over joins for data accessed together
- Arrays of references (`ObjectId[]`) for many-to-many relationships
- Always set `{ unique: true }` on indexes that enforce uniqueness (e.g., `users.email`, `users.handle`, `events.slug`)
