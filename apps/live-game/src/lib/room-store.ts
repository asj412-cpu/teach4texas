import type { LiveRoom } from "@/lib/domain/live-room";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase-admin";

/**
 * Shared live-room persistence (LG-ROOM-STORE).
 * Production/preview: one row per room in public.live_rooms on the existing
 * Supabase project, so every serverless instance sees the same room.
 * Writes use an optimistic version check. Server-only (service role).
 * Local dev without Supabase env: in-process map (single instance only).
 */

/** Rooms untouched for this long are treated as ended and purged. */
export const ROOM_IDLE_TTL_MS = 6 * 60 * 60 * 1000;

export type RoomRecord = { room: LiveRoom; version: number; updatedAtMs: number };

type MemRow = { state: string; version: number; updatedAtMs: number };

function mem(): Map<string, MemRow> {
  const key = "__t4t_live_rooms_dev__";
  const root = globalThis as unknown as Record<string, Map<string, MemRow>>;
  if (!root[key]) root[key] = new Map();
  return root[key];
}

export async function loadRoomRecord(code: string): Promise<RoomRecord | null> {
  if (!isSupabaseConfigured()) {
    const row = mem().get(code);
    if (!row) return null;
    return {
      room: JSON.parse(row.state) as LiveRoom,
      version: row.version,
      updatedAtMs: row.updatedAtMs,
    };
  }
  const res = await getServiceSupabase()
    .from("live_rooms")
    .select("state,version,updated_at")
    .eq("code", code)
    .maybeSingle();
  if (res.error) throw new Error(`loadRoomRecord: ${res.error.message}`);
  if (!res.data) return null;
  return {
    room: res.data.state as LiveRoom,
    version: res.data.version as number,
    updatedAtMs: new Date(res.data.updated_at as string).getTime(),
  };
}

/** Returns false when the code is already taken. */
export async function insertRoomRecord(room: LiveRoom): Promise<boolean> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    if (mem().has(room.code)) return false;
    mem().set(room.code, { state: JSON.stringify(room), version: 1, updatedAtMs: now });
    return true;
  }
  const iso = new Date(now).toISOString();
  const res = await getServiceSupabase().from("live_rooms").insert({
    code: room.code,
    state: room,
    version: 1,
    created_at: iso,
    updated_at: iso,
  });
  if (res.error) {
    if (res.error.code === "23505") return false;
    throw new Error(`insertRoomRecord: ${res.error.message}`);
  }
  return true;
}

/** Optimistic write. Returns false if another request saved first. */
export async function saveRoomRecord(
  room: LiveRoom,
  expectedVersion: number,
): Promise<boolean> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    const row = mem().get(room.code);
    if (!row || row.version !== expectedVersion) return false;
    mem().set(room.code, {
      state: JSON.stringify(room),
      version: expectedVersion + 1,
      updatedAtMs: now,
    });
    return true;
  }
  const res = await getServiceSupabase()
    .from("live_rooms")
    .update({
      state: room,
      version: expectedVersion + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("code", room.code)
    .eq("version", expectedVersion)
    .select("version");
  if (res.error) throw new Error(`saveRoomRecord: ${res.error.message}`);
  return (res.data?.length ?? 0) === 1;
}

/** Best-effort cleanup of idle rooms. Never throws. */
export async function purgeIdleRooms(): Promise<void> {
  const cutoff = Date.now() - ROOM_IDLE_TTL_MS;
  try {
    if (!isSupabaseConfigured()) {
      for (const [code, row] of mem()) {
        if (row.updatedAtMs < cutoff) mem().delete(code);
      }
      return;
    }
    const res = await getServiceSupabase()
      .from("live_rooms")
      .delete()
      .lt("updated_at", new Date(cutoff).toISOString());
    if (res.error) console.error("purgeIdleRooms:", res.error.message);
  } catch (err) {
    console.error("purgeIdleRooms:", err);
  }
}
