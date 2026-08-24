"use client";

import { useClientLocation } from "@/lib/client-router";
import { usePrefs } from "@/components/providers";
import { EmptyState, MetaLine, ShareButton, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import type { NewsItem } from "@/lib/types";

export default function NewsItemPage() {
  const { pathname } = useClientLocation();
  const id = pathname.split("/")[2] || "";
  const { dict } = usePrefs();
  const { data, loading, error } = useApi<{ item: NewsItem }>(id ? `/api/news/${id}` : null);
  if (loading && !data) return <Skeleton className="h-72" />;
  if (error && !data) return <EmptyState title={error} />;
  const item = data?.item;
  if (!item) return <EmptyState title={dict.noData} />;
  return (
    <article className="sheko-card overflow-hidden">
      {item.image ? <img src={item.image} alt="" className="h-64 w-full object-cover" /> : null}
      <div className="p-5">
        <div className="mb-3 flex justify-end"><ShareButton title={item.title} url={item.url} /></div>
        <h1 className="text-2xl font-semibold">{item.title}</h1>
        <p className="mt-3 text-[var(--muted)]">{item.summary}</p>
        <a href={item.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-[var(--pitch)] px-4 py-2 text-sm text-black">
          {dict.openSource}
        </a>
        <MetaLine source={item.source} updated={item.updatedAt || item.publishedAt} />
      </div>
    </article>
  );
}
