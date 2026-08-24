import { jsonError, jsonOk } from "@/lib/api";
import { getLiveMatches } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getLiveMatches();
    return jsonOk({ ok: true, ...data, lastUpdated: new Date().toISOString() });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "live failed");
  }
}
