"use client";

import { useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { HostSeatPanel } from "@/components/host-seat-panel";
import { GameShowStage } from "@/components/game-show";
import { kidPlainText } from "@/lib/plain-text";

export function MemoryMatchHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const match = view.match;
  const ranked = [...view.players].sort((a, b) => b.score - a.score);

  return (
    <GameShowStage>
      <header className="border-b border-white/15 bg-black/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-amber-200">
              Live host · Memory Match
            </p>
            <h1 className="dd-title text-2xl font-black uppercase sm:text-3xl">
              {kidPlainText(view.board.title, 80)}
            </h1>
          </div>
          <div className="gs-glass rounded-2xl px-5 py-3 text-center">
            <p className="text-base uppercase tracking-wide text-white/90">
              Student room code
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-widest">
              {view.code}
            </p>
            <p className="text-base text-white/90">
              {view.players.filter((p) => p.player_id !== "host").length} joined · students go to /join
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
              className="rounded-xl bg-emerald-800 px-6 py-3 text-lg font-black text-white shadow-lg shadow-emerald-900/50"
            >
              Start Memory Match
            </button>
            <button
              type="button"
              onClick={() =>
                onAction({ type: "lock_lobby", locked: !view.lobby_locked })
              }
              className="rounded-xl border border-white/40 px-5 py-3 text-base font-semibold"
            >
              {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
            </button>
          </div>
        )}

        <div className="w-full min-h-[16rem] overflow-visible gs-rise rounded-3xl border border-white/20 bg-black/40 p-4 pb-5 text-white backdrop-blur sm:aspect-video sm:min-h-0 sm:overflow-hidden sm:p-6 sm:pb-6">
          <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-0.5 text-center text-base font-black uppercase tracking-wide text-amber-200">
            {view.phase === "lobby"
              ? "Waiting in lobby"
              : "Find the matching pairs"}
          </p>
          <p className="mt-1 text-center text-3xl font-black text-white drop-shadow sm:text-4xl">
            {kidPlainText(view.board.title, 60)}
          </p>
          <p className="mt-1 text-center text-base text-white/90">
            {match ? `${match.pair_total} pairs` : ""} · tap cards on student
            devices
          </p>
          <div className="mt-4 grid auto-rows-min content-start grid-cols-2 gap-3 sm:h-[calc(100%-5.5rem)] sm:grid-cols-3 sm:overflow-y-auto lg:grid-cols-4">
            {ranked.filter((p) => p.player_id !== "host").length === 0 && (
              <p className="col-span-full self-center text-center text-white/90">
                Waiting for students…
              </p>
            )}
            {ranked.map((p) => {
              const row = match?.players.find((m) => m.player_id === p.player_id);
              return (
                <div
                  key={p.player_id}
                  className="flex flex-col justify-center rounded-2xl border border-white/25 bg-black/55 p-3 text-center shadow-lg backdrop-blur"
                >
                  <p className="truncate text-base font-bold">
                    {kidPlainText(p.display_name, 16)}
                  </p>
                  <p className="text-3xl font-black text-t4t-gold">
                    {p.score}
                  </p>
                  <p className="text-base text-white/90">
                    {row
                      ? `${row.pairs_found}/${match?.pair_total ?? 0} pairs`
                      : "ready"}
                    {row?.completed ? " · done" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>


          <HostSeatPanel view={view} onAction={onAction} />
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-base text-white/90 underline"
            >
              {showKey ? "Hide pair key" : "Show pair key (teacher only)"}
            </button>
            {showKey && match && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-base text-white/90">
                {match.pair_key.map((pair) => (
                  <li key={`${pair.prompt}-${pair.match}`}>
                    {pair.prompt} → {pair.match}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAction({ type: "end_game" })}
            className="rounded-lg border border-red-400 px-4 py-2 text-base font-semibold text-red-100"
          >
            End game
          </button>
        </div>
      </main>
    </GameShowStage>
  );
}
