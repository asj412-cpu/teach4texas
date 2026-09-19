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
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          Memory Match — wait for your teacher to start. ({view.players.length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!match || view.phase !== "matching") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for Memory Match to start…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-3 py-4 sm:px-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        Memory Match
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
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
              className={`flex aspect-square items-center justify-center rounded-xl border-2 p-1.5 text-center text-[11px] font-semibold leading-tight sm:text-sm ${
                card.matched
                  ? "border-t4t-green bg-t4t-green/15 text-t4t-navy"
                  : card.up
                    ? "border-t4t-gold bg-white text-t4t-navy"
                    : "border-t4t-navy/20 bg-t4t-navy text-t4t-gold"
              }`}
            >
              {card.up ? (card.text ?? "") : "?"}
            </button>
          );
        })}
      </div>

      {match.completed && (
        <p className="mt-6 text-center text-base font-semibold text-t4t-green">
          You found every pair!
        </p>
      )}
    </div>
  );
}
