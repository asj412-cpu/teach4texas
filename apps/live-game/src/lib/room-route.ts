import { NextResponse } from "next/server";
import type { LiveRoom } from "@/lib/domain/live-room";
import { playerView, withRoom, type RoomOutcome } from "@/lib/live-rooms";

/** Missing → 404 (clients retry before giving up), ended → 410, busy/store error → 503. */
export function roomUnavailable(
  out: Exclude<RoomOutcome<unknown>, { kind: "ok" }>,
): NextResponse {
  if (out.kind === "ended") {
    return NextResponse.json({ ok: false, error: "ROOM_ENDED" }, { status: 410 });
  }
  if (out.kind === "busy") {
    return NextResponse.json({ ok: false, error: "ROOM_BUSY" }, { status: 503 });
  }
  return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
}

/** Shared shape for student action routes: mutate room, return the player's view. */
export async function playerAction(
  code: string,
  playerId: string,
  act: (room: LiveRoom) => { ok: true } | { ok: false; error: string },
): Promise<NextResponse> {
  const out = await withRoom(code, (room) => {
    const result = act(room);
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, view: playerView(room, playerId) };
  });
  if (out.kind !== "ok") return roomUnavailable(out);
  if (!out.value.ok) {
    return NextResponse.json({ ok: false, error: out.value.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, view: out.value.view });
}
