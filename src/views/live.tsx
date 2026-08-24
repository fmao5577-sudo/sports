"use client";

import { MatchCard } from "@/components/match-card";
import { usePrefs } from "@/components/providers";
import { EmptyState, Freshness, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { MatchSummary } from "@/lib/types";

export default function LivePage() {
  const { dict } = usePrefs();
  const { data, loading, error, updatedAt } = useApi<{ live: MatchSummary[]; leagues: { id: string; name: string; matches: MatchSummary[] }[] }>("/api/live", 20000);

  if (loading && !data) return <div className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (error && !data) return <EmptyState title={error} />;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{dict.live}</h1>
          <p className="text-sm text-[var(--muted)]">{data?.live.length || 0} {dict.followLive}</p>
        </div>
        <Freshness status={data?.live.length ? "fresh" : "updating"} />
      </div>
      {!data?.live.length ? <EmptyState title={dict.emptyLive} /> : null}
      {data?.leagues.map((league) => (
        <section key={league.id} className="grid gap-3">
          <h2 className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">{league.name}</h2>
          {league.matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </section>
      ))}
      {updatedAt ? <p className="text-[11px] text-[var(--muted)]">{dict.lastUpdated}: {updatedAt}</p> : null}
    </div>
  );
}
