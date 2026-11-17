import { NextRequest, NextResponse } from "next/server";
import { hostView, playerView, verifyHost, withRoom } from "@/lib/live-rooms";
import { roomUnavailable } from "@/lib/room-route";
import { loadNumberLineSnapshot, type RoomRecord } from "@/lib/room-store";

export const dynamic = "force-dynamic";

/** Poll room state. Host: Authorization Bearer host_token. Player: ?player_id= */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const auth = req.headers.get("authorization");
  const hostToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const playerId = req.nextUrl.searchParams.get("player_id") ?? undefined;

  let preloaded: RoomRecord | undefined;
  if (req.nextUrl.searchParams.get("nl") === "1") {
    try {
      const snap = await loadNumberLineSnapshot(code);
      if (snap.kind === "missing") {
        return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
      }
      if (snap.kind === "ready") preloaded = snap.rec;
    } catch (err) {
      console.error("number line snapshot:", err);
    }
  }

  const out = await withRoom(code, (room) => {
    if (hostToken && verifyHost(room, hostToken)) {
      return { status: 200, body: { ok: true, view: hostView(room) } };
    }
    if (playerId) {
      const view = playerView(room, playerId);
      if (!view) return { status: 403, body: { ok: false, error: "NOT_A_PLAYER" } };
      return { status: 200, body: { ok: true, view } };
    }
    // Public lobby peek: code exists, player count, title only (no answers)
    return {
      status: 200,
      body: {
        ok: true,
        peek: {
          code: room.code,
          phase: room.phase,
          game_type: room.game_type,
          title: room.board.title,
          player_count: Object.keys(room.players).length,
          lobby_locked: room.lobby_locked,
        },
      },
    };
  }, { poll: true, preloaded });
  if (out.kind !== "ok") return roomUnavailable(out);
  return NextResponse.json(out.value.body, {
    status: out.value.status,
    headers: { "Cache-Control": "no-store" },
  });
}
