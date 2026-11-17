"use client";

/** Host picker card. Shown from the answer-free board payload. */
export function NumberLineStartCard({
  questions,
  grade,
  starting = false,
  onStart,
}: {
  questions: number;
  grade: string | number;
  starting?: boolean;
  onStart: () => void;
}) {
  return (
    <article className="rounded-3xl border-4 border-amber-300 bg-[#07111f] p-4 text-white shadow-[0_8px_0_#1e3a5f]">
      <p className="text-base font-black uppercase tracking-widest text-amber-200">Game type</p>
      <h2 className="mt-1 text-3xl font-black uppercase text-white">Number Line</h2>
      <p className="mt-2 text-base leading-relaxed text-white">
        Students drag or tap a marker on their own line. Snap lands on a tick.
        Range can sit anywhere. You reveal the true spot on the projector.
      </p>
      <p className="mt-2 text-base font-bold text-amber-200">
        {questions} questions · Grade {grade} math
      </p>
      <button
        type="button"
        disabled={starting}
        onClick={onStart}
        className="mt-4 w-full rounded-2xl bg-amber-300 px-4 py-4 text-2xl font-black uppercase text-[#1c1917] disabled:cursor-wait disabled:grayscale-[60%]"
      >
        {starting ? "Starting…" : "Start Number Line"}
      </button>
    </article>
  );
}
