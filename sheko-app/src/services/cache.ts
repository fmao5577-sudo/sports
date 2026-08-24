import { and, eq, gt, lt } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { cacheEntries, sourceHealth } from "@/db/schema";

type MemoryItem = {
  payload: unknown;
  expiresAt: number;
  fetchedAt: number;
  source: string;
  confidence: string;
};

const memory = new Map<string, MemoryItem>();

export async function cacheGet<T>(key: string): Promise<{
  payload: T;
  stale: boolean;
  fetchedAt: string;
  source: string;
  confidence: string;
} | null> {
  // 1) Hot path: memory only (no DB wait)
  const mem = memory.get(key);
  if (mem) {
    const stale = mem.expiresAt <= Date.now();
    // Fresh memory hit — return immediately
    if (!stale) {
      return {
        payload: mem.payload as T,
        stale: false,
        fetchedAt: new Date(mem.fetchedAt).toISOString(),
        source: mem.source,
        confidence: mem.confidence,
      };
    }
    // Stale memory — still return for SWR, but try DB in background only if available
  }

  if (!hasDatabase || !db) {
    if (!mem) return null;
    return {
      payload: mem.payload as T,
      stale: true,
      fetchedAt: new Date(mem.fetchedAt).toISOString(),
      source: mem.source,
      confidence: mem.confidence,
    };
  }

  try {
    const rows = await db
      .select()
      .from(cacheEntries)
      .where(eq(cacheEntries.key, key))
      .limit(1);
    const row = rows[0];
    if (!row) {
      if (!mem) return null;
      return {
        payload: mem.payload as T,
        stale: true,
        fetchedAt: new Date(mem.fetchedAt).toISOString(),
        source: mem.source,
        confidence: mem.confidence,
      };
    }
    const expired = row.expiresAt.getTime() <= Date.now();
    memory.set(key, {
      payload: row.payload,
      expiresAt: row.expiresAt.getTime(),
      fetchedAt: row.fetchedAt.getTime(),
      source: row.source,
      confidence: row.confidence,
    });
    return {
      payload: row.payload as T,
      stale: expired,
      fetchedAt: row.fetchedAt.toISOString(),
      source: row.source,
      confidence: row.confidence,
    };
  } catch {
    if (!mem) return null;
    return {
      payload: mem.payload as T,
      stale: true,
      fetchedAt: new Date(mem.fetchedAt).toISOString(),
      source: mem.source,
      confidence: mem.confidence,
    };
  }
}

export async function cacheSet(
  key: string,
  payload: unknown,
  ttlMs: number,
  source: string,
  confidence = "high",
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  // Always write memory synchronously
  memory.set(key, {
    payload,
    expiresAt: expiresAt.getTime(),
    fetchedAt: now.getTime(),
    source,
    confidence,
  });

  // Persist to DB in background — never block the request
  if (!hasDatabase || !db) return;
  void (async () => {
    try {
      await db
        .insert(cacheEntries)
        .values({
          key,
          payload,
          source,
          confidence,
          fetchedAt: now,
          expiresAt,
          lastUpdated: now,
        })
        .onConflictDoUpdate({
          target: cacheEntries.key,
          set: {
            payload,
            source,
            confidence,
            fetchedAt: now,
            expiresAt,
            lastUpdated: now,
          },
        });
    } catch {
      // ignore DB write failures
    }
  })();
}

/**
 * Stale-while-revalidate style remember:
 * - fresh cache → instant
 * - stale cache → return stale immediately AND refresh in background when possible
 * - miss → await loader
 */
export async function remember<T>(
  key: string,
  ttlMs: number,
  source: string,
  loader: () => Promise<T>,
  options?: { staleOk?: boolean },
): Promise<{ data: T; cached: boolean; fetchedAt: string; stale: boolean; source: string }> {
  const hit = await cacheGet<T>(key);
  if (hit && !hit.stale) {
    return { data: hit.payload, cached: true, fetchedAt: hit.fetchedAt, stale: false, source: hit.source };
  }

  // Stale hit: return immediately, refresh in background
  if (hit && (options?.staleOk ?? true)) {
    void (async () => {
      try {
        const data = await loader();
        await cacheSet(key, data, ttlMs, source);
      } catch {
        // keep stale
      }
    })();
    return { data: hit.payload, cached: true, fetchedAt: hit.fetchedAt, stale: true, source: hit.source };
  }

  try {
    const data = await loader();
    await cacheSet(key, data, ttlMs, source);
    return { data, cached: false, fetchedAt: new Date().toISOString(), stale: false, source };
  } catch (error) {
    if (hit && (options?.staleOk ?? true)) {
      return { data: hit.payload, cached: true, fetchedAt: hit.fetchedAt, stale: true, source: hit.source };
    }
    throw error;
  }
}

export async function markSource(source: string, ok: boolean, latencyMs?: number, error?: string) {
  if (!hasDatabase || !db) return;
  // fire-and-forget health tracking
  void (async () => {
    try {
      const now = new Date();
      await db
        .insert(sourceHealth)
        .values({
          source,
          status: ok ? "up" : "down",
          lastSuccessAt: ok ? now : null,
          lastErrorAt: ok ? null : now,
          lastError: error ?? null,
          latencyMs: latencyMs ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: sourceHealth.source,
          set: {
            status: ok ? "up" : "down",
            lastSuccessAt: ok ? now : undefined,
            lastErrorAt: ok ? undefined : now,
            lastError: error ?? null,
            latencyMs: latencyMs ?? null,
            updatedAt: now,
          },
        });
    } catch {
      // ignore
    }
  })();
}

export async function pruneCache() {
  if (!hasDatabase || !db) return;
  try {
    await db.delete(cacheEntries).where(lt(cacheEntries.expiresAt, new Date(Date.now() - 1000 * 60 * 60 * 24)));
  } catch {
    // ignore
  }
}

export async function getSourceHealth() {
  if (!hasDatabase || !db) return [];
  try {
    return await db.select().from(sourceHealth);
  } catch {
    return [];
  }
}
