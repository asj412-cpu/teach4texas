import { NextRequest, NextResponse } from "next/server";
import {
  applyHostAction,
  getRoom,
  hostView,
  type HostAction,
  verifyHost,
} from "@/lib/live-rooms";

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

  const auth = req.headers.get("authorization");
  const hostToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!verifyHost(room, hostToken)) {
    return NextResponse.json({ ok: false, error: "HOST_UNAUTHORIZED" }, { status: 401 });
  }

  let action: HostAction;
  try {
    action = (await req.json()) as HostAction;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const result = applyHostAction(room, action);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, view: hostView(room) });
}
