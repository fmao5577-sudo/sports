import { fetchText } from "@/lib/http";
import type { Locale, NewsItem } from "@/lib/types";
import { decodeHtml, hashId, uniqueBy } from "@/lib/utils";
import { remember } from "./cache";

type Feed = { source: string; url: string; lang: Locale };

const FEEDS: Feed[] = [
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml", lang: "en" },
  { source: "Sky Sports", url: "https://www.skysports.com/rss/12040", lang: "en" },
  { source: "Al Jazeera Sport", url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b1cd8d", lang: "ar" },
];

/** Fast path: fewer feeds on first load */
const FAST_FEEDS = FEEDS.slice(0, 2);

function extractTag(block: string, tag: string): string {
  const direct = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (direct?.[1]) return decodeHtml(direct[1].trim());
  return "";
}

function extractAttr(block: string, tag: string, attr: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function parseRss(xml: string, feed: Feed): NewsItem[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, 25).map((block) => {
    const title = extractTag(block, "title");
    const url = extractTag(block, "link") || extractTag(block, "guid");
    const summary = extractTag(block, "description").replace(/<[^>]+>/g, "").slice(0, 280);
    const published =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "dc:date") ||
      new Date().toISOString();
    const updated = extractTag(block, "updated") || published;
    const image =
      extractAttr(block, "media:content", "url") ||
      extractAttr(block, "media:thumbnail", "url") ||
      extractAttr(block, "enclosure", "url") ||
      (block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null);
    const publishedAt = Number.isNaN(Date.parse(published)) ? new Date().toISOString() : new Date(published).toISOString();
    const updatedAt = Number.isNaN(Date.parse(updated)) ? publishedAt : new Date(updated).toISOString();
    return {
      id: hashId(url || title),
      title,
      summary,
      image,
      source: feed.source,
      url,
      publishedAt,
      updatedAt,
      lang: feed.lang,
    };
  }).filter((item) => item.title && item.url);
}

export async function getNews(limit = 40, locale?: Locale): Promise<NewsItem[]> {
  const cached = await remember("news:all", 8 * 60_000, "rss-network", async () => {
    // Prefer speed: 2 feeds, 6s timeout each
    const batches = await Promise.allSettled(
      FAST_FEEDS.map(async (feed) => {
        const xml = await fetchText(feed.url, { timeoutMs: 6000 });
        return parseRss(xml, feed);
      }),
    );
    const items = batches.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    // Background: try remaining feeds without blocking
    const extra = FEEDS.slice(FAST_FEEDS.length);
    if (extra.length) {
      void Promise.allSettled(
        extra.map(async (feed) => {
          try {
            const xml = await fetchText(feed.url, { timeoutMs: 6000 });
            return parseRss(xml, feed);
          } catch {
            return [] as NewsItem[];
          }
        }),
      ).then(async (more) => {
        const add = more.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
        if (!add.length) return;
        const merged = uniqueBy([...items, ...add], (item) => item.url).sort(
          (a, b) => Date.parse(b.updatedAt || b.publishedAt) - Date.parse(a.updatedAt || a.publishedAt),
        );
        const { cacheSet } = await import("./cache");
        await cacheSet("news:all", merged, 8 * 60_000, "rss-network");
      });
    }
    return uniqueBy(items, (item) => item.url).sort(
      (a, b) => Date.parse(b.updatedAt || b.publishedAt) - Date.parse(a.updatedAt || a.publishedAt),
    );
  });

  const filtered = locale ? cached.data.filter((item) => item.lang === locale || item.lang === "en") : cached.data;
  return filtered.slice(0, limit);
}

export async function getNewsById(id: string): Promise<NewsItem | null> {
  const all = await getNews(80);
  return all.find((item) => item.id === id) ?? null;
}
