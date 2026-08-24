"use client";

import { useClientLocation } from "@/lib/client-router";
import { Suspense, useEffect, useState } from "react";
import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { SearchResults } from "@/lib/types";

function SearchInner() {
  const { search } = useClientLocation();
  const initial = new URLSearchParams(search).get("q") || "";
  const { dict, pushHistory, history } = usePrefs();
  const [q, setQ] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    if (debounced.length > 1) pushHistory(debounced);
  }, [debounced, pushHistory]);
  const { data, loading } = useApi<SearchResults>(debounced.length > 1 ? `/api/search?q=${encodeURIComponent(debounced)}` : null);

  return (
    <div className="grid gap-5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.searchPlaceholder} className="w-full rounded-2xl border border-[var(--line)] bg-white/5 px-4 py-3" />
      {history.length ? (
        <div className="flex flex-wrap gap-2">
          {history.map((item) => (
            <button key={item} className="sheko-chip" onClick={() => setQ(item)}>{item}</button>
          ))}
        </div>
      ) : null}
      {loading ? <Skeleton className="h-32" /> : null}
      {!debounced ? <EmptyState title={dict.emptySearch} /> : null}
      {data ? (
        <div className="grid gap-6">
          {!!data.players.length && (
            <section>
              <h2 className="mb-3 font-semibold">{dict.players}</h2>
              <div className="grid gap-2">
                {data.players.map((item) => (
                  <a key={item.id} href={`/players/${item.id}`} className="sheko-card flex items-center gap-3 p-3">
                    <Crest src={item.photo} alt={item.name} />
                    <span>{item.name}<span className="block text-xs text-[var(--muted)]">{item.team}</span></span>
                  </a>
                ))}
              </div>
            </section>
          )}
          {!!data.teams.length && (
            <section>
              <h2 className="mb-3 font-semibold">{dict.teams}</h2>
              {data.teams.map((item) => (
                <a key={item.id} href={`/teams/${item.id}`} className="sheko-card mb-2 flex items-center gap-3 p-3">
                  <Crest src={item.logo} alt={item.name} />
                  <span>{item.name}<span className="block text-xs text-[var(--muted)]">{item.league}</span></span>
                </a>
              ))}
            </section>
          )}
          {!!data.competitions.length && (
            <section>
              <h2 className="mb-3 font-semibold">{dict.competitions}</h2>
              {data.competitions.map((item) => (
                <a key={item.id} href={`/competitions/${item.id}`} className="sheko-card mb-2 flex items-center gap-3 p-3">
                  <Crest src={item.logo} alt={item.name} /> {item.name}
                </a>
              ))}
            </section>
          )}
          {!!data.matches.length && (
            <section>
              <h2 className="mb-3 font-semibold">{dict.matches}</h2>
              {data.matches.map((item) => (
                <a key={item.id} href={`/match/${item.id}`} className="sheko-card mb-2 block p-3">{item.name}</a>
              ))}
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-32" />}>
      <SearchInner />
    </Suspense>
  );
}
