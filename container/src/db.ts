/**
 * D1 REST API Client
 *
 * Cloudflare Containers don't have direct D1 bindings.
 * This client uses the Cloudflare API to query D1.
 *
 * Required env vars:
 *   CF_ACCOUNT_ID    - Cloudflare account ID
 *   CF_API_TOKEN     - API token with D1 read/write
 *   CF_DATABASE_ID   - D1 database UUID
 */

export interface D1QueryResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    served_by: string;
  };
}

interface D1ApiResponse<T> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export class D1Client {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(accountId: string, apiToken: string, databaseId: string) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Execute a single SQL query with optional parameters.
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<D1QueryResult<T>> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`D1 query failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as D1ApiResponse<T>;

    if (!data.success) {
      throw new Error(`D1 query error: ${data.errors.map((e) => e.message).join(", ")}`);
    }

    return data.result[0];
  }

  /**
   * Execute a query and return the first result row, or null.
   */
  async first<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.results[0] ?? null;
  }

  /**
   * Execute a query and return all result rows.
   */
  async all<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.results;
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE) and return meta.
   */
  async run(
    sql: string,
    params: unknown[] = []
  ): Promise<{ changes: number; lastRowId: number }> {
    const result = await this.query(sql, params);
    return {
      changes: result.meta.changes,
      lastRowId: result.meta.last_row_id,
    };
  }

  /**
   * Execute multiple queries in a batch (transaction).
   */
  async batch<T = Record<string, unknown>>(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1QueryResult<T>[]> {
    // D1 REST API doesn't have a batch endpoint yet,
    // so we execute sequentially. For atomicity, wrap in a transaction.
    const results: D1QueryResult<T>[] = [];
    await this.query("BEGIN");
    try {
      for (const stmt of statements) {
        results.push(await this.query<T>(stmt.sql, stmt.params || []));
      }
      await this.query("COMMIT");
    } catch (error) {
      await this.query("ROLLBACK").catch(() => {});
      throw error;
    }
    return results;
  }
}

/**
 * Create a D1Client from environment variables.
 */
export function createD1Client(): D1Client {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  const databaseId = process.env.CF_DATABASE_ID;

  if (!accountId || !apiToken || !databaseId) {
    throw new Error(
      "Missing required env vars: CF_ACCOUNT_ID, CF_API_TOKEN, CF_DATABASE_ID"
    );
  }

  return new D1Client(accountId, apiToken, databaseId);
}
