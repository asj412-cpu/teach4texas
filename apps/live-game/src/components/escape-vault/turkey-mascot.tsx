"use client";

export type MascotMood = "idle" | "cheer" | "hint" | "oops";

export function TurkeyMascot({
  mood = "idle",
  line,
  reducedMotion = false,
}: {
  mood?: MascotMood;
  line?: string;
  reducedMotion?: boolean;
}) {
  const bob =
    reducedMotion || mood === "idle"
      ? ""
      : mood === "cheer"
        ? "ev-mascot-cheer"
        : mood === "oops"
          ? "ev-mascot-oops"
          : "ev-mascot-hint";

  return (
    <div className="flex items-end gap-3">
      <div className={`relative h-24 w-24 shrink-0 ${bob}`} aria-hidden>
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <ellipse cx="60" cy="72" rx="34" ry="28" fill="#8B4513" />
          <ellipse cx="60" cy="72" rx="26" ry="22" fill="#A0522D" />
          <circle cx="60" cy="42" r="20" fill="#CD853F" />
          <circle cx="52" cy="40" r="3" fill="#1a1a1a" />
          <circle cx="68" cy="40" r="3" fill="#1a1a1a" />
          <path d="M60 44 L68 50 L60 48 Z" fill="#FF8C00" />
          <path
            d="M40 58 Q20 30 38 22 Q50 40 48 55"
            fill="#C45C26"
            opacity="0.95"
          />
          <path
            d="M80 58 Q100 30 82 22 Q70 40 72 55"
            fill="#D4A017"
            opacity="0.95"
          />
          <path
            d="M50 28 Q60 8 70 28"
            fill="#2d6a4f"
            opacity="0.9"
          />
          <ellipse cx="48" cy="95" rx="8" ry="4" fill="#5c3317" />
          <ellipse cx="72" cy="95" rx="8" ry="4" fill="#5c3317" />
          {mood === "cheer" && (
            <text x="60" y="18" textAnchor="middle" fontSize="14">
              ★
            </text>
          )}
          {mood === "oops" && (
            <text x="88" y="36" fontSize="16">
              ?
            </text>
          )}
        </svg>
      </div>
      {line && (
        <div className="relative mb-4 max-w-xs rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-t4t-navy shadow">
          <span className="absolute -left-2 bottom-3 h-0 w-0 border-y-8 border-r-8 border-y-transparent border-r-white" />
          {line}
        </div>
      )}
    </div>
  );
}
