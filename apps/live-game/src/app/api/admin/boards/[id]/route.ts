import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import {
  getBoardForOperator,
  setBoardStatus,
  upsertBoard,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const board = await getBoardForOperator(id);
  if (!board) {
    return NextResponse.json({ ok: false, error: "BOARD_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, board });
}

/** Update full board JSON or patch status. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { board?: unknown; status?: "draft" | "ready" | "failed" | "generating" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    if (body.board) {
      const existing = await getBoardForOperator(id);
      if (!existing) {
        return NextResponse.json({ ok: false, error: "BOARD_NOT_FOUND" }, { status: 404 });
      }
      const board = await upsertBoard({
        ...(body.board as object),
        id,
        created_at: existing.created_at,
      });
      return NextResponse.json({ ok: true, board });
    }
    if (body.status) {
      const board = await setBoardStatus(id, body.status);
      return NextResponse.json({ ok: true, board: { id: board.id, status: board.status } });
    }
    return NextResponse.json({ ok: false, error: "NOTHING_TO_UPDATE" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPDATE_FAILED";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
