"use client";

import type { MatchSummary } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { usePrefs } from "./providers";
import { Crest } from "./ui";

export function MatchCard({ match, compact = false }: { match: MatchSummary; compact?: boolean }) {
  const { locale, timezone } = usePrefs();
  return (
    <a href={`/match/${match.id}`} className="sheko-card block p-3 transition hover:-translate-y-0.5">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <span className="flex min-w-0 items-center gap-2">
          <Crest src={match.competitionLogo} alt={match.competitionName} size={16} />
          <span className="truncate">{match.competitionName}</span>
        </span>
        {match.live ? (
          <span className="inline-flex items-center gap-1 text-[var(--live)]">
            <span className="pulse-dot" /> {match.minute || "LIVE"}
          </span>
        ) : (
          <span>{match.finished ? match.statusLabel : formatTime(match.kickoff, timezone || undefined, locale)}</span>
        )}
      </div>
      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 ${compact ? "text-sm" : ""}`}>
        <div className="flex min-w-0 items-center gap-2">
          <Crest src={match.home.logo} alt={match.home.name} size={compact ? 22 : 28} />
          <span className="truncate font-medium">{match.home.name}</span>
        </div>
        <div className="min-w-[72px] text-center font-semibold tabular-nums">
          {match.score ?? "vs"}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate font-medium">{match.away.name}</span>
          <Crest src={match.away.logo} alt={match.away.name} size={compact ? 22 : 28} />
        </div>
      </div>
    </a>
  );
}

export function MatchList({ matches }: { matches: MatchSummary[] }) {
  return (
    <div className="grid gap-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
