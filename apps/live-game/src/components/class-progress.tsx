"use client";

/** AC-H08 P2-1: live class progress (and optional big countdown) for the projected host panel. */
export function ClassProgress({
  label,
  value,
  total,
  big,
}: {
  label: string;
  value: number;
  total: number;
  big?: string | null;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="mx-auto mt-4 w-full max-w-3xl" data-testid="class-progress">
      {big ? (
        <p className="dd-pop text-center font-mono text-6xl font-black tabular-nums text-amber-200 drop-shadow sm:text-7xl">
          {big}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between text-base font-bold text-white">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{total} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-4 overflow-hidden rounded-full border border-white/30 bg-black/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
