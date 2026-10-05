"use client";

import { useState } from "react";
import type { PlayerRoomView } from "@/lib/domain/live-room";
import { kidPlainText } from "@/lib/plain-text";
import { VaultLock } from "@/components/escape-vault/vault-lock";
import { TurkeyMascot } from "@/components/escape-vault/turkey-mascot";
import { ensureVaultAudio, playVaultSfx } from "@/components/escape-vault/audio";

export function EscapeVaultPlay({
  view,
  onAnswer,
}: {
  view: PlayerRoomView;
  onAnswer: (payload: { choice_id?: string; numeric?: string }) => void;
}) {
  const vault = view.vault;
  const [busy, setBusy] = useState(false);

  if (!vault) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-t4t-navy shadow">
        Waiting for host to start the escape…
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-t4t-burnt">
            {vault.room_name ?? "Escape"} · Room {vault.room_index + 1}/
            {vault.room_total}
            {vault.room_chip ? ` · ${vault.room_chip}` : ""}
          </p>
          <p className="mt-1 text-lg font-bold text-t4t-navy">
            {vault.prompt ?? "Get ready…"}
          </p>
        </div>
        <VaultLock state={vault.lock_state} />
      </div>

      {vault.kind === "mc" && vault.choices && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {vault.choices.map((c) => {
            const picked = vault.picked === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!vault.can_answer || busy}
                onClick={() => submit({ choice_id: c.id })}
                className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                  picked
                    ? vault.last_correct
                      ? "border-t4t-green bg-emerald-50 text-t4t-navy"
                      : "border-red-400 bg-red-50 text-t4t-navy"
                    : "border-t4t-navy/20 bg-white text-t4t-navy hover:border-t4t-gold"
                } disabled:opacity-60`}
              >
                <span className="mr-2 font-mono text-t4t-burnt">{c.id}.</span>
                {kidPlainText(c.label, 80)}
              </button>
            );
          })}
        </div>
      )}

      {vault.answered && (
        <p
          className={`text-center text-sm font-bold ${
            vault.last_correct ? "text-t4t-green" : "text-red-600"
          }`}
        >
          {vault.last_correct ? "Correct!" : "Miss"}
          {vault.hint && !vault.last_correct ? ` — ${vault.hint}` : ""}
        </p>
      )}

      <div className="flex items-end justify-between">
        <TurkeyMascot
          mood={
            !vault.answered
              ? "idle"
              : vault.last_correct
                ? "cheer"
                : vault.hint
                  ? "hint"
                  : "oops"
          }
          line={
            !vault.answered
              ? "Pick an answer, Cadet!"
              : vault.last_correct
                ? "Nice! Wait for the lock…"
                : vault.hint ?? "Protocol miss — host may reveal."
          }
        />
        <p className="font-mono text-sm font-bold tracking-widest text-t4t-green">
          {vault.chips.join(" ") || "····"}
        </p>
      </div>
    </div>
  );
}
