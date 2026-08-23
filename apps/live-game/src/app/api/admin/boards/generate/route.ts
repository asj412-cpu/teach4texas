import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import { generateBoardWithGrok } from "@/lib/ai/generate-board";
import { upsertBoard } from "@/lib/store";

export const dynamic = "force-dynamic";
/** AI drafts can take a while (5 category calls). */
export const maxDuration = 300;

/**
 * OPERATOR ONLY — draft a new game with Grok, save as status: draft.
 * Teachers cannot call this (no public route; requires operator auth).
 */
export async function POST(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: {
    grade?: 3 | 4 | 5;
    subject?: "math" | "rla" | "science";
    topic?: string;
    teks?: string[];
    title?: string;
    theme?: string;
    tpt_sku?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.grade || !body.subject || !body.topic?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "GRADE_SUBJECT_TOPIC_REQUIRED",
      },
      { status: 400 },
    );
  }

  try {
    const draft = await generateBoardWithGrok({
      grade: body.grade,
      subject: body.subject,
      topic: body.topic.trim(),
      teks: body.teks,
      title: body.title,
      theme: body.theme,
      tpt_sku: body.tpt_sku,
    });
    const board = await upsertBoard(draft);
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
      warning:
        "AI draft — review every question before marking ready. Teachers never see generate.",
      next: [
        "1. GET /api/admin/boards/:id and review cells",
        "2. PATCH status to ready",
        "3. Mint TPT access code",
        "4. Put code in TPT product download",
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GENERATE_FAILED";
    const status = msg.includes("XAI_API_KEY") ? 503 : 502;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
