"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type HostBoard = {
  id: string;
  title: string;
  grade: number;
  subject: string;
  categories: string[];
  cell_count: number;
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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm font-medium text-t4t-navy">
        ← Teach4Texas
      </Link>
      <h1 className="text-2xl font-bold text-t4t-navy">Redeem your purchase</h1>
      <p className="mt-2 text-sm text-t4t-darkText/75">
        Enter the <strong>access code from your TPT download</strong>. That code
        unlocks <strong>only the game you paid for</strong>. There is no free
        game generator — new games are separate TPT products.
      </p>

      {!unlocked ? (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-t4t-navy">
            Access code
            <input
              type="text"
              name="access_code"
              autoComplete="off"
              spellCheck={false}
              placeholder="T4T-XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-t4t-navy/20 bg-white px-3 py-2.5 font-mono text-base tracking-wide uppercase"
              required
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-xl bg-t4t-burnt px-4 py-3 text-sm font-semibold text-white hover:bg-t4t-burnt/90 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock purchased game"}
          </button>
        </form>
      ) : (
        <div className="mt-8 space-y-4 rounded-2xl border border-t4t-green/30 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-t4t-green">
            Unlocked — single game only
          </p>
          <h2 className="text-xl font-bold text-t4t-navy">{unlocked.title}</h2>
          <p className="text-sm text-t4t-darkText/75">
            Grade {unlocked.grade} · {unlocked.subject.toUpperCase()} ·{" "}
            {unlocked.cell_count} questions
          </p>
          <ul className="list-inside list-disc text-sm text-t4t-darkText/70">
            {unlocked.categories.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="text-xs text-t4t-darkText/50">
            Your code does not open other Teach4Texas games. Buy each product
            separately on TPT for its own code.
          </p>
          <button
            type="button"
            onClick={() => router.push("/host")}
            className="w-full rounded-xl bg-t4t-navy px-4 py-3 text-sm font-semibold text-white hover:bg-t4t-navy/90"
          >
            Open host board
          </button>
        </div>
      )}

      <p className="mt-8 text-xs text-t4t-darkText/50">
        Students do not use this code. When you start a live session, they get a
        short room code for their Chromebooks.
      </p>
    </div>
  );
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
