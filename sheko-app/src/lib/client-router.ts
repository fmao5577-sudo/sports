"use client";

import { useEffect, useState } from "react";

export function getBasePath() {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
}

export function stripBasePath(pathname: string) {
  const base = getBasePath();
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || "/";
  }
  return pathname || "/";
}

export function useClientLocation() {
  const read = () => ({
    pathname: stripBasePath(window.location.pathname),
    search: window.location.search,
  });
  const [location, setLocation] = useState(() => ({ pathname: "/", search: "" }));

  useEffect(() => {
    setLocation(read());
    const onPopState = () => setLocation(read());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return location;
}

export function navigate(path: string) {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  window.history.pushState({}, "", `${base}${normalized}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function assetUrl(path: string) {
  const base = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}` || "/";
}

export function apiUrl(path: string) {
  const external = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (external) return `${external}${path.startsWith("/") ? path : `/${path}`}`;
  return path;
}

export const isStaticMode = process.env.NEXT_PUBLIC_STATIC_MODE === "true";
