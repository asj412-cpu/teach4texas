/**
 * Resilient polling for host + student screens (LG-ROOM-STORE).
 * A single 404 / 5xx / network error is never fatal: retry with backoff
 * 0.5s, then every 1s, and only give up on "missing" after ~15s of
 * continuous failure. An explicit server "ended" (410) gives up at once.
 * Network/5xx errors never give up; the UI shows "Reconnecting…" instead.
 */
export const POLL_INTERVAL_MS = 1000;
// D2: cap at 1s so the "Reconnecting…" banner clears within ~1s of recovery.
export const RETRY_DELAYS_MS = [500, 1000] as const;
export const RETRY_WINDOW_MS = 15000;
/** A poll that never returns is aborted and counted as a retry. */
export const POLL_TIMEOUT_MS = 8000;

/** ok = got state; missing = 404; ended = 410; retry = 5xx/network/other. */
export type PollOutcome = "ok" | "missing" | "ended" | "retry";

export function outcomeForStatus(status: number, ok: boolean): PollOutcome {
  if (ok) return "ok";
  if (status === 410) return "ended";
  if (status === 404) return "missing";
  if (status >= 500 || status === 0 || status === 429) return "retry";
  return "ok"; // other 4xx (e.g. 403): keep polling at the normal rate, as before
}

export function startResilientPoll(opts: {
  poll: (signal: AbortSignal) => Promise<PollOutcome>;
  onEnded: () => void;
  onReconnecting?: (reconnecting: boolean) => void;
  /** Abort a poll that has not settled. Defaults to 8s. */
  timeoutMs?: number;
}): () => void {
  let stopped = false;
  let scheduleTimer: ReturnType<typeof setTimeout> | undefined;
  let abortTimer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let failSince: number | null = null;
  let attempt = 0;
  const timeoutMs = opts.timeoutMs ?? POLL_TIMEOUT_MS;

  const schedule = (ms: number) => {
    if (!stopped) scheduleTimer = setTimeout(tick, ms);
  };

  async function tick() {
    if (stopped) return;
    const started = Date.now();
    controller?.abort();
    const current = new AbortController();
    controller = current;
    let outcome: PollOutcome = "retry";
    let timedOut = false;
    const timeout = new Promise<PollOutcome>((resolve) => {
      abortTimer = setTimeout(() => {
        timedOut = true;
        current.abort();
        resolve("retry");
      }, timeoutMs);
    });
    const polled = opts.poll(current.signal).then(
      (value) => value,
      () => "retry" as const,
    );
    try {
      outcome = await Promise.race([polled, timeout]);
    } catch {
      outcome = "retry";
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
      if (!timedOut) current.abort();
    }
    if (stopped) return;
    if (outcome === "ended") {
      opts.onEnded();
      return;
    }
    if (outcome === "ok") {
      if (failSince !== null) opts.onReconnecting?.(false);
      failSince = null;
      attempt = 0;
      schedule(POLL_INTERVAL_MS);
      return;
    }
    const now = Date.now();
    if (failSince === null) failSince = started;
    if (now - failSince >= 2000) opts.onReconnecting?.(true);
    if (outcome === "missing" && now - failSince >= RETRY_WINDOW_MS) {
      opts.onEnded();
      return;
    }
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    schedule(delay);
  }

  void tick();
  return () => {
    stopped = true;
    if (scheduleTimer) clearTimeout(scheduleTimer);
    if (abortTimer) clearTimeout(abortTimer);
    controller?.abort();
  };
}
