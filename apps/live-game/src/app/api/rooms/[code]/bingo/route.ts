import { NextRequest, NextResponse } from "next/server";
import { parseBingoTapBody } from "@/lib/domain/bingo";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

/** Bingo: a student taps one cell. The server marks it only if it matches the open call. */
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
  const parsed = parseBingoTapBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  return playerAction(code, parsed.player_id, "submitBingoTap", [parsed.cell_index]);
}
