import { NextRequest, NextResponse } from "next/server";
import { verifyHost, withRoom } from "@/lib/live-rooms";
import { roomUnavailable } from "@/lib/room-route";
import { applyFeedback } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * Host-only one-tap feedback for the last finished game in this room.
 * Returns {ok:true} even if the DB write fails (logged).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const auth = req.headers.get("authorization");
  const hostToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

  let body: { rating?: unknown; note?: unknown };
  try {
    body = (await req.json()) as { rating?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const rating = body?.rating;
  if (rating !== 1 && rating !== -1 && rating !== null) {
    return NextResponse.json({ ok: false, error: "INVALID_RATING" }, { status: 400 });
  }

  let note: string | undefined;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string") {
      return NextResponse.json({ ok: false, error: "INVALID_NOTE" }, { status: 400 });
    }
    note = body.note.trim();
    if (note.length > 500) {
      return NextResponse.json({ ok: false, error: "NOTE_TOO_LONG" }, { status: 400 });
    }
  }

  const auth0 = await withRoom(
    code,
    (room) => {
      if (!verifyHost(room, hostToken)) return { authorized: false as const };
      return {
        authorized: true as const,
        gameId: room.usage?.last_finished_game_id,
      };
    },
    { poll: true },
  );
  if (auth0.kind !== "ok") return roomUnavailable(auth0);
  if (!auth0.value.authorized) {
    return NextResponse.json({ ok: false, error: "HOST_UNAUTHORIZED" }, { status: 401 });
  }
  const gameId = auth0.value.gameId;
  if (!gameId) {
    return NextResponse.json({ ok: false, error: "NO_FINISHED_GAME" }, { status: 409 });
  }

  await applyFeedback(gameId, rating, note);
  return NextResponse.json({ ok: true });
}
