"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl, isStaticMode } from "@/lib/client-router";
import { staticFallback } from "@/lib/static-fallback";

type ApiResponse = { error?: string };

export function useApi<T>(url: string | null, refreshMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    if (!url) return;
    if (!hasData.current) setLoading(true);

    if (isStaticMode && url.startsWith("/api/") && !process.env.NEXT_PUBLIC_API_BASE_URL) {
      const fallback = staticFallback(url);
      if (fallback !== null) {
        setData(fallback as T);
        hasData.current = true;
        setError(null);
        setUpdatedAt(new Date().toISOString());
        setLoading(false);
        return;
      }
    }

    try {
      const target = apiUrl(url);
      const isLive = url.includes("/api/live") || url.includes("/api/home");
      const response = await fetch(target, { cache: isLive ? "no-store" : "default" });
      const json = (await response.json()) as T & ApiResponse;
      if (!response.ok) throw new Error(json.error || "request failed");
      setData(json);
      hasData.current = true;
      setError(null);
      setUpdatedAt(new Date().toISOString());
    } catch (err) {
      if (isStaticMode) {
        const fallback = staticFallback(url);
        if (fallback !== null) {
          setData(fallback as T);
          hasData.current = true;
          setError(null);
          setUpdatedAt(new Date().toISOString());
          setLoading(false);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
    if (!refreshMs) return;
    const timer = window.setInterval(() => void load(), refreshMs);
    return () => window.clearInterval(timer);
  }, [load, refreshMs]);

  return { data, error, loading, reload: load, updatedAt };
}
