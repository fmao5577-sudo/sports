import { fetchJson } from "@/lib/http";
import { markSource } from "./cache";

const BASE = "https://api.football-data.org/v4";

export function hasFootballDataKey() {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

export async function footballData<T>(path: string): Promise<T | null> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return null;
  const started = Date.now();
  try {
    const data = await fetchJson<T>(`${BASE}${path}`, {
      headers: { "X-Auth-Token": key },
      timeoutMs: 10000,
    });
    await markSource("football-data.org", true, Date.now() - started);
    return data;
  } catch (error) {
    await markSource("football-data.org", false, Date.now() - started, error instanceof Error ? error.message : "error");
    return null;
  }
}
