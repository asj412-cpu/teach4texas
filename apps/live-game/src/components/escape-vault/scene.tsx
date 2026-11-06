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

function IceDoorSvg() {
  return (
    <svg className="ev-door-bg" viewBox="0 0 200 200" aria-hidden>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#dbeafe" strokeWidth="4" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#e0f2fe" strokeWidth="2" strokeDasharray="4 8" />
      <circle cx="100" cy="100" r="34" fill="none" stroke="#f8fbff" strokeWidth="5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 36}
            y1={100 + Math.sin(a) * 36}
            x2={100 + Math.cos(a) * 78}
            y2={100 + Math.sin(a) * 78}
            stroke="#bae6fd"
            strokeWidth="3"
          />
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const x = 100 + Math.cos(a) * 88;
        const y = 100 + Math.sin(a) * 88;
        return (
          <path
            key={i}
            d={`M ${x} ${y - 7} L ${x + 4} ${y} L ${x} ${y + 7} L ${x - 4} ${y} Z`}
            fill="#f8fbff"
          />
        );
      })}
    </svg>
  );
}

function IceCrystal({ className }: { className: string }) {
  return (
    <svg className={`ev-crystal ${className}`} viewBox="0 0 80 80" aria-hidden>
      <path
        d="M40 4 L48 32 L76 40 L48 48 L40 76 L32 48 L4 40 L32 32 Z"
        fill="rgba(224,242,254,0.28)"
        stroke="#f8fbff"
        strokeWidth="2"
      />
      <path d="M40 16 V64 M18 40 H62 M26 26 L54 54 M54 26 L26 54" stroke="#e0f2fe" strokeWidth="1.5" />
    </svg>
  );
}

function Snowfall() {
  return (
    <div className="ev-snowfield" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          className="ev-snow"
          style={{
            left: `${(i * 53) % 100}%`,
            width: 4 + (i % 4) * 2,
            height: 4 + (i % 4) * 2,
            animationDuration: `${9 + (i % 7) * 1.4}s`,
            animationDelay: `${-(i % 12) * 0.7}s`,
            opacity: 0.55 + (i % 4) * 0.1,
          }}
        />
      ))}
    </div>
  );
}

export function VaultScene({
  children,
  className = "",
  leaves = 10,
  skin = "classic",
}: {
  children: ReactNode;
  className?: string;
  leaves?: number;
  skin?: "classic" | "winter";
}) {
  const winter = skin === "winter";
  return (
    <div className={`ev-scene min-h-screen${winter ? " ev-winter" : ""} ${className}`}>
      {winter ? (
        <>
          <div className="ev-winter-glow" aria-hidden />
          <IceDoorSvg />
          <IceCrystal className="ev-crystal-a" />
          <IceCrystal className="ev-crystal-b" />
          <IceCrystal className="ev-crystal-c" />
          <Snowfall />
        </>
      ) : (
        <>
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
        </>
      )}
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
