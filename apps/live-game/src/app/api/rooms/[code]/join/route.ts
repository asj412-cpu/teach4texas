import { NextRequest, NextResponse } from "next/server";
import { joinRoom, withRoom } from "@/lib/live-rooms";
import { roomUnavailable } from "@/lib/room-route";

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

  const out = await withRoom(code, (room) =>
    joinRoom(room, body.display_name ?? "", {
      player_id: body.player_id ?? "",
      resume_secret: body.resume_secret ?? "",
    }),
  );
  if (out.kind !== "ok") return roomUnavailable(out);
  const result = out.value;

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
