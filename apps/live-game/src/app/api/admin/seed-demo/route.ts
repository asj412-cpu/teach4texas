import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import { ensureDemoAccessCode, listBoardsForOperator } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Seed sample math G3 board + known demo access code for local / packaging tests. */
export async function POST(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const demo = await ensureDemoAccessCode();
  const boards = await listBoardsForOperator();

  return NextResponse.json({
    ok: true,
    demo_access_code: demo.code,
    board_id: demo.boardId,
    created: demo.created,
    boards,
    tpt_flow: [
      "1. Mint or use demo_access_code for this board only",
      "2. Put the code in the TPT product PDF / teacher guide",
      "3. Teacher redeems at /redeem — unlocks only this game",
      "4. Students use a separate short room code when live multiplayer ships",
    ],
  });
}
