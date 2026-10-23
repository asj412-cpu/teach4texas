import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { LiveRoom } from "@/lib/domain/live-room";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase-admin";

/**
 * Privacy-safe usage tracking. Server-only. Every write is best-effort:
 * try/catch, log `usage.<fn>:`, never throw to the caller (UT-11).
 */

export type GameSessionRow = {
  id: string;
  redemption_event_id: string | null;
  product_code_id: string | null;
  is_demo: boolean;
  is_test: boolean;
  board_id: string;
  game_type: string;
  player_count: number;
  questions_answered: number;
  minutes: number;
  outcome: "finished" | "abandoned";
  action_errors: number;
  host_rating: 1 | -1 | null;
  host_note: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

const DATA_DIR = path.join(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? "/tmp/live-game-data"
    : path.join(process.cwd(), "data"),
);
const SESSIONS_PATH = path.join(DATA_DIR, "game_sessions.json");

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function faultInject(): void {
  if (process.env.UT_FAULT_INJECT === "1") {
    throw new Error("UT_FAULT_INJECT");
  }
}

function minutesBetween(startedAt: string | undefined, endedAt: string | undefined): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Number(((end - start) / 60000).toFixed(1)));
}

function sessionFromRoom(
  room: LiveRoom,
  outcome: "finished" | "abandoned",
): GameSessionRow | null {
  const u = room.usage;
  const id = u?.game_id;
  if (!id) return null;
  const now = new Date().toISOString();
  const startedAt = u.game_started_at ?? room.created_at ?? now;
  const endedAt = room.ended_at ?? now;
  return {
    id,
    redemption_event_id: u.redemption_event_id ?? null,
    product_code_id: u.product_code_id ?? null,
    is_demo: Boolean(u.is_demo),
    is_test: false,
    board_id: u.board_id || room.board_id,
    game_type: room.game_type,
    player_count: Math.max(0, u.max_players ?? 0),
    questions_answered: Math.max(0, u.questions_answered ?? 0),
    minutes: minutesBetween(startedAt, endedAt),
    outcome,
    action_errors: Math.max(0, u.action_errors ?? 0),
    host_rating: null,
    host_note: null,
    started_at: startedAt,
    ended_at: endedAt,
    created_at: now,
    updated_at: now,
  };
}

async function readFileSessions(): Promise<GameSessionRow[]> {
  try {
    const raw = await fs.readFile(SESSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GameSessionRow[]) : [];
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "ENOENT") return [];
    throw err;
  }
}

async function writeFileSessions(rows: GameSessionRow[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SESSIONS_PATH, JSON.stringify(rows, null, 2), "utf8");
}

async function insertSessionIgnoreDup(row: GameSessionRow): Promise<void> {
  if (isSupabaseConfigured()) {
    const res = await getServiceSupabase()
      .from("game_sessions")
      .upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (res.error) throw new Error(res.error.message);
    return;
  }
  const rows = await readFileSessions();
  if (rows.some((r) => r.id === row.id)) return;
  rows.push(row);
  await writeFileSessions(rows);
}

/** Increment sessions_started once per room (first start_game out of lobby). */
export async function recordRoomStart(room: LiveRoom): Promise<void> {
  try {
    faultInject();
    const pcId = room.usage?.product_code_id ?? null;
    const rdeId = room.usage?.redemption_event_id ?? null;
    if (isSupabaseConfigured()) {
      const res = await getServiceSupabase().rpc("ut_record_room_start", {
        p_product_code_id: pcId,
        p_redemption_event_id: rdeId,
      });
      if (res.error) throw new Error(res.error.message);
      return;
    }
    const { recordRoomStartCounters } = await import("@/lib/store-file");
    await recordRoomStartCounters(pcId, rdeId);
  } catch (err) {
    console.error("usage.recordRoomStart:", errMsg(err));
  }
}

export async function writeFinished(room: LiveRoom): Promise<void> {
  try {
    faultInject();
    const row = sessionFromRoom(room, "finished");
    if (!row) return;
    await insertSessionIgnoreDup(row);
  } catch (err) {
    console.error("usage.writeFinished:", errMsg(err));
  }
}

export async function writeAbandoned(room: LiveRoom): Promise<void> {
  try {
    faultInject();
    const u = room.usage;
    if (!u?.game_id) return;
    if (room.phase === "final") return;
    if (u.written_final) return;
    const row = sessionFromRoom(room, "abandoned");
    if (!row) return;
    await insertSessionIgnoreDup(row);
  } catch (err) {
    console.error("usage.writeAbandoned:", errMsg(err));
  }
}

export async function applyFeedback(
  gameId: string,
  rating: 1 | -1 | null,
  note?: string | null,
): Promise<void> {
  try {
    faultInject();
    const host_note =
      typeof note === "string" && note.trim().length > 0 ? note.trim().slice(0, 500) : null;
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const res = await getServiceSupabase()
        .from("game_sessions")
        .update({
          host_rating: rating,
          host_note,
          updated_at: now,
        })
        .eq("id", gameId);
      if (res.error) throw new Error(res.error.message);
      return;
    }
    const rows = await readFileSessions();
    const idx = rows.findIndex((r) => r.id === gameId);
    if (idx < 0) return;
    rows[idx] = { ...rows[idx]!, host_rating: rating, host_note, updated_at: now };
    await writeFileSessions(rows);
  } catch (err) {
    console.error("usage.applyFeedback:", errMsg(err));
  }
}
