import { jsonError, jsonOk } from "@/lib/api";
import { getCompetition } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const data = await getCompetition(id);
    return jsonOk({ ok: true, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "competition failed");
  }
}
