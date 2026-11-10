"use client";

import type { BingoCardView } from "@/lib/domain/bingo";

export function BingoCardFace({
  card,
  onTap,
  disabled,
  label,
}: {
  card: BingoCardView;
  onTap?: (index: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const cols = card.grid === 4 ? "grid-cols-4" : "grid-cols-5";
  return (
    <div className="bingo-card rounded-3xl border-4 border-[#fde047] bg-[#fffbeb] p-2 shadow-[0_10px_0_#14532d] sm:p-3">
      {label ? (
        <p className="mb-2 text-center text-base font-black uppercase tracking-wide text-[#14532d]">
          {label}
        </p>
      ) : null}
      <div className={`grid ${cols} gap-1.5 sm:gap-2`} role={onTap ? "group" : "list"}>
        {card.cells.map((cell) => {
          const text = cell.free ? "FREE" : (cell.answer ?? "");
          const stamp = cell.marked && !cell.free;
          const className = `bingo-cell relative flex aspect-square items-center justify-center rounded-xl border-2 border-[#14532d] text-lg font-black text-[#1c1917] sm:text-2xl ${
            cell.free ? "bg-[#fde68a] text-[#14532d]" : "bg-white"
          } ${stamp ? "bingo-stamp" : ""}`;
          if (!onTap || cell.free) {
            return (
              <div key={cell.index} className={className} role="listitem">
                {stamp ? <Stamp /> : null}
                <span className="relative z-[1]">{text}</span>
              </div>
            );
          }
          return (
            <button
              key={cell.index}
              type="button"
              disabled={disabled || cell.marked}
              onClick={() => onTap(cell.index)}
              className={`${className} enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-default`}
              aria-label={cell.marked ? `${text} stamped` : `Stamp ${text}`}
              aria-pressed={cell.marked}
            >
              {stamp ? <Stamp /> : null}
              <span className="relative z-[1]">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stamp() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-1 rounded-full border-4 border-[#991b1b] bg-[#991b1b]/15"
    />
  );
}

export function BingoConfetti() {
  const bits = [
    "#fde047",
    "#fb7185",
    "#38bdf8",
    "#4ade80",
    "#ffffff",
    "#f97316",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.flatMap((color, i) =>
        [0, 1, 2].map((k) => (
          <span
            key={`${color}-${k}`}
            className="bingo-confetti"
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
