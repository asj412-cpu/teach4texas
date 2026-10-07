"use client";

export type ConnState = "ok" | "reconnecting" | "ended";

/** Small fixed banner so a flaky poll never blanks the game screen. */
export function ConnectionBanner({
  state,
  endedText,
}: {
  state: ConnState;
  endedText?: string;
}) {
  if (state === "ok") return null;
  const text =
    state === "reconnecting"
      ? "Reconnecting to the room…"
      : (endedText ?? "Room ended or not found.");
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3"
    >
      <p className="max-w-[90vw] rounded-full bg-t4t-navy px-4 py-2 text-sm font-semibold text-white shadow-lg">
        {text}
      </p>
    </div>
  );
}
