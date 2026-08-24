"use client";

import { usePrefs } from "@/components/providers";
import { EmptyState } from "@/components/ui";

export default function FavoritesPage() {
  const { dict, favorites, recent } = usePrefs();
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">{dict.favorites}</h1>
      {!favorites.length ? <EmptyState title={dict.emptyFavorites} /> : (
        <div className="grid gap-3">
          {favorites.map((item) => (
            <a key={`${item.type}-${item.id}`} href={item.type === "team" ? `/teams/${item.id}` : item.type === "player" ? `/players/${item.id}` : item.type === "competition" ? `/competitions/${item.id}` : `/match/${item.id}`} className="sheko-card p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{item.type}</p>
              <p className="mt-1 font-medium">{item.name}</p>
            </a>
          ))}
        </div>
      )}
      {recent.length ? (
        <section>
          <h2 className="mb-3 font-semibold">{dict.recentlyViewed}</h2>
          <div className="grid gap-2">
            {recent.map((item) => (
              <a key={item.href} href={item.href} className="sheko-card p-3 text-sm">{item.name}</a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
