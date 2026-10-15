"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** R2 P1-H08: shared game-show stage (sunburst + sparks), sound cues and finale. */

type Cue = "select" | "open" | "correct" | "wrong" | "reveal" | "fanfare" | "tap";

const CUES: Record<Cue, { notes: number[]; step: number; type: OscillatorType; len: number; vol: number }> = {
  tap: { notes: [880], step: 0.05, type: "sine", len: 0.06, vol: 0.08 },
  select: { notes: [392, 523.25], step: 0.08, type: "square", len: 0.12, vol: 0.06 },
  open: { notes: [523.25, 659.25, 783.99], step: 0.09, type: "triangle", len: 0.2, vol: 0.14 },
  correct: { notes: [659.25, 783.99, 1046.5], step: 0.08, type: "triangle", len: 0.35, vol: 0.16 },
  wrong: { notes: [220, 174.61], step: 0.14, type: "sawtooth", len: 0.3, vol: 0.08 },
  reveal: { notes: [392, 493.88, 587.33, 783.99], step: 0.1, type: "triangle", len: 0.4, vol: 0.14 },
  fanfare: { notes: [523.25, 523.25, 659.25, 783.99, 1046.5], step: 0.13, type: "triangle", len: 0.8, vol: 0.16 },
};

/** Synthesized cue via Web Audio (no asset files). No-ops when audio is blocked. */
export function playCue(kind: Cue) {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const c = CUES[kind];
    c.notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = c.type;
      o.frequency.value = f;
      const t = ctx.currentTime + i * c.step;
      const last = i === c.notes.length - 1;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(c.vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (last ? c.len : c.step + 0.04));
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + c.len + 0.1);
    });
    setTimeout(() => void ctx.close(), 2000);
  } catch {
    /* audio is optional */
  }
}

/** Plays a cue whenever `key` changes to a non-null value. */
export function useCueOn(key: string | null, kind: Cue) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (key == null || key === last.current) return;
    last.current = key;
    playCue(kind);
  }, [key, kind]);
}

function Sparks({ n = 12 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
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

export function GameShowStage({
  children,
  className = "",
  sparks = true,
}: {
  children: ReactNode;
  className?: string;
  sparks?: boolean;
}) {
  return (
    <div className={`dd-stage min-h-screen text-white ${className}`}>
      <div className="dd-rays" aria-hidden />
      {sparks ? <Sparks /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const CONFETTI = ["#ffd66b", "#ff6b6b", "#3ddc84", "#5ab0ff", "#c38bff", "#ffffff"];

export function Confetti({ n = 36 }: { n?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="gs-confetti"
          style={{
            left: `${(i * 53) % 100}%`,
            background: CONFETTI[i % CONFETTI.length],
            animationDelay: `${(i * 0.17) % 3.6}s`,
            animationDuration: `${3 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Finale: podium for the top 3 + glass list for everyone else. */
export function Finale({
  players,
  highlightId,
  footer,
}: {
  players: { player_id: string; display_name: string; score: number }[];
  highlightId?: string | null;
  footer?: ReactNode;
}) {
  useCueOn("finale", "fanfare");
  // AC-H08 P2: host seat hidden unless it scored; shown as "Teacher"; ties share a rank and the
  // teacher always sorts after tied students so a tie never puts the teacher in the gold slot.
  const isHost = (p: { player_id: string }) => p.player_id === "host";
  const ranked = players
    .filter((p) => !isHost(p) || p.score > 0)
    .map((p) => (isHost(p) ? { ...p, display_name: "Teacher" } : p))
    .sort((a, b) => b.score - a.score || Number(isHost(a)) - Number(isHost(b)));
  const rankOf = (p: { score: number }) => 1 + ranked.filter((o) => o.score > p.score).length;
  const tied = (p: { player_id: string; score: number }) =>
    ranked.some((o) => o.player_id !== p.player_id && o.score === p.score);
  const top = ranked.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const heights = ["h-28", "h-40", "h-20"];
  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const medalFor = (p: { player_id: string; score: number }) =>
    isHost(p) && tied(p) ? "🎓" : (MEDAL[rankOf(p)] ?? "🏅");
  return (
    <GameShowStage>
      <Confetti />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="dd-title dd-title-shimmer text-center text-5xl font-black uppercase tracking-tight sm:text-6xl">
          Final Scores
        </h1>
        <div className="mt-10 flex items-end justify-center gap-3">
          {order.map((p, i) =>
            p ? (
              <div key={p.player_id} className="flex w-32 flex-col items-center gs-rise" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                <span className="text-4xl">{medalFor(p)}</span>
                <span className="mt-1 max-w-full truncate rounded-md bg-black/60 px-2 text-base font-bold text-white">
                  {rankOf(p)}. {p.display_name}
                </span>
                <span className="mt-1 rounded-md bg-black/60 px-2 text-lg font-black text-amber-200">{p.score}</span>
                <div
                  className={`gs-glass gs-podium mt-2 w-full rounded-t-xl ${heights[i]} ${
                    p.player_id === highlightId ? "ring-4 ring-t4t-gold" : ""
                  }`}
                  style={{ animationDelay: `${0.3 + i * 0.15}s` }}
                />
              </div>
            ) : null,
          )}
        </div>
        {ranked.length > 3 && (
          <ol className="mt-8 space-y-2">
            {ranked.slice(3).map((p, i) => (
              <li
                key={p.player_id}
                className={`gs-rise flex justify-between rounded-xl bg-black/55 px-4 py-2 text-base text-white ${
                  p.player_id === highlightId ? "ring-2 ring-t4t-gold" : ""
                }`}
                style={{ animationDelay: `${0.6 + i * 0.05}s` }}
              >
                <span>
                  {rankOf(p)}. {isHost(p) ? "🎓 " : ""}{p.display_name}
                </span>
                <span className="font-bold text-amber-200">{p.score}</span>
              </li>
            ))}
          </ol>
        )}
        {footer}
      </div>
    </GameShowStage>
  );
}

/** Drop-in cue trigger for render branches (hooks can't sit after early returns). */
export function CueOn({ k, kind }: { k: string | null; kind: Cue }) {
  useCueOn(k, kind);
  return null;
}
