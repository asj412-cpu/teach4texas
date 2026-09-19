import { NextRequest, NextResponse } from "next/server";
import { ACCESS_CODE_COOKIE } from "@/lib/domain/access-code";
import { resolveEntitlement, toHostBoardView } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Current host entitlement — at most one game. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ACCESS_CODE_COOKIE)?.value;
  const resolved = await resolveEntitlement(token);

  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "NOT_ENTITLED", board: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    board: toHostBoardView(resolved.board),
    isolation: {
      mode: "single_game",
      board_id: resolved.board.id,
    },
  });
}
