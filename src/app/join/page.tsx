"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PLAYER_KEY = "t4t_player";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const room = code.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${room}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(humanError(data.error));
        return;
      }
      localStorage.setItem(
        PLAYER_KEY,
        JSON.stringify({
          room_code: room,
          player_id: data.player_id,
          resume_secret: data.resume_secret,
        }),
      );
      router.push(`/play/${room}`);
    } catch {
      setError("Could not join. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm font-medium text-t4t-navy">
        ← Teach4Texas
      </Link>
      <h1 className="text-2xl font-bold text-t4t-navy">Join a game</h1>
      <p className="mt-2 text-sm text-t4t-darkText/75">
        Enter the <strong>short room code</strong> on the projector — not a TPT
        purchase code. Display name only; no account.
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-t4t-navy">
          Room code
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="ABC123"
            maxLength={8}
            className="mt-1 w-full rounded-lg border border-t4t-navy/20 bg-white px-3 py-2.5 text-center text-2xl font-bold tracking-widest uppercase"
            required
          />
        </label>
        <label className="block text-sm font-medium text-t4t-navy">
          Display name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            placeholder="Your name"
            maxLength={16}
            className="mt-1 w-full rounded-lg border border-t4t-navy/20 bg-white px-3 py-2.5 text-base"
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
          disabled={loading}
          className="w-full rounded-xl bg-t4t-green px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join"}
        </button>
      </form>
      <p className="mt-6 text-xs text-t4t-darkText/50">
        Teachers: redeem your TPT access code at{" "}
        <Link href="/redeem" className="underline">
          /redeem
        </Link>
        , then start a live session to get this room code.
      </p>
    </div>
  );
}

function humanError(code: string | undefined): string {
  switch (code) {
    case "ROOM_NOT_FOUND":
      return "No game with that code. Ask your teacher for the code on the board.";
    case "LOBBY_LOCKED":
      return "This game is not accepting new players right now.";
    case "ROOM_FULL":
      return "This room is full.";
    case "NAME_INVALID":
      return "Please enter a name (at least 2 characters).";
    case "ROOM_ENDED":
      return "This game has already ended.";
    default:
      return "Could not join.";
  }
}
