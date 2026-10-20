"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { fmtPull } from "@/lib/domain/tug-of-war";
import { TowArena, TowConfetti } from "@/components/tug-of-war/arena";
import { ensureTowAudio, isTowMuted, playTowSfx, setTowMuted } from "@/components/tug-of-war/audio";

const LETTERS = ["A", "B", "C", "D"];

export function TugOfWarPlay({
  view,
  submitting,
  onAnswer,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onAnswer: (choice: number) => void;
}) {
  const tow = view.tow;
  const [muted, setMuted] = useState(isTowMuted());
  const prev = useRef<{ stage: string; round: number; winner: string | null } | null>(null);
  useEffect(() => {
    if (!tow) return;
    const p = prev.current;
    if (p && tow.stage === "reveal" && (p.stage !== "reveal" || p.round !== tow.round)) {
      playTowSfx(tow.my_correct ? "cheer" : "creak");
    }
    if (p && tow.winner && !p.winner) playTowSfx("fanfare");
    prev.current = { stage: tow.stage, round: tow.round, winner: tow.winner };
  }, [tow]);

  if (!tow) return null;
  const team = tow.my_team;
  const teamName = team ? tow.team_names[team] : "your team";
  const teamBg = team === "red" ? "bg-[#b91c1c]" : team === "blue" ? "bg-[#1d4ed8]" : "bg-[#0b1630]";
  const last = tow.stage === "reveal" ? tow.last : null;
  const myPull = last && team ? (team === "red" ? last.red_pull : last.blue_pull) : null;
  const q = tow.question;
  const final = view.phase === "final";
  const winner = tow.winner;

  return (
    <div className="tw-sky relative min-h-screen overflow-hidden text-white">
      {final && winner && <TowConfetti team={winner} />}
      <header className={`${teamBg} border-b-4 border-white/80 px-4 py-3`}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold uppercase tracking-wide">You&apos;re on</p>
            <p className="truncate text-2xl font-black uppercase">
              {team === "red" ? "🚀 " : team === "blue" ? "☄️ " : ""}
              {teamName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold">{kidPlainText(view.my_display_name, 16)}</p>
            <button
              type="button"
              onClick={() => {
                ensureTowAudio();
                setTowMuted(!muted);
                setMuted(!muted);
              }}
              className="mt-1 rounded-lg border-2 border-white bg-[#0b1630] px-3 py-1 text-base font-bold"
              aria-pressed={muted}
            >
              {muted ? "🔇 Off" : "🔊 On"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-xl px-3 py-3">
        <div className="relative overflow-hidden rounded-2xl border-2 border-white/40">
          <TowArena position={tow.position} winner={final ? winner : null} compact />
          {tow.paused && !final && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="rounded-2xl bg-[#0b1630] px-5 py-2 text-2xl font-black uppercase text-yellow-200">⏸ Paused</p>
            </div>
          )}
        </div>
        {!final && view.phase !== "lobby" && (
          <p className="mx-auto mt-2 w-fit rounded-full bg-[#0b1630] px-4 py-1 text-base font-bold text-yellow-200">
            Round {Math.max(tow.round, 1)} / {tow.rounds_total}
          </p>
        )}

        {view.phase === "lobby" && (
          <section className="tw-panel mt-3 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black uppercase text-yellow-200">You&apos;re in!</p>
            <p className="mt-2 text-lg">
              Team {teamName} · {team ? tow.team_sizes[team] : 0} players. Waiting for your teacher to start.
            </p>
          </section>
        )}

        {final && (
          <section className="tw-panel gs-rise mt-3 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black uppercase">
              {winner === "tie"
                ? "It's a tie!"
                : winner === team
                  ? "Your team won! 🎉"
                  : `${winner ? tow.team_names[winner] : ""} win!`}
            </p>
            <p className="mt-2 text-lg">
              {winner !== "tie" && winner !== team ? "Great pulling — rematch? " : ""}You got {tow.my_correct_count} right.
            </p>
          </section>
        )}

        {!final && view.phase === "towing" && (
          <>
            {!q && (
              <section className="tw-panel mt-3 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black uppercase text-yellow-200">Grab the rope!</p>
                <p className="mt-2 text-lg">Get ready — the question is coming.</p>
              </section>
            )}
            {q && (
              <section className="tw-panel mt-3 rounded-2xl p-4" aria-live="polite">
                <p className="text-center text-2xl font-extrabold leading-snug">{q.prompt}</p>
                {last && (
                  <div className={`mt-3 rounded-xl px-4 py-3 text-center ${tow.my_correct ? "bg-[#047857]" : "bg-[#b91c1c]"}`}>
                    <p className="text-2xl font-black">{tow.my_correct ? "Correct! 💪" : tow.my_choice == null ? "No answer this time" : "Not this time"}</p>
                    {myPull != null && <p className="text-xl font-bold">Your team pulled {fmtPull(myPull)}!</p>}
                  </div>
                )}
                <div className="mt-3 grid gap-3">
                  {q.choices.map((c, i) => {
                    const locked = tow.my_choice != null;
                    const mine = tow.my_choice === i;
                    const correct = q.correct_index === i;
                    const state =
                      q.correct_index != null
                        ? correct
                          ? "border-white bg-[#047857]"
                          : mine
                            ? "border-white bg-[#b91c1c]"
                            : "border-white/30 bg-[#13294b]"
                        : mine
                          ? "border-yellow-300 bg-[#1c3a66] ring-4 ring-yellow-300"
                          : "border-white/30 bg-[#13294b]";
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={locked || submitting || tow.paused || tow.stage !== "question"}
                        onClick={() => {
                          ensureTowAudio();
                          playTowSfx("tick");
                          onAnswer(i);
                        }}
                        className={`tw-btn flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-xl font-bold text-white ${state}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-xl font-black text-[#0b1630]">
                          {LETTERS[i]}
                        </span>
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
                {tow.stage === "question" && tow.my_choice != null && (
                  <p className="mt-3 rounded-xl bg-[#13294b] px-4 py-2 text-center text-lg font-bold">Answer locked ✓ — hold the rope!</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
