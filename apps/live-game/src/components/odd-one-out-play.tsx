"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function OddOneOutPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (optionId: string) => void;
}) {
  const odd = view.odd;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          Find the Odd One — wait for your teacher to start. (
          {view.players.length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!odd || view.phase !== "odding") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for Find the Odd One to start…
      </div>
    );
  }

  const progress = odd.item_total
    ? Math.min(odd.item_index + 1, odd.item_total) / odd.item_total
    : 0;
  const optionCount = odd.options?.length ?? 0;

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        Find the Odd One
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Round {Math.min(odd.item_index + 1, odd.item_total)}/{odd.item_total} ·
        Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-t4t-green transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {odd.completed && (
        <p className="mt-10 text-center text-xl font-bold text-t4t-green">
          You finished! Score {view.my_score}
        </p>
      )}

      {odd.options && (
        <>
          {odd.prompt && (
            <p className="mx-auto mt-8 max-w-lg text-center text-2xl font-extrabold text-t4t-navy">
              {odd.prompt}
            </p>
          )}
          <div
            className={`mx-auto mt-8 grid max-w-md gap-3 ${
              optionCount === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"
            }`}
          >
            {odd.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={submitting || !odd.can_tap}
                onClick={() => onTap(opt.id)}
                className="min-h-20 rounded-xl border-2 border-t4t-navy/20 bg-white px-3 py-4 text-center text-lg font-extrabold text-t4t-navy shadow-sm transition active:scale-95 active:bg-t4t-navy active:text-white disabled:opacity-70"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {odd.tapped && !odd.completed && (
        <p className="mt-6 text-center text-sm text-t4t-navy">
          Locked in — wait for the next round.
        </p>
      )}
    </div>
  );
}
