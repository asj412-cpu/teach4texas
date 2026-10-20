"use client";

import { useEffect, useRef, useState } from "react";
import type { HostRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { fmtPull, type TowTeam } from "@/lib/domain/tug-of-war";
import { TeamPlate, TowArena, TowConfetti } from "@/components/tug-of-war/arena";
import { ensureTowAudio, isTowMuted, playTowSfx, setTowMuted } from "@/components/tug-of-war/audio";

const LETTERS = ["A", "B", "C", "D"];

export function TugOfWarHost({
  view,
  onAction,
}: {
  view: HostRoomView;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const tow = view.tow;
  const [showKey, setShowKey] = useState(false);
  const [muted, setMuted] = useState(isTowMuted());
  const [burstKey, setBurstKey] = useState(0);
  const prev = useRef<{ stage: string; round: number; winner: string | null } | null>(null);

  useEffect(() => {
    if (!tow) return;
    const p = prev.current;
    if (p && tow.stage === "reveal" && (p.stage !== "reveal" || p.round !== tow.round)) {
      playTowSfx("cheer");
      playTowSfx(Math.abs(tow.last?.move ?? 0) > 0 ? "creak" : "whoosh");
      setBurstKey((k) => k + 1);
    }
    if (p && tow.winner && !p.winner) setTimeout(() => playTowSfx("fanfare"), 600);
    if (p && tow.stage === "question" && p.stage !== "question") playTowSfx("whoosh");
    prev.current = { stage: tow.stage, round: tow.round, winner: tow.winner };
  }, [tow]);

  const act = (body: Record<string, unknown>) => {
    ensureTowAudio();
    onAction(body);
  };

  if (!tow) return null;
  const names = tow.team_names;
  const students = tow.teams.red.length + tow.teams.blue.length;
  const last = tow.stage === "reveal" ? tow.last : null;

  const header = (
    <header className="border-b-2 border-white/20 bg-[#0b1630]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-base font-bold uppercase tracking-wide text-yellow-200">Live host · Tug of War</p>
          <h1 className="text-2xl font-black uppercase text-white sm:text-3xl">{kidPlainText(view.board.title, 80)}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              ensureTowAudio();
              setTowMuted(!muted);
              setMuted(!muted);
            }}
            className="tw-btn rounded-xl border-2 border-white/70 bg-[#13294b] px-4 py-2 text-base font-bold text-white"
            aria-pressed={muted}
          >
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
          <div className="rounded-2xl border-2 border-white/40 bg-[#13294b] px-5 py-2 text-center text-white">
            <p className="text-base font-bold uppercase tracking-wide">Room code</p>
            <p className="font-mono text-3xl font-black tracking-widest text-yellow-200">{view.code}</p>
            <p className="text-base">{students} joined · students go to /join</p>
          </div>
        </div>
      </div>
    </header>
  );

  // ---------- Lobby ----------
  if (view.phase === "lobby") {
    return (
      <div className="tw-sky min-h-screen text-white">
        {header}
        <main className="mx-auto max-w-6xl px-4 py-5">
          <TowArena position={0} winner={null} />
          <div className="tw-panel mt-4 rounded-3xl p-4 sm:p-6">
            <h2 className="text-center text-3xl font-black uppercase text-yellow-200">Pick your teams</h2>
            <p className="mt-1 text-center text-lg">
              Students join automatically on the smaller team. Tap a name to move it before you start.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(["red", "blue"] as TowTeam[]).map((t) => (
                <section key={t} aria-label={names[t]}>
                  <TeamPlate team={t} name={names[t]} size={tow.teams[t].length} pull={null} big />
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {tow.teams[t].length === 0 && (
                      <li className="rounded-xl bg-[#13294b] px-3 py-3 text-base">Waiting for students…</li>
                    )}
                    {tow.teams[t].map((p) => (
                      <li key={p.player_id}>
                        <button
                          type="button"
                          onClick={() => act({ type: "tow_move_player", player_id: p.player_id })}
                          className="tw-btn flex w-full items-center justify-between gap-2 rounded-xl bg-[#13294b] px-3 py-3 text-left text-base font-bold text-white hover:bg-[#1c3a66]"
                          aria-label={`Move ${p.display_name} to ${t === "red" ? names.blue : names.red}`}
                        >
                          <span className="truncate">{kidPlainText(p.display_name, 16)}</span>
                          <span className="shrink-0 text-yellow-200">{t === "red" ? "Move →" : "← Move"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <span className="text-lg font-bold">Rounds:</span>
              {tow.round_choices.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => act({ type: "tow_set_rounds", rounds: n })}
                  aria-pressed={tow.rounds_total === n}
                  className={`tw-btn rounded-xl px-5 py-3 text-lg font-black ${
                    tow.rounds_total === n
                      ? "bg-yellow-300 text-[#0b1630]"
                      : "border-2 border-white/60 bg-[#13294b] text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => act({ type: "start_game" })}
                className="tw-btn rounded-2xl bg-yellow-300 px-8 py-4 text-2xl font-black uppercase text-[#0b1630] shadow-[0_6px_0_#a16207]"
              >
                Start tug of war
              </button>
              <button
                type="button"
                onClick={() => act({ type: "lock_lobby", locked: !view.lobby_locked })}
                className="tw-btn rounded-2xl border-2 border-white/60 bg-[#13294b] px-5 py-4 text-lg font-bold text-white"
              >
                {view.lobby_locked ? "Unlock lobby" : "Lock lobby"}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------- Final ----------
  if (view.phase === "final") {
    const w = tow.winner ?? "tie";
    return (
      <div className="tw-sky relative min-h-screen overflow-hidden text-white">
        <TowConfetti team={w} />
        {header}
        <main className="relative mx-auto max-w-6xl px-4 py-5">
          <div
            className={`gs-rise mx-auto w-fit rounded-3xl border-4 border-white px-8 py-4 text-center shadow-2xl ${
              w === "red" ? "bg-[#b91c1c]" : w === "blue" ? "bg-[#1d4ed8]" : "bg-[#0b1630]"
            }`}
          >
            <p className="text-lg font-bold uppercase tracking-widest">
              {tow.win_kind === "line" ? "Pulled across the line!" : tow.win_kind === "rounds" ? "Most ground after the last round" : "Final pull"}
            </p>
            <p className="text-4xl font-black uppercase sm:text-6xl">
              {w === "tie" ? "It's a tie!" : `${names[w]} win!`}
            </p>
          </div>
          <div className="mt-4">
            <TowArena position={tow.position} winner={w} />
          </div>
          <Recap tow={tow} />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => act({ type: "play_again" })}
              className="tw-btn rounded-2xl bg-yellow-300 px-8 py-4 text-2xl font-black uppercase text-[#0b1630] shadow-[0_6px_0_#a16207]"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={() => act({ type: "return_to_game" })}
              className="tw-btn rounded-2xl border-2 border-white/70 bg-[#13294b] px-8 py-4 text-2xl font-black uppercase text-white"
            >
              Return to game
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- Live rounds ----------
  const q = tow.question;
  const redPull = last ? fmtPull(last.red_pull) : null;
  const bluePull = last ? fmtPull(last.blue_pull) : null;
  const redAns = tow.teams.red.filter((p) => p.answered).length;
  const blueAns = tow.teams.blue.filter((p) => p.answered).length;

  return (
    <div className="tw-sky relative min-h-screen overflow-hidden text-white">
      {tow.winner && <TowConfetti team={tow.winner} />}
      {header}
      <main className="relative mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-wrap items-stretch justify-between gap-3">
          <TeamPlate team="red" name={names.red} size={tow.team_sizes.red} pull={redPull} />
          <div className="flex items-center rounded-2xl bg-[#0b1630] px-5 py-2 text-center">
            <p className="text-2xl font-black uppercase text-yellow-200">
              Round {Math.max(tow.round, 1)} / {tow.rounds_total}
            </p>
          </div>
          <TeamPlate team="blue" name={names.blue} size={tow.team_sizes.blue} pull={bluePull} />
        </div>
        <div className="relative mt-3 overflow-hidden rounded-3xl border-2 border-white/30">
          <TowArena position={tow.position} winner={tow.winner} />
          {last && (
            <div key={burstKey} className="tw-burst">
              <p
                className={`whitespace-nowrap rounded-2xl border-4 border-white px-5 py-2 text-3xl font-black uppercase shadow-2xl sm:text-5xl ${
                  last.move > 0 ? "bg-[#1d4ed8]" : last.move < 0 ? "bg-[#b91c1c]" : "bg-[#0b1630]"
                }`}
              >
                {last.move === 0
                  ? "Even pull!"
                  : `+${fmtPull(Math.max(last.red_pull, last.blue_pull))} pull!`}
              </p>
            </div>
          )}
          {tow.paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="rounded-3xl bg-[#0b1630] px-8 py-4 text-4xl font-black uppercase text-yellow-200">⏸ Paused</p>
            </div>
          )}
        </div>

        <section className="tw-panel mt-4 rounded-3xl p-4 sm:p-6" aria-live="polite">
          {tow.winner ? (
            <p className="text-center text-4xl font-black uppercase sm:text-5xl">
              {tow.winner === "tie" ? "It's a tie!" : `${names[tow.winner]} win!`}
            </p>
          ) : !q ? (
            <div className="text-center">
              <p className="text-3xl font-black uppercase text-yellow-200 sm:text-4xl">Grab the rope!</p>
              <p className="mt-2 text-lg">
                Every right answer pulls for your team. Pull = right answers ÷ team size, so every team is scored fairly.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-base font-bold uppercase tracking-wide text-yellow-200">
                Round {tow.round} of {tow.rounds_total}
                {q.teks ? ` · TEKS ${q.teks}` : ""}
              </p>
              <p className="mx-auto mt-2 max-w-4xl text-center text-3xl font-extrabold leading-tight sm:text-5xl">{q.prompt}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {q.choices.map((c, i) => {
                  const correct = q.correct_index === i;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-2xl font-bold ${
                        correct ? "border-white bg-[#047857]" : "border-white/30 bg-[#13294b]"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-xl font-black text-[#0b1630]">
                        {LETTERS[i]}
                      </span>
                      <span>{c}</span>
                      {correct && <span className="ml-auto text-xl font-black">✓</span>}
                    </div>
                  );
                })}
              </div>
              {last ? (
                <p className="mt-4 rounded-2xl bg-[#13294b] px-4 py-3 text-center text-xl font-bold">
                  Red {last.red_correct}/{last.red_size} = {fmtPull(last.red_pull)} · Blue {last.blue_correct}/{last.blue_size} ={" "}
                  {fmtPull(last.blue_pull)} →{" "}
                  {last.move === 0
                    ? "the rope holds still"
                    : `rope moves toward ${last.move > 0 ? names.blue : names.red}`}
                </p>
              ) : (
                <p className="mt-4 text-center text-xl font-bold">
                  Answers in: {tow.answer_count} / {tow.student_count} · {names.red} {redAns}/{tow.teams.red.length} ·{" "}
                  {names.blue} {blueAns}/{tow.teams.blue.length}
                </p>
              )}
            </>
          )}
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {tow.winner ? (
            <button
              type="button"
              onClick={() => act({ type: "end_game" })}
              className="tw-btn rounded-2xl bg-yellow-300 px-8 py-4 text-2xl font-black uppercase text-[#0b1630] shadow-[0_6px_0_#a16207]"
            >
              Show the winners
            </button>
          ) : tow.stage === "question" ? (
            <button
              type="button"
              disabled={tow.paused}
              onClick={() => act({ type: "tow_reveal" })}
              className="tw-btn rounded-2xl bg-yellow-300 px-8 py-4 text-2xl font-black uppercase text-[#0b1630] shadow-[0_6px_0_#a16207] disabled:opacity-70"
            >
              Reveal &amp; pull!
            </button>
          ) : (
            <button
              type="button"
              disabled={tow.paused}
              onClick={() => act({ type: "tow_next" })}
              className="tw-btn rounded-2xl bg-yellow-300 px-8 py-4 text-2xl font-black uppercase text-[#0b1630] shadow-[0_6px_0_#a16207] disabled:opacity-70"
            >
              {tow.round === 0 ? "Start round 1" : "Next question"}
            </button>
          )}
          {!tow.winner && (
            <button
              type="button"
              onClick={() => act({ type: "tow_pause" })}
              className="tw-btn rounded-2xl border-2 border-white/70 bg-[#13294b] px-5 py-4 text-lg font-bold text-white"
            >
              {tow.paused ? "▶ Resume" : "⏸ Pause"}
            </button>
          )}
          <button
            type="button"
            onClick={() => act({ type: "end_game" })}
            className="tw-btn rounded-2xl border-2 border-red-300 bg-[#0b1630] px-5 py-4 text-lg font-bold text-red-100"
          >
            End game
          </button>
        </div>

        <div className="mt-4 text-center">
          <button type="button" onClick={() => setShowKey((v) => !v)} className="rounded-lg bg-[#0b1630] px-3 py-2 text-base text-white underline">
            {showKey ? "Hide answer key" : "Show answer key (teacher only)"}
          </button>
          {showKey && (
            <ul className="tw-panel mx-auto mt-2 max-h-48 max-w-3xl overflow-y-auto rounded-2xl p-3 text-left text-base">
              {view.tow?.item_key.slice(0, tow.rounds_total).map((it, i) => (
                <li key={i}>
                  {i + 1}. {it.prompt} → <b>{it.answer}</b> ({it.teks})
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Recap({ tow }: { tow: NonNullable<HostRoomView["tow"]> }) {
  if (!tow.history.length) return null;
  return (
    <div className="tw-panel mt-4 overflow-x-auto rounded-3xl p-4">
      <h2 className="text-center text-2xl font-black uppercase text-yellow-200">Round by round</h2>
      <table className="mx-auto mt-2 w-full max-w-3xl text-left text-base">
        <thead>
          <tr className="border-b border-white/30">
            <th className="px-2 py-1">Round</th>
            <th className="px-2 py-1">Red pull</th>
            <th className="px-2 py-1">Blue pull</th>
            <th className="px-2 py-1">Rope</th>
          </tr>
        </thead>
        <tbody>
          {tow.history.map((h) => (
            <tr key={h.round} className="border-b border-white/10">
              <td className="px-2 py-1 font-bold">{h.round}</td>
              <td className="px-2 py-1">
                {h.red_correct}/{h.red_size} = {fmtPull(h.red_pull)}
              </td>
              <td className="px-2 py-1">
                {h.blue_correct}/{h.blue_size} = {fmtPull(h.blue_pull)}
              </td>
              <td className="px-2 py-1">
                {h.position_after === 0 ? "center" : h.position_after > 0 ? `Blue +${fmtPull(h.position_after)}` : `Red +${fmtPull(-h.position_after)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
