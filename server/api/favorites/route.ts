import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites, notifications, recentlyViewed, userPrefs } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { hashId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get("client");
    if (!clientId) return jsonOk({ ok: true, favorites: [], notifications: [], recent: [] });
    const [favs, notes, recent] = await Promise.all([
      db.select().from(favorites).where(eq(favorites.clientId, clientId)),
      db.select().from(notifications).where(eq(notifications.clientId, clientId)).orderBy(desc(notifications.createdAt)).limit(30),
      db.select().from(recentlyViewed).where(eq(recentlyViewed.clientId, clientId)).orderBy(desc(recentlyViewed.viewedAt)).limit(20),
    ]);
    return jsonOk({ ok: true, favorites: favs, notifications: notes, recent });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "favorites failed");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      entityName?: string;
      extra?: Record<string, string | number | null>;
      href?: string;
      locale?: string;
      theme?: string;
      timezone?: string;
    };
    const clientId = body.clientId;
    if (!clientId) return jsonError("clientId required", 400);

    if (body.action === "view" && body.entityType && body.entityId && body.entityName && body.href) {
      await db.insert(recentlyViewed).values({
        id: hashId(`${clientId}:${body.entityType}:${body.entityId}`),
        clientId,
        entityType: body.entityType,
        entityId: body.entityId,
        entityName: body.entityName,
        href: body.href,
      }).onConflictDoNothing();
      return jsonOk({ ok: true });
    }

    if (body.action === "prefs") {
      await db
        .insert(userPrefs)
        .values({
          clientId,
          locale: body.locale || "ar",
          theme: body.theme || "dark",
          timezone: body.timezone || null,
        })
        .onConflictDoUpdate({
          target: userPrefs.clientId,
          set: {
            locale: body.locale || "ar",
            theme: body.theme || "dark",
            timezone: body.timezone || null,
            updatedAt: new Date(),
          },
        });
      return jsonOk({ ok: true });
    }

    if (!body.entityType || !body.entityId || !body.entityName) return jsonError("entity required", 400);
    const id = hashId(`${clientId}:${body.entityType}:${body.entityId}`);
    if (body.action === "remove") {
      await db.delete(favorites).where(eq(favorites.id, id));
      return jsonOk({ ok: true });
    }
    await db
      .insert(favorites)
      .values({
        id,
        clientId,
        entityType: body.entityType,
        entityId: body.entityId,
        entityName: body.entityName,
        extra: body.extra,
      })
      .onConflictDoNothing();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "favorites write failed");
  }
}
