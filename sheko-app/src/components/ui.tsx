"use client";

import type { ReactNode } from "react";
import type { FreshnessTone } from "@/lib/types";
import { usePrefs } from "./providers";
import { assetUrl } from "@/lib/client-router";

export function Freshness({ status, label }: { status: FreshnessTone; label?: string }) {
  const { dict } = usePrefs();
  const map = {
    fresh: { color: "#34d399", text: dict.fresh },
    updating: { color: "#f5c451", text: dict.updating },
    delayed: { color: "#ff4d6d", text: dict.delayed },
    offline: { color: "#93a0b5", text: dict.offline },
  }[status];
  return (
    <span className="sheko-chip" style={{ color: map.color, borderColor: `${map.color}44` }}>
      <span className="h-2 w-2 rounded-full" style={{ background: map.color }} />
      {label || map.text}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skel bg-white/5 ${className}`} />;
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="sheko-card px-5 py-10 text-center text-sm text-[var(--muted)]">
      <p>{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ title, href, action }: { title: string; href?: string; action?: string }) {
  const { dict } = usePrefs();
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {href ? (
        <a href={href} className="text-xs uppercase tracking-[0.16em] text-[var(--pitch)]">
          {action || dict.seeAll}
        </a>
      ) : null}
    </div>
  );
}

export function Crest({ src, alt, size = 36 }: { src?: string | null; alt: string; size?: number }) {
  return (
    <img
      src={src || assetUrl("/brand/logo-mark.png")}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-white/5 object-contain"
      style={{ width: size, height: size }}
      onError={(event) => {
        event.currentTarget.src = assetUrl("/brand/logo-mark.png");
      }}
    />
  );
}

export function FavoriteButton({ type, id, name }: { type: string; id: string; name: string }) {
  const { isFavorite, toggleFavorite, dict } = usePrefs();
  const active = isFavorite(type, id);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite({ type, id, name })}
      className="sheko-chip"
      aria-pressed={active}
    >
      {active ? "♥" : "♡"} {active ? dict.removeFavorite : dict.addFavorite}
    </button>
  );
}

export function ShareButton({ title, url }: { title: string; url?: string }) {
  const { dict } = usePrefs();
  return (
    <button
      type="button"
      className="sheko-chip"
      onClick={async () => {
        const shareUrl = url || window.location.href;
        if (navigator.share) {
          await navigator.share({ title, url: shareUrl }).catch(() => undefined);
        } else {
          await navigator.clipboard.writeText(shareUrl);
        }
      }}
    >
      {dict.share}
    </button>
  );
}

export function MetaLine({ source, updated }: { source?: string; updated?: string }) {
  const { dict, locale, timezone } = usePrefs();
  const time = updated
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: timezone || undefined,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(updated))
    : "";
  return (
    <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
      {dict.source}: {source || "SHEKO"} · {dict.lastUpdated}: {time}
    </p>
  );
}
