import { NextRequest, NextResponse } from "next/server";
import { ACCESS_CODE_COOKIE } from "@/lib/domain/access-code";
import { resolveEntitlement } from "@/lib/store";
import { createLiveRoom, hostView } from "@/lib/live-rooms";

export const dynamic = "force-dynamic";

/**
 * Teacher with redeemed product access code starts a live room.
 * Isolation: room board is always entitlement.board_id — cannot pick another game.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ACCESS_CODE_COOKIE)?.value;
  const resolved = await resolveEntitlement(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "NOT_ENTITLED" }, { status: 401 });
  }

  // Optional claimed board_id must match entitlement
  let claimed: string | undefined;
  try {
    const body = await req.json();
    claimed = body?.board_id;
  } catch {
    // empty body ok
  }
  if (claimed && claimed !== resolved.board.id) {
    return NextResponse.json(
      { ok: false, error: "BOARD_ISOLATION_VIOLATION" },
      { status: 403 },
    );
  }

  try {
    const { room, hostToken } = createLiveRoom({ board: resolved.board });
    return NextResponse.json({
      ok: true,
      room_code: room.code,
      host_token: hostToken,
      board_id: resolved.board.id,
      isolation: { mode: "single_game", board_id: resolved.board.id },
      view: hostView(room),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "SESSION_CREATE_FAILED" }, { status: 500 });
  }
}
