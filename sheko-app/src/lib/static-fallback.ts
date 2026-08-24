function now() {
  return new Date().toISOString();
}

export function staticFallback(url: string): unknown {
  const path = url.split("?")[0];
  if (path === "/api/home") {
    return { ok: true, live: [], upcoming: [], finished: [], transfers: [], news: [], favoriteMatches: [], meta: { status: "stale", source: "static" } };
  }
  if (path === "/api/live") return { ok: true, live: [], leagues: [], lastUpdated: now() };
  if (path === "/api/matches") return { ok: true, date: "", leagues: [], matches: [] };
  if (path === "/api/news") return { ok: true, news: [] };
  if (path === "/api/injuries") return { ok: true, injuries: [], lastUpdated: now() };
  if (path === "/api/transfers") return { ok: true, items: [] };
  if (path === "/api/competitions") return { ok: true, competitions: [] };
  if (path === "/api/search") return { ok: true, query: "", players: [], teams: [], competitions: [], matches: [] };
  if (path.startsWith("/api/news/")) return { ok: true, item: null };
  if (path.startsWith("/api/")) return { ok: true, data: null };
  return null;
}
