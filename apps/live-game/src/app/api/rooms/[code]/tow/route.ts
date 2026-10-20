import { NextRequest, NextResponse } from "next/server";
import { playerAction } from "@/lib/room-route";

export const dynamic = "force-dynamic";

/** Tug of War: a student locks one A–D choice for the open round. */
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
  if (
    !body.player_id ||
    typeof body.choice_index !== "number" ||
    !Number.isInteger(body.choice_index)
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  return playerAction(code, body.player_id, "submitTowAnswer", [body.choice_index]);
}
