"use client";

import type { VaultLockState } from "@/lib/domain/escape-vault";

export function VaultLock({
  state,
  accent = "#d4a017",
  reducedMotion = false,
}: {
  state: VaultLockState;
  accent?: string;
  reducedMotion?: boolean;
}) {
  const open = state === "open";
  const ready = state === "ready";

  return (
    <div
      className={`relative mx-auto h-28 w-28 ${
        reducedMotion
          ? ""
          : open
            ? "ev-lock-open"
            : ready
              ? "ev-lock-ready"
              : state === "locked"
                ? "ev-lock-shake"
                : ""
      }`}
      aria-label={`Vault lock ${state}`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-lg">
        <defs>
          <linearGradient id="vaultMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="#8a6a10" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="#2a2a2a"
          stroke="url(#vaultMetal)"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r="34"
          fill="#1a1a1a"
          stroke={accent}
          strokeWidth="3"
          className={
            reducedMotion || open ? "" : ready ? "ev-dial-spin origin-center" : ""
          }
          style={{ transformOrigin: "60px 60px" }}
        />
        <g
          className={
            reducedMotion || !open ? "" : "ev-shackle-swing origin-center"
          }
          style={{ transformOrigin: "60px 28px" }}
        >
          <rect
            x="52"
            y="28"
            width="16"
            height="36"
            rx="4"
            fill={accent}
            opacity={open ? 0.4 : 1}
          />
          <circle cx="60" cy="60" r="10" fill={accent} />
          <circle cx="60" cy="60" r="4" fill="#1a1a1a" />
        </g>
      </svg>
      <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-white/80">
        {open ? "Unlocked" : ready ? "Ready" : state === "revealed" ? "Revealed" : "Locked"}
      </p>
    </div>
  );
}
