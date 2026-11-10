"use client";

import { useEffect, useRef, useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import type { BingoEndRule, BingoGrid } from "@/lib/domain/bingo";
import { kidPlainText } from "@/lib/plain-text";
import { BingoCardFace, BingoConfetti } from "@/components/bingo/card";
import { HostFeedback } from "@/components/host-feedback";
import {
  ensureBingoAudio,
  isBingoMuted,
  playBingoSfx,
  setBingoMuted,
} from "@/components/bingo/audio";

const RULES: { id: BingoEndRule; label: string; hint: string }[] = [
  { id: "first", label: "First bingo", hint: "The first line ends the game" },
  { id: "three", label: "3 winners", hint: "Keep going until 3 bingos" },
  { id: "blackout", label: "Blackout", hint: "Cover the whole card" },
];

export function BingoHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const bingo = view.bingo;
  const [muted, setMuted] = useState(isBingoMuted());
  const prev = useRef<{ stage: string; call: number; winners: number } | null>(null);

  useEffect(() => {
    if (!bingo) return;
    const p = prev.current;
    if (p && bingo.stage === "calling" && (p.stage !== "calling" || p.call !== bingo.call_number)) {
      playBingoSfx("drum");
    }
    if (p && bingo.stage === "reveal" && p.stage !== "reveal") playBingoSfx("reveal");
    if (p && bingo.winners.length > p.winners) playBingoSfx("fanfare");
    prev.current = { stage: bingo.stage, call: bingo.call_number, winners: bingo.winners.length };
  }, [bingo]);

  const act = (body: Record<string, unknown>) => {
    ensureBingoAudio();
    onAction(body);
  };

  if (!bingo) return null;

  const header = (
    <header className="border-b-4 border-[#fde047] bg-[#052e22] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-base font-black uppercase tracking-widest text-[#fde047]">Live host · Bingo</p>
          <h1 className="text-2xl font-black uppercase text-white sm:text-4xl">
            {kidPlainText(view.board.title, 80)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              ensureBingoAudio();
              setBingoMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-xl border-2 border-white bg-[#083426] px-4 py-3 text-base font-black text-white"
            aria-pressed={muted}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <div className="rounded-2xl border-2 border-[#fde047] bg-[#083426] px-5 py-2 text-center">
            <p className="text-base font-bold uppercase tracking-wide text-[#fde047]">Room code</p>
            <p className="font-mono text-3xl font-black tracking-widest text-white">{view.code}</p>
            <p className="text-base text-white">{bingo.student_count} joined · /join</p>
          </div>
        </div>
      </div>
    </header>
  );

  if (view.phase === "lobby") {
    return (
      <div className="bingo-felt min-h-screen text-white">
        {header}
        <main className="mx-auto max-w-5xl px-4 py-6">
          <section className="rounded-3xl border-4 border-[#fde047] bg-[#083426] p-5">
            <h2 className="text-center text-3xl font-black uppercase text-[#fde047]">Set up the card</h2>
            <p className="mt-2 text-center text-base text-white">
              You call questions from the projector. Students stamp their own cards. You do not get a card.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([5, 4] as BingoGrid[]).map((grid) => (
                <button
                  key={grid}
                  type="button"
                  aria-pressed={bingo.grid === grid}
                  onClick={() => act({ type: "bingo_set_grid", grid })}
                  className={`rounded-2xl px-4 py-4 text-left text-base font-black ${
                    bingo.grid === grid
                      ? "bg-[#fde047] text-[#1c1917]"
                      : "border-2 border-white bg-[#052e22] text-white"
                  }`}
                >
                  <span className="block text-2xl">{grid}×{grid}</span>
                  <span className="mt-1 block font-bold">
                    {grid === 5 ? "24 answers + FREE center" : "15 answers + FREE center"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {RULES.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  aria-pressed={bingo.end_rule === rule.id}
                  onClick={() => act({ type: "bingo_set_rule", end_rule: rule.id })}
                  className={`rounded-2xl px-4 py-4 text-left ${
                    bingo.end_rule === rule.id
                      ? "bg-[#fde047] text-[#1c1917]"
                      : "border-2 border-white bg-[#052e22] text-white"
                  }`}
                >
                  <span className="block text-xl font-black">{rule.label}</span>
                  <span className="mt-1 block text-base font-bold">{rule.hint}</span>
                </button>
              ))}
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {bingo.players.length === 0 && (
                <li className="rounded-xl bg-[#052e22] px-4 py-3 text-base font-bold">Waiting for students…</li>
              )}
              {bingo.players.map((player) => (
                <li key={player.player_id} className="rounded-xl bg-[#052e22] px-4 py-3 text-base font-bold">
                  {player.display_name}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => act({ type: "start_game" })}
                className="rounded-2xl bg-[#fde047] px-8 py-4 text-2xl font-black uppercase text-[#1c1917] shadow-[0_6px_0_#a16207]"
              >
                Start Bingo
              </button>
              <button
                type="button"
                onClick={() => act({ type: "lock_lobby", locked: !view.lobby_locked })}
                className="rounded-2xl border-2 border-white bg-[#052e22] px-5 py-4 text-xl font-black text-white"
              >
                {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view.phase === "final") {
    return (
      <div className="bingo-felt relative min-h-screen overflow-hidden text-white">
        <BingoConfetti />
        {header}
        <main className="relative mx-auto max-w-6xl px-4 py-6">
          <WinBanner bingo={bingo} />
          <WinnerCards bingo={bingo} />
          <div className="mx-auto mt-6 flex max-w-lg justify-center">
            <HostFeedback code={view.code} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => act({ type: "play_again" })}
              className="rounded-2xl bg-[#fde047] px-8 py-4 text-2xl font-black uppercase text-[#1c1917] shadow-[0_6px_0_#a16207]"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={() => act({ type: "return_to_game" })}
              className="rounded-2xl border-2 border-white bg-[#083426] px-8 py-4 text-2xl font-black uppercase text-white"
            >
              Return to game
            </button>
          </div>
        </main>
      </div>
    );
  }

  const q = bingo.question;
  return (
    <div className="bingo-felt relative min-h-screen overflow-hidden text-white">
      {bingo.winners.length > 0 ? <BingoConfetti /> : null}
      {header}
      <main className="relative mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rounded-full bg-[#083426] px-4 py-2 text-base font-black uppercase text-[#fde047]">
              {bingo.paused ? "Paused" : bingo.stage === "ready" ? "Ready" : `Call ${bingo.call_number} of ${bingo.call_total}`}
            </p>
            <p className="rounded-full bg-[#fde047] px-4 py-2 text-base font-black text-[#1c1917]">
              Close to bingo: {bingo.close_to_bingo}
            </p>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="bingo-drum" aria-hidden>
              <div className={`bingo-drum-ring ${bingo.stage === "calling" ? "is-live" : ""}`} />
              <div key={`${bingo.call_number}-${q?.answer ?? "hidden"}`} className={`bingo-ball ${q ? "is-in" : ""}`}>
                <span className="text-4xl font-black text-[#1c1917] sm:text-6xl">
                  {q?.answer ?? "B"}
                </span>
              </div>
            </div>
            <h2 className="mt-4 max-w-3xl text-center text-3xl font-black leading-tight text-white sm:text-4xl">
              {q ? q.prompt : "Press Next call when the class is ready."}
            </h2>
            {q?.answer ? (
              <p className="mt-3 rounded-2xl bg-[#fde047] px-6 py-3 text-3xl font-black text-[#1c1917] sm:text-4xl">
                Answer {q.answer}
              </p>
            ) : null}
            {q ? <p className="mt-2 text-base font-bold text-[#fde68a]">TEKS {q.teks}</p> : null}
          </div>
          {bingo.winners.length > 0 ? (
            <div className="mt-4">
              <WinBanner bingo={bingo} />
              <WinnerCards bingo={bingo} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => act({ type: "bingo_pause" })}
              className="rounded-2xl border-2 border-white bg-[#083426] px-5 py-4 text-xl font-black text-white"
            >
              {bingo.paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              disabled={bingo.paused}
              onClick={() => act(bingo.decided ? { type: "end_game" } : { type: "bingo_next" })}
              className="rounded-2xl bg-[#fde047] px-6 py-4 text-2xl font-black uppercase text-[#1c1917] disabled:cursor-not-allowed disabled:grayscale-[50%]"
            >
              {bingo.decided ? "Finish game" : "Next call"}
            </button>
            <button
              type="button"
              disabled={bingo.paused || bingo.stage !== "calling"}
              onClick={() => act({ type: "bingo_reveal" })}
              className="rounded-2xl border-2 border-[#fde047] bg-[#083426] px-5 py-4 text-xl font-black text-[#fde047] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reveal answer
            </button>
            <button
              type="button"
              onClick={() => act({ type: "end_game" })}
              className="rounded-2xl border-2 border-white bg-[#7f1d1d] px-5 py-4 text-xl font-black text-white"
            >
              End game
            </button>
          </div>
        </section>
        <aside className="rounded-3xl border-2 border-[#fde047] bg-[#083426] p-4">
          <h3 className="text-xl font-black uppercase text-[#fde047]">Called questions</h3>
          <ol className="mt-3 max-h-[28rem] space-y-2 overflow-auto">
            {bingo.called_log.length === 0 && (
              <li className="text-base font-bold text-white">No calls yet.</li>
            )}
            {bingo.called_log.map((row) => (
              <li key={row.call_number} className="rounded-xl bg-[#052e22] px-3 py-2 text-base text-white">
                <span className="font-black text-[#fde047]">{row.call_number}. </span>
                {row.prompt}
                {row.answer ? <span className="mt-1 block font-black text-[#fde68a]">Answer {row.answer}</span> : null}
              </li>
            ))}
          </ol>
          <h3 className="mt-4 text-xl font-black uppercase text-[#fde047]">Class</h3>
          <ul className="mt-2 space-y-1">
            {bingo.players.map((player) => (
              <li key={player.player_id} className="flex items-center justify-between gap-2 text-base font-bold">
                <span>{player.display_name}</span>
                <span className="text-[#fde68a]">
                  {player.winner ? "Bingo" : player.one_away ? "1 away" : `${player.marked} marks`}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

function WinBanner({ bingo }: { bingo: NonNullable<HostRoomView["bingo"]> }) {
  const names = bingo.winners.map((winner) => winner.display_name);
  const tie = bingo.tie_call != null;
  return (
    <div className="rounded-3xl border-4 border-white bg-[#991b1b] px-6 py-4 text-center text-white">
      <p className="text-base font-black uppercase tracking-widest text-[#fde68a]">
        {bingo.end_rule === "blackout" ? "Blackout" : tie ? "Same-call tie" : "Bingo"}
      </p>
      <p className="text-4xl font-black uppercase sm:text-5xl">
        {names.length === 0 ? "Bingo!" : names.join(" · ")}
      </p>
    </div>
  );
}

function WinnerCards({ bingo }: { bingo: NonNullable<HostRoomView["bingo"]> }) {
  if (bingo.winners.length === 0) return null;
  return (
    <div className={`mt-4 grid gap-4 ${bingo.winners.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-md"}`}>
      {bingo.winners.map((winner) => (
        <BingoCardFace
          key={winner.player_id}
          card={winner.card}
          label={`${winner.display_name}'s card`}
        />
      ))}
    </div>
  );
}
