"use client";

import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

/** AC-H08c: game-show student screen. Text ≥16px; AA colors (#047857 / #b91c1c with white text). */
export function TrueFalseDashPlay({
  view,
  submitting,
  onTap,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onTap: (answer: boolean) => void;
}) {
  const dash = view.dash;

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-1 text-base font-black uppercase tracking-widest text-amber-200">You&apos;re in!</p>
        <h1 className="dd-title mt-3 text-3xl font-black uppercase">{kidPlainText(view.title, 80)}</h1>
        <p className="mt-4 rounded-2xl border border-white/25 bg-black/50 px-4 py-3 text-lg font-semibold text-white">
          True or False Dash — wait for your teacher to start. ({view.players.filter((p) => !p.is_host).length} players)
        </p>
        <p className="mt-6 text-xl font-black text-white">You: {kidPlainText(view.my_display_name, 20)}</p>
      </div>
    );
  }

  if (!dash || view.phase !== "dashing") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="rounded-2xl bg-black/55 px-6 py-4 text-xl font-bold text-white">Waiting for True or False Dash to start…</p>
      </div>
    );
  }

  const progress = dash.item_total ? Math.min(dash.item_index + 1, dash.item_total) / dash.item_total : 0;
  const showCombo = dash.tapped && dash.last_correct && dash.streak >= 2;
  const btn = (val: boolean) => {
    const picked = dash.tapped && dash.picked === val;
    const fb = picked ? (dash.last_correct ? "fb-correct" : "fb-wrong") : val ? "bg-[#065f46] border-[#6ee7b7]" : "bg-[#991b1b] border-[#fca5a5]";
    return `gs-choice min-h-28 rounded-2xl border-4 px-3 py-4 text-center text-3xl font-black uppercase text-white shadow-[0_6px_0_rgba(0,0,0,0.45)] disabled:cursor-default ${fb}`;
  };

  return (
    <div className="px-4 py-6">
      <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-1 text-base font-black uppercase tracking-widest text-amber-200">True or False Dash</p>
      <h1 className="mt-2 text-center text-xl font-black text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.8)]">{kidPlainText(view.title, 80)}</h1>
      <p className="mx-auto mt-2 w-fit rounded-full bg-black/55 px-4 py-1 text-base font-semibold text-white">
        Claim {Math.min(dash.item_index + 1, dash.item_total)}/{dash.item_total} · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-3 max-w-md overflow-hidden rounded-full bg-black/50">
        <div className="h-full bg-amber-300 transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {dash.completed && (
        <p className="mx-auto mt-10 w-fit rounded-2xl bg-[#047857] px-6 py-3 text-center text-2xl font-black text-white">You finished! Score {view.my_score}</p>
      )}

      {dash.prompt && (
        <p className="gs-glass gs-rise mx-auto mt-8 max-w-lg rounded-2xl bg-black/55 px-5 py-5 text-center text-2xl font-extrabold text-white">{dash.prompt}</p>
      )}

      {showCombo && (
        <p className="mx-auto mt-4 w-fit animate-pulse rounded-full bg-black/60 px-4 py-1 text-center text-2xl font-black text-amber-200">Combo {dash.streak} 🔥</p>
      )}

      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
        <button type="button" disabled={submitting || !dash.can_tap} onClick={() => onTap(true)} className={btn(true)}>✓ True</button>
        <button type="button" disabled={submitting || !dash.can_tap} onClick={() => onTap(false)} className={btn(false)}>✗ False</button>
      </div>

      {dash.tapped && !dash.completed && (
        <p role="status" className={`mx-auto mt-6 w-fit rounded-full px-5 py-2 text-center text-xl font-black text-white ${dash.last_correct ? "bg-[#047857]" : "bg-[#b91c1c]"}`}>
          {dash.last_correct ? "Correct!" : "Miss — next claim coming"}
        </p>
      )}
    </div>
  );
}
