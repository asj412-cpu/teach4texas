"use client";

import { useEffect, useState } from "react";

export function RoomTransition({
  roomKey,
  roomName,
  accent = "#c45c26",
  reducedMotion = false,
  onDone,
}: {
  roomKey: string;
  roomName: string;
  accent?: string;
  reducedMotion?: boolean;
  onDone?: () => void;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
    const ms = reducedMotion ? 350 : 900;
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, ms);
    return () => clearTimeout(t);
  }, [roomKey, reducedMotion, onDone]);

  if (!show) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex rounded-2xl items-center justify-center ${
        reducedMotion ? "ev-fade" : "ev-door-open"
      }`}
      style={{ background: `linear-gradient(135deg, ${accent}ee, #1a2e1acc)` }}
      aria-live="polite"
    >
      <div className="rounded-2xl bg-black/40 px-8 py-6 text-center text-white backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
          Entering
        </p>
        <p className="mt-2 text-3xl font-extrabold">{roomName}</p>
      </div>
    </div>
  );
}
