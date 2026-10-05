"use client";

export function EscapeFinale({
  title,
  chips,
  elapsedLabel,
  reducedMotion = false,
}: {
  title: string;
  chips: string[];
  elapsedLabel: string;
  reducedMotion?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200 via-orange-100 to-emerald-100 p-6 text-t4t-navy">
      {!reducedMotion && (
        <div className="ev-confetti pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="ev-confetti-piece"
              style={{
                left: `${(i * 17) % 100}%`,
                animationDelay: `${(i % 6) * 0.12}s`,
                background: ["#c45c26", "#d4a017", "#2d6a4f", "#7b2d8e"][i % 4],
              }}
            />
          ))}
        </div>
      )}
      <p className="text-center text-xs font-bold uppercase tracking-widest text-t4t-burnt">
        Escaped!
      </p>
      <h2 className="mt-2 text-center text-3xl font-extrabold sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-center text-lg font-semibold">
        Code unlocked:{" "}
        <span className="font-mono tracking-widest text-t4t-green">
          {chips.join("") || "GIVE"}
        </span>
      </p>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Class time · {elapsedLabel}
      </p>
    </div>
  );
}
