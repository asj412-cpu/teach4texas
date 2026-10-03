"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function TrueFalseDashPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (answer: boolean) => void;
}) {
  const dash = view.dash;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          True or False Dash — wait for your teacher to start. (
          {view.players.length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!dash || view.phase !== "dashing") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for True or False Dash to start…
      </div>
    );
  }

  const progress = dash.item_total
    ? Math.min(dash.item_index + 1, dash.item_total) / dash.item_total
    : 0;
  const showCombo = dash.tapped && dash.last_correct && dash.streak >= 2;

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        True or False Dash
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Claim {Math.min(dash.item_index + 1, dash.item_total)}/{dash.item_total}{" "}
        · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-t4t-green transition-[width] duration-200"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {dash.completed && (
        <p className="mt-10 text-center text-xl font-bold text-t4t-green">
          You finished! Score {view.my_score}
        </p>
      )}

      {dash.prompt && (
        <p className="mx-auto mt-8 max-w-lg text-center text-2xl font-extrabold text-t4t-navy">
          {dash.prompt}
        </p>
      )}

      {showCombo && (
        <p className="mt-4 text-center text-2xl font-extrabold text-t4t-green animate-pulse">
          Combo {dash.streak}
        </p>
      )}

      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
        <button
          type="button"
          disabled={submitting || !dash.can_tap}
          onClick={() => onTap(true)}
          className={`min-h-24 rounded-2xl border-2 px-3 py-4 text-center text-2xl font-extrabold shadow-sm transition active:scale-95 disabled:opacity-70 ${
            dash.tapped && dash.picked === true
              ? dash.last_correct
                ? "border-t4t-green bg-t4t-green text-white"
                : "border-t4t-burnt bg-t4t-burnt text-white"
              : "border-t4t-green/40 bg-white text-t4t-green"
          }`}
        >
          True
        </button>
        <button
          type="button"
          disabled={submitting || !dash.can_tap}
          onClick={() => onTap(false)}
          className={`min-h-24 rounded-2xl border-2 px-3 py-4 text-center text-2xl font-extrabold shadow-sm transition active:scale-95 disabled:opacity-70 ${
            dash.tapped && dash.picked === false
              ? dash.last_correct
                ? "border-t4t-green bg-t4t-green text-white"
                : "border-t4t-burnt bg-t4t-burnt text-white"
              : "border-t4t-burnt/40 bg-white text-t4t-burnt"
          }`}
        >
          False
        </button>
      </div>

      {dash.tapped && !dash.completed && (
        <p
          className={`mt-6 text-center text-xl font-extrabold ${
            dash.last_correct ? "text-t4t-green" : "text-t4t-burnt"
          }`}
        >
          {dash.last_correct ? "Correct!" : "Miss."}
        </p>
      )}
    </div>
  );
}
