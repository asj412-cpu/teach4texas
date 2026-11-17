"use client";

export type ConnState = "ok" | "reconnecting" | "ended";

/** Small fixed banner so a flaky poll never blanks the game screen. */
export function ConnectionBanner({
  state,
  endedText,
  projected = false,
}: {
  state: ConnState;
  endedText?: string;
  /** Host projector copy is 24px. Student copy stays at 20px. */
  projected?: boolean;
}) {
  if (state === "ok") return null;
  const text = state === "reconnecting" ? "Reconnecting…" : (endedText ?? "Room ended or not found.");
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center px-3"
    >
      <p
        className={`max-w-[90vw] rounded-full bg-t4t-navy px-4 py-2 font-semibold text-white shadow-lg ${
          projected ? "text-2xl" : "text-xl"
        }`}
      >
        {text}
      </p>
    </div>
  );
}
