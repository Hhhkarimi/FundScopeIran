const DEFAULT_TIMEOUT_MS = 18_000;

const BLOCK_MARKERS = [
  "request rejected",
  "access denied",
  "cloudflare",
  "General Error Detected",
  "درخواست شما به دلایلی مسدود شده",
  "دسترسی شما"
];

export class SourceBlockedError extends Error {
  constructor(public source: string, message: string) {
    super(message);
    this.name = "SourceBlockedError";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetchJson<T>(
  url: string,
  init: RequestInit & { source: string; retries?: number; timeoutMs?: number }
): Promise<T> {
  const { source, retries = 2, timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = init;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain,*/*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 FundScopeIran/1.0",
          ...requestInit.headers
        }
      });

      const text = await response.text();
      const lower = text.toLowerCase();
      if (BLOCK_MARKERS.some((marker) => lower.includes(marker.toLowerCase()))) {
        throw new SourceBlockedError(source, `${source} appears to have blocked this request`);
      }
      if (!response.ok) {
        throw new Error(`${source} HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
        throw new SourceBlockedError(source, `${source} returned non-JSON content`);
      }
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof SourceBlockedError) throw error;
      if (attempt < retries) await delay(500 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${source} request failed`);
}
