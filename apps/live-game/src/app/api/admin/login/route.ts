import { NextRequest, NextResponse } from "next/server";
import { operatorCookieValue, operatorSecret } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  if (body.secret !== operatorSecret()) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("t4t_operator", operatorCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
