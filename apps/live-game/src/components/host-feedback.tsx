"use client";

import { useState } from "react";

const HOST_TOKEN_KEY = "t4t_host_token";
const ROOM_CODE_KEY = "t4t_room_code";

/**
 * One-tap host feedback on the final screen. Never gates Play again / Return to game.
 */
export function HostFeedback({ code }: { code?: string }) {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [note, setNote] = useState("");

  async function submit(nextRating: 1 | -1 | null, nextNote?: string) {
    if (done) return;
    setDone(true);
    const roomCode =
      code ?? (typeof window !== "undefined" ? sessionStorage.getItem(ROOM_CODE_KEY) : null);
    const token = typeof window !== "undefined" ? sessionStorage.getItem(HOST_TOKEN_KEY) : null;
    if (!roomCode || !token) return;
    const trimmed = (nextNote ?? note).trim();
    try {
      await fetch(`/api/rooms/${roomCode}/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: nextRating,
          note: trimmed.length > 0 ? trimmed : undefined,
        }),
      });
    } catch {
      // Failures are silent (UT-11); thanks already shown.
    }
  }

  if (done) {
    return (
      <p className="text-center text-base font-semibold text-white">Thanks for the feedback</p>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-white/25 bg-[#13294b] p-4 text-white">
      <h2 className="text-center text-2xl font-bold leading-tight">How did it go?</h2>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Thumbs up"
          onClick={() => {
            setRating(1);
            void submit(1);
          }}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-t4t-green px-4 py-3 text-2xl font-bold text-white"
        >
          <span aria-hidden>👍</span>
          <span>Thumbs up</span>
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          onClick={() => {
            setRating(-1);
            void submit(-1);
          }}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-t4t-burnt px-4 py-3 text-2xl font-bold text-white"
        >
          <span aria-hidden>👎</span>
          <span>Thumbs down</span>
        </button>
      </div>
      <label className="mt-4 block text-base font-semibold text-white">
        Something broke? (optional)
        <textarea
          value={note}
          maxLength={500}
          rows={3}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/30 bg-[#0b1630] px-3 py-2 text-base text-white placeholder:text-white/60"
          placeholder="What went wrong?"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void submit(rating, note)}
          className="min-h-8 rounded-lg bg-amber-300 px-4 py-2 text-base font-bold text-t4t-navy"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => void submit(null, "")}
          className="min-h-8 rounded-lg border border-white/50 px-4 py-2 text-base font-semibold text-white"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
