import type { DataMeta, FreshnessTone, MatchPhase } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = num(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function strOrNum(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
}

export function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function pick<T>(value: unknown, fallback: T): T {
  return (value as T) ?? fallback;
}

export function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|united|city|club|the)\b/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();
}

export function teamLogo(id?: string | number | null): string {
  if (!id) return "/brand/logo-mark.png";
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
}

export function playerPhoto(id?: string | number | null): string {
  if (!id) return "/brand/logo-mark.png";
  return `https://images.fotmob.com/image_resources/playerimages/${id}.png`;
}

export function leagueLogo(id?: string | number | null): string {
  if (!id) return "/brand/logo-mark.png";
  return `https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png`;
}

export function countryFlag(code?: string | null): string {
  if (!code || code.length !== 3 && code.length !== 2) return "";
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${code.toLowerCase()}.png`;
}

export function formatFee(value?: number | null, text?: string | null): string | null {
  if (text && /loan|free|undisclosed|swap/i.test(text) && (value === null || value === undefined)) {
    return text;
  }
  if (typeof value === "number" && value > 0) {
    if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}m`;
    if (value >= 1_000) return `€${Math.round(value / 1_000)}k`;
    return `€${value}`;
  }
  return text || null;
}

export function freshnessFromAge(updatedAt: string | Date, live = false): FreshnessTone {
  const ts = typeof updatedAt === "string" ? Date.parse(updatedAt) : updatedAt.getTime();
  if (!Number.isFinite(ts)) return "delayed";
  const age = Date.now() - ts;
  if (live) return age < 45_000 ? "fresh" : age < 120_000 ? "updating" : "delayed";
  if (age < 5 * 60_000) return "fresh";
  if (age < 30 * 60_000) return "updating";
  return "delayed";
}

export function makeMeta(partial: Partial<DataMeta> & { source: string }): DataMeta {
  const now = new Date().toISOString();
  return {
    source: partial.source,
    sources: partial.sources ?? [partial.source],
    lastUpdated: partial.lastUpdated ?? now,
    timestamp: partial.timestamp ?? now,
    confidence: partial.confidence ?? "high",
    status: partial.status ?? freshnessFromAge(partial.lastUpdated ?? now),
    verified: partial.verified ?? false,
    note: partial.note,
  };
}

export function mapFotmobStatus(status: Record<string, unknown> | undefined, statusId?: number): {
  phase: MatchPhase;
  label: string;
  minute: string | null;
  live: boolean;
  finished: boolean;
  cancelled: boolean;
  postponed: boolean;
} {
  const reason = isRecord(status?.reason) ? status.reason : {};
  const short = str(reason.short || status?.reasonShort).toUpperCase();
  const long = str(reason.long).toLowerCase();
  const started = bool(status?.started);
  const finished = bool(status?.finished);
  const cancelled = bool(status?.cancelled);
  const awarded = bool(status?.awarded);
  const liveTime = isRecord(status?.liveTime) ? status.liveTime : null;
  const minute = str(liveTime?.short || liveTime?.long || status?.liveTime, "") || null;

  if (cancelled || short === "CANC" || long.includes("cancel")) {
    return { phase: "cancelled", label: "CANC", minute: null, live: false, finished: false, cancelled: true, postponed: false };
  }
  if (short === "PP" || short === "POSTP" || long.includes("postpone")) {
    return { phase: "postponed", label: "PP", minute: null, live: false, finished: false, cancelled: false, postponed: true };
  }
  if (short === "ABD" || long.includes("abandon")) {
    return { phase: "abandoned", label: "ABD", minute: null, live: false, finished: true, cancelled: false, postponed: false };
  }
  if (awarded) {
    return { phase: "awarded", label: "AWD", minute: null, live: false, finished: true, cancelled: false, postponed: false };
  }
  if (short === "PEN" || long.includes("penalty")) {
    return { phase: "pen", label: "PEN", minute: minute ?? "PEN", live: started && !finished, finished, cancelled: false, postponed: false };
  }
  if (short === "AET" || short === "ET" || long.includes("extra")) {
    return { phase: "aet", label: finished ? "AET" : "ET", minute: minute ?? "ET", live: started && !finished, finished, cancelled: false, postponed: false };
  }
  if (short === "HT" || long.includes("half-time") || long.includes("halftime")) {
    return { phase: "ht", label: "HT", minute: "HT", live: true, finished: false, cancelled: false, postponed: false };
  }
  if (finished || short === "FT" || statusId === 6 || statusId === 7 || statusId === 8) {
    return { phase: "ft", label: "FT", minute: null, live: false, finished: true, cancelled: false, postponed: false };
  }
  if (started || Boolean(minute) || [2, 3, 4, 5, 9, 10].includes(statusId ?? -1)) {
    return { phase: "live", label: minute || "LIVE", minute, live: true, finished: false, cancelled: false, postponed: false };
  }
  return { phase: "scheduled", label: "NS", minute: null, live: false, finished: false, cancelled: false, postponed: false };
}

export function ymd(date = new Date(), timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function compactYmd(date = new Date(), timeZone?: string): string {
  return ymd(date, timeZone).replaceAll("-", "");
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function formatKickoff(iso: string, timeZone?: string, locale: "ar" | "en" = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    timeZone: timeZone || undefined,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(iso: string, timeZone?: string, locale: "ar" | "en" = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    timeZone: timeZone || undefined,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeTime(iso: string, locale: "ar" | "en" = "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function shekoRating(stats: Record<string, number>): number {
  const rating =
    6.2 +
    (stats.goals ?? 0) * 1.05 +
    (stats.assists ?? 0) * 0.75 +
    (stats.shotsOnTarget ?? 0) * 0.16 +
    (stats.keyPasses ?? 0) * 0.12 +
    (stats.tackles ?? 0) * 0.08 +
    (stats.interceptions ?? 0) * 0.08 +
    ((stats.passAccuracy ?? 0) - 75) * 0.015 +
    (stats.saves ?? 0) * 0.18 -
    (stats.yellow ?? 0) * 0.28 -
    (stats.red ?? 0) * 1.15 -
    (stats.ownGoals ?? 0) * 1;
  return Math.round(clamp(rating, 4, 9.8) * 10) / 10;
}

export function decodeHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}
