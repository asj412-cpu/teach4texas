import { NextResponse } from "next/server";
import {
  playerView,
  runRoomAction,
  type PlayerActionName,
  type RoomOutcome,
} from "@/lib/live-rooms";

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

/** Student action routes (D1): queue the tap, fold, return the player's view. */
export async function playerAction(
  code: string,
  playerId: string,
  fn: PlayerActionName,
  args: unknown[],
): Promise<NextResponse> {
  const out = await runRoomAction(code, { t: "player", fn, pid: playerId, args }, (room, result) => ({
    result,
    view: playerView(room, playerId),
  }));
  if (out.kind === "queued") {
    // Accepted and safe in the queue; the next poll applies it.
    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  }
  if (out.kind !== "ok") return roomUnavailable(out);
  if (out.value.result && !out.value.result.ok) {
    return NextResponse.json({ ok: false, error: out.value.result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, view: out.value.view });
}
