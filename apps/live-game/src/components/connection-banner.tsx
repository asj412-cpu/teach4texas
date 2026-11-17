"use client";

export type ConnState = "ok" | "reconnecting" | "ended";

/** In-flow bar. It reserves its own height and renders nothing while the connection is fine. */
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
    <div role="status" aria-live="polite" className="w-full bg-t4t-navy px-3 py-2 text-center">
      <p className={`font-semibold text-white ${projected ? "text-2xl" : "text-xl"}`}>{text}</p>
    </div>
  );
}
