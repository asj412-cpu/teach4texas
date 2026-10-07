import { NextRequest, NextResponse } from "next/server";
import { submitOddTap } from "@/lib/live-rooms";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;

  let body: { player_id?: string; option_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || !body.option_id) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const playerId = body.player_id;
  const option_id = body.option_id;
  return playerAction(code, playerId, (room) =>
    submitOddTap(room, playerId, option_id),
  );
}
