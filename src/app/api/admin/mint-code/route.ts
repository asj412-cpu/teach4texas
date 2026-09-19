import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import { mintProductAccessCode } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * OPERATOR ONLY — mint a TPT product access code for one board.
 * Teachers never call this; they only redeem codes from purchases.
 *
 * Auth: x-operator-secret header or t4t_operator cookie after /api/admin/login
 * Body: { board_id, label?, max_sessions? }
 */
export async function POST(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: {
    board_id?: string;
    label?: string;
    max_sessions?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.board_id) {
    return NextResponse.json(
      { ok: false, error: "BOARD_ID_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    const { code, record } = await mintProductAccessCode({
      boardId: body.board_id,
      label: body.label,
      maxSessions: body.max_sessions ?? null,
    });
    return NextResponse.json({
      ok: true,
      code,
      board_id: record.board_id,
      product_code_id: record.id,
      packaging_note:
        "Copy this code into the TPT product download. It unlocks only this board. Show once — not stored in plaintext.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "MINT_FAILED";
    const status = msg === "BOARD_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
