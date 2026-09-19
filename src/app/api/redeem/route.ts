import { NextRequest, NextResponse } from "next/server";
import { redeemAccessCode } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Teacher redeems a TPT product access code.
 * Success: HttpOnly cookie bound to exactly one board_id.
 * No catalog of games is returned.
 */
export async function POST(req: NextRequest) {
  let body: { access_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const code = body.access_code ?? "";
  const result = await redeemAccessCode(code);

  if (!result.ok) {
    const status =
      result.error === "INVALID_CODE"
        ? 401
        : result.error === "CODE_REVOKED" || result.error === "CODE_EXHAUSTED"
          ? 403
          : 404;
    return NextResponse.json(
      { ok: false, error: result.error },
      { status },
    );
  }

  const res = NextResponse.json({
    ok: true,
    board: result.board,
    // Only the unlocked game — isolation contract
    isolation: {
      mode: "single_game",
      board_id: result.board.id,
      message:
        "This access code unlocks only this game. Other TPT products need their own codes.",
    },
  });

  res.cookies.set(result.cookieName, result.entitlementToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: result.maxAgeSec,
  });

  return res;
}
