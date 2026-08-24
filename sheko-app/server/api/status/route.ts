import { jsonOk } from "@/lib/api";
import { getSourceHealth } from "@/services/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = await getSourceHealth();
  return jsonOk({
    ok: true,
    sources,
    providers: {
      fotmob: "primary live/fixtures/squads/transfers",
      rss: "news aggregation",
      footballData: Boolean(process.env.FOOTBALL_DATA_API_KEY),
      apiFootball: Boolean(process.env.API_FOOTBALL_KEY),
    },
    now: new Date().toISOString(),
  });
}
