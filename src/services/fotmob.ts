import { fetchJson } from "@/lib/http";
import { markSource } from "./cache";

const FOTMOB = "https://www.fotmob.com/api/data";
const SEARCH = "https://apigw.fotmob.com/searchapi/suggest";

const headers = {
  Referer: "https://www.fotmob.com/",
  Origin: "https://www.fotmob.com",
};

async function fotmob<T>(path: string, timeoutMs = 8000): Promise<T> {
  const started = Date.now();
  try {
    const data = await fetchJson<T>(`${FOTMOB}${path}`, { headers, timeoutMs, retries: 1 });
    void markSource("fotmob", true, Date.now() - started);
    return data;
  } catch (error) {
    void markSource("fotmob", false, Date.now() - started, error instanceof Error ? error.message : "error");
    throw error;
  }
}

export function getMatchesByDate(date: string) {
  return fotmob<unknown>(`/matches?date=${date}`, 9000);
}

export function getLeague(id: string, season?: string) {
  const suffix = season ? `&season=${encodeURIComponent(season)}` : "";
  return fotmob<unknown>(`/leagues?id=${id}${suffix}`, 8000);
}

export function getTeam(id: string) {
  return fotmob<unknown>(`/teams?id=${id}`, 8000);
}

export function getPlayer(id: string) {
  return fotmob<unknown>(`/playerData?id=${id}`, 8000);
}

export function getMatchDetails(id: string) {
  return fotmob<unknown>(`/matchDetails?matchId=${id}`, 8000);
}

export function getTransfers() {
  return fotmob<unknown>(`/transfers`, 10000);
}

export function getTable(leagueId: string) {
  return fotmob<unknown>(`/tltable?leagueId=${leagueId}`, 8000);
}

export async function searchSuggest(term: string) {
  const started = Date.now();
  try {
    const data = await fetchJson<unknown>(`${SEARCH}?term=${encodeURIComponent(term)}`, {
      headers,
      timeoutMs: 6000,
      retries: 0,
    });
    void markSource("fotmob-search", true, Date.now() - started);
    return data;
  } catch (error) {
    void markSource("fotmob-search", false, Date.now() - started, error instanceof Error ? error.message : "error");
    throw error;
  }
}
