import { jsonError, jsonOk } from "@/lib/api";
import { getStandings } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const standings = await getStandings(id);
    return jsonOk({ ok: true, standings });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "standings failed");
  }
}
