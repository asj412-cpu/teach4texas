"use client";

import { useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { HostSeatPanel } from "@/components/host-seat-panel";
import { kidPlainText } from "@/lib/plain-text";

export function TrueFalseDashHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const dash = view.dash;
  const ranked = [...view.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-t4t-navy text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-t4t-gold">
              Live host · True or False Dash
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
              Start True or False Dash
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

        {view.phase === "dashing" && (
          <div className="mb-6 flex flex-wrap gap-3">
            {dash?.has_next && (
              <button
                type="button"
                onClick={() => onAction({ type: "next_claim" })}
                className="rounded-xl bg-t4t-gold px-5 py-3 text-sm font-semibold text-t4t-navy"
              >
                Next claim
              </button>
            )}
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

        <div className="w-full min-h-[16rem] overflow-visible rounded-2xl bg-t4t-lightBlue p-4 pb-5 text-t4t-navy sm:aspect-video sm:min-h-0 sm:overflow-hidden sm:p-6 sm:pb-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
            {view.phase === "lobby"
              ? "Waiting in lobby"
              : dash?.has_next
                ? "True or false?"
                : "Last claim"}
          </p>
          <p className="mx-auto mt-4 max-w-4xl text-center text-3xl font-extrabold leading-tight sm:text-5xl">
            {view.phase === "dashing" && dash?.prompt
              ? dash.prompt
              : kidPlainText(view.board.title, 60)}
          </p>
          <p className="mt-4 text-center text-sm text-t4t-darkText/70">
            {dash
              ? `Claim ${Math.min(dash.item_index + 1, dash.item_total)}/${dash.item_total}`
              : ""}{" "}
            · students tap True or False
            {view.phase === "dashing"
              ? ` · ${dash?.answer_count ?? 0}/${view.players.length} locked`
              : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:h-[calc(100%-12rem)] sm:grid-cols-3 sm:overflow-y-auto lg:grid-cols-4">
            {ranked.length === 0 && (
              <p className="col-span-full self-center text-center text-t4t-darkText/50">
                Waiting for students…
              </p>
            )}
            {ranked.map((p) => {
              const row = dash?.players.find(
                (m) => m.player_id === p.player_id,
              );
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
                      ? `${row.correct_count} correct${row.tapped ? " · locked" : " · picking"}${row.streak >= 2 ? ` · combo ${row.streak}` : ""}`
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
              className="text-sm text-white/70 underline"
            >
              {showKey ? "Hide answer key" : "Show answer key (teacher only)"}
            </button>
            {showKey && dash && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-white/85">
                {dash.item_key.map((item) => (
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
