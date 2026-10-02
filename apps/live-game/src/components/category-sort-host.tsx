"use client";

import { useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { HostSeatPanel } from "@/components/host-seat-panel";
import { kidPlainText } from "@/lib/plain-text";

export function CategorySortHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const category = view.category;
  const ranked = [...view.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-t4t-navy text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-t4t-gold">
              Live host · Sort into Bins
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
              className="rounded-xl bg-t4t-green px-5 py-3 text-sm font-semibold text-white"
            >
              Start Sort into Bins
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

        {view.phase === "binning" && (
          <div className="mb-6 flex flex-wrap gap-3">
            {category?.has_next && (
              <button
                type="button"
                onClick={() => onAction({ type: "next_item" })}
                className="rounded-xl bg-t4t-gold px-5 py-3 text-sm font-semibold text-t4t-navy"
              >
                Next item
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

        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-t4t-lightBlue p-4 text-t4t-navy sm:p-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
            {view.phase === "lobby"
              ? "Waiting in lobby"
              : category?.has_next
                ? "Sort this into a bin"
                : "Last item"}
          </p>
          {view.phase === "binning" && category?.prompt && (
            <p className="mt-1 text-center text-sm font-semibold text-t4t-darkText/70">
              {category.prompt}
            </p>
          )}
          <p className="mt-2 text-center text-2xl font-extrabold sm:text-4xl">
            {view.phase === "binning" && category?.item_label
              ? category.item_label
              : kidPlainText(view.board.title, 60)}
          </p>
          {view.phase === "binning" &&
            category?.categories &&
            category.categories.length > 0 && (
              <div
                className={`mx-auto mt-3 grid max-w-2xl gap-2 ${
                  category.categories.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2"
                }`}
              >
                {category.categories.map((bin) => (
                  <div
                    key={bin.id}
                    className="rounded-lg border-2 border-t4t-navy/20 bg-white px-2 py-2 text-center text-sm font-bold"
                  >
                    {bin.label}
                  </div>
                ))}
              </div>
            )}
          <p className="mt-2 text-center text-sm text-t4t-darkText/70">
            {category
              ? `Item ${Math.min(category.item_index + 1, category.item_total)}/${category.item_total}`
              : ""}{" "}
            · tap a bin on student devices
            {view.phase === "binning"
              ? ` · ${category?.answer_count ?? 0}/${view.players.length} sorted`
              : ""}
          </p>
          <div className="mt-3 grid h-[calc(100%-11rem)] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {ranked.filter((p) => p.player_id !== "host").length === 0 && (
              <p className="col-span-full self-center text-center text-t4t-darkText/50">
                Waiting for students…
              </p>
            )}
            {ranked.map((p) => {
              const row = category?.players.find(
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
                      ? `${row.correct_count} correct${row.tapped ? " · locked" : " · sorting"}`
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
            {showKey && category && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-white/85">
                {category.item_key.map((item) => (
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
