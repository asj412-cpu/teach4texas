import { NextRequest, NextResponse } from "next/server";
import { FULL_COOKIE, verifyFullCookie } from "@/lib/server/entitlement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return NextResponse.json({ full: verifyFullCookie(req.cookies.get(FULL_COOKIE)?.value) });
}

/** Leave full mode on this browser (data stays in localStorage). */
export async function DELETE() {
  const res = NextResponse.json({ full: false });
  res.cookies.set(FULL_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
