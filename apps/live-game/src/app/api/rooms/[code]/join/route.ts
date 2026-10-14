import { NextRequest, NextResponse } from "next/server";
import { type JoinResult, playerView, runRoomAction } from "@/lib/live-rooms";
import { generateId, generateOpaqueToken, sha256Hex } from "@/lib/crypto";
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

  const presetId = generateId("pl");
  const presetSecret = generateOpaqueToken();
  const resume =
    body.player_id && body.resume_secret
      ? { player_id: body.player_id, resume_secret: body.resume_secret }
      : undefined;
  const out = await runRoomAction(
    code,
    {
      t: "join",
      name: body.display_name ?? "",
      pid: presetId,
      secret: presetSecret,
      resume,
    },
    (room, applied): JoinResult => {
      if (applied && !applied.ok) return { ok: false, error: applied.error };
      const resumed =
        resume &&
        room.players[resume.player_id]?.resume_secret_hash === sha256Hex(resume.resume_secret);
      const pid = resumed ? resume.player_id : presetId;
      const secret = resumed ? resume.resume_secret : presetSecret;
      const view = room.players[pid] ? playerView(room, pid) : null;
      if (!view) return { ok: false, error: "JOIN_FAILED" };
      return { ok: true, player_id: pid, resume_secret: secret, view };
    },
  );
  if (out.kind === "queued") {
    // Join is safely queued; the next poll applies it. Hand back the preset ids.
    const pid = resume?.player_id ?? presetId;
    const secret = resume?.resume_secret ?? presetSecret;
    return NextResponse.json(
      { ok: true, queued: true, player_id: pid, resume_secret: secret },
      { status: 202 },
    );
  }
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
