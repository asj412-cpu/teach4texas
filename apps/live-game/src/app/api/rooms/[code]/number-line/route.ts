import { NextRequest, NextResponse } from "next/server";
import { parseNumberLinePlaceBody } from "@/lib/domain/number-line";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

/** Number Line: store a placed value. The answer is not in this response until reveal. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = parseNumberLinePlaceBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  return playerAction(code, parsed.player_id, "submitNumberLinePlace", [
    parsed.question_id,
    parsed.value,
    parsed.lock,
    parsed.request_id,
  ]);
}
