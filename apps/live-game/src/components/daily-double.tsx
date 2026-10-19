"use client";

import { useEffect, useRef, useState } from "react";

/** Short game-show sting via Web Audio (no asset files). Silently no-ops if blocked. */
export function playDailyDoubleSting() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.11;
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.7 : 0.18));
      o.connect(gn).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.8);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* audio is optional */
  }
}

function Sparks() {
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="dd-spark"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i * 0.29) % 2.4}s`,
            width: 4 + (i % 3) * 3,
            height: 4 + (i % 3) * 3,
          }}
        />
      ))}
    </>
  );
}

function useStingOnce() {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    playDailyDoubleSting();
  }, []);
}

function quickBets(max: number, face: number): number[] {
  const set = new Set<number>([
    Math.min(face, max),
    Math.round(max / 2 / 50) * 50,
    max,
  ]);
  return [...set].filter((n) => n > 0).sort((a, b) => a - b);
}

function WagerPicker({
  max,
  face,
  current,
  disabled,
  onLock,
  tone,
}: {
  max: number;
  face: number;
  current: number | null;
  disabled?: boolean;
  onLock: (amount: number) => void;
  tone: "host" | "player";
}) {
  const [amount, setAmount] = useState<number>(current ?? Math.min(face, max));
  const [pulse, setPulse] = useState(0);
  const set = (n: number) => {
    setAmount(Math.max(0, Math.min(max, Math.round(n))));
    setPulse((p) => p + 1);
  };
  return (
    <div className="w-full">
      <div
        key={pulse}
        className="dd-pop text-center text-6xl font-black tabular-nums text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:text-7xl"
        aria-live="polite"
      >
        {amount}
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={max >= 200 ? 50 : 10}
        value={amount}
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value))}
        aria-label="Wager"
        className="mt-4 w-full accent-yellow-400"
      />
      <div className="mt-1 flex justify-between text-base text-white/80">
        <span>0</span>
        <span>max {max}</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quickBets(max, face).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => set(n)}
            className={`rounded-full border-2 px-4 py-1.5 text-base font-bold transition hover:scale-105 ${
              amount === n
                ? "border-yellow-300 bg-yellow-300 text-[#1b365d]"
                : "border-yellow-300/60 text-yellow-200"
            }`}
          >
            {n === max ? `All in · ${n}` : n}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLock(amount)}
        className={
          tone === "host"
            ? "mt-6 w-full rounded-2xl border-2 border-yellow-300 bg-white/5 py-4 text-lg font-black uppercase tracking-wide text-yellow-200 transition hover:bg-white/10 active:translate-y-1 disabled:opacity-60"
            : "mt-6 w-full rounded-2xl bg-gradient-to-b from-yellow-300 to-amber-500 py-4 text-lg font-black uppercase tracking-wide text-[#1b365d] shadow-[0_6px_0_#8a5a00] transition active:translate-y-1 active:shadow-[0_2px_0_#8a5a00] disabled:opacity-60"
        }
      >
        {current !== null ? `Locked at ${current} · change` : tone === "host" ? "Lock host wager" : "Lock my wager"}
      </button>
    </div>
  );
}

/** Student wager screen (phase dd_wager). */
export function DailyDoublePlayer(props: {
  category: string;
  points: number;
  score: number;
  maxWager: number;
  myWager: number | null;
  submitting: boolean;
  onWager: (amount: number) => void;
}) {
  useStingOnce();
  return (
    <div className="dd-stage min-h-screen px-4 py-10 text-white">
      <div className="dd-rays" />
      <Sparks />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <p className="text-base font-bold uppercase tracking-[0.3em] text-yellow-200/80">
          {props.category} · {props.points}
        </p>
        <h1 className="dd-title dd-title-shimmer mt-3 text-center text-5xl font-black uppercase leading-none sm:text-6xl">
          Bonus
          <br />
          Wager!
        </h1>
        <div className="dd-card mt-8 w-full rounded-3xl border border-yellow-300/40 bg-white/10 p-6 backdrop-blur">
          <p className="text-center text-base text-white/90">
            Your score <span className="font-bold text-yellow-200">{props.score}</span> · How much will you bet?
          </p>
          <WagerPicker
            max={props.maxWager}
            face={props.points}
            current={props.myWager}
            disabled={props.submitting}
            onLock={props.onWager}
            tone="player"
          />
          <p className="mt-4 text-center text-base font-semibold text-white/85">
            Right answer: +wager · Wrong answer: −wager
          </p>
        </div>
        {props.myWager !== null && (
          <p className="mt-6 animate-pulse text-center text-base font-semibold text-yellow-200">
            Wager locked! Waiting for your teacher to reveal the question…
          </p>
        )}
      </div>
    </div>
  );
}

/** Host wager screen (phase dd_wager). */
export function DailyDoubleHost(props: {
  code: string;
  category: string;
  points: number;
  hostScore: number;
  hostMaxWager: number;
  hostWager: number | null;
  wagerCount: number;
  playerCount: number;
  players: { player_id: string; display_name: string; score: number }[];
  wagers: Record<string, number>;
  onHostWager: (amount: number) => void;
  onOpenQuestion: () => void;
}) {
  useStingOnce();
  return (
    <div className="dd-stage min-h-screen px-4 py-8 text-white">
      <div className="dd-rays" />
      <Sparks />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col items-center">
          <p className="text-base font-bold uppercase tracking-[0.3em] text-yellow-200/80">
            Room {props.code} · {props.category} · {props.points}
          </p>
          <h1 className="dd-title dd-title-shimmer mt-4 text-center text-7xl font-black uppercase leading-none sm:text-8xl">
            Bonus
            <br />
            Wager!
          </h1>
          <p className="mt-6 max-w-lg text-center text-lg text-white/85">
            Everyone places a wager on their device. Right answers win the wager,
            wrong answers lose it. No wager = plays for {props.points}.
          </p>
          <div className="dd-card mt-8 w-full max-w-sm rounded-3xl border border-yellow-300/40 bg-white/10 p-6 backdrop-blur">
            <p className="text-center text-base text-white/80">
              host score <span className="font-bold text-yellow-200">{props.hostScore}</span>
            </p>
            <WagerPicker
              max={props.hostMaxWager}
              face={props.points}
              current={props.hostWager}
              onLock={props.onHostWager}
              tone="host"
            />
          </div>
        </div>
        <aside className="w-full rounded-2xl border border-yellow-300/30 bg-black/30 p-4 backdrop-blur lg:w-72">
          <p className="text-base uppercase text-white/80">Control dock</p>
          <p className="mt-2 text-base">
            Wagers in:{" "}
            <span className="font-bold text-yellow-200">
              {props.wagerCount} / {props.playerCount}
            </span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 transition-all duration-500"
              style={{
                width: `${props.playerCount ? (100 * props.wagerCount) / props.playerCount : 0}%`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={props.onOpenQuestion}
            className="mt-4 w-full rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 py-3 text-base font-black uppercase text-[#1b365d] shadow-[0_4px_0_#8a5a00] active:translate-y-0.5"
          >
            Reveal the question
          </button>
          <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-base">
            {props.players.map((p) => (
              <li key={p.player_id} className="flex items-center justify-between">
                <span>{p.display_name}</span>
                <span className={props.wagers[p.player_id] !== undefined ? "font-bold text-yellow-200" : "text-white/75"}>
                  {props.wagers[p.player_id] !== undefined ? "✓ locked" : "…"}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
