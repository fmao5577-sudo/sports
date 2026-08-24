"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/match-card";
import { usePrefs } from "@/components/providers";
import { EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { MatchSummary } from "@/lib/types";
import { addDays, compactYmd, ymd } from "@/lib/utils";

export default function MatchesPage() {
  const { dict, timezone } = usePrefs();
  const [offset, setOffset] = useState(0);
  const date = useMemo(() => compactYmd(addDays(new Date(), offset), timezone || undefined), [offset, timezone]);
  const label = offset === 0 ? dict.today : offset === -1 ? dict.yesterday : offset === 1 ? dict.tomorrow : ymd(addDays(new Date(), offset));
  const { data, loading, error } = useApi<{ leagues: { id: string; name: string; matches: MatchSummary[] }[] }>(`/api/matches?date=${date}`, 45000);
  const [tab, setTab] = useState<"all" | "live" | "upcoming" | "finished">("all");

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="sheko-chip" onClick={() => setOffset((v) => v - 1)}>‹</button>
        <h1 className="text-xl font-semibold">{dict.matches} · {label}</h1>
        <button type="button" className="sheko-chip" onClick={() => setOffset((v) => v + 1)}>›</button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["all", "live", "upcoming", "finished"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`sheko-chip ${tab === item ? "bg-[var(--pitch)] text-black" : ""}`}>
            {item === "all" ? dict.all : dict[item === "upcoming" ? "upcoming" : item === "finished" ? "finished" : "live"]}
          </button>
        ))}
      </div>
      {loading && !data ? <Skeleton className="h-40" /> : null}
      {error && !data ? <EmptyState title={error} /> : null}
      {data?.leagues.map((league) => {
        const matches = league.matches.filter((match) => {
          if (tab === "live") return match.live;
          if (tab === "upcoming") return match.status === "scheduled";
          if (tab === "finished") return match.finished;
          return true;
        });
        if (!matches.length) return null;
        return (
          <section key={league.id} className="grid gap-3">
            <a href={`/competitions/${league.id}`} className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">{league.name}</a>
            {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </section>
        );
      })}
    </div>
  );
}
