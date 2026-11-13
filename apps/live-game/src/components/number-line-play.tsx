"use client";

import { useEffect, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { NumberLineTrack } from "@/components/number-line/track";
import {
  ensureNumberLineAudio,
  isNumberLineMuted,
  playNumberLineSfx,
  setNumberLineMuted,
} from "@/components/number-line/audio";

function useClock(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function NumberLinePlay({
  view,
  submitting,
  notice,
  onPlace,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  notice: string | null;
  onPlace: (questionId: string, value: number, lock: boolean) => void;
}) {
  const line = view.number_line;
  const now = useClock();
  const [muted, setMuted] = useState(isNumberLineMuted());
  const [draft, setDraft] = useState<number | null>(null);
  const questionId = line?.question?.id ?? "";

  useEffect(() => {
    setDraft(null);
  }, [questionId, line?.my_locked]);

  if (!line) return null;

  const remain = line.paused
    ? line.paused_remaining_ms
    : line.ends_at
      ? Math.max(0, new Date(line.ends_at).getTime() - now)
      : null;
  const timeUp = remain != null && remain <= 0 && line.stage === "placing";
  const canMove = line.accepting && !line.my_locked && !timeUp && !submitting;
  const shown = draft ?? line.my_value;
  const revealed = line.stage === "reveal" || line.stage === "board";

  if (view.phase === "lobby") {
    return (
      <div className="nl-stage flex min-h-screen flex-col justify-center px-4 text-center text-white">
        <p className="text-base font-black uppercase tracking-widest text-[#fde047]">You are in</p>
        <h1 className="mt-3 text-3xl font-black">{kidPlainText(view.title, 80)}</h1>
        <p className="mt-4 text-base">Waiting for the host to start the number line.</p>
        <p className="mt-6 text-2xl font-black">You: {kidPlainText(view.my_display_name, 16)}</p>
      </div>
    );
  }

  if (view.phase === "final") {
    return (
      <div className="nl-stage relative min-h-screen px-4 py-8 text-center text-white">
        <p className="text-base font-black uppercase tracking-widest text-[#fde047]">Podium</p>
        <h1 className="mt-2 text-4xl font-black">Nice work</h1>
        <p className="mt-3 text-2xl font-black text-[#fde047]">Your score {view.my_score}</p>
        <ol className="mx-auto mt-6 max-w-md space-y-2 text-left">
          {line.podium.map((rank, index) => (
            <li key={rank.player_id} className="flex justify-between rounded-2xl bg-[#10233f] px-4 py-3 text-2xl font-black">
              <span>
                {index + 1}. {rank.display_name}
              </span>
              <span>{rank.score}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const question = line.question;

  return (
    <div className="nl-stage min-h-screen text-white">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-base font-black uppercase tracking-wide text-[#fde047]">
          {question ? `Question ${question.number} of ${question.total}` : "Number line"}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black tabular-nums text-[#fde047]">
            {view.my_score}
          </p>
          <button
            type="button"
            aria-pressed={muted}
            onClick={() => {
              ensureNumberLineAudio();
              setNumberLineMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-xl border-2 border-white px-3 py-2 text-base font-black"
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
      </header>
      <main className="px-0 pb-8">
        {line.stage === "board" ? (
          <section className="px-4">
            <h2 className="text-center text-3xl font-black text-[#fde047]">Top 5</h2>
            <ol className="mx-auto mt-4 max-w-md space-y-2">
              {line.leaderboard.map((rank, index) => (
                <li
                  key={rank.player_id}
                  className="flex justify-between rounded-2xl bg-[#10233f] px-4 py-3 text-2xl font-black"
                >
                  <span>
                    {index + 1}. {rank.display_name}
                  </span>
                  <span className="text-[#fde047]">{rank.score}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <>
            <h2 className="px-4 text-center text-3xl font-black leading-tight">
              {question ? question.prompt : "Watch the board."}
            </h2>
            {remain != null && line.stage === "placing" ? (
              <p className="mt-3 text-center text-3xl font-black tabular-nums text-[#fde047]">
                {timeUp ? "Time" : `${Math.ceil(remain / 1000)}s`}
              </p>
            ) : null}
            {question && line.stage === "placing" && !line.my_locked ? (
              <p className="mt-3 px-4 text-center text-base font-bold text-white">
                Drag or tap the line, then lock it in.
              </p>
            ) : null}
            {question ? (
              <div className="mt-8 w-full">
                <NumberLineTrack
                  item={question}
                  value={shown}
                  interactive={canMove}
                  disabled={!canMove}
                  answer={question.answer}
                  sweeping={line.stage === "reveal"}
                  dots={[]}
                  onGrab={() => {
                    ensureNumberLineAudio();
                    playNumberLineSfx("pickup");
                  }}
                  onPreview={(value) => setDraft(value)}
                  onPlace={(value) => {
                    setDraft(value);
                    ensureNumberLineAudio();
                    playNumberLineSfx("drop");
                    onPlace(question.id, value, false);
                  }}
                />
              </div>
            ) : null}
            {revealed && line.my_award ? (
              <p className="mt-4 px-4 text-center text-2xl font-black text-[#fde047]">
                {line.my_award.exact
                  ? `Exact +${line.my_award.total}`
                  : line.my_award.total > 0
                    ? `Close +${line.my_award.total}`
                    : "Not this time"}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="mx-4 mt-4 rounded-xl bg-[#b91c1c] px-4 py-3 text-center text-base font-bold">
                {notice}
              </p>
            ) : null}
            <div className="mt-6 px-4">
              <button
                type="button"
                disabled={!canMove || shown == null || !question}
                onClick={() => {
                  if (!question || shown == null) return;
                  ensureNumberLineAudio();
                  playNumberLineSfx("lock");
                  onPlace(question.id, shown, true);
                }}
                className="w-full rounded-2xl bg-[#fde047] px-4 py-4 text-2xl font-black uppercase text-[#1c1917] disabled:cursor-not-allowed disabled:grayscale-[60%]"
              >
                {line.my_locked ? "Locked in" : timeUp ? "Time is up" : "Lock it in"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
