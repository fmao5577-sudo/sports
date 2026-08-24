export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      // Short browser/CDN cache + SWR; overrides allowed via init.headers
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      ...init?.headers,
    },
  });
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message, ok: false }, { status });
}
