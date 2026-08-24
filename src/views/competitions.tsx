"use client";

import { usePrefs } from "@/components/providers";
import { Crest, EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { Competition } from "@/lib/types";

export default function CompetitionsPage() {
  const { dict, locale } = usePrefs();
  const { data, loading, error } = useApi<{ competitions: Competition[] }>("/api/competitions");
  if (loading && !data) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (error && !data) return <EmptyState title={error} />;
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold">{dict.competitions}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {data?.competitions.map((comp) => (
          <a key={comp.id} href={`/competitions/${comp.id}`} className="sheko-card p-4">
            <Crest src={comp.logo} alt={comp.name} size={40} />
            <p className="mt-3 font-medium">{locale === "ar" ? comp.nameAr : comp.name}</p>
            <p className="text-xs text-[var(--muted)]">{comp.country}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
