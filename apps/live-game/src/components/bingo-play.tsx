"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { BingoCardFace, BingoConfetti } from "@/components/bingo/card";
import {
  ensureBingoAudio,
  isBingoMuted,
  playBingoSfx,
  setBingoMuted,
} from "@/components/bingo/audio";

export function BingoPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (cellIndex: number) => Promise<string | null>;
}) {
  const bingo = view.bingo;
  const [muted, setMuted] = useState(isBingoMuted());
  const [holdMs, setHoldMs] = useState(0);
  const prev = useRef<{ marks: number; won: boolean; call: number } | null>(null);

  useEffect(() => {
    if (!bingo) return;
    setHoldMs(bingo.lockout_ms);
  }, [bingo]);

  useEffect(() => {
    if (holdMs <= 0) return;
    const id = window.setInterval(() => {
      setHoldMs((ms) => Math.max(0, ms - 200));
    }, 200);
    return () => window.clearInterval(id);
  }, [holdMs]);

  useEffect(() => {
    if (!bingo?.card) return;
    const marks = bingo.marked_count;
    const call = bingo.question?.call_number ?? 0;
    const p = prev.current;
    if (p && marks > p.marks) playBingoSfx("stamp");
    if (p && bingo.i_won && !p.won) playBingoSfx("fanfare");
    if (p && call > p.call && bingo.stage === "calling") playBingoSfx("drum");
    prev.current = { marks, won: bingo.i_won, call };
  }, [bingo]);

  if (!bingo) return null;

  const locked = holdMs > 0 || bingo.paused || submitting;
  const q = bingo.question;

  return (
    <div className="bingo-felt relative min-h-screen text-white">
      {bingo.i_won ? <BingoConfetti /> : null}
      <header className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-base font-black uppercase tracking-widest text-[#fde047]">Bingo</p>
          <h1 className="text-xl font-black text-white">{kidPlainText(view.title, 60)}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            ensureBingoAudio();
            setBingoMuted(!muted);
            setMuted(!muted);
          }}
          className="rounded-xl border-2 border-white bg-[#083426] px-3 py-2 text-base font-black"
          aria-pressed={muted}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-8">
        {view.phase === "lobby" || !bingo.card ? (
          <section className="rounded-3xl border-4 border-[#fde047] bg-[#083426] p-6 text-center">
            <p className="text-2xl font-black text-[#fde047]">You&apos;re in, {view.my_display_name}</p>
            <p className="mt-3 text-base font-bold text-white">
              Waiting for your teacher to deal the cards.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border-2 border-[#fde047] bg-[#083426] px-4 py-4 text-center" aria-live="polite">
              <p className="text-base font-black uppercase text-[#fde68a]">
                {bingo.paused
                  ? "Paused"
                  : q
                    ? `Call ${q.call_number}`
                    : "Get ready"}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white">
                {q ? q.prompt : "Your card is ready. Listen for the first call."}
              </h2>
              {q?.answer ? (
                <p className="mt-3 text-3xl font-black text-[#fde047]">Answer {q.answer}</p>
              ) : null}
            </section>
            {holdMs > 0 ? (
              <p role="status" className="mt-3 rounded-2xl bg-[#7f1d1d] px-4 py-3 text-center text-base font-black text-white">
                Not this one. Hands still for {Math.ceil(holdMs / 1000)} seconds.
              </p>
            ) : null}
            {bingo.i_won ? (
              <p className="mt-3 rounded-2xl bg-[#fde047] px-4 py-3 text-center text-2xl font-black text-[#1c1917]">
                Bingo! Your card is on the big screen.
              </p>
            ) : null}
            <div className="mt-4">
              <BingoCardFace
                card={bingo.card}
                disabled={locked || bingo.stage === "ready" || !q}
                onTap={(index) => {
                  const cell = bingo.card?.cells[index];
                  if (!cell || cell.free || cell.marked) return;
                  ensureBingoAudio();
                  void onTap(index).then((err) => {
                    if (err === "WRONG" || err === "NOT_CALLED" || err === "LOCKED_OUT") {
                      playBingoSfx("buzz");
                      setHoldMs((ms) => Math.max(ms, 3000));
                    }
                  });
                }}
              />
            </div>
            <p className="mt-3 text-center text-base font-bold text-white">
              {view.my_display_name} · {bingo.marked_count} stamped
              {bingo.winner_names.length > 0 ? ` · Winners: ${bingo.winner_names.join(", ")}` : ""}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
