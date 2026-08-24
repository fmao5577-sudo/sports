import { jsonError, jsonOk } from "@/lib/api";
import { getNews } from "@/services/news";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") === "ar" ? "ar" : searchParams.get("locale") === "en" ? "en" : undefined;
    const news = await getNews(Number(searchParams.get("limit") || 40), locale);
    return jsonOk({ ok: true, news });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "news failed");
  }
}
