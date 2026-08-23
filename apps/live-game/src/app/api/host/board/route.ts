import { NextRequest, NextResponse } from "next/server";
import { ACCESS_CODE_COOKIE } from "@/lib/domain/access-code";
import { resolveEntitlement } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Full board for the entitled host only.
 * Rejects if client tries to request a different board_id (query param ignored for security —
 * board always comes from entitlement).
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(ACCESS_CODE_COOKIE)?.value;
  const resolved = await resolveEntitlement(token);

  if (!resolved) {
    return NextResponse.json({ ok: false, error: "NOT_ENTITLED" }, { status: 401 });
  }

  // Optional client claim of board_id — must match entitlement or 403
  const claimed = req.nextUrl.searchParams.get("board_id");
  if (claimed && claimed !== resolved.board.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "BOARD_ISOLATION_VIOLATION",
        message: "Your access code does not unlock that game.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    board: resolved.board,
  });
}
