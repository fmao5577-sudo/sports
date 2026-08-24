"use client";

import { useClientLocation } from "@/lib/client-router";
import { useEffect, useState } from "react";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, FavoriteButton, Freshness, MetaLine, ShareButton, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { MatchDetails } from "@/lib/types";
import { formatKickoff } from "@/lib/utils";

const TABS = ["timeline", "stats", "lineups", "h2h"] as const;

export default function MatchPage() {
  const { pathname } = useClientLocation();
  const id = pathname.split("/")[2] || "";
  const { dict, locale, timezone, pushRecent } = usePrefs();
  const { data, loading, error } = useApi<{ data: MatchDetails }>(id ? `/api/matches/${id}` : null, 15000);
  const [tab, setTab] = useState<(typeof TABS)[number]>("timeline");
  const match = data?.data;

  useEffect(() => {
    if (!match) return;
    pushRecent({
      type: "match",
      id: match.summary.id,
      name: `${match.summary.home.name} vs ${match.summary.away.name}`,
      href: `/match/${match.summary.id}`,
    });
  }, [match, pushRecent]);

  if (loading && !match) return <Skeleton className="h-80" />;
  if (error && !match) return <EmptyState title={error} />;
  if (!match) return <EmptyState title={dict.noData} />;

  const summary = match.summary;

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <section className="sheko-card sticky top-[118px] z-20 overflow-hidden p-4 md:top-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <a href={`/competitions/${summary.competitionId}`}>{summary.competitionName}</a>
          <div className="flex flex-wrap gap-2">
            <Freshness status={summary.live ? "fresh" : summary.finished ? "updating" : "fresh"} />
            <FavoriteButton type="match" id={summary.id} name={`${summary.home.name} vs ${summary.away.name}`} />
            <ShareButton title={`${summary.home.name} ${summary.score ?? "vs"} ${summary.away.name}`} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <a href={`/teams/${summary.home.id}`} className="grid justify-items-center gap-2 text-center">
            <Crest src={summary.home.logo} alt={summary.home.name} size={56} />
            <span className="text-sm font-medium">{summary.home.name}</span>
          </a>
          <div className="text-center">
            <p className="text-4xl font-semibold tabular-nums">{summary.score ?? "vs"}</p>
            <p className={`mt-1 text-sm ${summary.live ? "text-[var(--live)]" : "text-[var(--muted)]"}`}>
              {summary.live ? summary.minute || "LIVE" : summary.finished ? summary.statusLabel : formatKickoff(summary.kickoff, timezone || undefined, locale)}
            </p>
          </div>
          <a href={`/teams/${summary.away.id}`} className="grid justify-items-center gap-2 text-center">
            <Crest src={summary.away.logo} alt={summary.away.name} size={56} />
            <span className="text-sm font-medium">{summary.away.name}</span>
          </a>
        </div>
        {(match.venue || match.referee) && (
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            {match.venue} {match.referee ? `· ${match.referee}` : ""}
          </p>
        )}
      </section>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`sheko-chip ${tab === item ? "bg-[var(--pitch)] text-black" : ""}`}>
            {dict[item]}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        <div className="sheko-card p-4">
          {(match.events.length
            ? match.events
            : match.commentary.map((item) => ({
                id: item.text,
                minute: item.minute || "",
                type: "other" as const,
                team: "home" as const,
                player: undefined,
                assist: undefined,
                detail: item.text,
              }))
          ).map((event) => (
            <div key={event.id} className="flex gap-3 border-b border-[var(--line)] py-3 last:border-0">
              <span className="w-10 text-xs text-[var(--gold)]">{event.minute}</span>
              <div>
                <p className="text-sm font-medium">{event.player || event.detail || event.type}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{event.type} {event.assist ? `· ${event.assist}` : ""}</p>
              </div>
            </div>
          ))}
          {!match.events.length && !match.commentary.length ? <p className="text-sm text-[var(--muted)]">{dict.noData}</p> : null}
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="sheko-card divide-y divide-[var(--line)] p-4">
          {match.xg ? <p className="pb-3 text-sm">xG {match.xg.home ?? "-"} / {match.xg.away ?? "-"}</p> : null}
          {match.stats.map((stat) => (
            <div key={stat.key + stat.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 text-sm">
              <span className="text-end tabular-nums">{stat.home}</span>
              <span className="text-center text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{stat.label}</span>
              <span className="tabular-nums">{stat.away}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "lineups" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { team: match.summary.home.name, formation: match.lineups.homeFormation, players: match.lineups.home, subs: match.lineups.homeSubs, coach: match.lineups.homeCoach },
            { team: match.summary.away.name, formation: match.lineups.awayFormation, players: match.lineups.away, subs: match.lineups.awaySubs, coach: match.lineups.awayCoach },
          ].map((side) => (
            <section key={side.team} className="sheko-card p-4">
              <h3 className="mb-3 font-semibold">{side.team} · {side.formation || "—"}</h3>
              <div className="grid gap-2">
                {side.players.map((player) => (
                  <a key={player.id} href={`/players/${player.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Crest src={player.photo} alt={player.name} size={28} />
                      {player.number ? `${player.number}. ` : ""}{player.name}
                    </span>
                    {player.rating ? (
                      <span className="text-xs text-[var(--gold)]">
                        {player.rating} {player.ratingSource === "sheko" ? dict.shekoRating : dict.officialRating}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
              {side.subs.length ? <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Subs</p> : null}
              {side.subs.map((player) => (
                <a key={player.id} href={`/players/${player.id}`} className="mt-2 block text-sm text-[var(--muted)]">{player.name}</a>
              ))}
              {side.coach ? <p className="mt-4 text-xs text-[var(--muted)]">{dict.coach}: {side.coach}</p> : null}
            </section>
          ))}
        </div>
      ) : null}

      {tab === "h2h" ? (
        <div className="sheko-card divide-y divide-[var(--line)] p-4">
          {match.h2h.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{item.home}</span>
              <span className="tabular-nums text-[var(--gold)]">{item.score || "vs"}</span>
              <span>{item.away}</span>
            </div>
          ))}
        </div>
      ) : null}

      {match.playerRatings.length ? (
        <section className="sheko-card p-4">
          <h3 className="mb-3 font-semibold">{dict.officialRating} / {dict.shekoRating}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {match.playerRatings.map((player) => (
              <a key={player.id} href={`/players/${player.id}`} className="flex items-center justify-between text-sm">
                <span>{player.name}</span>
                <span className="text-[var(--gold)]">{player.rating}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <MetaLine source={match.meta.source} updated={match.meta.lastUpdated} />
    </div>
  );
}
