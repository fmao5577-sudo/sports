import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

/**
 * DB is OPTIONAL for speed.
 * Without DATABASE_URL the app runs on in-memory cache only (faster cold start).
 */
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaDb?: ReturnType<typeof drizzle<typeof schema>> | null;
};

function createDb() {
  if (!databaseUrl) return null;
  try {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 3_000,
      });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
    return drizzle(pool, { schema });
  } catch {
    return null;
  }
}

export const db = globalForDb.__arenaDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaDb = db;
}

export const hasDatabase = Boolean(db);
export { schema };
