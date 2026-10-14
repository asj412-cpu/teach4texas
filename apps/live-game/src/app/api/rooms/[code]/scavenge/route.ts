import { NextRequest, NextResponse } from "next/server";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;

  let body: { player_id?: string; target_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || !body.target_id) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const playerId = body.player_id;
  const target_id = body.target_id;
  return playerAction(code, playerId, "submitScavengerTap", [target_id]);
}
