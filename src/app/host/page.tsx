"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameBoard, QuestionCell } from "@/lib/domain/board";
import type { HostRoomView } from "@/lib/domain/live-room";

const HOST_TOKEN_KEY = "t4t_host_token";
const ROOM_CODE_KEY = "t4t_room_code";

export default function HostPage() {
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

  const poll = useCallback(async () => {
    if (!hostToken || !roomCode) return;
    const res = await fetch(`/api/rooms/${roomCode}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const data = await res.json();
    if (res.ok && data.ok) setView(data.view as HostRoomView);
  }, [hostToken, roomCode]);

  useEffect(() => {
    if (!hostToken || !roomCode) return;
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [hostToken, roomCode, poll]);

  async function startLive() {
    if (!board) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id }),
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
    if (res.ok && data.ok) setView(data.view);
  }

  const categories = useMemo(() => {
    const b = view?.board ?? board;
    if (!b) return [];
    return [...new Set(b.cells.map((c) => c.category))];
  }, [view, board]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-t4t-navy">
        Loading your purchased game…
      </div>
    );
  }

  if (error === "not_entitled" || !board) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-bold text-t4t-navy">No purchase unlocked</h1>
        <p className="mt-2 text-sm text-t4t-darkText/75">
          Redeem the access code from your Teachers Pay Teachers download. Games
          are sold individually — there is no free generator.
        </p>
        <Link
          href="/redeem"
          className="mt-6 inline-flex justify-center rounded-xl bg-t4t-burnt px-4 py-3 text-sm font-semibold text-white"
        >
          Redeem purchase
        </Link>
      </div>
    );
  }

  // Not live yet
  if (!roomCode || !hostToken || !view) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
          Paid game unlocked
        </p>
        <h1 className="mt-1 text-2xl font-bold text-t4t-navy">{board.title}</h1>
        <p className="mt-2 text-sm text-t4t-darkText/75">
          Grade {board.grade} · {board.subject.toUpperCase()} ·{" "}
          {board.cells.length} questions. Only this game is available on this
          host session.
        </p>
        <button
          type="button"
          disabled={starting}
          onClick={startLive}
          className="mt-8 rounded-xl bg-t4t-navy px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {starting ? "Starting…" : "Start live class session"}
        </button>
        <p className="mt-3 text-xs text-t4t-darkText/50">
          Students will join with a short room code (not your TPT access code).
        </p>
      </div>
    );
  }

  const used = new Set(view.used_cell_ids);
  const activeCell: QuestionCell | undefined = view.active_cell_id
    ? view.board.cells.find((c) => c.id === view.active_cell_id)
    : undefined;

  if (view.phase === "final") {
    const ranked = [...view.players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen bg-t4t-navy px-6 py-12 text-white">
        <h1 className="text-center text-3xl font-extrabold text-t4t-gold">
          Final scores
        </h1>
        <ol className="mx-auto mt-10 max-w-md space-y-3">
          {ranked.map((p, i) => (
            <li
              key={p.player_id}
              className="flex justify-between rounded-xl bg-white/10 px-4 py-3"
            >
              <span>
                {i + 1}. {p.display_name}
              </span>
              <span className="font-bold text-t4t-gold">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (
    activeCell &&
    (view.phase === "question_open" ||
      view.phase === "question_locked" ||
      view.phase === "reveal")
  ) {
    return (
      <div className="min-h-screen bg-t4t-navy px-4 py-6 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase text-t4t-gold">
              Room {view.code} · {activeCell.category} · {activeCell.points}
              {activeCell.daily_double ? " · DD" : ""}
            </p>
            <p className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
              {activeCell.question}
            </p>
            <ul className="mt-6 space-y-2">
              {activeCell.choices.map((c, i) => (
                <li
                  key={i}
                  className={`rounded-xl border px-4 py-3 ${
                    view.phase === "reveal" && i === activeCell.correct_index
                      ? "border-t4t-gold bg-t4t-gold/20"
                      : "border-white/20"
                  }`}
                >
                  <span className="font-bold text-t4t-gold">
                    {String.fromCharCode(65 + i)}.
                  </span>{" "}
                  {c}
                </li>
              ))}
            </ul>
            {view.phase === "reveal" && (
              <p className="mt-4 text-sm text-t4t-gold">
                TEKS {activeCell.teks} · {activeCell.answer}
              </p>
            )}
          </div>
          <aside className="w-full rounded-2xl bg-black/20 p-4 lg:w-72">
            <p className="text-xs uppercase text-white/60">Control dock</p>
            <p className="mt-2 text-sm">
              Answers: {view.answer_count} / {view.players.length}
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
                  <span className="text-t4t-gold">{p.score}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    );
  }

  // Lobby or board
  return (
    <div className="min-h-screen bg-t4t-lightGray">
      <header className="border-b border-t4t-navy/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-t4t-burnt">
              Live host · paid game only
            </p>
            <h1 className="text-xl font-bold text-t4t-navy">{view.board.title}</h1>
          </div>
          <div className="rounded-xl bg-t4t-navy px-5 py-3 text-center text-white">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Student room code
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-widest">
              {view.code}
            </p>
            <p className="text-xs text-white/70">
              {view.players.length} joined · students go to /join
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
              className="rounded-xl border border-t4t-navy px-5 py-3 text-sm font-semibold text-t4t-navy"
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
              className="rounded-lg bg-t4t-navy px-1 py-3 text-center text-[10px] font-bold uppercase leading-tight text-white sm:text-xs"
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
                  className={`rounded-lg py-5 text-xl font-extrabold sm:py-7 sm:text-2xl ${
                    isUsed
                      ? "bg-t4t-navy/15 text-t4t-navy/30"
                      : isActive
                        ? "bg-t4t-gold text-t4t-navy ring-2 ring-t4t-navy"
                        : "bg-t4t-burnt text-white hover:bg-t4t-burnt/90"
                  }`}
                >
                  {isUsed ? "—" : pts}
                </button>
              );
            }),
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <ul className="text-sm text-t4t-darkText/80">
            {view.players.map((p) => (
              <li key={p.player_id}>
                {p.display_name} — {p.score} pts
              </li>
            ))}
            {view.players.length === 0 && (
              <li className="text-t4t-darkText/50">Waiting for students…</li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => hostAction({ type: "end_game" })}
            className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700"
          >
            End game
          </button>
        </div>
      </main>
    </div>
  );
}
