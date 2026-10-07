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
      className={`relative overflow-hidden rounded-2xl p-6 text-t4t-navy ${
        escaped
          ? "bg-gradient-to-br from-amber-200 via-orange-100 to-emerald-100"
          : "bg-gradient-to-br from-slate-200 via-amber-50 to-slate-100"
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
      <p className="text-center text-xs font-bold uppercase tracking-widest text-t4t-burnt">
        {escaped ? "Escaped!" : "Time's up"}
      </p>
      <h2 className="mt-2 text-center text-3xl font-extrabold sm:text-4xl">
        {escaped ? title : notEscapedTitle}
      </h2>
      <p className="mt-3 text-center text-lg font-semibold">
        {escaped ? "Code unlocked: " : "Chips found: "}
        <span className="font-mono tracking-widest text-t4t-green">
          {chips.join("") || (escaped ? codeWord : "—")}
        </span>
      </p>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Class time · {elapsedLabel}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto,1fr] lg:items-start">
        <div className="flex justify-center">
          <TurkeyMascot
            mood={escaped ? "cheer" : "oops"}
            line={line}
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="rounded-xl bg-white/80 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-t4t-burnt">
            Class scoreboard
          </p>
          {ranked.length === 0 ? (
            <p className="mt-2 text-sm text-t4t-darkText/60">No players joined.</p>
          ) : (
            <ol className="mt-2 grid gap-1 sm:grid-cols-2">
              {ranked.slice(0, 12).map((p, i) => (
                <li
                  key={p.player_id}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    i === 0 ? "bg-amber-100" : "bg-white"
                  }`}
                >
                  <span className="truncate">
                    {i + 1}. {p.display_name}
                    {p.is_host ? " (host)" : ""}
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
