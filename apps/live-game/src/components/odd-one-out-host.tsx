"use client";

import { rankedTiles } from "@/lib/host-tiles";
import { useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { HostSeatPanel } from "@/components/host-seat-panel";
import { ClassProgress } from "@/components/class-progress";
import { GameShowStage } from "@/components/game-show";
import { kidPlainText } from "@/lib/plain-text";

export function OddOneOutHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const odd = view.odd;
  const ranked = rankedTiles(view);
  const optionCount = odd?.options.length ?? 0;

  return (
    <GameShowStage>
      <header className="border-b border-white/15 bg-black/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-amber-200">
              Live host · Find the Odd One
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
              Start Find the Odd One
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

        {view.phase === "odding" && (
          <div className="mb-6 flex flex-wrap gap-3">
            {odd?.has_next && (
              <button
                type="button"
                onClick={() => onAction({ type: "next_round" })}
                className="rounded-xl bg-amber-300 px-5 py-3 text-base font-black text-t4t-navy"
              >
                Next round
              </button>
            )}
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

        <div className="w-full min-h-[16rem] overflow-visible gs-rise rounded-3xl border border-white/20 bg-black/40 p-4 pb-5 text-white backdrop-blur sm:p-6 sm:pb-6">
          <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-0.5 text-center text-base font-black uppercase tracking-wide text-amber-200">
            {view.phase === "lobby"
              ? "Waiting in lobby"
              : odd?.has_next
                ? "Find the one that does not belong"
                : "Last round"}
          </p>
          <p className="mt-2 text-center text-3xl font-black text-white drop-shadow sm:text-4xl">
            {view.phase === "odding" && odd?.prompt
              ? odd.prompt
              : kidPlainText(view.board.title, 60)}
          </p>
          {view.phase === "odding" && odd?.options && odd.options.length > 0 && (
            <div
              className={`mx-auto mt-4 grid max-w-3xl gap-3 ${
                optionCount === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {odd.options.map((opt) => (
                <div
                  key={opt.id}
                  className="rounded-xl border-2 border-t4t-gold/60 bg-black/55 px-3 py-4 text-center text-lg font-extrabold shadow-sm sm:text-2xl"
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-base text-white/90">
            {odd
              ? `Round ${Math.min(odd.item_index + 1, odd.item_total)}/${odd.item_total}`
              : ""}{" "}
            · tap the odd one on student devices
            {view.phase === "odding"
              ? ` · ${odd?.answer_count ?? 0}/${view.players.length} locked`
              : ""}
          </p>
          {odd ? <ClassProgress label={`Item ${Math.min(odd.item_index + 1, odd.item_total)}/${odd.item_total} · answers in`} value={odd.answer_count} total={view.players.filter((p) => p.player_id !== "host").length} /> : null}
          <div className="mt-3 grid auto-rows-min content-start grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ranked.filter((p) => p.player_id !== "host").length === 0 && (
              <p className="col-span-full self-center text-center text-white/90">
                Waiting for students…
              </p>
            )}
            {ranked.map((p) => {
              const row = odd?.players.find(
                (m) => m.player_id === p.player_id,
              );
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
                      ? `${row.correct_count} correct${row.tapped ? " · locked" : " · picking"}`
                      : "ready"}
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
              {showKey ? "Hide answer key" : "Show answer key (teacher only)"}
            </button>
            {showKey && odd && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-base text-white/90">
                {odd.item_key.map((item) => (
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
            className="rounded-lg border border-red-400 px-4 py-2 text-base font-semibold text-red-100"
          >
            End game
          </button>
        </div>
      </main>
    </GameShowStage>
  );
}
