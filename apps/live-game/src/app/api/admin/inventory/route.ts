import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import {
  ensureDemoAccessCode,
  ensureMemoryMatchSample,
  ensureScavengerTapSample,
  ensureSequenceSortSample,
  ensureTimedRaceSample,
  listBoardsForOperator,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  await ensureDemoAccessCode();
  await ensureMemoryMatchSample();
  await ensureTimedRaceSample();
  await ensureScavengerTapSample();
  await ensureSequenceSortSample();
  const boards = await listBoardsForOperator();
  return NextResponse.json({
    ok: true,
    boards,
    note: "Teachers cannot see this inventory. They only redeem paid codes.",
  });
}
