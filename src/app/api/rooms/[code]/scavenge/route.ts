import { NextRequest, NextResponse } from "next/server";
import { getRoom, playerView, submitScavengerTap } from "@/lib/live-rooms";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ ok: false, error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  let body: { player_id?: string; target_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.player_id || !body.target_id) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = submitScavengerTap(room, body.player_id, body.target_id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const view = playerView(room, body.player_id);
  return NextResponse.json({ ok: true, view });
}
