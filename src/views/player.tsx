"use client";

import { useClientLocation } from "@/lib/client-router";
import { useEffect } from "react";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, FavoriteButton, MetaLine, ShareButton, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { PlayerProfile } from "@/lib/types";

export default function PlayerPage() {
  const { pathname } = useClientLocation();
  const id = pathname.split("/")[2] || "";
  const { dict, pushRecent } = usePrefs();
  const { data, loading, error } = useApi<{ data: PlayerProfile }>(id ? `/api/players/${id}` : null);
  const player = data?.data;

  useEffect(() => {
    if (player) pushRecent({ type: "player", id: player.id, name: player.name, href: `/players/${player.id}` });
  }, [player, pushRecent]);

  if (loading && !player) return <Skeleton className="h-80" />;
  if (error && !player) return <EmptyState title={error} />;
  if (!player) return <EmptyState title={dict.noData} />;

  return (
    <div className="grid gap-5">
      <section className="sheko-card flex flex-wrap items-center gap-4 p-5">
        <Crest src={player.photo} alt={player.name} size={84} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold">{player.name}</h1>
          <p className="text-sm text-[var(--muted)]">{player.position} · {player.nationality} · {player.age}</p>
          <a href={player.currentClubId ? `/teams/${player.currentClubId}` : "#"} className="mt-2 inline-flex items-center gap-2 text-sm">
            <Crest src={player.currentClubLogo} alt={player.currentClub || ""} size={22} />
            {dict.currentClub}: {player.currentClub || "—"} · {player.currentLeague}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <FavoriteButton type="player" id={player.id} name={player.name} />
          <ShareButton title={player.name} />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          [dict.shirt, player.shirtNumber],
          [dict.contract, player.contractUntil?.slice(0, 10)],
          [dict.marketValue, player.marketValue],
          [dict.lastTransfer, player.lastTransfer ? `${player.lastTransfer.fromClub} → ${player.lastTransfer.toClub}` : "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="sheko-card p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-medium">{value || "—"}</p>
          </div>
        ))}
      </div>

      {player.lastTransfer ? (
        <section className="sheko-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">{dict.lastTransfer}</h2>
          <p>{player.lastTransfer.fromClub} → {player.lastTransfer.toClub}</p>
          <p className="text-[var(--muted)]">{player.lastTransfer.fee} · {player.lastTransfer.date.slice(0, 10)} · {player.lastTransfer.source}</p>
        </section>
      ) : null}

      <section className="sheko-card p-4">
        <h2 className="mb-3 font-semibold">{dict.previousClubs}</h2>
        <div className="grid gap-2">
          {player.previousClubs.slice(0, 12).map((club) => (
            <div key={`${club.id}-${club.name}-${club.start}`} className="flex justify-between text-sm">
              <span>{club.name}</span>
              <span className="text-[var(--muted)]">{(club.start || "").slice(0, 10)} – {(club.end || "").slice(0, 10) || "now"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sheko-card p-4">
        <h2 className="mb-3 font-semibold">{dict.matches}</h2>
        <div className="grid gap-2">
          {player.recentMatches.map((item) => (
            <a key={item.id} href={item.id ? `/match/${item.id}` : "#"} className="flex justify-between text-sm">
              <span>{item.opponent || item.date}</span>
              <span className="text-[var(--gold)]">{item.rating ?? ""}</span>
            </a>
          ))}
        </div>
      </section>

      <MetaLine source={player.meta.source} updated={player.meta.lastUpdated} />
    </div>
  );
}
