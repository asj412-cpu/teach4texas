"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import type { NlSeconds } from "@/lib/domain/number-line";
import { hostChromeBeforePx, hostScoreRowPx } from "@/lib/domain/number-line-layout";
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

function useHostFrame(phase: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState(72);
  const [viewport, setViewport] = useState(768);
  useEffect(() => {
    const measure = () => {
      setViewport(window.innerHeight || 768);
      const el = ref.current;
      if (!el) return;
      const next = Math.ceil(el.getBoundingClientRect().height);
      setBar((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [phase]);
  return { ref, bar, viewport };
}

function HostBar({
  barRef,
  children,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div ref={barRef} className="nl-host-bar">
      <div className="nl-host-bar-row">{children}</div>
    </div>
  );
}

function useClock(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export const HOST_PROMPT_CLASS =
  "nl-host-prompt text-center text-2xl font-black leading-8 text-white";

export function HostRoomCode({ code }: { code: string }) {
  return (
    <div className="shrink-0 rounded-2xl border-2 border-[#fde047] bg-[#10233f] px-3 py-2 text-center">
      <p className="text-2xl font-bold uppercase leading-8 tracking-wide text-[#fde047]">Room code</p>
      <p className="font-mono text-3xl font-black leading-9 tracking-widest text-white">{code}</p>
    </div>
  );
}

/** Hidden on the podium. One line at 24px, including on a phone. */
export function HostRosterCount({
  phase,
  locked,
  joined,
}: {
  phase: string;
  locked: number;
  joined: number;
}) {
  if (phase === "final") return null;
  return (
    <p className="whitespace-nowrap text-2xl font-bold leading-8 text-white">
      {locked} locked in · {joined} joined
    </p>
  );
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
  const [busy, setBusy] = useState(false);
  const frame = useHostFrame(view.phase);
  const headerRef = useRef<HTMLElement>(null);
  const beforeRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [chromePx, setChromePx] = useState(() => {
    const width = typeof window === "undefined" ? 1366 : window.innerWidth;
    return hostChromeBeforePx(width) + 32;
  });
  const [scorePx, setScorePx] = useState(() =>
    hostScoreRowPx(typeof window === "undefined" ? 1366 : window.innerWidth),
  );
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const measure = () => {
      const headerH = headerRef.current?.getBoundingClientRect().height ?? 0;
      const beforeH = beforeRef.current?.getBoundingClientRect().height ?? 0;
      if (headerH + beforeH > 0) setChromePx(Math.ceil(headerH + beforeH));
      const statsH = statsRef.current?.getBoundingClientRect().height ?? 0;
      if (statsH > 0) setScorePx(Math.ceil(statsH));
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [headerRef.current, beforeRef.current, statsRef.current]) {
      if (el) observer.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [view.phase, line?.stage, line?.question?.prompt, line?.question?.id, line?.locked_count, line?.joined_count]);

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
    if (busy) return;
    ensureNumberLineAudio();
    setBusy(true);
    void Promise.resolve(onAction(body)).finally(() => setBusy(false));
  };

  if (!line) return null;

  const remain = line.paused
    ? line.paused_remaining_ms
    : line.ends_at
      ? Math.max(0, new Date(line.ends_at).getTime() - now)
      : null;

  const header = (
    <header ref={headerRef} className="border-b-4 border-[#fde047] bg-[#07111f] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2">
        <h1 className="min-w-0 text-2xl font-black leading-8 text-white">
          <span className="text-[#fde047]">Number line · </span>
          {kidPlainText(view.board.title, 80)}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              ensureNumberLineAudio();
              setNumberLineMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-xl border-2 border-white bg-[#10233f] px-3 py-2 text-2xl font-black leading-8 text-white"
            aria-pressed={muted}
            aria-label={muted ? "Sound off" : "Sound on"}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <HostRoomCode code={view.code} />
        </div>
        <HostRosterCount phase={view.phase} locked={line.locked_count} joined={line.joined_count} />
      </div>
    </header>
  );

  if (view.phase === "lobby") {
    return (
      <div className="nl-stage min-h-screen text-white" style={{ paddingBottom: frame.bar }}>
        {header}
        <main className="mx-auto max-w-3xl px-4 py-3">
          <section className="rounded-3xl border-4 border-[#fde047] bg-[#10233f] p-4 text-center">
            <h2 className="text-3xl font-black text-[#fde047]">Place it on the line</h2>
            <p className="mt-2 text-2xl text-white">
              Students drag or tap a marker on their own screen. You reveal the true spot here.
            </p>
            <p className="mt-3 text-2xl font-black uppercase tracking-wide text-[#fde047]">Timer for each question</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {SECONDS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  disabled={busy}
                  aria-pressed={line.seconds === seconds}
                  onClick={() => act({ type: "nl_set_seconds", seconds })}
                  className={`rounded-2xl px-5 py-3 text-2xl font-black disabled:opacity-50 ${
                    line.seconds === seconds
                      ? "bg-[#fde047] text-[#1c1917]"
                      : "border-2 border-white bg-[#07111f] text-white"
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <ul className="mt-3 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto text-left md:grid-cols-4">
              {line.joined_count === 0 ? (
                <li className="rounded-xl bg-[#07111f] px-3 py-2 text-2xl font-bold">Waiting for students…</li>
              ) : null}
              {view.players
                .filter((player) => player.player_id !== "host")
                .map((player) => (
                  <li key={player.player_id} className="truncate rounded-xl bg-[#07111f] px-3 py-2 text-2xl font-bold">
                    {kidPlainText(player.display_name, 16)}
                  </li>
                ))}
            </ul>
          </section>
        </main>
        <HostBar barRef={frame.ref}>
          <button
            type="button"
            disabled={busy}
            onClick={() => act({ type: "start_game" })}
            className="nl-host-btn bg-[#fde047] text-[#1c1917]"
            aria-label="Start game"
          >
            {busy ? "Starting…" : "Start"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act({ type: "lock_lobby", locked: !view.lobby_locked })}
            className="nl-host-btn border-2 border-white bg-[#07111f] text-white"
            aria-label={view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
          >
            {view.lobby_locked ? "Unlock" : "Lock"}
          </button>
        </HostBar>
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ type: "play_again" })}
              className="rounded-2xl bg-[#fde047] px-8 py-4 text-2xl font-black uppercase text-[#1c1917] shadow-[0_6px_0_#a16207] disabled:opacity-50"
            >
              Play again
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ type: "return_to_game" })}
              className="rounded-2xl border-2 border-white bg-[#10233f] px-8 py-4 text-2xl font-black uppercase text-white disabled:opacity-50"
            >
              Return to game
            </button>
          </div>
          <div className="mx-auto mt-6 flex max-w-lg justify-center">
            <HostFeedback code={view.code} />
          </div>
        </main>
      </div>
    );
  }

  const question = line.question;
  const revealed = line.stage === "reveal" || line.stage === "board";

  return (
    <div className="nl-stage min-h-screen text-white" style={{ paddingBottom: frame.bar }}>
      {header}
      <main className="mx-auto w-full px-2">
        {line.stage === "board" ? (
          <section className="mt-6 rounded-3xl border-4 border-[#fde047] bg-[#10233f] p-6">
            <h2 className="text-center text-3xl font-black text-[#fde047]">Top 5</h2>
            <Leaderboard ranks={line.leaderboard} />
          </section>
        ) : (
          <section>
            <div ref={beforeRef} className="pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate rounded-full bg-[#10233f] px-3 py-1 text-2xl font-black leading-8 text-[#fde047]">
                  {line.paused
                    ? "Paused"
                    : question
                      ? `Question ${question.number} of ${question.total}`
                      : "Number line"}
                </p>
                {line.stage === "placing" || line.stage === "ready" ? (
                  <p className="text-2xl font-black leading-8 tabular-nums text-[#fde047]">
                    {line.stage === "placing" ? `${Math.ceil((remain ?? 0) / 1000)}s` : `${line.seconds}s`}
                  </p>
                ) : null}
              </div>
              <h2 className={`${HOST_PROMPT_CLASS} mt-1`}>
                {question ? question.prompt : "Get ready for the next number."}
              </h2>
              {question ? (
                <p className="mt-1 text-center text-2xl font-bold leading-8 text-[#fde68a]">
                  TEKS {question.teks} · {question.mode === "snap" ? "Snap to a tick" : "Place anywhere"}
                </p>
              ) : null}
            </div>
            {question ? (
              <div className="mt-1">
                <NumberLineTrack
                  item={question}
                  value={null}
                  interactive={false}
                  answer={question.answer}
                  labelsRevealed={revealed}
                  barPx={frame.bar}
                  viewportPx={frame.viewport}
                  chromePx={chromePx}
                  scoreRowPx={scorePx}
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
              <div
                ref={statsRef}
                className="flex flex-wrap justify-center gap-2 pt-1"
                style={{ scrollMarginBottom: frame.bar + 8 }}
              >
                <p className="whitespace-nowrap rounded-2xl bg-[#fde047] px-4 py-1 text-2xl font-black leading-8 text-[#1c1917]">
                  Exact {line.exact_pct ?? 0}%
                </p>
                <p className="whitespace-nowrap rounded-2xl border-2 border-[#fde047] bg-[#10233f] px-4 py-1 text-2xl font-black leading-8 text-white">
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
                    disabled={busy}
                    aria-pressed={line.seconds === seconds}
                    onClick={() => act({ type: "nl_set_seconds", seconds })}
                    className={`rounded-2xl px-4 py-3 text-2xl font-black disabled:opacity-50 ${
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
      </main>
      <HostBar barRef={frame.ref}>
        <button type="button" disabled={busy} onClick={() => act({ type: "nl_pause" })} className="nl-host-btn border-2 border-white bg-[#10233f] text-white" aria-label={line.paused ? "Resume" : "Pause"}>
          {line.paused ? "Resume" : "Pause"}
        </button>
        <button type="button" disabled={busy} onClick={() => act({ type: "nl_next" })} className="nl-host-btn bg-[#fde047] text-[#1c1917]" aria-label="Next question">
          Next
        </button>
        <button type="button" disabled={busy || line.stage !== "placing"} onClick={() => act({ type: "nl_reveal" })} className="nl-host-btn bg-white text-[#1c1917] disabled:cursor-not-allowed" aria-label="Reveal answers">
          Reveal
        </button>
        <button type="button" disabled={busy} onClick={() => act({ type: "nl_show_names" })} className="nl-host-btn border-2 border-white bg-[#10233f] text-white" aria-pressed={line.show_names} aria-label={line.show_names ? "Hide names" : "Show names"}>
          <span className="nl-host-names">
            <span className={line.show_names ? undefined : "invisible"} aria-hidden={!line.show_names}>Hide</span>
            <span className={line.show_names ? "invisible" : undefined} aria-hidden={line.show_names}>Names</span>
          </span>
        </button>
        <button type="button" disabled={busy} onClick={() => act({ type: "end_game" })} className="nl-host-btn border-2 border-white bg-[#07111f] text-white" aria-label="End game">
          End
        </button>
      </HostBar>
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
