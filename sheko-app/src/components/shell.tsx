"use client";

import { useClientLocation, navigate, assetUrl } from "@/lib/client-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePrefs } from "./providers";
import { Freshness } from "./ui";

const NAV = [
  { href: "/", key: "home", icon: "⌂" },
  { href: "/live", key: "live", icon: "●" },
  { href: "/matches", key: "matches", icon: "▣" },
  { href: "/transfers", key: "transfers", icon: "⇄" },
] as const;

const MORE = [
  { href: "/competitions", key: "competitions" },
  { href: "/news", key: "news" },
  { href: "/injuries", key: "injuries" },
  { href: "/favorites", key: "favorites" },
  { href: "/search", key: "search" },
  { href: "/settings", key: "settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname, search } = useClientLocation();
  const { dict, locale, setLocale, theme, setTheme, online } = usePrefs();
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMore(false);
  }, [pathname]);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
    const rewriteLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((anchor) => {
        if (!base || anchor.dataset.shekoBaseReady === "1") return;
        const href = anchor.getAttribute("href") || "";
        if (!href || href.startsWith("//") || href.startsWith("/api/")) return;
        anchor.setAttribute("href", `${base}${href}`);
        anchor.dataset.shekoBaseReady = "1";
      });
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.origin !== window.location.origin) return;
      const url = new URL(anchor.href);
      if (url.pathname.startsWith("/api/")) return;
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      event.preventDefault();
      const appPath = base && nextPath.startsWith(base) ? nextPath.slice(base.length) || "/" : nextPath;
      navigate(appPath);
    };
    rewriteLinks();
    const observer = new MutationObserver(rewriteLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
    };
  }, []);

  const title = useMemo(() => {
    if (pathname.startsWith("/match/")) return dict.matchCenter;
    if (pathname.startsWith("/players/")) return dict.playerDatabase;
    if (pathname.startsWith("/teams/")) return dict.teams;
    if (pathname.startsWith("/competitions/")) return dict.competitions;
    return dict.appName;
  }, [pathname, dict]);

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px]">
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-[var(--line)] p-5 md:flex md:border-e">
        <a href="/" className="mb-8 flex items-center gap-3">
          <img src={assetUrl("/brand/logo-mark.png")} alt="" className="h-11 w-11 rounded-2xl object-cover" />
          <div>
            <p className="text-sm font-semibold tracking-[0.18em]">SHEKO</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pitch)]">Sports</p>
          </div>
        </a>
        <nav className="grid gap-1.5">
          {[...NAV, ...MORE].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-3 py-2.5 text-sm ${pathname === item.href ? "bg-[var(--pitch)] text-black" : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"}`}
            >
              {dict[item.key]}
            </a>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 pt-6">
          <Freshness status={online ? "fresh" : "offline"} />
          <p className="text-[11px] leading-5 text-[var(--muted)]">{dict.dataNote}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color:color-mix(in_srgb,var(--bg)_84%,transparent)] px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <a href="/" className="md:hidden">
              <img src={assetUrl("/brand/logo-mark.png")} alt="SHEKO" className="h-10 w-10 rounded-2xl object-cover" />
            </a>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="truncate text-[11px] text-[var(--muted)]">{dict.tagline}</p>
            </div>
            <button type="button" className="sheko-chip" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
              {locale === "ar" ? "EN" : "ع"}
            </button>
            <button type="button" className="sheko-chip" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? dict.light : dict.dark}
            </button>
          </div>
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dict.searchPlaceholder}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/5 px-4 py-2.5 text-sm outline-none ring-[var(--pitch)] focus:ring-2"
            />
          </form>
        </header>
        <main className="px-4 py-4 md:px-6 md:py-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] bg-[color:color-mix(in_srgb,var(--bg)_92%,transparent)] px-1 py-2 backdrop-blur-xl md:hidden">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`grid place-items-center gap-1 rounded-2xl py-1 text-[10px] ${pathname === item.href ? "text-[var(--pitch)]" : "text-[var(--muted)]"}`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {dict[item.key]}
          </a>
        ))}
        <button
          type="button"
          onClick={() => setMore((value) => !value)}
          className="grid place-items-center gap-1 rounded-2xl py-1 text-[10px] text-[var(--muted)]"
        >
          <span className="text-base leading-none">☰</span>
          {dict.more}
        </button>
      </nav>

      {more ? (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[var(--bg-soft)] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid grid-cols-2 gap-3">
              {MORE.map((item) => (
                <a key={item.href} href={item.href} className="sheko-card px-4 py-4 text-sm">
                  {dict[item.key]}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
