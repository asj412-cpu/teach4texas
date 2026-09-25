"use client";

import { useEffect, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

export function SequenceSortPlay({
  view,
  submitting,
  onSubmit,
}: {
  view: PlayerRoomView;
  submitting: boolean;
  onSubmit: (order: string[]) => void;
}) {
  const sequence = view.sequence;
  const [order, setOrder] = useState<{ id: string; label: string }[]>(
    sequence?.steps ?? [],
  );

  useEffect(() => {
    setOrder(sequence?.steps ?? []);
  }, [sequence?.item_index, view.phase]);

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          Order the Steps — wait for your teacher to start. (
          {view.players.length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {kidPlainText(view.my_display_name, 20)}
        </p>
      </div>
    );
  }

  if (!sequence || view.phase !== "sorting") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-t4t-navy">
        Waiting for Order the Steps to start…
      </div>
    );
  }

  const progress = sequence.item_total
    ? Math.min(sequence.item_index + 1, sequence.item_total) /
      sequence.item_total
    : 0;

  function move(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    const next = [...order];
    const tmp = next[index]!;
    next[index] = next[nextIndex]!;
    next[nextIndex] = tmp;
    setOrder(next);
  }

  return (
    <div className="min-h-screen bg-t4t-lightBlue px-4 py-6">
      <p className="text-center text-xs font-semibold uppercase text-t4t-burnt">
        Order the Steps
      </p>
      <h1 className="mt-1 text-center text-lg font-bold text-t4t-navy">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Prompt {Math.min(sequence.item_index + 1, sequence.item_total)}/
        {sequence.item_total} · Score {view.my_score}
      </p>
      <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-t4t-green"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {sequence.completed && (
        <p className="mt-10 text-center text-xl font-bold text-t4t-green">
          You finished! Score {view.my_score}
        </p>
      )}

      {sequence.prompt && order.length > 0 && (
        <>
          <p className="mx-auto mt-8 max-w-lg text-center text-xl font-bold text-t4t-navy">
            {sequence.prompt}
          </p>
          <ol className="mx-auto mt-6 flex max-w-md flex-col gap-2">
            {order.map((step, i) => (
              <li
                key={step.id}
                className="flex items-center gap-2 rounded-xl border-2 border-t4t-navy/20 bg-white px-3 py-3 text-t4t-navy"
              >
                <span className="w-6 text-center text-sm font-extrabold text-t4t-burnt">
                  {i + 1}
                </span>
                <span className="flex-1 text-left text-base font-semibold">
                  {step.label}
                </span>
                <span className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={
                      submitting || !sequence.can_submit || i === 0
                    }
                    onClick={() => move(i, -1)}
                    className="rounded-md bg-t4t-navy px-2 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !sequence.can_submit ||
                      i === order.length - 1
                    }
                    onClick={() => move(i, 1)}
                    className="rounded-md bg-t4t-navy px-2 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
                  >
                    Down
                  </button>
                </span>
              </li>
            ))}
          </ol>
          {sequence.can_submit && (
            <button
              type="button"
              disabled={submitting || order.length === 0}
              onClick={() => onSubmit(order.map((s) => s.id))}
              className="mx-auto mt-6 block w-full max-w-md rounded-xl bg-t4t-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              Lock in this order
            </button>
          )}
        </>
      )}

      {sequence.submitted && !sequence.completed && (
        <p className="mt-6 text-center text-sm text-t4t-navy">
          Locked in — wait for the next prompt.
        </p>
      )}
    </div>
  );
}
