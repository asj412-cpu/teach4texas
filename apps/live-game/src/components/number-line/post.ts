import type { TapStatus } from "@/lib/action-post";

/** Number line only. Other games keep the shared poster. */
const TIMEOUT_MS = 4000;
const RETRY_MS = [400, 900, 1800];

/**
 * Place/lock with a 4s timeout and backoff. The same request_id is retried,
 * so a lost response cannot double-count.
 */
export async function postNumberLine(
  url: string,
  body: Record<string, unknown>,
  onStatus: (status: TapStatus) => void,
): Promise<{ status: number; data: { ok?: boolean; view?: unknown; error?: string } | null } | null> {
  onStatus("sending");
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let status = 0;
    let data: { ok?: boolean; view?: unknown; error?: string } | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: ctrl.signal,
      });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch {
      status = 0;
    } finally {
      clearTimeout(timer);
    }
    const retryable = status === 0 || status === 429 || status >= 500;
    if (!retryable) {
      onStatus(status >= 400 && status < 500 && data?.ok === false && status !== 404 ? "rejected" : "idle");
      return { status, data };
    }
    if (attempt >= RETRY_MS.length) {
      onStatus("failed");
      return null;
    }
    onStatus("retrying");
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS[attempt]));
  }
}
