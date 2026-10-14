/**
 * Student action POSTs (D1). A 503 / 5xx / 429 / network error is retried with
 * backoff (0.3s, 0.7s, 1.5s, 3s). The UI shows "Sending…" while retrying and
 * "Didn't send. Tap again." if every retry fails. The server queues each tap as
 * its own row, so a 2xx means it is never lost (202 = queued, applied on next poll).
 */
export type TapStatus = "idle" | "sending" | "retrying" | "failed" | "rejected";

const RETRY_DELAYS_MS = [300, 700, 1500, 3000];

export async function postAction(
  url: string,
  body: unknown,
  onStatus: (s: TapStatus) => void,
): Promise<{ status: number; data: { ok?: boolean; view?: unknown; error?: string } | null } | null> {
  onStatus("sending");
  for (let attempt = 0; ; attempt++) {
    let status = 0;
    let data: { ok?: boolean; view?: unknown; error?: string } | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch {
      status = 0;
    }
    const retryable = status === 0 || status === 429 || status >= 500;
    if (!retryable) {
      // P2-1: a queued action the game rejected (e.g. answer during the wager) comes back 4xx.
      onStatus(status >= 400 && status < 500 && data?.ok === false && status !== 404 ? "rejected" : "idle");
      return { status, data };
    }
    if (attempt >= RETRY_DELAYS_MS.length) {
      onStatus("failed");
      return null;
    }
    onStatus("retrying");
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
}
