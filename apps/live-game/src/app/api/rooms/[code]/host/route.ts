import { NextRequest, NextResponse } from "next/server";
import {
  applyHostAction,
  hostView,
  type HostAction,
  verifyHost,
  withRoom,
} from "@/lib/live-rooms";
import { roomUnavailable } from "@/lib/room-route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const auth = req.headers.get("authorization");
  const hostToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

  let action: HostAction;
  try {
    action = (await req.json()) as HostAction;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const out = await withRoom(code, (room) => {
    if (!verifyHost(room, hostToken)) {
      return { status: 401, body: { ok: false, error: "HOST_UNAUTHORIZED" } };
    }
    const result = applyHostAction(room, action);
    if (!result.ok) {
      return { status: 400, body: { ok: false, error: result.error } };
    }
    return { status: 200, body: { ok: true, view: hostView(room) } };
  });
  if (out.kind !== "ok") return roomUnavailable(out);
  return NextResponse.json(out.value.body, { status: out.value.status });
}
