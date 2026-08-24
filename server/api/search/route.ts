import { jsonError, jsonOk } from "@/lib/api";
import { searchAll } from "@/services/sports";
import { db } from "@/db";
import { searchHistory } from "@/db/schema";
import { hashId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const clientId = searchParams.get("client") || "";
    const data = await searchAll(q);
    if (q.trim().length > 1 && clientId) {
      try {
        await db.insert(searchHistory).values({
          id: hashId(`${clientId}:${q}:${Date.now()}`),
          clientId,
          query: q.trim().slice(0, 80),
        });
      } catch {
        // ignore history write
      }
    }
    return jsonOk({ ok: true, query: q, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "search failed");
  }
}
