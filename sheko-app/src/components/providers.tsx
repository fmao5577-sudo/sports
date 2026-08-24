"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale, ThemeMode } from "@/lib/types";
import { getDict, type Dict } from "@/lib/i18n";
import { apiUrl, assetUrl, isStaticMode } from "@/lib/client-router";

type Favorite = { type: string; id: string; name: string };
type Prefs = {
  locale: Locale;
  theme: ThemeMode;
  timezone: string;
  favorites: Favorite[];
  history: string[];
  recent: { type: string; id: string; name: string; href: string }[];
  notify: Record<string, boolean>;
};

type Ctx = Prefs & {
  dict: Dict;
  dir: "rtl" | "ltr";
  clientId: string;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  setTimezone: (zone: string) => void;
  toggleFavorite: (item: Favorite) => void;
  isFavorite: (type: string, id: string) => boolean;
  pushHistory: (q: string) => void;
  pushRecent: (item: { type: string; id: string; name: string; href: string }) => void;
  setNotify: (key: string, value: boolean) => void;
  online: boolean;
};

const PrefsContext = createContext<Ctx | null>(null);
const STORAGE = "sheko-sports-prefs-v1";

function uid() {
  return `sheko_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function Providers({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({
    locale: "ar",
    theme: "dark",
    timezone: "",
    favorites: [],
    history: [],
    recent: [],
    notify: {
      goals: true,
      kickoff: true,
      fulltime: true,
      cards: true,
      transfers: true,
      news: true,
      lineups: true,
      injuries: true,
    },
  });
  const [clientId, setClientId] = useState("");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    const existingId = localStorage.getItem("sheko-client-id") || uid();
    localStorage.setItem("sheko-client-id", existingId);
    setClientId(existingId);
    if (raw) {
      try {
        setPrefs((current) => ({ ...current, ...JSON.parse(raw) }));
      } catch {
        // ignore
      }
    } else if (navigator.language.toLowerCase().startsWith("en")) {
      setPrefs((current) => ({ ...current, locale: "en" }));
    }
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (!isStaticMode && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(assetUrl("/sw.js")).catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    localStorage.setItem(STORAGE, JSON.stringify(prefs));
    document.documentElement.lang = prefs.locale;
    document.documentElement.dir = prefs.locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.classList.toggle("dark", prefs.theme === "dark");
    if (isStaticMode && !process.env.NEXT_PUBLIC_API_BASE_URL) return;
    void fetch(apiUrl("/api/favorites"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        action: "prefs",
        locale: prefs.locale,
        theme: prefs.theme,
        timezone: prefs.timezone,
      }),
    }).catch(() => undefined);
  }, [prefs, clientId]);

  const value = useMemo<Ctx>(() => ({
    ...prefs,
    dict: getDict(prefs.locale),
    dir: prefs.locale === "ar" ? "rtl" : "ltr",
    clientId,
    online,
    setLocale: (locale) => setPrefs((p) => ({ ...p, locale })),
    setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
    setTimezone: (timezone) => setPrefs((p) => ({ ...p, timezone })),
    toggleFavorite: (item) => {
      setPrefs((p) => {
        const exists = p.favorites.some((fav) => fav.type === item.type && fav.id === item.id);
        const favorites = exists
          ? p.favorites.filter((fav) => !(fav.type === item.type && fav.id === item.id))
          : [...p.favorites, item];
        if (clientId) {
          if (!isStaticMode || process.env.NEXT_PUBLIC_API_BASE_URL) void fetch(apiUrl("/api/favorites"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              action: exists ? "remove" : "add",
              entityType: item.type,
              entityId: item.id,
              entityName: item.name,
            }),
          }).catch(() => undefined);
        }
        return { ...p, favorites };
      });
    },
    isFavorite: (type, id) => prefs.favorites.some((fav) => fav.type === type && fav.id === id),
    pushHistory: (q) => setPrefs((p) => ({ ...p, history: [q, ...p.history.filter((item) => item !== q)].slice(0, 10) })),
    pushRecent: (item) => {
      setPrefs((p) => ({ ...p, recent: [item, ...p.recent.filter((row) => row.href !== item.href)].slice(0, 12) }));
      if (clientId) {
        if (!isStaticMode || process.env.NEXT_PUBLIC_API_BASE_URL) void fetch(apiUrl("/api/favorites"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, action: "view", entityType: item.type, entityId: item.id, entityName: item.name, href: item.href }),
        }).catch(() => undefined);
      }
    },
    setNotify: (key, value) => setPrefs((p) => ({ ...p, notify: { ...p.notify, [key]: value } })),
  }), [prefs, clientId, online]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside provider");
  return ctx;
}
