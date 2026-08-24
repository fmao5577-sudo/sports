"use client";

import { useMemo, useState } from "react";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { TransferRecord } from "@/lib/types";
import { FEATURED_COMPETITIONS } from "@/lib/competitions";

export default function TransfersPage() {
  const { dict } = usePrefs();
  const [range, setRange] = useState("week");
  const [rumour, setRumour] = useState(false);
  const [league, setLeague] = useState("");
  const [q, setQ] = useState("");
  const url = `/api/transfers?range=${range}&rumour=${rumour ? "1" : "0"}${league ? `&league=${league}` : ""}`;
  const { data, loading, error } = useApi<{ items: TransferRecord[] }>(url, 60000);
  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data?.items || []).filter((item) =>
      !query || [item.playerName, item.fromClub, item.toClub].some((value) => value.toLowerCase().includes(query)),
    );
  }, [data, q]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">{dict.transferCenter}</h1>
        <p className="text-sm text-[var(--muted)]">{dict.dataNote}</p>
      </div>
      <div className="no-scrollbar flex flex-wrap gap-2">
        {["today", "yesterday", "week", "month", "latest"].map((item) => (
          <button key={item} className={`sheko-chip ${range === item ? "bg-[var(--pitch)] text-black" : ""}`} onClick={() => setRange(item)}>
            {item === "today" ? dict.today : item === "yesterday" ? dict.yesterday : item === "week" ? dict.thisWeek : item === "month" ? dict.thisMonth : dict.latest}
          </button>
        ))}
        <button className={`sheko-chip ${rumour ? "bg-[var(--gold)] text-black" : ""}`} onClick={() => setRumour((v) => !v)}>{dict.rumours}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.searchPlaceholder} className="rounded-2xl border border-[var(--line)] bg-white/5 px-4 py-3" />
        <select value={league} onChange={(e) => setLeague(e.target.value)} className="rounded-2xl border border-[var(--line)] bg-transparent px-3 py-3">
          <option value="">{dict.allLeagues}</option>
          {FEATURED_COMPETITIONS.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
        </select>
      </div>
      {loading && !data ? <Skeleton className="h-40" /> : null}
      {error && !data ? <EmptyState title={error} /> : null}
      <div className="grid gap-3">
        {items.map((item) => (
          <a key={item.id} href={`/players/${item.playerId}`} className="sheko-card grid gap-3 p-4 md:grid-cols-[auto_1fr_auto]">
            <Crest src={item.playerPhoto} alt={item.playerName} size={48} />
            <div>
              <p className="font-semibold">{item.playerName}</p>
              <p className="text-sm text-[var(--muted)]">{item.fromClub} → {item.toClub}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.source} · {item.date.slice(0, 10)}</p>
              {item.status === "rumour" ? <p className="mt-2 text-xs text-[var(--gold)]">{dict.rumourBadge} · {item.probability}</p> : null}
            </div>
            <div className="text-end">
              <p className="font-medium text-[var(--gold)]">{item.fee || item.status}</p>
              <p className="text-xs uppercase text-[var(--muted)]">{item.status}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
