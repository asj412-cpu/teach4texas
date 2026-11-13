"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatTickLabel,
  tickValue,
  visibleTickIndexes,
  type NlMode,
} from "@/lib/domain/number-line";

export type LineDot = {
  id: string;
  value: number;
  name: string | null;
};

type LineShape = {
  min: number;
  max: number;
  divisions: number;
  mode: NlMode;
};

function percent(item: LineShape, value: number): number {
  const span = item.max - item.min;
  if (!(span > 0)) return 0;
  return Math.min(100, Math.max(0, ((value - item.min) / span) * 100));
}

function valueFromPointer(item: LineShape, clientX: number, rect: DOMRect): number {
  const t = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  const clamped = Math.min(1, Math.max(0, t));
  if (item.mode === "snap") {
    const index = Math.min(item.divisions, Math.max(0, Math.round(clamped * item.divisions)));
    return tickValue(item, index);
  }
  return item.min + clamped * (item.max - item.min);
}

export function NumberLineTrack({
  item,
  value,
  interactive,
  disabled,
  answer,
  dots,
  sweeping,
  onPreview,
  onPlace,
  onGrab,
}: {
  item: LineShape;
  value: number | null;
  interactive: boolean;
  disabled?: boolean;
  answer: number | null;
  dots: LineDot[];
  sweeping: boolean;
  onPreview?: (value: number) => void;
  onPlace?: (value: number) => void;
  onGrab?: () => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(375);
  const [held, setHeld] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 375);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxLabels = Math.max(2, Math.floor(width / 72));
  const ticks = visibleTickIndexes(item.divisions, maxLabels);
  const marker = value == null ? null : percent(item, value);
  const truth = answer == null ? null : percent(item, answer);

  function pointAt(clientX: number, commit: boolean) {
    const rect = rail.current?.getBoundingClientRect();
    if (!rect) return;
    const next = valueFromPointer(item, clientX, rect);
    onPreview?.(next);
    if (commit) onPlace?.(next);
  }

  return (
    <div className="w-full">
      <div
        ref={rail}
        className={`nl-rail relative w-full touch-none ${disabled ? "opacity-80" : ""}`}
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          if (!interactive || disabled) return;
          dragging.current = true;
          setHeld(true);
          onGrab?.();
          event.currentTarget.setPointerCapture(event.pointerId);
          pointAt(event.clientX, false);
        }}
        onPointerMove={(event) => {
          if (!dragging.current || !interactive || disabled) return;
          pointAt(event.clientX, false);
        }}
        onPointerUp={(event) => {
          if (!dragging.current) return;
          dragging.current = false;
          setHeld(false);
          pointAt(event.clientX, true);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          setHeld(false);
        }}
      >
        <div className="nl-line" aria-hidden />
        {truth != null ? (
          <div
            className={`nl-sweep ${sweeping ? "is-on" : ""}`}
            style={{ width: `${truth}%` }}
            aria-hidden
          />
        ) : null}
        {ticks.map((index) => (
          <span
            key={index}
            className="nl-tick"
            style={{ left: `${(index / item.divisions) * 100}%` }}
            aria-hidden
          />
        ))}
        {truth != null ? (
          <span className="nl-truth" style={{ left: `${truth}%` }} aria-hidden>
            <span className="nl-truth-flag" />
          </span>
        ) : null}
        {dots.map((dot, index) => (
          <span
            key={dot.id}
            className="nl-dot"
            style={{
              left: `${percent(item, dot.value)}%`,
              animationDelay: `${index * 0.06}s`,
            }}
          >
            {dot.name ? <span className="nl-dot-name">{dot.name}</span> : null}
          </span>
        ))}
        {marker != null ? (
          <button
            type="button"
            className={`nl-marker ${held ? "is-held" : ""}`}
            style={{ left: `${marker}%` }}
            disabled={!interactive || disabled}
            aria-label="Your marker"
            onKeyDown={(event) => {
              if (!interactive || disabled || !onPlace || value == null) return;
              const step = item.mode === "snap" ? 1 : Math.max(1, Math.round(item.divisions / 20));
              const span = item.max - item.min;
              const index = Math.round(((value - item.min) / span) * item.divisions);
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = Math.min(item.divisions, index + (item.mode === "snap" ? 1 : step));
                onPlace(item.mode === "snap" ? tickValue(item, next) : item.min + (next / item.divisions) * span);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                const next = Math.max(0, index - (item.mode === "snap" ? 1 : step));
                onPlace(item.mode === "snap" ? tickValue(item, next) : item.min + (next / item.divisions) * span);
              }
            }}
          />
        ) : null}
      </div>
      <div className="relative mt-2 h-10 w-full">
        {ticks.map((index) => {
          const atStart = index === 0;
          const atEnd = index === item.divisions;
          return (
            <span
              key={index}
              className="absolute top-0 text-2xl font-black leading-none text-white"
              style={{
                left: `${(index / item.divisions) * 100}%`,
                transform: atStart ? "none" : atEnd ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {formatTickLabel(item, index)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
