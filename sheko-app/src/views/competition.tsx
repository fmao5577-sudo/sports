"use client";

import { useClientLocation } from "@/lib/client-router";
import { useState } from "react";
import { MatchCard } from "@/components/match-card";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, FavoriteButton, MetaLine, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { Competition, MatchSummary, StandingRow, TransferRecord } from "@/lib/types";

type Payload = {
  competition: Competition;
  standings: StandingRow[];
  matches: MatchSummary[];
  fixtures: MatchSummary[];
  results: MatchSummary[];
  live: MatchSummary[];
  transfers: TransferRecord[];
  playoff: unknown;
  meta: { source: string; lastUpdated: string };
};

export default function CompetitionPage() {
  const { pathname } = useClientLocation();
  const id = pathname.split("/")[2] || "";
  const { dict } = usePrefs();
  const { data, loading, error } = useApi<Payload>(id ? `/api/competitions/${id}` : null, 60000);
  const [tab, setTab] = useState("overview");
  if (loading && !data) return <Skeleton className="h-72" />;
  if (error && !data) return <EmptyState title={error} />;
  if (!data) return <EmptyState title={dict.noData} />;
  const { competition } = data;
  return (
    <div className="grid gap-5">
      <section className="sheko-card flex flex-wrap items-center gap-4 p-5">
        <Crest src={competition.logo} alt={competition.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{competition.name}</h1>
          <p className="text-sm text-[var(--muted)]">{competition.country} · {competition.season}</p>
        </div>
        <FavoriteButton type="competition" id={competition.id} name={competition.name} />
      </section>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["overview", "standings", "fixtures", "results", "transfers", "knockout"].map((item) => (
          <button key={item} type="button" className={`sheko-chip ${tab === item ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setTab(item)}>
            {item === "knockout" ? dict.knockout : dict[item as keyof typeof dict] || item}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <div className="grid gap-4">
          {data.live.map((match) => <MatchCard key={match.id} match={match} />)}
          {data.matches.slice(0, 8).map((match) => <MatchCard key={match.id} match={match} compact />)}
        </div>
      ) : null}
      {tab === "standings" ? (
        <div className="sheko-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <tr>
                {[dict.pos, dict.teams, dict.played, dict.won, dict.drawn, dict.lost, dict.gf, dict.ga, dict.gd, dict.pts].map((h) => (
                  <th key={h} className="px-3 py-3 text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.standings.map((row) => (
                <tr key={row.teamId} className="border-t border-[var(--line)]">
                  <td className="px-3 py-2" style={{ color: row.qualColor || undefined }}>{row.position}</td>
                  <td className="px-3 py-2">
                    <a href={`/teams/${row.teamId}`} className="flex items-center gap-2">
                      <Crest src={row.teamLogo} alt={row.teamName} size={22} />
                      {row.teamName}
                    </a>
                  </td>
                  <td className="px-3 py-2">{row.played}</td>
                  <td className="px-3 py-2">{row.won}</td>
                  <td className="px-3 py-2">{row.drawn}</td>
                  <td className="px-3 py-2">{row.lost}</td>
                  <td className="px-3 py-2">{row.gf}</td>
                  <td className="px-3 py-2">{row.ga}</td>
                  <td className="px-3 py-2">{row.gd}</td>
                  <td className="px-3 py-2 font-semibold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {tab === "fixtures" ? data.fixtures.map((match) => <MatchCard key={match.id} match={match} />) : null}
      {tab === "results" ? data.results.map((match) => <MatchCard key={match.id} match={match} />) : null}
      {tab === "transfers" ? data.transfers.map((item) => (
        <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card flex items-center justify-between gap-3 p-3">
          <span>{item.playerName}</span>
          <span className="text-sm text-[var(--muted)]">{item.fromClub} → {item.toClub}</span>
          <span>{item.fee}</span>
        </a>
      )) : null}
      {tab === "knockout" ? (
        <div className="sheko-card p-5 text-sm text-[var(--muted)]">
          {data.playoff ? <pre className="overflow-auto text-xs">{JSON.stringify(data.playoff, null, 2).slice(0, 2500)}</pre> : dict.noData}
        </div>
      ) : null}
      <MetaLine source={data.meta.source} updated={data.meta.lastUpdated} />
    </div>
  );
}
