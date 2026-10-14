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
        <p className="text-base uppercase text-amber-200">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-white/90">
          Find the Odd One — wait for your teacher to start. (
          {view.players.filter((p) => !p.is_host).length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-white">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!odd || view.phase !== "odding") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white">
        Waiting for Find the Odd One to start…
      </div>
    );
  }

  const progress = odd.item_total
    ? Math.min(odd.item_index + 1, odd.item_total) / odd.item_total
    : 0;
  const optionCount = odd.options?.length ?? 0;

  return (
    <div className="min-h-screen px-4 py-6">
      <p className="text-center text-base font-semibold uppercase text-amber-200">
        Find the Odd One
      </p>
      <h1 className="dd-title mt-1 text-center text-2xl font-black uppercase">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-base text-white/90">
        Round {Math.min(odd.item_index + 1, odd.item_total)}/{odd.item_total} ·
        Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full bg-t4t-green transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {odd.completed && (
        <p className="mt-10 text-center text-xl font-bold text-green-300">
          You finished! Score {view.my_score}
        </p>
      )}

      {odd.options && (
        <>
          {odd.prompt && (
            <p className="mx-auto mt-8 max-w-lg text-center text-2xl font-extrabold text-white">
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
                className={`min-h-20 rounded-xl border-2 px-3 py-4 text-center text-lg font-extrabold shadow-sm transition active:scale-95 disabled:opacity-100 ${
                  odd.tapped && odd.picked === opt.id
                    ? odd.last_correct ? "fb-correct" : "fb-wrong"
                    : "border-white/30 bg-black/50 text-white backdrop-blur active:bg-amber-300 active:text-t4t-navy"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {odd.tapped && !odd.completed && (
        <p
          role="status"
          data-testid="answer-feedback"
          className={`mx-auto mt-6 w-fit rounded-full px-5 py-2 text-center text-xl font-black text-white ${
            odd.last_correct ? "fb-correct" : "fb-wrong"
          }`}
        >
          {odd.last_correct ? "Correct! +points" : "Miss — wait for the next round."}
        </p>
      )}
    </div>
  );
}
