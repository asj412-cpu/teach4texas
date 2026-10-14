"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { VaultLock } from "@/components/escape-vault/vault-lock";
import { TurkeyMascot, type MascotMood } from "@/components/escape-vault/turkey-mascot";
import { ensureVaultAudio, playVaultSfx } from "@/components/escape-vault/audio";
import { pickLine, resolveEscapeVaultTheme } from "@/components/escape-vault/theme";
import { EscapeFinale } from "@/components/escape-vault/finale";

export function EscapeVaultPlay({
  view,
  onAnswer,
}: {
  view: PlayerRoomView;
  onAnswer: (payload: { choice_id?: string; numeric?: string }) => void;
}) {
  const vault = view.vault;
  const [busy, setBusy] = useState(false);
  /** Brief oops beat on a miss before the hint bubble shows. */
  const [hintReadyFor, setHintReadyFor] = useState<string | null>(null);
  /** Student-side "lock opened" beat when the host advances rooms. */
  const [openedInto, setOpenedInto] = useState<string | null>(null);
  const prevRoom = useRef<number | null>(null);
  /** Banner timer lives in a ref so the 1s poll never clears/restarts it (N1). */
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = resolveEscapeVaultTheme(vault?.theme);

  const puzzleKey = vault ? `${vault.room_index}:${vault.puzzle_index}` : null;
  const missKey =
    vault && vault.answered && !vault.last_correct ? puzzleKey : null;

  // Wrong answer → buzz + oops mascot, then the hint (P1-1, P1-2).
  useEffect(() => {
    if (!missKey) return;
    playVaultSfx("wrong");
    const t = setTimeout(() => setHintReadyFor(missKey), 1600);
    return () => clearTimeout(t);
  }, [missKey]);

  // Room advanced → show the open lock + "Entering …" for a beat.
  // Keyed on room_index only: the 1s poll hands us a new `vault` object each
  // tick, so `vault` must not be a dep and same-room re-runs must not touch
  // the timer (N1 / EV03).
  const roomIndex = vault?.room_index ?? null;
  const roomName = vault?.room_name ?? null;
  useEffect(() => {
    if (roomIndex === null) return;
    const prev = prevRoom.current;
    prevRoom.current = roomIndex;
    if (prev === null || prev === roomIndex) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (roomIndex < prev) {
      setOpenedInto(null); // replay reset
      return;
    }
    setOpenedInto(roomName ?? "the next room");
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setOpenedInto(null);
    }, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIndex]);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    [],
  );

  if (!vault) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-t4t-navy shadow">
        Waiting for host to start the escape…
      </div>
    );
  }

  const submit = async (payload: { choice_id?: string; numeric?: string }) => {
    if (!vault.can_answer || busy) return;
    setBusy(true);
    ensureVaultAudio();
    playVaultSfx("tick");
    try {
      await onAnswer(payload);
    } finally {
      setBusy(false);
    }
  };

  const mood: MascotMood = !vault.answered
    ? "idle"
    : vault.last_correct
      ? "cheer"
      : hintReadyFor === missKey && vault.hint
        ? "hint"
        : "oops";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
            {vault.room_name ?? "Escape"} · Room {vault.room_index + 1}/
            {vault.room_total}
            {vault.room_chip ? ` · ${vault.room_chip}` : ""}
          </p>
          <p className="mt-1 text-lg font-bold text-t4t-navy">
            {vault.prompt ?? "Get ready…"}
          </p>
        </div>
        <VaultLock state={openedInto ? "open" : vault.lock_state} />
      </div>

      {openedInto && (
        <p
          className="rounded-xl bg-t4t-green px-3 py-2 text-center text-sm font-bold text-white"
          role="status"
        >
          Unlocked! Entering {kidPlainText(openedInto, 60)}…
        </p>
      )}

      {vault.kind === "mc" && vault.choices && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vault.choices.map((c) => {
            const picked = vault.picked === c.id;
            const isKey = vault.revealed_choice_id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!vault.can_answer || busy}
                onClick={() => submit({ choice_id: c.id })}
                data-revealed-correct={isKey ? "true" : undefined}
                className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                  isKey
                    ? "border-4 border-t4t-green bg-emerald-100 text-t4t-navy"
                    : picked
                    ? vault.last_correct
                      ? "border-t4t-green bg-emerald-50 text-t4t-navy"
                      : "border-red-400 bg-red-50 text-t4t-navy"
                    : "border-t4t-navy/20 bg-white text-t4t-navy hover:border-t4t-gold"
                } disabled:opacity-60`}
              >
                <span className="mr-2 font-mono text-t4t-burnt">{c.id}.</span>
                {kidPlainText(c.label, 80)}
                {isKey ? <span className="ml-2 text-t4t-green">✓ Answer</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {vault.answered && (
        <p
          className={`text-center text-sm font-bold ${
            vault.last_correct ? "text-t4t-green" : "text-red-600"
          }`}
        >
          {vault.last_correct ? "Correct!" : "Miss — check the hint"}
        </p>
      )}

      {vault.revealed && vault.revealed_answer && vault.kind !== "mc" && (
        <p className="rounded-xl border-4 border-t4t-green bg-emerald-100 px-3 py-2 text-center text-sm font-bold text-t4t-navy">
          ✓ Answer: {vault.revealed_answer}
        </p>
      )}

      <div className="flex items-end justify-between">
        <TurkeyMascot
          mood={mood}
          line={
            mood === "idle"
              ? `Pick an answer, ${theme.playerNoun}!`
              : mood === "cheer"
                ? "Nice! Wait for the lock…"
                : mood === "oops"
                  ? pickLine(theme.lines.oops, vault.room_index)
                  : (vault.hint ?? "Host may reveal the answer.")
          }
        />
        <p className="font-mono text-sm font-bold tracking-widest text-t4t-green">
          {vault.chips.join(" ") || "····"}
        </p>
      </div>
    </div>
  );
}

/** Escape-themed student final (replaces the generic "Game over!"). */
export function EscapeVaultFinal({ view }: { view: PlayerRoomView }) {
  const vault = view.vault;
  const theme = resolveEscapeVaultTheme(vault?.theme);
  const escaped = Boolean(vault?.escaped);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6" style={{ background: theme.palette.bg }}>
      <p className="mb-3 text-center text-sm font-semibold text-white">
        {kidPlainText(view.my_display_name ?? "", 24)} · Your score: {view.my_score}
      </p>
      <EscapeFinale
        title={theme.finaleTitle}
        notEscapedTitle={theme.notEscapedTitle}
        escaped={escaped}
        chips={vault?.chips ?? []}
        codeWord={theme.codeWord}
        elapsedLabel={escaped ? "escaped together" : "ended by host"}
        line={pickLine(escaped ? theme.lines.finale : theme.lines.notEscaped, view.my_score)}
        players={view.players.map((p, i) => ({
          player_id: `${p.display_name}-${i}`,
          display_name: kidPlainText(p.display_name, 16),
          score: p.score,
        }))}
        reducedMotion={reduced}
      />
      <p className="mt-6 text-center text-sm text-white/80">
        Waiting for host to play again…
      </p>
    </div>
  );
}
