"use client";

import { useEffect, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

function formatMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function TimedRacePlay({
  view,
  submitting,
  onAnswer,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onAnswer: (choiceIndex: number) => void;
}) {
  const race = view.race;
  const [remaining, setRemaining] = useState(race?.time_remaining_ms ?? 0);

  useEffect(() => {
    const endsAt = race?.ends_at;
    if (!endsAt || view.phase !== "racing") {
      setRemaining(race?.time_remaining_ms ?? 0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [race?.ends_at, race?.time_remaining_ms, view.phase]);

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-base uppercase text-amber-200">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-white/90">
          Timed Race — wait for your teacher to start. ({view.players.length}{" "}
          players)
        </p>
        <p className="mt-6 text-lg font-semibold text-white">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!race || view.phase !== "racing") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white">
        Waiting for Timed Race to start…
      </div>
    );
  }

  const timedOut = remaining <= 0 && !race.completed;
  const progress = race.item_total
    ? Math.min(race.item_index, race.item_total) / race.item_total
    : 0;

  return (
    <div className="min-h-screen px-4 py-6">
      <p className="text-center text-base font-semibold uppercase text-amber-200">
        Timed Race
      </p>
      <h1 className="dd-title mt-1 text-center text-2xl font-black uppercase">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-base text-white/90">
        {formatMs(remaining)} · {race.item_index}/{race.item_total} · Score{" "}
        {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full bg-t4t-green"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {race.completed && (
        <p className="mt-10 text-center text-xl font-bold text-green-300">
          You finished! Score {view.my_score}
        </p>
      )}

      {timedOut && (
        <p className="mt-10 text-center text-xl font-bold text-white">
          Time&apos;s up! Score {view.my_score}
        </p>
      )}

      {race.can_answer && race.prompt && race.choices && (
        <>
          <p className="mx-auto mt-8 max-w-lg text-center text-xl font-bold text-white">
            {race.prompt}
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            {race.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                disabled={submitting || !race.can_answer}
                onClick={() => onAnswer(i)}
                className="rounded-xl border-2 border-white/30 bg-black/50 backdrop-blur px-4 py-4 text-left text-base font-medium text-white active:bg-amber-300 active:text-white disabled:opacity-70"
              >
                <span className="mr-2 font-bold text-amber-200">
                  {String.fromCharCode(65 + i)}.
                </span>
                {choice}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
