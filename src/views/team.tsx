"use client";

import { useClientLocation } from "@/lib/client-router";
import { useEffect, useState } from "react";
import { MatchCard } from "@/components/match-card";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, FavoriteButton, MetaLine, ShareButton, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { TeamProfile } from "@/lib/types";

export default function TeamPage() {
  const { pathname } = useClientLocation();
  const id = pathname.split("/")[2] || "";
  const { dict, pushRecent } = usePrefs();
  const { data, loading, error } = useApi<{ data: TeamProfile }>(id ? `/api/teams/${id}` : null);
  const [tab, setTab] = useState("squad");
  const team = data?.data;

  useEffect(() => {
    if (team) pushRecent({ type: "team", id: team.id, name: team.name, href: `/teams/${team.id}` });
  }, [team, pushRecent]);

  if (loading && !team) return <Skeleton className="h-80" />;
  if (error && !team) return <EmptyState title={error} />;
  if (!team) return <EmptyState title={dict.noData} />;

  return (
    <div className="grid gap-5">
      <section className="sheko-card flex flex-wrap items-center gap-4 p-5">
        <Crest src={team.logo} alt={team.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold">{team.name}</h1>
          <p className="text-sm text-[var(--muted)]">{team.leagueName} · {team.stadium} · {dict.coach}: {team.coach || "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FavoriteButton type="team" id={team.id} name={team.name} />
          <ShareButton title={team.name} />
        </div>
      </section>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["squad", "standings", "transfers", "injuries", "news"].map((item) => (
          <button key={item} className={`sheko-chip ${tab === item ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setTab(item)}>
            {dict[item as keyof typeof dict] || item}
          </button>
        ))}
      </div>
      {tab === "squad" ? team.squad.map((group) => (
        <section key={group.group} className="sheko-card p-4">
          <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-[var(--muted)]">{group.group}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {group.players.map((player) => (
              <a key={player.id} href={`/players/${player.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 hover:bg-white/5">
                <span className="flex items-center gap-3">
                  <Crest src={player.photo} alt={player.name} />
                  <span>
                    <span className="block font-medium">{player.name}</span>
                    <span className="text-xs text-[var(--muted)]">{player.position} · {player.nationality}</span>
                  </span>
                </span>
                {player.injured ? <span className="text-xs text-[var(--live)]">{dict.injuries}</span> : null}
              </a>
            ))}
          </div>
        </section>
      )) : null}
      {tab === "standings" ? (
        <div className="sheko-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {team.standings?.map((row) => (
                <tr key={row.teamId} className="border-b border-[var(--line)]">
                  <td className="px-3 py-2">{row.position}</td>
                  <td className="px-3 py-2">{row.teamName}</td>
                  <td className="px-3 py-2">{row.played}</td>
                  <td className="px-3 py-2 font-semibold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {tab === "transfers" ? (
        <div className="grid gap-3">
          {[...team.transfersIn, ...team.transfersOut].map((item) => (
            <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card p-3 text-sm">
              {item.playerName}: {item.fromClub} → {item.toClub} · {item.fee || item.status}
            </a>
          ))}
          {team.rumours.map((item) => (
            <div key={item.id} className="sheko-card p-3 text-sm">
              <span className="sheko-chip mb-2">{dict.rumourBadge}</span>
              <p>{item.playerName}: {item.fromClub} → {item.toClub} · {item.probability}</p>
            </div>
          ))}
        </div>
      ) : null}
      {tab === "injuries" ? team.injuries.map((item) => (
        <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card p-3 text-sm">
          {item.playerName} · {item.kind} · {item.expectedReturn}
        </a>
      )) : null}
      {tab === "news" ? team.news.map((item) => (
        <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="sheko-card p-3">
          <p className="font-medium">{item.title}</p>
          <p className="text-xs text-[var(--muted)]">{item.source}</p>
        </a>
      )) : null}
      {team.nextMatch ? <MatchCard match={team.nextMatch} /> : null}
      <MetaLine source={team.meta.source} updated={team.meta.lastUpdated} />
    </div>
  );
}
