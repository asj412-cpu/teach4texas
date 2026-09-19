"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";

const PLAYER_KEY = "t4t_player";

type StoredPlayer = {
  room_code: string;
  player_id: string;
  resume_secret: string;
};

export default function PlayPage() {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const [view, setView] = useState<PlayerRoomView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const poll = useCallback(async () => {
    if (!playerId) return;
    const res = await fetch(
      `/api/rooms/${code}?player_id=${encodeURIComponent(playerId)}`,
    );
    const data = await res.json();
    if (res.ok && data.ok) setView(data.view);
    else if (res.status === 404) setError("Room ended or not found.");
  }, [code, playerId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if (!raw) {
        setError("Join from /join first.");
        return;
      }
      const stored = JSON.parse(raw) as StoredPlayer;
      if (stored.room_code.toUpperCase() !== code) {
        setError("This device is joined to a different room.");
        return;
      }
      setPlayerId(stored.player_id);
    } catch {
      setError("Join from /join first.");
    }
  }, [code]);

  useEffect(() => {
    if (!playerId) return;
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [playerId, poll]);

  async function answer(choice_index: number) {
    if (!playerId || !view || view.my_answered || view.phase !== "question_open")
      return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, choice_index }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setView(data.view);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <p className="text-t4t-navy">{error}</p>
        <Link href="/join" className="mt-4 text-t4t-burnt underline">
          Back to join
        </Link>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex min-h-screen items-center justify-center text-t4t-navy">
        Connecting…
      </div>
    );
  }

  if (view.phase === "lobby") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <p className="text-sm uppercase text-t4t-burnt">You&apos;re in!</p>
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">{view.title}</h1>
        <p className="mt-2 text-t4t-darkText/70">
          Waiting for your teacher to start… ({view.players.length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {view.my_display_name}
        </p>
        <p className="mt-1 text-sm">Your score: {view.my_score}</p>
      </div>
    );
  }

  if (view.phase === "final") {
    return (
      <div className="min-h-screen bg-t4t-navy px-6 py-12 text-white">
        <h1 className="text-center text-3xl font-extrabold text-t4t-gold">
          Game over!
        </h1>
        <p className="mt-2 text-center">Your score: {view.my_score}</p>
        <ol className="mx-auto mt-8 max-w-sm space-y-2">
          {view.players.map((p, i) => (
            <li
              key={`${p.display_name}-${i}`}
              className="flex justify-between rounded-lg bg-white/10 px-3 py-2"
            >
              <span>
                {i + 1}. {p.display_name}
              </span>
              <span className="text-t4t-gold">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (view.active_question) {
    const q = view.active_question;
    return (
      <div className="min-h-screen bg-t4t-lightBlue px-4 py-8">
        <p className="text-center text-xs font-semibold uppercase text-t4t-navy">
          {q.category} · {q.points}
          {q.daily_double ? " · Daily Double" : ""}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-center text-xl font-bold text-t4t-navy">
          {q.question}
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          {q.choices.map((choice, i) => {
            const showCorrect =
              view.phase === "reveal" && q.correct_index === i;
            return (
              <button
                key={i}
                type="button"
                disabled={
                  submitting ||
                  view.my_answered ||
                  view.phase !== "question_open"
                }
                onClick={() => answer(i)}
                className={`rounded-xl border-2 px-4 py-4 text-left text-base font-medium ${
                  showCorrect
                    ? "border-t4t-green bg-t4t-green/15 text-t4t-navy"
                    : "border-t4t-navy/20 bg-white text-t4t-navy active:bg-t4t-navy active:text-white disabled:opacity-70"
                }`}
              >
                <span className="mr-2 font-bold text-t4t-burnt">
                  {String.fromCharCode(65 + i)}.
                </span>
                {choice}
              </button>
            );
          })}
        </div>
        {view.my_answered && view.phase === "question_open" && (
          <p className="mt-6 text-center text-sm text-t4t-navy">
            Answer locked in — wait for reveal.
          </p>
        )}
        {view.phase === "question_locked" && (
          <p className="mt-6 text-center text-sm text-t4t-navy">
            Answers locked…
          </p>
        )}
        {view.phase === "reveal" && q.answer && (
          <p className="mt-6 text-center text-sm font-semibold text-t4t-green">
            Correct: {q.answer}
            {q.teks ? ` (${q.teks})` : ""}
          </p>
        )}
        <p className="mt-8 text-center text-sm text-t4t-darkText/60">
          Score: {view.my_score}
        </p>
      </div>
    );
  }

  // Board waiting
  return (
    <div className="min-h-screen bg-t4t-lightGray px-4 py-8">
      <h1 className="text-center text-lg font-bold text-t4t-navy">{view.title}</h1>
      <p className="mt-1 text-center text-sm text-t4t-darkText/70">
        Your score: {view.my_score} · Wait for teacher to pick a question
      </p>
      <div className="mx-auto mt-8 max-w-lg opacity-80">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${view.board_grid.categories.length}, 1fr)`,
          }}
        >
          {view.board_grid.categories.map((cat) => (
            <div
              key={cat}
              className="rounded bg-t4t-navy px-0.5 py-2 text-center text-[8px] font-bold uppercase text-white"
            >
              {cat.split(" ")[0]}
            </div>
          ))}
          {[100, 200, 300, 400, 500].map((pts) =>
            view.board_grid.categories.map((cat) => {
              const cell = view.board_grid.cells.find(
                (c) => c.category === cat && c.points === pts,
              )!;
              return (
                <div
                  key={cell.id}
                  className={`rounded py-3 text-center text-sm font-bold ${
                    cell.used
                      ? "bg-t4t-navy/10 text-t4t-navy/30"
                      : cell.active
                        ? "bg-t4t-gold text-t4t-navy"
                        : "bg-t4t-burnt/80 text-white"
                  }`}
                >
                  {cell.used ? "—" : pts}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
