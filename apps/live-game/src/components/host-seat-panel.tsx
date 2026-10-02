"use client";

import { useEffect, useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";

/**
 * Teacher playable seat on the host screen. Submits via hostAction as player "host".
 * Keeps control dock / stage controls elsewhere — this is answers only.
 */
export function HostSeatPanel({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const seat = view.host_seat;
  const [busy, setBusy] = useState(false);
  const seq = seat.sequence;
  const [order, setOrder] = useState<{ id: string; label: string }[]>(
    seq?.steps ?? [],
  );

  useEffect(() => {
    setOrder(seq?.steps ?? []);
  }, [seq?.item_index, view.phase, seq?.steps]);

  async function act(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.resolve(onAction(body));
    } finally {
      setBusy(false);
    }
  }

  const scoreLine = (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-t4t-gold">
      Your seat · host · score {seat.score}
    </p>
  );

  // Jeopardy board question
  if (
    view.game_type === "board" &&
    view.phase === "question_open" &&
    view.active_cell_id
  ) {
    const cell = view.board.cells.find((c) => c.id === view.active_cell_id);
    if (!cell) return null;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {seat.answered ? (
          <p className="text-sm text-white/80">Answer locked in.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {cell.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => act({ type: "host_answer", choice_index: i })}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
              >
                <span className="mr-1 text-t4t-gold">
                  {String.fromCharCode(65 + i)}.
                </span>
                {kidPlainText(c, 80)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view.game_type === "memory_match" && view.phase === "matching" && seat.match) {
    const match = seat.match;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        <p className="mb-2 text-xs text-white/70">
          Tap cards · {match.pairs_found}/{match.pair_total} pairs · moves{" "}
          {match.moves}
        </p>
        <div
          className="mx-auto grid max-w-md gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${match.columns}, minmax(0, 1fr))`,
          }}
        >
          {match.cards.map((card, i) => {
            const disabled =
              busy || !match.can_flip || card.up || match.completed;
            return (
              <button
                key={card.id}
                type="button"
                disabled={disabled}
                onClick={() => act({ type: "host_flip", card_index: i })}
                className={`flex aspect-square items-center justify-center rounded-lg border p-1 text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                  card.matched
                    ? "border-t4t-green bg-t4t-green/20 text-white"
                    : card.up
                      ? "border-t4t-gold bg-white text-t4t-navy"
                      : "border-white/30 bg-t4t-navy text-t4t-gold"
                }`}
              >
                {card.up ? (card.text ?? "") : "?"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (view.game_type === "timed_race" && view.phase === "racing" && seat.race) {
    const race = seat.race;
    if (!race.can_answer || !race.prompt || !race.choices) {
      return (
        <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
          {scoreLine}
          <p className="text-sm text-white/80">
            {race.completed ? "You finished the race." : "Waiting…"}
          </p>
        </div>
      );
    }
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        <p className="mb-2 text-sm font-bold text-white">
          {kidPlainText(race.prompt, 160)}
        </p>
        <div className="flex flex-col gap-2">
          {race.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              disabled={busy || !race.can_answer}
              onClick={() => act({ type: "host_race", choice_index: i })}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
            >
              <span className="mr-1 text-t4t-gold">
                {String.fromCharCode(65 + i)}.
              </span>
              {kidPlainText(choice, 80)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (
    view.game_type === "scavenger_tap" &&
    view.phase === "scavenging" &&
    seat.scavenger
  ) {
    const sc = seat.scavenger;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {sc.tapped ? (
          <p className="text-sm text-white/80">Locked in — wait for next clue.</p>
        ) : sc.targets ? (
          <div className="grid grid-cols-2 gap-2">
            {sc.targets.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy || !sc.can_tap}
                onClick={() => act({ type: "host_scavenge", target_id: t.id })}
                className="min-h-14 rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
              >
                {kidPlainText(t.label, 60)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (
    view.game_type === "sequence_sort" &&
    view.phase === "sorting" &&
    seat.sequence
  ) {
    const sequence = seat.sequence;
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
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {sequence.submitted ? (
          <p className="text-sm text-white/80">
            Locked in — wait for next prompt.
          </p>
        ) : (
          <>
            <ol className="flex flex-col gap-1.5">
              {order.map((step, i) => (
                <li
                  key={step.id}
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-sm text-white"
                >
                  <span className="w-5 text-t4t-gold">{i + 1}</span>
                  <span className="flex-1">{kidPlainText(step.label, 80)}</span>
                  <button
                    type="button"
                    disabled={busy || !sequence.can_submit || i === 0}
                    onClick={() => move(i, -1)}
                    className="rounded bg-t4t-navy px-2 py-0.5 text-[10px] uppercase disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !sequence.can_submit ||
                      i === order.length - 1
                    }
                    onClick={() => move(i, 1)}
                    className="rounded bg-t4t-navy px-2 py-0.5 text-[10px] uppercase disabled:opacity-40"
                  >
                    Down
                  </button>
                </li>
              ))}
            </ol>
            {sequence.can_submit && (
              <button
                type="button"
                disabled={busy || order.length === 0}
                onClick={() =>
                  act({ type: "host_sort", order: order.map((s) => s.id) })
                }
                className="mt-2 w-full rounded-lg bg-t4t-green py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Lock in this order
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  if (
    view.game_type === "category_sort" &&
    view.phase === "binning" &&
    seat.category
  ) {
    const cat = seat.category;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {cat.tapped ? (
          <p className="text-sm text-white/80">Locked in — wait for next item.</p>
        ) : cat.categories ? (
          <div
            className={`grid gap-2 ${
              cat.categories.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {cat.categories.map((bin) => (
              <button
                key={bin.id}
                type="button"
                disabled={busy || !cat.can_tap}
                onClick={() => act({ type: "host_bin", category_id: bin.id })}
                className="min-h-14 rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
              >
                {kidPlainText(bin.label, 60)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (view.game_type === "odd_one_out" && view.phase === "odding" && seat.odd) {
    const odd = seat.odd;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {odd.tapped ? (
          <p className="text-sm text-white/80">
            Locked in — wait for next round.
          </p>
        ) : odd.options ? (
          <div
            className={`grid gap-2 ${
              odd.options.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {odd.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={busy || !odd.can_tap}
                onClick={() => act({ type: "host_odd", option_id: opt.id })}
                className="min-h-14 rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
              >
                {kidPlainText(opt.label, 60)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (view.game_type === "true_false_dash" && view.phase === "dashing" && seat.dash) {
    const dash = seat.dash;
    return (
      <div className="mt-4 rounded-xl border border-t4t-gold/40 bg-black/25 p-3">
        {scoreLine}
        {dash.tapped ? (
          <p className="text-sm text-white/80">
            Locked in — wait for next claim.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || !dash.can_tap}
              onClick={() => act({ type: "host_claim", answer: true })}
              className="min-h-14 rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
            >
              True
            </button>
            <button
              type="button"
              disabled={busy || !dash.can_tap}
              onClick={() => act({ type: "host_claim", answer: false })}
              className="min-h-14 rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white hover:bg-t4t-gold hover:text-t4t-navy disabled:opacity-60"
            >
              False
            </button>
          </div>
        )}
      </div>
    );
  }

  // Lobby / inactive: still show host score chip when seated
  if (view.phase === "lobby" || view.phase === "board") {
    return (
      <p className="mt-2 text-xs text-white/60">
        Host seat ready · score {seat.score}
      </p>
    );
  }

  return null;
}

export function HostFinalActions({
  onAction,
}: {
  onAction: (body: Record<string, unknown>) => void;
}) {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={() => onAction({ type: "play_again" })}
        className="rounded-xl bg-t4t-gold px-5 py-3 text-sm font-bold text-t4t-navy"
      >
        Play again
      </button>
      <button
        type="button"
        onClick={() => onAction({ type: "return_to_game" })}
        className="rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white"
      >
        Return to game
      </button>
    </div>
  );
}
