import { jsonError, jsonOk } from "@/lib/api";
import { getHome } from "@/services/sports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const favorites = (searchParams.get("favorites") || "").split(",").filter(Boolean);
    const data = await getHome(favorites);
    return jsonOk({ ok: true, ...data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "home failed");
  }
}
