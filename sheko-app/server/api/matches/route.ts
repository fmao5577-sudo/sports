import { jsonError, jsonOk } from "@/lib/api";
import { compactYmd } from "@/lib/utils";
import { getMatches } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || compactYmd();
    const data = await getMatches(date);
    return jsonOk({ ok: true, date, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "matches failed");
  }
}
