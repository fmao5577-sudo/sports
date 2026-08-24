import { jsonError, jsonOk } from "@/lib/api";
import { getInjuries } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teams = (searchParams.get("teams") || "").split(",").filter(Boolean);
    const injuries = await getInjuries(teams.length ? teams : undefined);
    return jsonOk({ ok: true, injuries, lastUpdated: new Date().toISOString() });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "injuries failed");
  }
}
