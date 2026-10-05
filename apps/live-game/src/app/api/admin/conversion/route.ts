import { NextRequest, NextResponse } from "next/server";
import { isOperatorAuthorized } from "@/lib/operator-auth";
import { getConversionStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOperatorAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const until = req.nextUrl.searchParams.get("until") ?? undefined;
  const stats = await getConversionStats({ since, until });

  return NextResponse.json({
    ok: true,
    demo: stats.demo,
    paid: stats.paid,
    total: stats.total,
    since: stats.since,
    until: stats.until,
    note: "kind from T4T-DEMO- prefix at redeem; no PII",
  });
}
