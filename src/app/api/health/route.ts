import { NextResponse } from "next/server";
import { protocolVersion } from "@/lib/brand";

export const dynamic = "force-dynamic";

/** Lightweight health for uptime probes. PartyKit synthetic join is post-MVP ops (PR 10). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "live-game",
    protocol_version: protocolVersion,
    time: new Date().toISOString(),
  });
}
