"use client";

import { useEffect, useRef, useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import type { NlSeconds } from "@/lib/domain/number-line";
import { kidPlainText } from "@/lib/plain-text";
import { HostFeedback } from "@/components/host-feedback";
import { NumberLineTrack } from "@/components/number-line/track";
import {
  ensureNumberLineAudio,
  isNumberLineMuted,
  playNumberLineSfx,
  setNumberLineMuted,
} from "@/components/number-line/audio";

const SECONDS: NlSeconds[] = [15, 30, 45, 60];

function useClock(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function NumberLineHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const line = view.number_line;
  const now = useClock();
  const [muted, setMuted] = useState(isNumberLineMuted());
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (!line) return;
    const key = `${line.stage}:${line.question?.id ?? ""}:${line.show_names}`;
    const before = prev.current;
    if (before && line.stage === "placing" && !before.startsWith("placing")) playNumberLineSfx("drop");
    if (before && line.stage === "reveal" && !before.startsWith("reveal")) playNumberLineSfx("reveal");
    if (before && view.phase === "final" && !before.startsWith("final")) playNumberLineSfx("fanfare");
    prev.current = view.phase === "final" ? "final" : key;
  }, [line, view.phase]);

  const act = (body: Record<string, unknown>) => {
    ensureNumberLineAudio();
    onAction(body);
  };

  if (!line) return null;

  const remain = line.paused
    ? line.paused_remaining_ms
    : line.ends_at
      ? Math.max(0, new Date(line.ends_at).getTime() - now)
      : null;

  const header = (
    <header className="border-b-4 border-[#fde047] bg-[#07111f] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-2xl font-black uppercase tracking-widest text-[#fde047]">Live host · Number line</p>
          <h1 className="text-2xl font-black text-white sm:text-4xl">{kidPlainText(view.board.title, 80)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              ensureNumberLineAudio();
              setNumberLineMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-xl border-2 border-white bg-[#10233f] px-4 py-3 text-2xl font-black text-white"
            aria-pressed={muted}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <div className="rounded-2xl border-2 border-[#fde047] bg-[#10233f] px-5 py-2 text-center">
            <p className="text-2xl font-bold uppercase tracking-wide text-[#fde047]">Room code</p>
            <p className="font-mono text-3xl font-black tracking-widest text-white">{view.code}</p>
            <p className="text-2xl text-white">
              {line.locked_count} locked in · {line.joined_count} joined
            </p>
          </div>
        </div>
      </div>
    </header>
  );

  if (view.phase === "lobby") {
    return (
      <div className="nl-stage min-h-screen text-white">
        {header}
        <main className="mx-auto max-w-3xl px-4 py-8">
          <section className="rounded-3xl border-4 border-[#fde047] bg-[#10233f] p-6 text-center">
            <h2 className="text-3xl font-black text-[#fde047]">Place it on the line</h2>
            <p className="mt-3 text-2xl text-white">
              Students drag or tap a marker on their own screen. You reveal the true spot here.
            </p>
            <p className="mt-4 text-2xl font-black uppercase tracking-wide text-[#fde047]">Timer for each question</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SECONDS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  aria-pressed={line.seconds === seconds}
                  onClick={() => act({ type: "nl_set_seconds", seconds })}
                  className={`rounded-2xl px-5 py-3 text-2xl font-black ${
                    line.seconds === seconds
                      ? "bg-[#fde047] text-[#1c1917]"
                      : "border-2 border-white bg-[#07111f] text-white"
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <ul className="mt-5 grid gap-2 text-left sm:grid-cols-2">
              {line.joined_count === 0 ? (
                <li className="rounded-xl bg-[#07111f] px-4 py-3 text-2xl font-bold">Waiting for students…</li>
              ) : null}
              {view.players
                .filter((player) => player.player_id !== "host")
                .map((player) => (
                  <li key={player.player_id} className="rounded-xl bg-[#07111f] px-4 py-3 text-2xl font-bold">
                    {kidPlainText(player.display_name, 16)}
                  </li>
                ))}
            </ul>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => act({ type: "start_game" })}
                className="rounded-2xl bg-[#fde047] px-8 py-4 text-2xl font-black uppercase text-[#1c1917] shadow-[0_6px_0_#a16207]"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => act({ type: "lock_lobby", locked: !view.lobby_locked })}
                className="rounded-2xl border-2 border-white bg-[#07111f] px-5 py-4 text-2xl font-black text-white"
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
      <div className="nl-stage relative min-h-screen text-white">
        <Confetti />
        {header}
        <main className="relative mx-auto max-w-4xl px-4 py-8 text-center">
          <p className="text-2xl font-black uppercase tracking-widest text-[#fde047]">Podium</p>
          <h2 className="mt-2 text-4xl font-black text-white">That is the line</h2>
          <Podium ranks={line.podium} />
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
              className="rounded-2xl border-2 border-white bg-[#10233f] px-8 py-4 text-2xl font-black uppercase text-white"
            >
              Return to game
            </button>
          </div>
        </main>
      </div>
    );
  }

  const question = line.question;
  const revealed = line.stage === "reveal" || line.stage === "board";

  return (
    <div className="nl-stage min-h-screen text-white">
      {header}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-full bg-[#10233f] px-4 py-2 text-2xl font-black uppercase text-[#fde047]">
            {line.paused
              ? "Paused"
              : question
                ? `Question ${question.number} of ${question.total}`
                : "Number line"}
          </p>
          {line.stage === "placing" || line.stage === "ready" ? (
            <p className="text-3xl font-black tabular-nums text-[#fde047]">
              {line.stage === "placing" ? `${Math.ceil((remain ?? 0) / 1000)}s` : `${line.seconds}s`}
            </p>
          ) : null}
        </div>
        {line.stage === "board" ? (
          <section className="mt-6 rounded-3xl border-4 border-[#fde047] bg-[#10233f] p-6">
            <h2 className="text-center text-3xl font-black text-[#fde047]">Top 5</h2>
            <Leaderboard ranks={line.leaderboard} />
          </section>
        ) : (
          <section className="mt-6">
            <h2 className="text-center text-3xl font-black leading-tight text-white sm:text-5xl">
              {question ? question.prompt : "Get ready for the next number."}
            </h2>
            {question ? (
              <p className="mt-2 text-center text-2xl font-bold text-[#fde68a]">
                TEKS {question.teks} · {question.mode === "snap" ? "Snap to a tick" : "Place anywhere"}
              </p>
            ) : null}
            {question ? (
              <div className="mt-8">
                <NumberLineTrack
                  item={question}
                  value={null}
                  interactive={false}
                  answer={question.answer}
                  sweeping={line.stage === "reveal"}
                  dots={
                    revealed
                      ? line.markers
                          .filter((marker) => marker.value != null)
                          .map((marker) => ({
                            id: marker.player_id,
                            value: marker.value as number,
                            name: line.show_names ? marker.display_name : null,
                          }))
                      : []
                  }
                />
              </div>
            ) : null}
            {revealed && question?.answer != null ? (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <p className="rounded-2xl bg-[#fde047] px-5 py-3 text-2xl font-black text-[#1c1917]">
                  Exact {line.exact_pct ?? 0}%
                </p>
                <p className="rounded-2xl border-2 border-[#fde047] bg-[#10233f] px-5 py-3 text-2xl font-black text-white">
                  Within tolerance {line.within_pct ?? 0}%
                </p>
              </div>
            ) : null}
            {line.stage === "ready" ? (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SECONDS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    aria-pressed={line.seconds === seconds}
                    onClick={() => act({ type: "nl_set_seconds", seconds })}
                    className={`rounded-2xl px-4 py-3 text-2xl font-black ${
                      line.seconds === seconds
                        ? "bg-[#fde047] text-[#1c1917]"
                        : "border-2 border-white bg-[#10233f] text-white"
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => act({ type: "nl_pause" })}
            className="rounded-2xl border-2 border-white bg-[#10233f] px-5 py-4 text-2xl font-black text-white"
          >
            {line.paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => act({ type: "nl_next" })}
            className="rounded-2xl bg-[#fde047] px-6 py-4 text-2xl font-black uppercase text-[#1c1917]"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => act({ type: "nl_reveal" })}
            disabled={line.stage !== "placing"}
            className="rounded-2xl bg-white px-6 py-4 text-2xl font-black uppercase text-[#1c1917] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reveal
          </button>
          <button
            type="button"
            onClick={() => act({ type: "nl_show_names" })}
            className="rounded-2xl border-2 border-white bg-[#10233f] px-5 py-4 text-2xl font-black text-white"
            aria-pressed={line.show_names}
          >
            {line.show_names ? "Hide names" : "Show names"}
          </button>
          <button
            type="button"
            onClick={() => act({ type: "end_game" })}
            className="rounded-2xl border-2 border-white bg-[#07111f] px-5 py-4 text-2xl font-black text-white"
          >
            End
          </button>
        </div>
      </main>
    </div>
  );
}

function Leaderboard({ ranks }: { ranks: { player_id: string; display_name: string; score: number }[] }) {
  if (ranks.length === 0) {
    return <p className="mt-4 text-center text-2xl font-bold">No scores yet.</p>;
  }
  return (
    <ol className="mx-auto mt-4 max-w-lg space-y-2">
      {ranks.map((rank, index) => (
        <li
          key={rank.player_id}
          className="flex items-center justify-between rounded-2xl bg-[#07111f] px-4 py-3 text-2xl font-black"
        >
          <span>
            {index + 1}. {rank.display_name}
          </span>
          <span className="text-[#fde047]">{rank.score}</span>
        </li>
      ))}
    </ol>
  );
}

function Podium({ ranks }: { ranks: { player_id: string; display_name: string; score: number }[] }) {
  const slots = [
    { place: 2, rank: ranks[1], height: "h-28" },
    { place: 1, rank: ranks[0], height: "h-40" },
    { place: 3, rank: ranks[2], height: "h-20" },
  ];
  return (
    <div className="mx-auto mt-8 flex max-w-xl items-end justify-center gap-3">
      {slots.map((slot) => (
        <div key={slot.place} className="flex w-28 flex-col items-center">
          <p className="text-2xl font-black text-white">{slot.rank?.display_name ?? "—"}</p>
          <p className="text-2xl font-black text-[#fde047]">{slot.rank?.score ?? 0}</p>
          <div
            className={`nl-podium mt-2 flex w-full items-end justify-center rounded-t-2xl bg-[#fde047] text-3xl font-black text-[#1c1917] ${slot.height}`}
          >
            {slot.place}
          </div>
        </div>
      ))}
    </div>
  );
}

function Confetti() {
  const bits = ["#fde047", "#fb7185", "#38bdf8", "#4ade80", "#ffffff", "#f97316"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.flatMap((color, i) =>
        [0, 1, 2].map((k) => (
          <span
            key={`${color}-${k}`}
            className="nl-confetti"
            style={{
              left: `${(i * 17 + k * 11) % 100}%`,
              background: color,
              animationDelay: `${(i + k) * 0.12}s`,
            }}
          />
        )),
      )}
    </div>
  );
}
