import { sleep } from "./utils";

type FetcherOptions = {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  cacheTtlMs?: number;
};

const inflight = new Map<string, Promise<unknown>>();
let lastRequestAt = 0;
const MIN_GAP_MS = 30;

async function throttle() {
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestAt));
  if (wait) await sleep(wait);
  lastRequestAt = Date.now();
}

export async function fetchJson<T>(url: string, options: FetcherOptions = {}): Promise<T> {
  const key = url;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const run = (async () => {
    const retries = options.retries ?? 1;
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        await throttle();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json,text/xml,application/xml,text/plain,*/*",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            ...options.headers,
          },
          cache: "no-store",
        });
        clearTimeout(timeout);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          return (await response.json()) as T;
        }
        const text = await response.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as T;
        }
      } catch (error) {
        lastError = error;
        if (attempt < retries) await sleep(400 * 2 ** attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Request failed");
  })();

  inflight.set(key, run);
  try {
    return (await run) as T;
  } finally {
    inflight.delete(key);
  }
}

export async function fetchText(url: string, options: FetcherOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml,application/xml,text/xml,*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        ...options.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
