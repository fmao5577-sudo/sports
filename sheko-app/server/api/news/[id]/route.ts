import { jsonError, jsonOk } from "@/lib/api";
import { getNewsById } from "@/services/news";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const item = await getNewsById(id);
    if (!item) return jsonError("not found", 404);
    return jsonOk({ ok: true, item });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "news item failed");
  }
}
