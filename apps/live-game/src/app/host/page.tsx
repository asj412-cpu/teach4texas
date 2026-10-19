"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionBanner, type ConnState } from "@/components/connection-banner";
import { outcomeForStatus, startResilientPoll, type PollOutcome } from "@/lib/poll-backoff";
import type { GameBoard, GameType, QuestionCell } from "@/lib/domain/board";
import {
  boardGameType,
  supportsBoardPlay,
  supportsCategorySort,
  supportsMemoryMatch,
  supportsOddOneOut,
  supportsScavengerTap,
  supportsTrueFalseDash,
  supportsEscapeVault,
  supportsSequenceSort,
  supportsTimedRace,
} from "@/lib/domain/board";
import type { HostRoomView } from "@/lib/domain/live-room";
import { CategorySortHost } from "@/components/category-sort-host";
import { MemoryMatchHost } from "@/components/memory-match-host";
import { OddOneOutHost } from "@/components/odd-one-out-host";
import { TrueFalseDashHost } from "@/components/true-false-dash-host";
import { EscapeVaultHost } from "@/components/escape-vault-host";
import { ScavengerTapHost } from "@/components/scavenger-tap-host";
import { SequenceSortHost } from "@/components/sequence-sort-host";
import { TimedRaceHost } from "@/components/timed-race-host";
import {
  HostFinalActions,
  HostSeatPanel,
} from "@/components/host-seat-panel";
import { kidPlainText } from "@/lib/plain-text";
import { DailyDoubleHost } from "@/components/daily-double";
import { CueOn, Finale, GameShowStage } from "@/components/game-show";

const HOST_TOKEN_KEY = "t4t_host_token";
const ROOM_CODE_KEY = "t4t_room_code";

export default function HostPage() {
  const [conn, setConn] = useState<ConnState>("ok");
  return (
    <>
      <HostPageBody onConnection={setConn} />
      <ConnectionBanner
        state={conn}
        endedText="Room ended or not found. Start a new room from your game."
      />
    </>
  );
}

function HostPageBody({ onConnection }: { onConnection: (s: ConnState) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<GameBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [view, setView] = useState<HostRoomView | null>(null);
  const [starting, setStarting] = useState(false);

  // Load entitled board
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/host/me");
        const me = await meRes.json();
        if (!meRes.ok || !me.ok) {
          if (!cancelled) {
            setError("not_entitled");
            setLoading(false);
          }
          return;
        }
        const boardRes = await fetch(
          `/api/host/board?board_id=${encodeURIComponent(me.board.id)}`,
        );
        const data = await boardRes.json();
        if (!boardRes.ok || !data.ok) {
          if (!cancelled) {
            setError("load_failed");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setBoard(data.board as GameBoard);
          const savedToken = sessionStorage.getItem(HOST_TOKEN_KEY);
          const savedCode = sessionStorage.getItem(ROOM_CODE_KEY);
          if (savedToken && savedCode) {
            setHostToken(savedToken);
            setRoomCode(savedCode);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("load_failed");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const poll = useCallback(async (): Promise<PollOutcome> => {
    if (!hostToken || !roomCode) return "ok";
    const res = await fetch(`/api/rooms/${roomCode}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    const outcome = outcomeForStatus(res.status, res.ok && Boolean(data?.ok));
    if (outcome === "ok" && res.ok && data?.ok) setView(data.view as HostRoomView);
    return outcome;
  }, [hostToken, roomCode]);

  useEffect(() => {
    if (!hostToken || !roomCode) return;
    onConnection("ok");
    const stop = startResilientPoll({
      poll,
      onEnded: () => onConnection("ended"),
      onReconnecting: (r) => onConnection(r ? "reconnecting" : "ok"),
    });
    return () => {
      stop();
      onConnection("ok");
    };
  }, [hostToken, roomCode, poll, onConnection]);

  async function startLive(gameType?: GameType) {
    if (!board) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id, game_type: gameType }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "start_failed");
        return;
      }
      sessionStorage.setItem(HOST_TOKEN_KEY, data.host_token);
      sessionStorage.setItem(ROOM_CODE_KEY, data.room_code);
      setHostToken(data.host_token);
      setRoomCode(data.room_code);
      setView(data.view);
    } finally {
      setStarting(false);
    }
  }

  async function hostAction(body: Record<string, unknown>) {
    if (!hostToken || !roomCode) return;
    const res = await fetch(`/api/rooms/${roomCode}/host`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return;

    // Return to game: leave the live room → redeemed host lobby (distinct from Play again).
    if (body.type === "return_to_game") {
      sessionStorage.removeItem(HOST_TOKEN_KEY);
      sessionStorage.removeItem(ROOM_CODE_KEY);
      setHostToken(null);
      setRoomCode(null);
      setView(null);
      return;
    }

    setView(data.view);
  }

  const categories = useMemo(() => {
    const b = view?.board ?? board;
    if (!b) return [];
    return [...new Set((b.cells ?? []).map((c) => c.category))];
  }, [view, board]);

  if (loading) {
    return (
      <GameShowStage>
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mx-auto mt-3 w-fit max-w-full rounded-3xl bg-black/45 px-6 py-2">
          <h1 className="dd-title dd-title-shimmer text-5xl font-black uppercase">Get ready!</h1>
          </div>
          <p className="gs-glass mt-6 rounded-2xl bg-black/55 px-6 py-4 text-xl font-bold text-white">
            <span className="mr-2 inline-block animate-spin" aria-hidden>🎲</span>Loading your purchased game…
          </p>
        </div>
      </GameShowStage>
    );
  }

  if (error === "not_entitled" || !board) {
    return (
      <GameShowStage>
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
          <p className="mx-auto w-fit rounded-full bg-black/55 px-4 py-1 text-base font-black uppercase tracking-widest text-amber-200">🔒 Locked</p>
          <div className="mx-auto mt-3 w-fit max-w-full rounded-3xl bg-black/45 px-6 py-2">
          <h1 className="dd-title text-4xl font-black uppercase">No game unlocked yet</h1>
          </div>
          <p className="mt-4 rounded-2xl border border-white/25 bg-black/55 px-5 py-4 text-base text-white">
            Redeem the access code from your Teachers Pay Teachers download. Games
            are sold individually — there is no free generator.
          </p>
          <Link href="/redeem" className="gs-cat mt-6 inline-flex justify-center rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide">
            Redeem purchase ▶
          </Link>
        </div>
      </GameShowStage>
    );
  }

  // Not live yet
  if (!roomCode || !hostToken || !view) {
    return (
      <GameShowStage>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-10">
        <p className="mx-auto w-fit rounded-full bg-[#047857] px-4 py-1 text-base font-black uppercase tracking-widest text-white">
          ✓ Paid game unlocked
        </p>
        <div className="mx-auto mt-3 w-fit max-w-full rounded-3xl bg-black/45 px-6 py-2">
        <h1 className="dd-title dd-title-shimmer text-center text-4xl font-black uppercase sm:text-5xl">
          {kidPlainText(board.title, 80)}
        </h1>
        </div>
        <p className="mt-4 rounded-2xl border border-white/25 bg-black/55 px-5 py-3 text-center text-base text-white">
          Grade {board.grade} · {board.subject.toUpperCase()}
          {supportsBoardPlay(board)
            ? ` · ${board.cells.length} questions`
            : supportsMemoryMatch(board)
              ? ` · ${board.items?.length ?? 0} match pairs`
              : supportsTimedRace(board)
                ? ` · ${board.race_items?.length ?? 0} race items`
                : supportsScavengerTap(board)
                  ? ` · ${board.scavenger_items?.length ?? 0} scavenger clues`
                  : supportsSequenceSort(board)
                    ? ` · ${board.sequence_items?.length ?? 0} sequence prompts`
                    : supportsCategorySort(board)
                      ? ` · ${board.category_items?.length ?? 0} category items`
                      : supportsOddOneOut(board)
                        ? ` · ${board.odd_items?.length ?? 0} odd-one-out rounds`
                        : supportsTrueFalseDash(board)
                          ? ` · ${board.dash_items?.length ?? 0} true-or-false claims`
                          : ""}
          {supportsMemoryMatch(board) ? " · Memory Match ready" : ""}
          {supportsTimedRace(board) ? " · Timed Race ready" : ""}
          {supportsScavengerTap(board) ? " · Scavenger Hunt ready" : ""}
          {supportsSequenceSort(board) ? " · Order the Steps ready" : ""}
          {supportsCategorySort(board) ? " · Sort into Bins ready" : ""}
          {supportsOddOneOut(board) ? " · Find the Odd One ready" : ""}
          {supportsTrueFalseDash(board) ? " · True or False Dash ready" : ""}. Only
          this game is available on this host session.
        </p>
        <div className="gs-glass gs-rise mt-6 flex flex-col gap-3 rounded-3xl bg-black/40 p-5">
          {supportsBoardPlay(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("board")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting ? "Starting…" : "Start game show (Jeopardy board)"}
            </button>
          )}
          {supportsMemoryMatch(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("memory_match")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "memory_match"
                  ? "Start Memory Match"
                  : "Start as Memory Match"}
            </button>
          )}
          {supportsTimedRace(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("timed_race")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "timed_race"
                  ? "Start Timed Race"
                  : "Start as Timed Race"}
            </button>
          )}
          {supportsScavengerTap(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("scavenger_tap")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "scavenger_tap"
                  ? "Start Scavenger Hunt"
                  : "Start as Scavenger Hunt"}
            </button>
          )}
          {supportsSequenceSort(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("sequence_sort")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "sequence_sort"
                  ? "Start Order the Steps"
                  : "Start as Order the Steps"}
            </button>
          )}
          {supportsCategorySort(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("category_sort")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "category_sort"
                  ? "Start Sort into Bins"
                  : "Start as Sort into Bins"}
            </button>
          )}
          {supportsOddOneOut(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("odd_one_out")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "odd_one_out"
                  ? "Start Find the Odd One"
                  : "Start as Find the Odd One"}
            </button>
          )}
          {supportsTrueFalseDash(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("true_false_dash")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "true_false_dash"
                  ? "Start True or False Dash"
                  : "Start as True or False Dash"}
            </button>
          )}
          {supportsEscapeVault(board) && (
            <button
              type="button"
              disabled={starting}
              onClick={() => startLive("escape_vault")}
              className="gs-cat rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-wait disabled:grayscale-[60%]"
            >
              {starting
                ? "Starting…"
                : boardGameType(board) === "escape_vault"
                  ? "Start Escape Vault"
                  : "Start as Escape Vault"}
            </button>
          )}
        </div>
        <p className="mt-4 rounded-xl bg-black/55 px-4 py-3 text-center text-base text-white">
          Students will join with a short room code (not your TPT access code).
        </p>
      </div>
      </GameShowStage>
    );
  }

  if (view.game_type === "escape_vault" && (view.phase === "escaping" || view.phase === "final" || view.phase === "lobby")) {
    return <EscapeVaultHost view={view} onAction={hostAction} />;
  }

  if (view.phase === "final") {
    return <Finale players={view.players} footer={<HostFinalActions onAction={hostAction} />} />;
  }

  if (view.game_type === "memory_match") {
    return <MemoryMatchHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "timed_race") {
    return <TimedRaceHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "scavenger_tap") {
    return <ScavengerTapHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "sequence_sort") {
    return <SequenceSortHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "category_sort") {
    return <CategorySortHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "odd_one_out") {
    return <OddOneOutHost view={view} onAction={hostAction} />;
  }

  if (view.game_type === "true_false_dash") {
    return <TrueFalseDashHost view={view} onAction={hostAction} />;
  }


  const used = new Set(view.used_cell_ids);
  const activeCell: QuestionCell | undefined = view.active_cell_id
    ? view.board.cells.find((c) => c.id === view.active_cell_id)
    : undefined;

  if (activeCell && view.phase === "dd_wager") {
    const topPoints = Math.max(500, ...view.board.cells.map((c) => c.points));
    return (
      <DailyDoubleHost
        code={view.code}
        category={activeCell.category}
        points={activeCell.points}
        hostScore={view.host_seat.score}
        hostMaxWager={Math.max(view.host_seat.score, topPoints)}
        hostWager={view.wagers.host ?? null}
        wagerCount={view.wager_count}
        playerCount={view.players.length}
        players={view.players}
        wagers={view.wagers}
        onHostWager={(amount) => hostAction({ type: "host_wager", amount })}
        onOpenQuestion={() => hostAction({ type: "open_question" })}
      />
    );
  }

  if (
    activeCell &&
    (view.phase === "question_open" ||
      view.phase === "question_locked" ||
      view.phase === "reveal")
  ) {
    return (
      <GameShowStage className="px-4 py-6">
        <CueOn k={`${activeCell.id}-${view.phase}`} kind={view.phase === "reveal" ? "reveal" : "open"} />
        <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
          <div key={`${activeCell.id}-${view.phase}`} className="gs-glass gs-rise flex-1 rounded-3xl p-5 sm:p-7">
            <p className="text-base font-semibold uppercase text-yellow-200">
              Room {view.code} · {activeCell.category} · {activeCell.points}
              {activeCell.daily_double ? " · Bonus Wager" : ""}
            </p>
            {activeCell.daily_double && (
              <p className="mt-2 inline-block rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 px-3 py-1 text-base font-black uppercase text-t4t-navy">
                Bonus Wager · playing for wagers
              </p>
            )}
            <p className="mt-4 text-2xl font-black leading-snug drop-shadow sm:text-4xl">
              {kidPlainText(activeCell.question, 240)}
            </p>
            <ul className="mt-6 space-y-2">
              {activeCell.choices.map((c, i) => {
                const canPick =
                  view.phase === "question_open" && !view.host_seat.answered;
                const picked =
                  view.host_seat.answered &&
                  view.answers.host === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={!canPick}
                      onClick={() =>
                        hostAction({ type: "host_answer", choice_index: i })
                      }
                      className={`gs-choice gs-glass w-full rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold ${
                        view.phase === "reveal" && i === activeCell.correct_index
                          ? "gs-correct"
                          : picked
                            ? "border-t4t-gold"
                            : "border-white/20"
                      } ${canPick ? "hover:bg-white/20" : ""} disabled:cursor-default`}
                    >
                      <span className="font-bold text-t4t-gold">
                        {String.fromCharCode(65 + i)}.
                      </span>{" "}
                      {c}
                    </button>
                  </li>
                );
              })}
            </ul>
            {view.phase === "question_open" && view.host_seat.answered && (
              <p className="mt-2 text-sm text-t4t-gold">Your host answer is locked in.</p>
            )}
            {view.phase === "reveal" && (
              <p className="mt-4 text-sm text-t4t-gold">
                TEKS {activeCell.teks} · {activeCell.answer}
              </p>
            )}
          </div>
          <aside className="gs-glass w-full rounded-3xl p-4 lg:w-72">
            <p className="text-xs uppercase text-white/60">Control dock</p>
            <p className="mt-2 text-sm">
              Answers: {view.answer_count} / {view.players.filter((p) => p.player_id !== "host").length}
            </p>
            <p className="text-sm">
              host score:{" "}
              <span className="font-bold text-t4t-gold">
                {view.host_seat.score}
              </span>
            </p>
            <p className="text-sm">Phase: {view.phase}</p>
            <div className="mt-4 flex flex-col gap-2">
              {view.phase === "question_open" && (
                <button
                  type="button"
                  className="rounded-lg bg-t4t-burnt py-2 text-sm font-semibold"
                  onClick={() => hostAction({ type: "lock" })}
                >
                  Lock answers
                </button>
              )}
              {(view.phase === "question_locked" ||
                view.phase === "question_open") && (
                <button
                  type="button"
                  className="rounded-lg bg-t4t-gold py-2 text-sm font-semibold text-t4t-navy"
                  onClick={() => hostAction({ type: "reveal" })}
                >
                  Reveal & score
                </button>
              )}
              {view.phase === "reveal" && (
                <button
                  type="button"
                  className="rounded-lg border border-white/40 py-2 text-sm font-semibold"
                  onClick={() => hostAction({ type: "back_to_board" })}
                >
                  Back to board
                </button>
              )}
            </div>
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm">
              {view.players.map((p) => (
                <li key={p.player_id} className="flex justify-between">
                  <span>{p.display_name}</span>
                  <span className="text-t4t-gold">
                    {view.phase === "reveal" &&
                    view.points_awarded[p.player_id] !== undefined
                      ? `${view.points_awarded[p.player_id]! >= 0 ? "+" : ""}${view.points_awarded[p.player_id]} → `
                      : ""}
                    {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </GameShowStage>
    );
  }

  // Lobby or board
  return (
    <GameShowStage sparks={false}>
      <CueOn k={view.active_cell_id ? `sel-${view.active_cell_id}` : null} kind="select" />
      <header className="gs-glass border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-t4t-gold">
              Live host · paid game only
            </p>
            <h1 className="dd-title text-2xl font-black uppercase sm:text-3xl">{view.board.title}</h1>
          </div>
          <div className="gs-glass rounded-2xl px-5 py-3 text-center text-white">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Student room code
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-widest">
              {view.code}
            </p>
            <p className="text-xs text-white/70">
              {view.players.filter((p) => p.player_id !== "host").length} joined · students go to /join
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {view.phase === "lobby" && (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => hostAction({ type: "start_game" })}
              className="rounded-xl bg-t4t-green px-5 py-3 text-sm font-semibold text-white"
            >
              Start game (leave lobby)
            </button>
            <button
              type="button"
              onClick={() =>
                hostAction({ type: "lock_lobby", locked: !view.lobby_locked })
              }
              className="rounded-xl border border-white/60 px-5 py-3 text-sm font-semibold text-white"
            >
              {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
            </button>
          </div>
        )}

        {view.phase === "board" && view.active_cell_id && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => hostAction({ type: "open_question" })}
              className="rounded-xl bg-t4t-burnt px-5 py-3 text-sm font-semibold text-white"
            >
              Open question for students
            </button>
          </div>
        )}

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${categories.length}, minmax(6.5rem, 1fr))`,
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat}
              className="gs-cat rounded-lg px-1 py-3 text-center text-[10px] font-black uppercase leading-tight sm:text-xs"
            >
              {cat}
            </div>
          ))}
          {[100, 200, 300, 400, 500].map((pts) =>
            categories.map((cat) => {
              const cell = view.board.cells.find(
                (c) => c.category === cat && c.points === pts,
              )!;
              const isUsed = used.has(cell.id);
              const isActive = view.active_cell_id === cell.id;
              return (
                <button
                  key={cell.id}
                  type="button"
                  disabled={isUsed || view.phase === "lobby"}
                  onClick={() =>
                    hostAction({ type: "select_cell", cell_id: cell.id })
                  }
                  style={{ animationDelay: `${(pts / 100) * 0.06}s` }}
                  className={`gs-tile rounded-xl py-5 text-2xl font-black sm:py-7 sm:text-4xl ${
                    isUsed ? "gs-tile-used" : isActive ? "gs-tile-active" : ""
                  }`}
                >
                  {isUsed ? "—" : pts}
                </button>
              );
            }),
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <ul className="flex flex-wrap gap-2 text-sm">
            {[...view.players].sort((a, b) => b.score - a.score).map((p) => (
              <li key={p.player_id} className="gs-glass gs-rise rounded-full px-3 py-1">
                {p.display_name} <span className="font-black text-t4t-gold">{p.score}</span>
              </li>
            ))}
            {view.players.filter((p) => p.player_id !== "host").length === 0 && (
              <li className="text-white/60">Waiting for students…</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => hostAction({ type: "end_game" })}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-200"
          >
            End game
          </button>
        </div>
      </main>
    </GameShowStage>
  );
}
