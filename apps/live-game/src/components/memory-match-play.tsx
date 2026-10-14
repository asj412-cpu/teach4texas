"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function MemoryMatchPlay({
  view,
  submitting,
  onFlip,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onFlip: (cardIndex: number) => void;
}) {
  const match = view.match;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-base uppercase text-amber-200">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-white/90">
          Memory Match — wait for your teacher to start. ({view.players.filter((p) => !p.is_host).length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-white">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!match || view.phase !== "matching") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white">
        Waiting for Memory Match to start…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6">
      <p className="text-center text-base font-semibold uppercase text-amber-200">
        Memory Match
      </p>
      <h1 className="dd-title mt-1 text-center text-2xl font-black uppercase">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-base text-white/90">
        Pairs {match.pairs_found}/{match.pair_total} · Moves {match.moves} ·
        Score {view.my_score}
      </p>

      <div
        className="mx-auto mt-4 grid max-w-lg gap-2"
        style={{ gridTemplateColumns: `repeat(${match.columns}, minmax(0, 1fr))` }}
      >
        {match.cards.map((card, i) => {
          const disabled =
            submitting ||
            !match.can_flip ||
            card.up ||
            match.completed;
          return (
            <button
              key={card.id}
              type="button"
              disabled={disabled}
              onClick={() => onFlip(i)}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 p-1.5 text-center text-base font-semibold leading-tight sm:text-base ${
                card.matched
                  ? "border-t4t-green bg-emerald-900/80 text-white"
                  : card.up
                    ? "border-t4t-gold bg-white text-t4t-navy"
                    : "border-amber-200/40 bg-black/55 text-amber-200"
              }`}
            >
              {card.up ? (card.text ?? "") : "?"}
            </button>
          );
        })}
      </div>

      {match.completed && (
        <p className="mt-6 text-center text-base font-semibold text-green-300">
          You found every pair!
        </p>
      )}
    </div>
  );
}
