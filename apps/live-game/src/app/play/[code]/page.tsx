"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { CategorySortPlay } from "@/components/category-sort-play";
import { MemoryMatchPlay } from "@/components/memory-match-play";
import { OddOneOutPlay } from "@/components/odd-one-out-play";
import { TrueFalseDashPlay } from "@/components/true-false-dash-play";
import { EscapeVaultFinal, EscapeVaultPlay } from "@/components/escape-vault-play";
import { ScavengerTapPlay } from "@/components/scavenger-tap-play";
import { SequenceSortPlay } from "@/components/sequence-sort-play";
import { TimedRacePlay } from "@/components/timed-race-play";
import { kidPlainText } from "@/lib/plain-text";
import { ConnectionBanner, type ConnState } from "@/components/connection-banner";
import { postAction, type TapStatus } from "@/lib/action-post";
import { outcomeForStatus, startResilientPoll, type PollOutcome } from "@/lib/poll-backoff";
import { DailyDoublePlayer } from "@/components/daily-double";
import { CueOn, Finale, GameShowStage, playCue } from "@/components/game-show";

const PLAYER_KEY = "t4t_player";

type StoredPlayer = {
  room_code: string;
  player_id: string;
  resume_secret: string;
};

export default function PlayPage() {
  const [conn, setConn] = useState<ConnState>("ok");
  const [tap, setTap] = useState<TapStatus>("idle");
  useEffect(() => {
    if (tap !== "failed" && tap !== "rejected") return;
    const t = setTimeout(() => setTap("idle"), 4000);
    return () => clearTimeout(t);
  }, [tap]);
  return (
    <>
      <PlayPageBody onConnection={setConn} onTap={setTap} />
      {tap === "retrying" || tap === "failed" || tap === "rejected" ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3"
        >
          <p className="max-w-[90vw] rounded-full bg-t4t-burnt px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {tap === "retrying"
              ? "Sending…"
              : tap === "rejected"
                ? "That didn’t count right now."
                : "Didn’t send. Tap again."}
          </p>
        </div>
      ) : null}
      <ConnectionBanner state={conn === "ended" ? "ok" : conn} />
    </>
  );
}

function PlayPageBody({
  onConnection,
  onTap,
}: {
  onConnection: (s: ConnState) => void;
  onTap: (s: TapStatus) => void;
}) {
  const params = useParams();
  const code = String(params.code ?? "").toUpperCase();
  const [view, setView] = useState<PlayerRoomView | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A single 404/5xx/network error is never fatal: see lib/poll-backoff.ts.
  const poll = useCallback(async (): Promise<PollOutcome> => {
    if (!playerId) return "ok";
    const res = await fetch(
      `/api/rooms/${code}?player_id=${encodeURIComponent(playerId)}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => null);
    const outcome = outcomeForStatus(res.status, res.ok && Boolean(data?.ok));
    if (outcome === "ok" && res.ok && data?.ok) setView(data.view);
    return outcome;
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
    const stop = startResilientPoll({
      poll,
      onEnded: () => {
        onConnection("ended");
        setError("Room ended or not found.");
      },
      onReconnecting: (r) => onConnection(r ? "reconnecting" : "ok"),
    });
    return () => {
      stop();
      onConnection("ok");
    };
  }, [playerId, poll, onConnection]);

  async function flip(card_index: number) {
    if (!playerId || !view || view.game_type !== "memory_match") return;
    if (view.phase !== "matching" || !view.match?.can_flip) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/flip`, { player_id: playerId, card_index }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function sequenceSubmit(order: string[]) {
    if (!playerId || !view || view.game_type !== "sequence_sort") return;
    if (view.phase !== "sorting" || !view.sequence?.can_submit) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/sort`, { player_id: playerId, order }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function categoryTap(category_id: string) {
    if (!playerId || !view || view.game_type !== "category_sort") return;
    if (view.phase !== "binning" || !view.category?.can_tap) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/bin`, { player_id: playerId, category_id }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function oddTap(option_id: string) {
    if (!playerId || !view || view.game_type !== "odd_one_out") return;
    if (view.phase !== "odding" || !view.odd?.can_tap) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/odd`, { player_id: playerId, option_id }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function dashTap(answer: boolean) {
    if (!playerId || !view || view.game_type !== "true_false_dash") return;
    if (view.phase !== "dashing" || !view.dash?.can_tap) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/dash`, { player_id: playerId, answer }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function vaultAnswer(payload: { choice_id?: string; numeric?: string }) {
    if (!playerId || !view || view.game_type !== "escape_vault") return;
    if (view.phase !== "escaping" || !view.vault?.can_answer) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/vault`, { player_id: playerId, ...payload }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function scavengerTap(target_id: string) {
    if (!playerId || !view || view.game_type !== "scavenger_tap") return;
    if (view.phase !== "scavenging" || !view.scavenger?.can_tap) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/scavenge`, { player_id: playerId, target_id }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function raceAnswer(choice_index: number) {
    if (!playerId || !view || view.game_type !== "timed_race") return;
    if (view.phase !== "racing" || !view.race?.can_answer) return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/race`, { player_id: playerId, choice_index }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function answer(choice_index: number) {
    if (!playerId || !view || view.my_answered || view.phase !== "question_open")
      return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/answer`, { player_id: playerId, choice_index }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
    } finally {
      setSubmitting(false);
    }
  }

  async function wager(amount: number) {
    if (!playerId || !view || view.phase !== "dd_wager") return;
    setSubmitting(true);
    try {
      const r = await postAction(`/api/rooms/${code}/wager`, { player_id: playerId, amount }, onTap);
      if (r?.data?.ok && r.data.view) setView(r.data.view as PlayerRoomView);
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
        <h1 className="mt-2 text-2xl font-bold text-t4t-navy">
          {kidPlainText(view.title, 80)}
        </h1>
        <p className="mt-2 text-t4t-darkText/70">
          {view.game_type === "memory_match"
            ? "Memory Match — waiting for your teacher to start"
            : view.game_type === "timed_race"
              ? "Timed Race — waiting for your teacher to start"
              : view.game_type === "scavenger_tap"
                ? "Scavenger Hunt — waiting for your teacher to start"
                : view.game_type === "sequence_sort"
                  ? "Order the Steps — waiting for your teacher to start"
                  : view.game_type === "category_sort"
                    ? "Sort into Bins — waiting for your teacher to start"
                    : view.game_type === "odd_one_out"
                      ? "Find the Odd One — waiting for your teacher to start"
                      : view.game_type === "true_false_dash"
                        ? "True or False Dash — waiting for your teacher to start"
                        : view.game_type === "escape_vault"
                          ? "Escape Vault — waiting for your teacher to start"
                          : "Waiting for your teacher to start"}{" "}
          ({view.players.length} players)
        </p>
        <p className="mt-6 text-lg font-semibold text-t4t-navy">
          You: {view.my_display_name}
        </p>
        <p className="mt-1 text-sm">Your score: {view.my_score}</p>
      </div>
    );
  }

  if (view.game_type === "memory_match" && view.phase !== "final") {
    return (
      <MemoryMatchPlay view={view} submitting={submitting} onFlip={flip} />
    );
  }

  if (view.game_type === "timed_race" && view.phase !== "final") {
    return (
      <TimedRacePlay
        view={view}
        submitting={submitting}
        onAnswer={raceAnswer}
      />
    );
  }

  if (view.game_type === "scavenger_tap" && view.phase !== "final") {
    return (
      <ScavengerTapPlay
        view={view}
        submitting={submitting}
        onTap={scavengerTap}
      />
    );
  }

  if (view.game_type === "sequence_sort" && view.phase !== "final") {
    return (
      <SequenceSortPlay
        view={view}
        submitting={submitting}
        onSubmit={sequenceSubmit}
      />
    );
  }

  if (view.game_type === "category_sort" && view.phase !== "final") {
    return (
      <CategorySortPlay
        view={view}
        submitting={submitting}
        onTap={categoryTap}
      />
    );
  }

  if (view.game_type === "odd_one_out" && view.phase !== "final") {
    return (
      <OddOneOutPlay view={view} submitting={submitting} onTap={oddTap} />
    );
  }

  if (view.game_type === "true_false_dash" && view.phase !== "final") {
    return (
      <TrueFalseDashPlay view={view} submitting={submitting} onTap={dashTap} />
    );
  }

  if (view.game_type === "escape_vault" && view.phase !== "final") {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-amber-50 px-4 py-6">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
          {kidPlainText(view.title, 60)} · {view.my_display_name} · {view.my_score} pts
        </p>
        <EscapeVaultPlay view={view} onAnswer={vaultAnswer} />
      </div>
    );
  }

  if (view.phase === "final" && view.game_type === "escape_vault") {
    return <EscapeVaultFinal view={view} />;
  }

  if (view.phase === "final") {
    return (
      <Finale
        players={view.players.map((p, i) => ({ player_id: `${i}-${p.display_name}`, display_name: p.display_name, score: p.score }))}
        footer={
          <>
            <p className="gs-glass mx-auto mt-8 max-w-xs rounded-2xl px-4 py-3 text-center text-lg font-black">
              Your score: <span className="text-t4t-gold">{view.my_score}</span>
            </p>
            <p className="mt-6 text-center text-sm text-white/70">Waiting for host to play again…</p>
          </>
        }
      />
    );
  }

  if (view.phase === "dd_wager" && view.active_question) {
    return (
      <DailyDoublePlayer
        category={view.active_question.category}
        points={view.active_question.points}
        score={view.my_score}
        maxWager={view.max_wager}
        myWager={view.my_wager}
        submitting={submitting}
        onWager={wager}
      />
    );
  }

  if (view.active_question) {
    const q = view.active_question;
    const reveal = view.phase === "reveal";
    const mine = view.my_choice;
    const gotIt = reveal && mine != null && mine === q.correct_index;
    return (
      <GameShowStage className="px-4 py-8">
        <CueOn
          k={`${q.category}-${q.points}-${view.phase}`}
          kind={reveal ? (mine == null ? "reveal" : gotIt ? "correct" : "wrong") : "open"}
        />
        <div key={`${q.category}-${q.points}`} className="gs-glass gs-rise mx-auto max-w-lg rounded-3xl p-5">
          <p className="text-center text-xs font-black uppercase tracking-wider text-t4t-gold">
            {q.category} · {q.points}
            {q.daily_double ? " · Daily Double" : ""}
          </p>
          <p className="mt-3 text-center text-2xl font-black leading-snug drop-shadow">
            {kidPlainText(q.question, 240)}
          </p>
        </div>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
          {q.choices.map((choice, i) => {
            const showCorrect = reveal && q.correct_index === i;
            const showWrong = reveal && mine === i && q.correct_index !== i;
            const picked = mine === i;
            return (
              <button
                key={i}
                type="button"
                disabled={submitting || view.my_answered || view.phase !== "question_open"}
                onClick={() => {
                  playCue("tap");
                  void answer(i);
                }}
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                className={`gs-choice gs-glass gs-rise rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold ${
                  showCorrect
                    ? "gs-correct"
                    : showWrong
                      ? "gs-wrong"
                      : picked
                        ? "border-t4t-gold ring-2 ring-t4t-gold"
                        : "border-white/25 disabled:opacity-70"
                }`}
              >
                <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-t4t-gold font-black text-t4t-navy">
                  {String.fromCharCode(65 + i)}
                </span>
                {kidPlainText(choice, 120)}
              </button>
            );
          })}
        </div>
        {view.my_answered && view.phase === "question_open" && (
          <p className="mt-6 text-center text-base font-bold text-t4t-gold">Locked in! Wait for the reveal…</p>
        )}
        {view.phase === "question_locked" && (
          <p className="mt-6 text-center text-base font-bold text-t4t-gold">Answers locked…</p>
        )}
        {reveal && mine != null && (
          <p className={`dd-pop mt-6 text-center text-4xl font-black ${gotIt ? "text-green-300" : "text-red-300"}`}>
            {gotIt ? "Correct!" : "Not this time"}
          </p>
        )}
        {reveal && view.my_points_delta !== null && view.my_points_delta !== 0 && (
          <p
            className={`dd-pop mt-2 text-center text-3xl font-black ${
              view.my_points_delta >= 0 ? "text-green-300" : "text-red-300"
            }`}
          >
            {view.my_points_delta >= 0 ? "+" : ""}
            {view.my_points_delta}
          </p>
        )}
        {reveal && q.answer && (
          <p className="gs-glass mx-auto mt-6 max-w-md rounded-xl px-3 py-2 text-center text-sm font-semibold">
            Correct: {kidPlainText(q.answer, 120)}
            {q.teks ? ` (${q.teks})` : ""}
          </p>
        )}
        <p className="mt-8 text-center text-lg font-black">
          Score: <span className="text-t4t-gold">{view.my_score}</span>
        </p>
      </GameShowStage>
    );
  }

  // Board waiting
  return (
    <GameShowStage sparks={false} className="px-4 py-8">
      <h1 className="dd-title text-center text-2xl font-black uppercase">
        {kidPlainText(view.title, 80)}
      </h1>
      <p className="mt-2 text-center text-sm font-semibold text-white/80">
        Score <span className="font-black text-t4t-gold">{view.my_score}</span> · Watch the board!
      </p>
      <div className="mx-auto mt-8 max-w-lg">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${view.board_grid.categories.length}, 1fr)`,
          }}
        >
          {view.board_grid.categories.map((cat) => (
            <div
              key={cat}
              className="gs-cat rounded px-0.5 py-2 text-center text-[8px] font-black uppercase"
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
                  className={`gs-tile rounded-lg py-3 text-center text-base font-black ${
                    cell.used ? "gs-tile-used" : cell.active ? "gs-tile-active" : ""
                  }`}
                >
                  {cell.used ? "—" : pts}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </GameShowStage>
  );
}
