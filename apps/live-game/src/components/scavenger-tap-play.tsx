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
        <p className="text-base uppercase text-amber-200">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-white/90">
          Scavenger Hunt — wait for your teacher to start. ({view.players.filter((p) => !p.is_host).length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-white">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!scavenger || view.phase !== "scavenging") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white">
        Waiting for Scavenger Hunt to start…
      </div>
    );
  }

  const progress = scavenger.item_total
    ? Math.min(scavenger.item_index + 1, scavenger.item_total) /
      scavenger.item_total
    : 0;

  return (
    <div className="min-h-screen px-4 py-6">
      <p className="text-center text-base font-semibold uppercase text-amber-200">
        Scavenger Hunt
      </p>
      <h1 className="dd-title mt-1 text-center text-2xl font-black uppercase">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-base text-white/90">
        Clue {Math.min(scavenger.item_index + 1, scavenger.item_total)}/
        {scavenger.item_total} · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full bg-t4t-green"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {scavenger.completed && (
        <p className="mt-10 text-center text-xl font-bold text-green-300">
          You finished! Score {view.my_score}
        </p>
      )}

      {scavenger.prompt && scavenger.targets && (
        <>
          <p className="mx-auto mt-8 max-w-lg text-center text-xl font-bold text-white">
            {scavenger.prompt}
          </p>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
            {scavenger.targets.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={submitting || !scavenger.can_tap}
                onClick={() => onTap(target.id)}
                className={`min-h-20 rounded-xl border-2 px-3 py-4 text-center text-lg font-bold transition active:scale-95 disabled:opacity-100 ${
                  scavenger.tapped && scavenger.picked === target.id
                    ? scavenger.last_correct ? "fb-correct" : "fb-wrong"
                    : "border-white/30 bg-black/50 text-white backdrop-blur active:bg-amber-300 active:text-t4t-navy"
                }`}
              >
                {target.label}
              </button>
            ))}
          </div>
        </>
      )}

      {scavenger.tapped && !scavenger.completed && (
        <p
          role="status"
          data-testid="answer-feedback"
          className={`mx-auto mt-6 w-fit rounded-full px-5 py-2 text-center text-xl font-black text-white ${
            scavenger.last_correct ? "fb-correct" : "fb-wrong"
          }`}
        >
          {scavenger.last_correct ? "Correct! +points" : "Miss — wait for the next clue."}
        </p>
      )}
    </div>
  );
}
