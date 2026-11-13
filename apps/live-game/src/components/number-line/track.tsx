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

function valueKey(value: number): number {
  return Math.round(value * 1e6) / 1e6;
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
  const [width, setWidth] = useState(280);
  const [held, setHeld] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 280);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const divisions = Math.max(1, Math.round(item.divisions));
  const marks = Array.from({ length: divisions + 1 }, (_, index) => index);
  const maxLabels = Math.max(2, Math.floor(width / 72));
  const labels = visibleTickIndexes(divisions, maxLabels);
  const marker = value == null ? null : percent(item, value);
  const truth = answer == null ? null : percent(item, answer);
  const stacks = new Map<number, number>();
  const stacked = dots.map((dot) => {
    const key = valueKey(dot.value);
    const stack = stacks.get(key) ?? 0;
    stacks.set(key, stack + 1);
    return { ...dot, stack };
  });
  const maxStack = stacked.reduce((highest, dot) => Math.max(highest, dot.stack), 0);

  function pointAt(clientX: number, commit: boolean) {
    const rect = rail.current?.getBoundingClientRect();
    if (!rect) return;
    const next = valueFromPointer(item, clientX, rect);
    onPreview?.(next);
    if (commit) onPlace?.(next);
  }

  return (
    <div className="nl-track">
      <div style={{ height: maxStack * 28 }} aria-hidden />
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
        {marks.map((index) => (
          <span
            key={index}
            className="nl-tick"
            style={{ left: `${(index / divisions) * 100}%` }}
            aria-hidden
          />
        ))}
        {truth != null ? (
          <span className="nl-truth" style={{ left: `${truth}%` }} aria-hidden>
            <span className="nl-truth-flag" />
          </span>
        ) : null}
        {stacked.map((dot, index) => {
          const at = percent(item, dot.value);
          return (
            <span
              key={dot.id}
              className="nl-dot"
              style={{
                left: `${at}%`,
                top: `calc(2.15rem - ${dot.stack * 1.75}rem)`,
                animationDelay: `${index * 0.04}s`,
              }}
            >
              {dot.name ? (
                <span className={`nl-dot-name ${at > 68 ? "is-left" : ""}`}>{dot.name}</span>
              ) : null}
            </span>
          );
        })}
        {marker != null ? (
          <button
            type="button"
            className={`nl-marker ${held ? "is-held" : ""}`}
            style={{ left: `${marker}%` }}
            disabled={!interactive || disabled}
            aria-label="Your marker"
            onKeyDown={(event) => {
              if (!interactive || disabled || !onPlace || value == null) return;
              const step = item.mode === "snap" ? 1 : Math.max(1, Math.round(divisions / 20));
              const span = item.max - item.min;
              const index = Math.round(((value - item.min) / span) * divisions);
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = Math.min(divisions, index + (item.mode === "snap" ? 1 : step));
                onPlace(item.mode === "snap" ? tickValue(item, next) : item.min + (next / divisions) * span);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                const next = Math.max(0, index - (item.mode === "snap" ? 1 : step));
                onPlace(item.mode === "snap" ? tickValue(item, next) : item.min + (next / divisions) * span);
              }
            }}
          />
        ) : null}
      </div>
      <div className="relative mt-3 h-10 w-full">
        {labels.map((index) => {
          const atStart = index === 0;
          const atEnd = index === divisions;
          return (
            <span
              key={index}
              className="absolute top-0 text-2xl font-black leading-none text-white"
              style={{
                left: `${(index / divisions) * 100}%`,
                transform: atStart ? "none" : atEnd ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {formatTickLabel({ ...item, divisions }, index)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
