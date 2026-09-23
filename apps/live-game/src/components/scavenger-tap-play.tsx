"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function ScavengerTapPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (targetId: string) => void;
}) {
  const scavenger = view.scavenger;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          Scavenger Hunt — wait for your teacher to start. ({view.players.length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!scavenger || view.phase !== "scavenging") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for Scavenger Hunt to start…
      </div>
    );
  }

  const progress = scavenger.item_total
    ? Math.min(scavenger.item_index + 1, scavenger.item_total) /
      scavenger.item_total
    : 0;

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        Scavenger Hunt
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Clue {Math.min(scavenger.item_index + 1, scavenger.item_total)}/
        {scavenger.item_total} · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-t4t-green"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {scavenger.completed && (
        <p className="mt-10 text-center text-xl font-bold text-t4t-green">
          You finished! Score {view.my_score}
        </p>
      )}

      {scavenger.prompt && scavenger.targets && (
        <>
          <p className="mx-auto mt-8 max-w-lg text-center text-xl font-bold text-t4t-navy">
            {scavenger.prompt}
          </p>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
            {scavenger.targets.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={submitting || !scavenger.can_tap}
                onClick={() => onTap(target.id)}
                className="min-h-20 rounded-xl border-2 border-t4t-navy/20 bg-white px-3 py-4 text-center text-base font-semibold text-t4t-navy active:bg-t4t-navy active:text-white disabled:opacity-70"
              >
                {target.label}
              </button>
            ))}
          </div>
        </>
      )}

      {scavenger.tapped && !scavenger.completed && (
        <p className="mt-6 text-center text-sm text-t4t-navy">
          Locked in — wait for the next clue.
        </p>
      )}
    </div>
  );
}
