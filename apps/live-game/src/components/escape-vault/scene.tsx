"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Confetti } from "@/components/game-show";
import { playVaultSfx } from "@/components/escape-vault/audio";

/** Thanksgiving vault backdrop: warm rays, slow-turning vault door, falling leaves, vignette. */
const LEAVES = ["🍂", "🍁", "🍂", "🌾", "🍁"];

function VaultDoorSvg() {
  return (
    <svg className="ev-door-bg" viewBox="0 0 200 200" aria-hidden>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#ffcf7a" strokeWidth="4" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#ffcf7a" strokeWidth="2" strokeDasharray="6 6" />
      <circle cx="100" cy="100" r="34" fill="none" stroke="#ffcf7a" strokeWidth="5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 36}
            y1={100 + Math.sin(a) * 36}
            x2={100 + Math.cos(a) * 78}
            y2={100 + Math.sin(a) * 78}
            stroke="#ffcf7a"
            strokeWidth="3"
          />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return <circle key={i} cx={100 + Math.cos(a) * 88} cy={100 + Math.sin(a) * 88} r="4" fill="#ffcf7a" />;
      })}
    </svg>
  );
}

export function VaultScene({ children, className = "", leaves = 10 }: { children: ReactNode; className?: string; leaves?: number }) {
  return (
    <div className={`ev-scene min-h-screen ${className}`}>
      <div className="ev-rays" aria-hidden />
      <div className="ev-glow" aria-hidden />
      <VaultDoorSvg />
      {Array.from({ length: leaves }).map((_, i) => (
        <span
          key={i}
          className="ev-leaf"
          aria-hidden
          style={{
            left: `${(i * 41) % 96}%`,
            animationDuration: `${9 + (i % 4) * 2.5}s`,
            animationDelay: `${(i * 1.3) % 9}s`,
            fontSize: 16 + (i % 3) * 8,
          }}
        >
          {LEAVES[i % LEAVES.length]}
        </span>
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Full-screen "UNLOCKED!" beat: ring burst + confetti + unlock sting. Shows when `trigger` changes. */
export function UnlockCelebration({ trigger, label }: { trigger: string | null; label: string }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!trigger) return;
    setShown(trigger);
    playVaultSfx("unlock");
    const t = setTimeout(() => setShown(null), 2400);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!shown) return null;
  return (
    <div className="ev-celebrate" role="status" aria-live="polite">
      <Confetti n={40} />
      <span className="ev-ring" />
      <div className="text-center">
        <p className="dd-title text-6xl font-black uppercase sm:text-7xl">Unlocked!</p>
        <p className="mt-3 text-xl font-bold text-amber-100 drop-shadow">{label}</p>
      </div>
    </div>
  );
}
