import { NextRequest, NextResponse } from "next/server";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;

  let body: { player_id?: string; choice_id?: string; numeric?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || (!body.choice_id && body.numeric == null)) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const playerId = body.player_id;
  const payload = { choice_id: body.choice_id, numeric: body.numeric };
  return playerAction(code, playerId, "submitVaultAnswer", [payload]);
}
