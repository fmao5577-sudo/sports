"use client";

import { usePrefs } from "@/components/providers";
import { EmptyState, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { NewsItem } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export default function NewsPage() {
  const { dict, locale } = usePrefs();
  const { data, loading, error } = useApi<{ news: NewsItem[] }>(`/api/news?locale=${locale}`, 60000);
  if (loading && !data) return <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (error && !data) return <EmptyState title={error} />;
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{dict.news}</h1>
      {data?.news.map((item) => (
        <a key={item.id} href={`/news/${item.id}`} className="sheko-card flex gap-4 overflow-hidden p-3">
          {item.image ? <img src={item.image} alt="" className="h-24 w-32 shrink-0 rounded-2xl object-cover" /> : null}
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{item.summary}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.source} · {relativeTime(item.publishedAt, locale)}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
