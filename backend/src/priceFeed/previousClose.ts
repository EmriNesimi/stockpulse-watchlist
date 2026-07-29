import { env } from "../env";

export async function fetchPreviousClose(symbol: string): Promise<number | null> {
  if (!env.polygonApiKey) return null;
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${env.polygonApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { results?: Array<{ c: number }> };
    return body.results?.[0]?.c ?? null;
  } catch {
    return null;
  }
}
