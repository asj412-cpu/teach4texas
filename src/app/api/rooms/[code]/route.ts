import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  hostView,
  playerView,
  verifyHost,
} from "@/lib/live-rooms";

export const dynamic = "force-dynamic";

/** Poll room state. Host: Authorization Bearer host_token. Player: ?player_id= */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const auth = req.headers.get("authorization");
  const hostToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (hostToken && verifyHost(room, hostToken)) {
    return NextResponse.json({ ok: true, view: hostView(room) });
  }

  const playerId = req.nextUrl.searchParams.get("player_id") ?? undefined;
  if (playerId) {
    const view = playerView(room, playerId);
    if (!view) {
      return NextResponse.json({ ok: false, error: "NOT_A_PLAYER" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, view });
  }

  // Public lobby peek: code exists, player count, title only (no answers)
  return NextResponse.json({
    ok: true,
    peek: {
      code: room.code,
      phase: room.phase,
      title: room.board.title,
      player_count: Object.keys(room.players).length,
      lobby_locked: room.lobby_locked,
    },
  });
}
