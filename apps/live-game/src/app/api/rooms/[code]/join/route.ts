import { NextRequest, NextResponse } from "next/server";
import { joinRoom } from "@/lib/live-rooms";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  let body: {
    display_name?: string;
    player_id?: string;
    resume_secret?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = joinRoom(code, body.display_name ?? "", {
    player_id: body.player_id ?? "",
    resume_secret: body.resume_secret ?? "",
  });

  if (!result.ok) {
    const status =
      result.error === "ROOM_NOT_FOUND"
        ? 404
        : result.error === "ROOM_FULL" || result.error === "LOBBY_LOCKED"
          ? 403
          : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    player_id: result.player_id,
    resume_secret: result.resume_secret,
    view: result.view,
  });
}
