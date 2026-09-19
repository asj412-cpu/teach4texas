import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import {
  cloneBoard,
  listBoardsForOperator,
  upsertBoard,
} from "@/lib/store";
import { GameBoardSchema } from "@/lib/domain/board";

export const dynamic = "force-dynamic";

/** List inventory (operator). */
export async function GET(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const boards = await listBoardsForOperator();
  return NextResponse.json({ ok: true, boards });
}

/**
 * Create a board.
 * body.mode:
 *  - "import" + board: full GameBoard JSON
 *  - "clone" + source_board_id + title (+ optional grade/subject/tpt_sku)
 */
export async function POST(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: {
    mode?: string;
    board?: unknown;
    source_board_id?: string;
    title?: string;
    grade?: 3 | 4 | 5;
    subject?: "math" | "rla" | "science";
    tpt_sku?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    if (body.mode === "clone") {
      if (!body.source_board_id || !body.title) {
        return NextResponse.json(
          { ok: false, error: "CLONE_REQUIRES_SOURCE_AND_TITLE" },
          { status: 400 },
        );
      }
      const board = await cloneBoard({
        sourceBoardId: body.source_board_id,
        title: body.title,
        grade: body.grade,
        subject: body.subject,
        tpt_sku: body.tpt_sku,
      });
      return NextResponse.json({
        ok: true,
        board,
        next: "Edit content if needed, mark ready, mint TPT access code.",
      });
    }

    if (body.mode === "import" || body.board) {
      const board = await upsertBoard(body.board);
      return NextResponse.json({
        ok: true,
        board: {
          id: board.id,
          title: board.title,
          status: board.status,
          grade: board.grade,
          subject: board.subject,
          tpt_sku: board.tpt_sku,
          cell_count: board.cells.length,
        },
        next:
          board.status === "ready"
            ? "Mint a TPT access code for this board."
            : "Set status to ready when content is reviewed, then mint a code.",
      });
    }

    return NextResponse.json(
      { ok: false, error: "UNKNOWN_MODE", hint: "Use mode clone|import" },
      { status: 400 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CREATE_FAILED";
    // Zod errors
    if (msg.includes("Zod") || e && typeof e === "object" && "issues" in e) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_FAILED",
          details: e,
          schema_hint: GameBoardSchema.description,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
