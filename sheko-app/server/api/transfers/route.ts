import { jsonError, jsonOk } from "@/lib/api";
import { getTransfers } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getTransfers({
      rumour: searchParams.get("rumour") === "1",
      teamId: searchParams.get("team") || undefined,
      leagueId: searchParams.get("league") || undefined,
      range: searchParams.get("range") || undefined,
    });
    return jsonOk({ ok: true, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "transfers failed");
  }
}
