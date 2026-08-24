"use client";

import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { InjuryRecord } from "@/lib/types";

export default function InjuriesPage() {
  const { dict, favorites } = usePrefs();
  const teams = favorites.filter((item) => item.type === "team").map((item) => item.id).join(",");
  const { data, loading, error } = useApi<{ injuries: InjuryRecord[] }>(`/api/injuries${teams ? `?teams=${teams}` : ""}`, 120000);
  if (loading && !data) return <Skeleton className="h-40" />;
  if (error && !data) return <EmptyState title={error} />;
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{dict.injuriesSuspensions}</h1>
      {data?.injuries.map((item) => (
        <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card flex items-center gap-3 p-4">
          <Crest src={item.playerPhoto} alt={item.playerName} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.playerName}</p>
            <p className="text-sm text-[var(--muted)]">{item.teamName} · {item.kind} · {item.expectedReturn}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.source} · {item.lastUpdated.slice(0, 16)}</p>
          </div>
        </a>
      ))}
      {!data?.injuries.length ? <EmptyState title={dict.noData} /> : null}
    </div>
  );
}
