"use client";

import { TurkeyMascot } from "@/components/escape-vault/turkey-mascot";

export type FinalePlayer = {
  player_id: string;
  display_name: string;
  score: number;
  is_host?: boolean;
};

export function EscapeFinale({
  title,
  notEscapedTitle,
  escaped,
  chips,
  codeWord,
  elapsedLabel,
  line,
  players = [],
  reducedMotion = false,
}: {
  title: string;
  notEscapedTitle: string;
  escaped: boolean;
  chips: string[];
  codeWord: string;
  elapsedLabel: string;
  line: string;
  players?: FinalePlayer[];
  reducedMotion?: boolean;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <div
      className={`ev-glass gs-rise relative overflow-hidden rounded-3xl p-6 text-white ${
        escaped ? "ring-2 ring-amber-300/60" : ""
      }`}
      data-testid="ev-finale"
      data-escaped={escaped ? "true" : "false"}
    >
      {escaped && !reducedMotion && (
        <div className="ev-confetti pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="ev-confetti-piece"
              style={{
                left: `${(i * 17) % 100}%`,
                animationDelay: `${(i % 7) * 0.15}s`,
                background: ["#c45c26", "#d4a017", "#2d6a4f", "#7b2d8e"][i % 4],
              }}
            />
          ))}
        </div>
      )}
      <p className="text-center text-xs font-black uppercase tracking-widest text-amber-300">
        {escaped ? "Escaped!" : "Time's up"}
      </p>
      <h2 className="ev-title mt-2 text-center text-4xl font-black sm:text-5xl">
        {escaped ? title : notEscapedTitle}
      </h2>
      <p className="mt-3 text-center text-lg font-semibold">
        {escaped ? "Code unlocked: " : "Chips found: "}
        <span className="font-mono text-2xl font-black tracking-[0.35em] text-amber-300">
          {chips.join("") || (escaped ? codeWord : "—")}
        </span>
      </p>
      <p className="mt-1 text-center text-sm text-amber-100/70">
        Class time · {elapsedLabel}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto,1fr] lg:items-start">
        <div className="flex justify-center">
          <TurkeyMascot
            mood={escaped ? "cheer" : "idle"}
            line={line}
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="rounded-2xl bg-black/25 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-amber-300">
            Class scoreboard
          </p>
          {ranked.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">No players joined.</p>
          ) : (
            <ol className="mt-2 grid gap-1 sm:grid-cols-2">
              {ranked.slice(0, 12).map((p, i) => (
                <li
                  key={p.player_id}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    i === 0 ? "bg-gradient-to-r from-amber-300 to-amber-500 text-t4t-navy" : "bg-white/10"
                  }`}
                >
                  <span className="truncate">
                    {i + 1}. {p.display_name}
                    {p.is_host && p.display_name.toLowerCase() !== "host" ? " (host)" : ""}
                  </span>
                  <span className="ml-2 font-mono font-bold">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
