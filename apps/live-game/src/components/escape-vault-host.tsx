"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HOST_PLAYER_ID, type HostRoomView } from "@/lib/domain/live-room";
import { HostFinalActions, HostSeatPanel } from "@/components/host-seat-panel";
import { kidPlainText } from "@/lib/plain-text";
import { VaultLock } from "@/components/escape-vault/vault-lock";
import { TurkeyMascot, type MascotMood } from "@/components/escape-vault/turkey-mascot";
import { RoomTransition } from "@/components/escape-vault/room-transition";
import { EscapeFinale } from "@/components/escape-vault/finale";
import {
  pickLine,
  resolveEscapeVaultTheme,
} from "@/components/escape-vault/theme";
import {
  ensureVaultAudio,
  isVaultMuted,
  playVaultSfx,
  setVaultMuted,
  startAmbient,
  stopAmbient,
} from "@/components/escape-vault/audio";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export function EscapeVaultHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const vault = view.vault;
  const theme = resolveEscapeVaultTheme(vault?.theme ?? view.board.theme);
  const reduced = usePrefersReducedMotion();
  const [muted, setMuted] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [mood, setMood] = useState<MascotMood>("idle");
  const [lineSalt, setLineSalt] = useState(0);
  const [prevRoom, setPrevRoom] = useState(vault?.room_index ?? 0);
  const [showTransition, setShowTransition] = useState(false);
  /** Local "lock swings open" beat before the room advances (P2 unlock anim). */
  const [opening, setOpening] = useState(false);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const escaped = Boolean(vault?.escaped);

  /** Oops first (wrong), then settle on the hint. */
  const oopsThenHint = () => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    setMood("oops");
    setLineSalt((n) => n + 1);
    moodTimer.current = setTimeout(() => {
      setMood("hint");
      setLineSalt((n) => n + 1);
    }, 1600);
  };

  useEffect(() => {
    setMuted(isVaultMuted());
  }, []);

  // Room change → door transition + cheer. The chime is played once on the
  // Unlock click (not here), so it never doubles and never fires on Play again.
  useEffect(() => {
    if (!vault) return;
    if (view.phase !== "escaping") {
      if (vault.room_index !== prevRoom) setPrevRoom(vault.room_index);
      return;
    }
    if (vault.room_index !== prevRoom) {
      setShowTransition(true);
      setPrevRoom(vault.room_index);
      setMood("cheer");
      setLineSalt((n) => n + 1);
    }
  }, [vault?.room_index, prevRoom, vault, view.phase]);

  // Host-seat miss → wrong buzz + oops, then hint.
  const seatVault = view.host_seat?.vault;
  const seatMissKey =
    seatVault && seatVault.answered && !seatVault.last_correct
      ? `${seatVault.room_index}:${seatVault.puzzle_index}`
      : null;
  useEffect(() => {
    if (!seatMissKey) return;
    playVaultSfx("wrong");
    oopsThenHint();
  }, [seatMissKey]);

  useEffect(() => {
    if (view.phase === "final") {
      if (escaped) {
        playVaultSfx("fanfare");
        setMood("cheer");
      } else {
        setMood("oops");
      }
      stopAmbient();
    }
    if (view.phase === "lobby") {
      // Play again / Return: clear stale vault reactions.
      if (moodTimer.current) clearTimeout(moodTimer.current);
      setMood("idle");
      setShowTransition(false);
      setOpening(false);
    }
  }, [view.phase, escaped]);

  useEffect(() => {
    return () => {
      stopAmbient();
      if (moodTimer.current) clearTimeout(moodTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  const line = useMemo(() => {
    const bag =
      view.phase === "final"
        ? escaped
          ? theme.lines.finale
          : theme.lines.oops
        : mood === "cheer"
          ? theme.lines.cheer
          : mood === "oops"
            ? theme.lines.oops
            : mood === "hint"
              ? theme.lines.hint
              : theme.lines.idle;
    return pickLine(bag, lineSalt + (vault?.room_index ?? 0));
  }, [mood, lineSalt, theme, vault?.room_index, view.phase, escaped]);

  const accent =
    theme.roomAccent[vault?.theme_key ?? ""] ?? theme.palette.accent;

  const armAudio = () => {
    ensureVaultAudio();
    if (!muted) startAmbient();
  };

  const toggleMute = () => {
    ensureVaultAudio();
    const next = !muted;
    setMuted(next);
    setVaultMuted(next);
    if (next) stopAmbient();
    else startAmbient();
  };

  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  const studentsJoined = view.players.filter(
    (p) => p.player_id !== HOST_PLAYER_ID,
  ).length;

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: theme.palette.bg }}
      onPointerDown={armAudio}
    >
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Live host · Escape Vault
            </p>
            <h1 className="text-xl font-bold">
              {kidPlainText(view.board.title, 80)}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg border border-white/40 px-3 py-2 text-xs font-semibold"
              aria-pressed={muted}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <div className="rounded-xl bg-black/30 px-5 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-white/70">
                Student room code
              </p>
              <p className="font-mono text-3xl font-extrabold tracking-widest">
                {view.code}
              </p>
              <p className="text-xs text-white/70">
                {studentsJoined} joined · students go to /join
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view.phase === "lobby" && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                armAudio();
                playVaultSfx("tick");
                onAction({ type: "start_game" });
              }}
              className="rounded-xl bg-t4t-green px-5 py-3 text-sm font-semibold text-white"
            >
              Start Escape Vault
            </button>
            <button
              type="button"
              onClick={() =>
                onAction({ type: "lock_lobby", locked: !view.lobby_locked })
              }
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold"
            >
              {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
            </button>
          </div>
        )}

        {view.phase === "escaping" && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                armAudio();
                playVaultSfx("tick");
                onAction({ type: "reveal_vault" });
                if (vault?.majority_met) {
                  setMood("hint");
                  setLineSalt((n) => n + 1);
                } else {
                  oopsThenHint();
                }
              }}
              className="rounded-xl border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-100"
              disabled={vault?.revealed}
            >
              Reveal answer
            </button>
            <button
              type="button"
              onClick={() => {
                if (opening) return;
                armAudio();
                playVaultSfx("unlock");
                setOpening(true);
                setMood("cheer");
                setLineSalt((n) => n + 1);
                // Let the shackle swing (~0.7s) before the room changes.
                openTimer.current = setTimeout(
                  () => {
                    onAction({ type: "unlock_advance" });
                    setOpening(false);
                  },
                  reduced ? 0 : 750,
                );
              }}
              className="rounded-xl bg-t4t-gold px-5 py-3 text-sm font-semibold text-t4t-navy disabled:opacity-40"
              disabled={!vault?.can_unlock || opening}
            >
              Unlock & advance
            </button>
            {vault?.has_next_puzzle && (
              <button
                type="button"
                onClick={() => onAction({ type: "next_puzzle" })}
                className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold"
              >
                Next puzzle
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onAction({ type: "lock_lobby", locked: !view.lobby_locked })
              }
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold"
            >
              {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
            </button>
          </div>
        )}

        <div
          className="relative w-full min-h-[16rem] overflow-visible rounded-2xl p-4 pb-5 sm:min-h-[24rem] sm:p-6 lg:min-h-[32rem]"
          style={{ background: theme.palette.panel, color: theme.palette.text }}
        >
          {showTransition && vault && (
            <RoomTransition
              roomKey={`${vault.room_index}-${vault.room_name}`}
              roomName={vault.room_name ?? "Next room"}
              accent={accent}
              reducedMotion={reduced}
              onDone={() => setShowTransition(false)}
            />
          )}

          {view.phase === "final" ? (
            <EscapeFinale
              title={theme.finaleTitle}
              notEscapedTitle={theme.notEscapedTitle}
              escaped={escaped}
              chips={vault?.chips ?? []}
              codeWord={theme.codeWord}
              elapsedLabel={formatElapsed(vault?.elapsed_ms ?? 0)}
              line={line}
              players={ranked.map((p) => ({
                player_id: p.player_id,
                display_name: kidPlainText(p.display_name, 16),
                score: p.score,
                is_host: p.player_id === HOST_PLAYER_ID,
              }))}
              reducedMotion={reduced}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
                    {view.phase === "lobby"
                      ? "Waiting in lobby"
                      : `Room ${(vault?.room_index ?? 0) + 1}/${vault?.room_total ?? 0}`}
                    {view.phase === "escaping" && vault?.room_chip
                      ? ` · Chip ${vault.room_chip}`
                      : ""}
                    {view.phase === "escaping" && vault?.teks
                      ? ` · TEKS ${vault.teks}`
                      : ""}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold sm:text-3xl">
                    {view.phase === "escaping" && vault?.room_name
                      ? vault.room_name
                      : kidPlainText(view.board.title, 60)}
                  </p>
                </div>
                <VaultLock
                  state={opening ? "open" : (vault?.lock_state ?? "locked")}
                  accent={theme.palette.lock}
                  reducedMotion={reduced}
                />
              </div>

              <p className="mx-auto mt-4 max-w-4xl text-center text-xl font-bold leading-snug sm:text-2xl">
                {view.phase === "escaping" && vault?.prompt
                  ? vault.prompt
                  : "Students join with display name only — no accounts."}
              </p>

              {view.phase === "escaping" &&
                vault?.revealed_answer &&
                vault.kind !== "mc" && (
                  <p className="mx-auto mt-3 w-fit rounded-xl border-4 border-t4t-green bg-emerald-100 px-4 py-2 text-lg font-bold">
                    ✓ Answer: {vault.revealed_answer}
                  </p>
                )}

              {view.phase === "escaping" && vault?.choices && (
                <div className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {vault.choices.map((c) => {
                    const isKey = vault.revealed_choice_id === c.id;
                    return (
                      <div
                        key={c.id}
                        data-revealed-correct={isKey ? "true" : undefined}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ${
                          isKey
                            ? "border-4 border-t4t-green bg-emerald-100 ring-2 ring-t4t-green/40"
                            : vault.revealed_choice_id
                              ? "bg-white/60 opacity-70"
                              : "bg-white/90"
                        }`}
                      >
                        <span className="mr-2 font-mono text-t4t-burnt">{c.id}.</span>
                        {c.label}
                        {isKey ? (
                          <span className="ml-2 font-bold text-t4t-green">✓ Answer</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <TurkeyMascot mood={mood} line={line} reducedMotion={reduced} />
                <div className="text-right text-xs text-t4t-darkText/70">
                  {vault
                    ? `${vault.answer_count}/${vault.student_count} answered · ${vault.correct_count} correct`
                    : ""}
                  {vault?.majority_met ? " · majority ready" : ""}
                  {vault ? ` · ${formatElapsed(vault.elapsed_ms)}` : ""}
                  <div className="mt-1 font-mono text-sm font-bold tracking-widest text-t4t-green">
                    {(vault?.chips ?? []).join(" ") || "— — — —"}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ranked.length === 0 && (
                  <p className="col-span-full text-center text-t4t-darkText/50">
                    Waiting for students…
                  </p>
                )}
                {ranked.map((p) => {
                  const row = vault?.players.find(
                    (m) => m.player_id === p.player_id,
                  );
                  return (
                    <div
                      key={p.player_id}
                      className="rounded-xl bg-white p-2 text-center shadow-sm"
                    >
                      <p className="truncate text-sm font-bold">
                        {kidPlainText(p.display_name, 16)}
                      </p>
                      <p className="text-xl font-extrabold">{p.score}</p>
                      <p className="text-[10px] text-t4t-darkText/60">
                        {row
                          ? `${row.correct_count} correct${row.answered ? " · locked" : " · picking"}`
                          : "ready"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {view.phase === "final" ? (
          <HostFinalActions onAction={onAction} />
        ) : (
          <HostSeatPanel view={view} onAction={onAction} />
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="text-sm text-white/70 underline"
            >
              {showKey ? "Hide answer key" : "Show answer key (teacher only)"}
            </button>
            {showKey && vault && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-white/85">
                {vault.item_key.map((item) => (
                  <li key={`${item.room}-${item.prompt}`}>
                    {item.room}: {item.prompt} → {item.answer}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => onAction({ type: "end_game" })}
            className="rounded-lg border border-red-400 px-4 py-2 text-sm font-semibold text-red-200"
          >
            End game
          </button>
        </div>
      </main>
    </div>
  );
}
