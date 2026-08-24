import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entities, entityAliases } from "@/db/schema";
import { hashId, normalizeName } from "@/lib/utils";

export async function upsertEntity(input: {
  type: "player" | "team" | "competition";
  name: string;
  source: string;
  sourceId: string;
  payload: unknown;
}) {
  const normalized = normalizeName(input.name);
  const id = `${input.type}:${input.source}:${input.sourceId}`;
  const now = new Date();
  try {
    const existingAlias = await db
      .select()
      .from(entityAliases)
      .where(eq(entityAliases.alias, `${input.source}:${normalized}`))
      .limit(1);
    const entityId = existingAlias[0]?.entityId || id;
    await db
      .insert(entities)
      .values({
        id: entityId,
        type: input.type,
        canonicalName: input.name,
        normalizedName: normalized,
        primarySource: input.source,
        sourceIds: { [input.source]: input.sourceId },
        payload: input.payload,
        lastVerifiedAt: now,
      })
      .onConflictDoUpdate({
        target: entities.id,
        set: {
          payload: input.payload,
          lastVerifiedAt: now,
          canonicalName: input.name,
        },
      });
    await db
      .insert(entityAliases)
      .values({
        id: hashId(`${entityId}:${input.source}:${input.sourceId}`),
        entityId,
        alias: `${input.source}:${normalized}`,
        source: input.source,
        sourceId: input.sourceId,
      })
      .onConflictDoNothing();
    return entityId;
  } catch {
    return id;
  }
}

export async function resolveEntity(type: string, name: string, source?: string) {
  const normalized = normalizeName(name);
  try {
    const aliasRows = await db.select().from(entityAliases);
    const match = aliasRows.find((row) => {
      const aliasName = row.alias.split(":").slice(1).join(":");
      return aliasName === normalized && (!source || row.source === source);
    });
    if (!match) return null;
    const rows = await db.select().from(entities).where(eq(entities.id, match.entityId)).limit(1);
    return rows[0] && rows[0].type === type ? rows[0] : rows[0];
  } catch {
    return null;
  }
}
