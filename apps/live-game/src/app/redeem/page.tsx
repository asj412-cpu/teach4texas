"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameShowStage } from "@/components/game-show";

type HostBoard = {
  id: string;
  title: string;
  grade: number;
  subject: string;
  categories: string[];
  cell_count: number;
  game_type?: string;
  item_count?: number;
  race_item_count?: number;
  scavenger_item_count?: number;
  sequence_item_count?: number;
  category_item_count?: number;
  odd_item_count?: number;
  dash_item_count?: number;
  vault_room_count?: number;
  supports_memory_match?: boolean;
  supports_timed_race?: boolean;
  supports_scavenger_tap?: boolean;
  supports_sequence_sort?: boolean;
  supports_category_sort?: boolean;
  supports_odd_one_out?: boolean;
  supports_true_false_dash?: boolean;
  supports_escape_vault?: boolean;
  supports_tug_of_war?: boolean;
  tow_item_count?: number;
  supports_board?: boolean;
};

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState<HostBoard | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUnlocked(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(humanError(data.error));
        return;
      }
      setUnlocked(data.board);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const modes: [boolean | undefined, string, string][] = [
    [unlocked?.supports_memory_match, "memory_match", "Memory Match"],
    [unlocked?.supports_timed_race, "timed_race", "Timed Race"],
    [unlocked?.supports_scavenger_tap, "scavenger_tap", "Scavenger Hunt"],
    [unlocked?.supports_sequence_sort, "sequence_sort", "Order the Steps"],
    [unlocked?.supports_category_sort, "category_sort", "Sort into Bins"],
    [unlocked?.supports_odd_one_out, "odd_one_out", "Find the Odd One"],
    [unlocked?.supports_true_false_dash, "true_false_dash", "True or False Dash"],
    [unlocked?.supports_escape_vault, "escape_vault", "Escape Vault"],
    [unlocked?.supports_tug_of_war, "tug_of_war", "Tug of War"],
  ];

  return (
    <GameShowStage>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="w-fit rounded-full bg-black/55 px-4 py-1 text-base font-semibold text-white hover:bg-black/70"
        >
          ← Teach4Texas
        </Link>
        <p className="mx-auto mt-8 w-fit rounded-full bg-black/55 px-4 py-1 text-base font-black uppercase tracking-widest text-amber-200">
          🎟️ Teacher entrance
        </p>
        <div className="mx-auto mt-3 w-fit max-w-full rounded-3xl bg-black/45 px-6 py-2">
        <h1 className="dd-title dd-title-shimmer text-center text-5xl font-black uppercase tracking-tight">
          Unlock your game
        </h1>
        </div>
        <p className="mt-5 rounded-2xl border border-white/25 bg-black/55 px-5 py-4 text-center text-base text-white">
          Enter the <strong className="text-amber-200">access code from your TPT download</strong>. It
          unlocks <strong className="text-amber-200">only the game you paid for</strong>. New games
          are separate TPT products.
        </p>

        {!unlocked ? (
          <form className="gs-glass gs-rise mt-6 space-y-4 rounded-3xl bg-black/45 p-6" onSubmit={onSubmit}>
            <label className="block text-base font-bold uppercase tracking-wide text-amber-200">
              Access code
              <input
                type="text"
                name="access_code"
                autoComplete="off"
                spellCheck={false}
                placeholder="T4T-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-2 w-full rounded-xl border-4 border-amber-300 bg-[#0b1a30] px-4 py-3 text-center font-mono text-xl tracking-widest text-white uppercase placeholder:text-white/70 focus:border-white focus:outline-none"
                required
              />
            </label>
            {error && (
              <p role="alert" className="rounded-xl bg-[#b91c1c] px-4 py-3 text-base font-semibold text-white">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="gs-cat w-full rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:grayscale-[60%]"
            >
              {loading ? "Checking…" : "Unlock my game ▶"}
            </button>
          </form>
        ) : (
          <div className="gs-glass gs-rise mt-6 space-y-4 rounded-3xl bg-black/50 p-6 text-white">
            <p className="w-fit rounded-full bg-[#047857] px-4 py-1 text-base font-black uppercase tracking-wide text-white">
              ✓ Unlocked — single game only
            </p>
            <h2 className="text-3xl font-black text-white">{unlocked.title}</h2>
            <p className="text-base text-white">
              Grade {unlocked.grade} · {unlocked.subject.toUpperCase()} · {summaryFor(unlocked)}
            </p>
            {modes.some(([ok, t]) => ok && t !== unlocked.game_type) && (
              <div className="flex flex-wrap gap-2">
                {modes
                  .filter(([ok, t]) => ok && t !== unlocked.game_type)
                  .map(([, t, label]) => (
                    <span key={t} className="rounded-full border border-amber-300/70 bg-black/60 px-3 py-1 text-base font-semibold text-amber-200">
                      can host as {label}
                    </span>
                  ))}
              </div>
            )}
            {unlocked.categories.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {unlocked.categories.map((c) => (
                  <li key={c} className="rounded-lg bg-white/15 px-3 py-1 text-base text-white">
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-base text-white">
              Your code does not open other Teach4Texas games. Buy each product
              separately on TPT for its own code.
            </p>
            <button
              type="button"
              onClick={() => router.push("/host")}
              className="gs-cat w-full rounded-2xl px-4 py-4 text-xl font-black uppercase tracking-wide transition hover:-translate-y-0.5"
            >
              Open host board ▶
            </button>
          </div>
        )}

        <p className="mt-6 rounded-xl bg-black/55 px-4 py-3 text-center text-base text-white">
          Students don&apos;t use this code. When you start a live game, they join
          with a short room code on their Chromebooks.
        </p>
      </div>
    </GameShowStage>
  );
}

function summaryFor(b: HostBoard): string {
  switch (b.game_type) {
    case "memory_match": return `Memory Match · ${b.item_count ?? 0} pairs`;
    case "timed_race": return `Timed Race · ${b.race_item_count ?? 0} items`;
    case "scavenger_tap": return `Scavenger Hunt · ${b.scavenger_item_count ?? 0} clues`;
    case "sequence_sort": return `Order the Steps · ${b.sequence_item_count ?? 0} prompts`;
    case "category_sort": return `Sort into Bins · ${b.category_item_count ?? 0} items`;
    case "odd_one_out": return `Find the Odd One · ${b.odd_item_count ?? 0} rounds`;
    case "true_false_dash": return `True or False Dash · ${b.dash_item_count ?? 0} claims`;
    case "escape_vault": return `Escape Vault · ${b.vault_room_count ?? 0} rooms`;
    case "tug_of_war": return `Tug of War · ${b.tow_item_count ?? 0} team questions`;
    default: return `Game show board · ${b.cell_count} questions`;
  }
}

function humanError(code: string | undefined): string {
  switch (code) {
    case "INVALID_CODE":
      return "That access code is not valid. Check the TPT download and try again.";
    case "CODE_REVOKED":
      return "This access code has been revoked. Contact support if you believe this is an error.";
    case "CODE_EXHAUSTED":
      return "This access code has no remaining host uses.";
    case "GAME_UNAVAILABLE":
      return "The game for this code is temporarily unavailable.";
    default:
      return "Could not redeem this code.";
  }
}
