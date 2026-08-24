import { jsonError, jsonOk } from "@/lib/api";
import { getCompetitions } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const competitions = await getCompetitions();
    return jsonOk({ ok: true, competitions });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "competitions failed");
  }
}
