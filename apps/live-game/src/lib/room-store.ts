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

export type PendingAction = { id: number; action: unknown };

export type RoomRecord = {
  room: LiveRoom;
  version: number;
  updatedAtMs: number;
  /** Queued actions not yet folded into state, oldest first. */
  pending: PendingAction[];
};

type MemRow = {
  state: string;
  version: number;
  updatedAtMs: number;
  pending: PendingAction[];
};

let memSeq = 0;

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
      pending: row.pending.map((p) => ({ id: p.id, action: JSON.parse(JSON.stringify(p.action)) })),
    };
  }
  const res = await getServiceSupabase().rpc("live_room_load", { p_code: code });
  if (res.error) throw new Error(`loadRoomRecord: ${res.error.message}`);
  const data = res.data as {
    state: LiveRoom;
    version: number;
    updated_at: string;
    pending: { id: number | string; action: unknown }[];
  } | null;
  if (!data) return null;
  return {
    room: data.state,
    version: data.version,
    updatedAtMs: new Date(data.updated_at).getTime(),
    pending: (data.pending ?? []).map((p) => ({ id: Number(p.id), action: p.action })),
  };
}

/** Append one action and load the room in one round trip (P2-L1). Null if the room is gone. */
export async function enqueueAndLoad(
  code: string,
  action: unknown,
): Promise<{ id: number; rec: RoomRecord } | null> {
  if (!isSupabaseConfigured()) {
    const id = await enqueueRoomAction(code, action);
    if (id == null) return null;
    const rec = await loadRoomRecord(code);
    return rec ? { id, rec } : null;
  }
  const res = await getServiceSupabase().rpc("live_room_enqueue_load", {
    p_code: code,
    p_action: action,
  });
  if (res.error) {
    if (res.error.code === "23503") return null;
    throw new Error(`enqueueAndLoad: ${res.error.message}`);
  }
  const data = res.data as {
    state: LiveRoom;
    version: number;
    updated_at: string;
    own_id: number | string;
    pending: { id: number | string; action: unknown }[];
  } | null;
  if (!data) return null;
  return {
    id: Number(data.own_id),
    rec: {
      room: data.state,
      version: data.version,
      updatedAtMs: new Date(data.updated_at).getTime(),
      pending: (data.pending ?? []).map((p) => ({ id: Number(p.id), action: p.action })),
    },
  };
}

/** Append one action to the room's queue. Returns its id, or null if the room is gone. */
export async function enqueueRoomAction(code: string, action: unknown): Promise<number | null> {
  if (!isSupabaseConfigured()) {
    const row = mem().get(code);
    if (!row) return null;
    memSeq += 1;
    row.pending.push({ id: memSeq, action: JSON.parse(JSON.stringify(action)) });
    return memSeq;
  }
  const res = await getServiceSupabase()
    .from("live_room_actions")
    .insert({ code, action })
    .select("id")
    .single();
  if (res.error) {
    if (res.error.code === "23503") return null; // room row gone
    throw new Error(`enqueueRoomAction: ${res.error.message}`);
  }
  return Number((res.data as { id: number | string }).id);
}

/** Returns false when the code is already taken. */
export async function insertRoomRecord(room: LiveRoom): Promise<boolean> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    if (mem().has(room.code)) return false;
    mem().set(room.code, {
      state: JSON.stringify(room),
      version: 1,
      updatedAtMs: now,
      pending: [],
    });
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

/**
 * Optimistic write + delete of the queued actions that were folded in, in one
 * transaction (live_room_commit). Returns false if another request saved first.
 */
export async function saveRoomRecord(
  room: LiveRoom,
  expectedVersion: number,
  appliedIds: number[] = [],
): Promise<boolean> {
  const now = Date.now();
  if (!isSupabaseConfigured()) {
    const row = mem().get(room.code);
    if (!row || row.version !== expectedVersion) return false;
    const applied = new Set(appliedIds);
    mem().set(room.code, {
      state: JSON.stringify(room),
      version: expectedVersion + 1,
      updatedAtMs: now,
      pending: row.pending.filter((p) => !applied.has(p.id)),
    });
    return true;
  }
  const res = await getServiceSupabase().rpc("live_room_commit", {
    p_code: room.code,
    p_version: expectedVersion,
    p_state: room,
    p_applied: appliedIds,
  });
  if (res.error) throw new Error(`saveRoomRecord: ${res.error.message}`);
  return res.data === true;
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
