import { NextRequest, NextResponse } from "next/server";
import {
  hostView,
  type HostAction,
  runNumberLineReveal,
  runRoomAction,
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

  // Number line reveal: one aggregated load + one commit. Other actions keep the auth read.
  if (action.type === "nl_reveal") {
    const revealed = await runNumberLineReveal(code, hostToken);
    if (revealed.kind === "unauthorized") {
      return NextResponse.json({ ok: false, error: "HOST_UNAUTHORIZED" }, { status: 401 });
    }
    if (revealed.kind !== "ok") return roomUnavailable(revealed);
    if (!revealed.result.ok) {
      return NextResponse.json({ ok: false, error: revealed.result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, view: revealed.view });
  }

  // Authorize against the stored room before queueing anything.
  const auth0 = await withRoom(code, (room) => verifyHost(room, hostToken), { poll: true });
  if (auth0.kind !== "ok") return roomUnavailable(auth0);
  if (!auth0.value) {
    return NextResponse.json({ ok: false, error: "HOST_UNAUTHORIZED" }, { status: 401 });
  }

  const out = await runRoomAction(code, { t: "host", a: action }, (room, result) => ({
    result,
    view: hostView(room),
  }));
  if (out.kind === "queued") {
    return NextResponse.json({ ok: true, queued: true }, { status: 202 });
  }
  if (out.kind !== "ok") return roomUnavailable(out);
  if (out.value.result && !out.value.result.ok) {
    return NextResponse.json({ ok: false, error: out.value.result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, view: out.value.view });
}
