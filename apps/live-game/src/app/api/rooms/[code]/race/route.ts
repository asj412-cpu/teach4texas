import { NextRequest, NextResponse } from "next/server";
import { submitRaceAnswer } from "@/lib/live-rooms";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;

  let body: { player_id?: string; choice_index?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || body.choice_index === undefined) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const playerId = body.player_id;
  const choice_index = body.choice_index;
  return playerAction(code, playerId, (room) =>
    submitRaceAnswer(room, playerId, choice_index),
  );
}
