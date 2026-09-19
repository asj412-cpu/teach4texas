import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import { ensureDemoAccessCode, listBoardsForOperator } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  await ensureDemoAccessCode();
  const boards = await listBoardsForOperator();
  return NextResponse.json({
    ok: true,
    boards,
    note: "Teachers cannot see this inventory. They only redeem paid codes.",
  });
}
