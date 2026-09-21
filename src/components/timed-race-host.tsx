"use client";

import { useEffect, useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

function formatMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function TimedRaceHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const race = view.race;
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  const [remaining, setRemaining] = useState(race?.time_remaining_ms ?? 0);

  useEffect(() => {
    const endsAt = race?.ends_at;
    if (!endsAt || view.phase !== "racing") {
      setRemaining(race?.time_remaining_ms ?? 0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [race?.ends_at, race?.time_remaining_ms, view.phase]);

  return (
    <div className="min-h-screen bg-t4t-navy text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-t4t-gold">
              Live host · Timed Race
            </p>
            <h1 className="text-xl font-bold">
              {kidPlainText(view.board.title, 80)}
            </h1>
          </div>
          <div className="rounded-xl bg-black/30 px-5 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Student room code
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-widest">
              {view.code}
            </p>
            <p className="text-xs text-white/70">
              {view.players.length} joined · students go to /join
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view.phase === "lobby" && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onAction({ type: "start_game" })}
              className="rounded-xl bg-t4t-green px-5 py-3 text-sm font-semibold text-white"
            >
              Start Timed Race
            </button>
            <button
              type="button"
              onClick={() =>
                onAction({ type: "lock_lobby", locked: !view.lobby_locked })
              }
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold"
            >
              {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
            </button>
          </div>
        )}

        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-t4t-lightBlue p-4 text-t4t-navy sm:p-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
            {view.phase === "lobby"
              ? "Waiting in lobby"
              : remaining > 0
                ? "Race in progress"
                : "Time is up"}
          </p>
          <p className="mt-1 text-center text-2xl font-extrabold sm:text-3xl">
            {kidPlainText(view.board.title, 60)}
          </p>
          <p className="mt-1 text-center text-sm text-t4t-darkText/70">
            {race ? `${race.item_total} questions` : ""} ·{" "}
            {view.phase === "racing"
              ? formatMs(remaining)
              : `${race?.seconds ?? 90}s clock`}{" "}
            · tap answers on student devices
          </p>
          <div className="mt-4 grid h-[calc(100%-5.5rem)] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {ranked.length === 0 && (
              <p className="col-span-full self-center text-center text-t4t-darkText/50">
                Waiting for students…
              </p>
            )}
            {ranked.map((p) => {
              const row = race?.players.find((m) => m.player_id === p.player_id);
              return (
                <div
                  key={p.player_id}
                  className="flex flex-col justify-center rounded-xl bg-white p-3 text-center shadow-sm"
                >
                  <p className="truncate text-sm font-bold">
                    {kidPlainText(p.display_name, 16)}
                  </p>
                  <p className="text-2xl font-extrabold text-t4t-navy">
                    {p.score}
                  </p>
                  <p className="text-xs text-t4t-darkText/60">
                    {row
                      ? `${row.answered}/${race?.item_total ?? 0} answered`
                      : "ready"}
                    {row?.completed ? " · done" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-sm text-white/70 underline"
            >
              {showKey ? "Hide answer key" : "Show answer key (teacher only)"}
            </button>
            {showKey && race && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-white/85">
                {race.item_key.map((item) => (
                  <li key={`${item.prompt}-${item.answer}`}>
                    {item.prompt} → {item.answer}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAction({ type: "end_game" })}
            className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-200"
          >
            End game
          </button>
        </div>
      </main>
    </div>
  );
}
