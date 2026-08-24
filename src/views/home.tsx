"use client";

import { MatchCard } from "@/components/match-card";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, Freshness, SectionTitle, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { MatchSummary, NewsItem, TransferRecord } from "@/lib/types";
import { FEATURED_COMPETITIONS } from "@/lib/competitions";
import { relativeTime } from "@/lib/utils";

type HomeResponse = {
  live: MatchSummary[];
  upcoming: MatchSummary[];
  finished: MatchSummary[];
  featured: { id: string; name: string; matches: MatchSummary[] }[];
  news: NewsItem[];
  transfers: TransferRecord[];
  favoriteMatches: MatchSummary[];
  meta?: { lastUpdated?: string; status?: "fresh" | "updating" | "delayed" | "offline" };
};

export default function HomePage() {
  const { dict, favorites, locale } = usePrefs();
  const favIds = favorites.filter((item) => item.type === "team").map((item) => item.id).join(",");
  const { data, loading, error, updatedAt } = useApi<HomeResponse>(`/api/home?favorites=${favIds}`, 30000);

  if (loading && !data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (error && !data) return <EmptyState title={error} />;

  return (
    <div className="grid gap-8">
      <section className="sheko-card overflow-hidden">
        <div className="relative min-h-[180px] bg-[url('https://images.pexels.com/photos/30651230/pexels-photo-30651230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
          <div className="relative flex h-full flex-col justify-end p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--pitch)]">SHEKO SPORTS</p>
            <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight">{dict.tagline}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Freshness status={data?.meta?.status || "fresh"} />
              {updatedAt ? <span className="sheko-chip">{relativeTime(updatedAt, locale)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      {data?.favoriteMatches?.length ? (
        <section>
          <SectionTitle title={dict.personalized} href="/favorites" />
          <div className="grid gap-3 md:grid-cols-2">{data.favoriteMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
        </section>
      ) : null}

      <section>
        <SectionTitle title={dict.live} href="/live" />
        {data?.live?.length ? (
          <div className="grid gap-3 md:grid-cols-2">{data.live.slice(0, 6).map((match) => <MatchCard key={match.id} match={match} />)}</div>
        ) : (
          <EmptyState title={dict.emptyLive} />
        )}
      </section>

      <section>
        <SectionTitle title={dict.featured} href="/competitions" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {FEATURED_COMPETITIONS.map((comp) => (
            <a key={comp.id} href={`/competitions/${comp.id}`} className="sheko-card min-w-[168px] p-3">
              <Crest src={comp.logo} alt={comp.name} size={34} />
              <p className="mt-3 text-sm font-medium">{locale === "ar" ? comp.nameAr : comp.name}</p>
              <p className="text-[11px] text-[var(--muted)]">{comp.country}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <SectionTitle title={dict.upcoming} href="/matches" />
          <div className="grid gap-3">{data?.upcoming.slice(0, 6).map((match) => <MatchCard key={match.id} match={match} compact />)}</div>
        </section>
        <section>
          <SectionTitle title={dict.finished} href="/matches" />
          <div className="grid gap-3">{data?.finished.slice(0, 6).map((match) => <MatchCard key={match.id} match={match} compact />)}</div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <SectionTitle title={dict.transferCenter} href="/transfers" />
          <div className="grid gap-3">
            {data?.transfers.slice(0, 6).map((item) => (
              <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card flex items-center gap-3 p-3">
                <Crest src={item.playerPhoto} alt={item.playerName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.playerName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{item.fromClub} → {item.toClub}</p>
                </div>
                <span className="text-xs text-[var(--gold)]">{item.fee || item.status}</span>
              </a>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle title={dict.news} href="/news" />
          <div className="grid gap-3">
            {data?.news.slice(0, 6).map((item) => (
              <a key={item.id} href={`/news/${item.id}`} className="sheko-card flex gap-3 p-3">
                {item.image ? <img src={item.image} alt="" className="h-16 w-20 rounded-xl object-cover" /> : null}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{item.source} · {relativeTime(item.publishedAt, locale)}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
