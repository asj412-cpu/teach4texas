import { NextRequest, NextResponse } from "next/server";
import { submitDashTap } from "@/lib/live-rooms";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;

  let body: { player_id?: string; answer?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || typeof body.answer !== "boolean") {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const playerId = body.player_id;
  const answer = body.answer;
  return playerAction(code, playerId, (room) =>
    submitDashTap(room, playerId, answer),
  );
}
