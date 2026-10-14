"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { VaultLock } from "@/components/escape-vault/vault-lock";
import { TurkeyMascot, type MascotMood } from "@/components/escape-vault/turkey-mascot";
import { ensureVaultAudio, playVaultSfx } from "@/components/escape-vault/audio";
import { pickLine, resolveEscapeVaultTheme } from "@/components/escape-vault/theme";
import { EscapeFinale } from "@/components/escape-vault/finale";
import { UnlockCelebration, VaultScene } from "@/components/escape-vault/scene";
import { Confetti } from "@/components/game-show";

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
      <div className="ev-glass rounded-3xl p-6 text-center text-lg font-bold text-amber-50">
        🔒 Waiting for host to start the escape…
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
    <div className="flex flex-col gap-4">
      <UnlockCelebration
        trigger={openedInto ? `${vault.room_index}` : null}
        label={openedInto ? `Entering ${kidPlainText(openedInto, 40)}` : ""}
      />
      <div key={puzzleKey ?? "x"} className="ev-glass gs-rise flex flex-col-reverse items-center gap-2 rounded-3xl p-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-amber-200">
            {vault.room_name ?? "Escape"} · Room {vault.room_index + 1}/
            {vault.room_total}
            {vault.room_chip ? ` · ${vault.room_chip}` : ""}
            {vault.puzzle_total > 1 ? ` · Lock ${vault.puzzle_index + 1}/${vault.puzzle_total}` : ""}
          </p>
          <p className="mt-1 text-xl font-black leading-snug text-white drop-shadow sm:text-2xl">
            {vault.prompt ?? "Get ready…"}
          </p>
        </div>
        <VaultLock state={openedInto ? "open" : vault.lock_state} />
      </div>

      {openedInto && (
        <p
          className="gs-rise rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-3 py-2 text-center text-base font-black text-white shadow-lg"
          role="status"
        >
          Unlocked! Entering {kidPlainText(openedInto, 60)}…
        </p>
      )}

      {vault.kind === "mc" && vault.choices && (
        <div
          // R2 P3: after answering, choices drop below the hint so it fits a 390×844 phone.
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${vault.answered ? "order-last" : ""}`}
        >
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
                className={`ev-glass ev-choice gs-rise rounded-2xl border-2 px-4 ${vault.answered ? "py-2 text-base" : "py-4 text-lg"} text-left font-bold text-white ${
                  isKey
                    ? "gs-correct"
                    : picked
                    ? vault.last_correct
                      ? "gs-correct"
                      : "gs-wrong"
                    : "border-amber-200/30"
                } disabled:opacity-70`}
              >
                <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 font-black text-t4t-navy">{c.id}</span>
                {kidPlainText(c.label, 80)}
                {isKey ? <span className="ml-2 font-black">✓ Answer</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {vault.answered && (
        <p
          className={`dd-pop text-center text-3xl font-black drop-shadow ${
            vault.last_correct ? "text-green-300" : "text-red-300"
          }`}
        >
          {vault.last_correct ? "Correct!" : "Miss — check the hint"}
        </p>
      )}

      {vault.revealed && vault.revealed_answer && vault.kind !== "mc" && (
        <p className="gs-correct rounded-2xl border-2 px-3 py-3 text-center text-lg font-black">
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
        <p className="ev-glass rounded-xl px-3 py-2 font-mono text-2xl font-black tracking-[0.35em] text-amber-300">
          {vault.chips.join(" ") || "····"}
        </p>
      </div>
    </div>
  );
}

function formatClassTime(ms: number | null, escaped: boolean): string {
  if (ms == null) return escaped ? "escaped together" : "ended by host";
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}${escaped ? " · escaped together" : ""}`;
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
    <VaultScene>
    {escaped ? <Confetti n={44} /> : null}
    <div className="mx-auto max-w-lg px-4 py-6">
      <p className="ev-glass mx-auto mb-3 w-fit rounded-full px-4 py-1 text-center text-sm font-bold text-white">
        {kidPlainText(view.my_display_name ?? "", 24)} · Your score: {view.my_score}
      </p>
      <EscapeFinale
        title={theme.finaleTitle}
        notEscapedTitle={theme.notEscapedTitle}
        escaped={escaped}
        chips={vault?.chips ?? []}
        codeWord={theme.codeWord}
        elapsedLabel={formatClassTime(vault?.elapsed_ms ?? null, escaped)}
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
    </VaultScene>
  );
}
