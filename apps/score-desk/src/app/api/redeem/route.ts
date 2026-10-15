import { NextRequest, NextResponse } from "next/server";
import { FULL_COOKIE, checkCode, mintFullCookie } from "@/lib/server/entitlement";

export const dynamic = "force-dynamic";

const MSG: Record<string, string> = {
  INVALID_CODE: "That code didn't match. Check the code in your TPT download (Start Here page) and try again.",
  WRONG_PRODUCT: "That code is for a different Teach4Texas product. Use the Score Desk code from your Score Desk download.",
  CODE_REVOKED: "That code has been turned off. Contact Teach4Texas through TPT for help.",
  CODE_EXHAUSTED: "That code has reached its limit. Contact Teach4Texas through TPT for help.",
  NOT_CONFIGURED: "Unlocking is not available right now. Please try again later.",
};

/** Expected rejections return 200 + {ok:false} so the browser console stays clean (QA R1 P3-4). */
export async function POST(req: NextRequest) {
  let code = "";
  try { code = String((await req.json())?.access_code ?? ""); } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }
  const r = await checkCode(code);
  if (!r.ok) {
    console.log(JSON.stringify({ evt: "score_desk_redeem", ok: false, error: r.error }));
    return NextResponse.json({ ok: false, error: r.error, message: MSG[r.error] }, { status: 200 });
  }
  const c = mintFullCookie();
  if (!c) return NextResponse.json({ ok: false, error: "NOT_CONFIGURED", message: MSG.NOT_CONFIGURED }, { status: 200 });
  console.log(JSON.stringify({ evt: "score_desk_redeem", ok: true, via: r.via }));
  const res = NextResponse.json({ ok: true, mode: "full" });
  res.cookies.set(FULL_COOKIE, c.value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: c.maxAge });
  return res;
}
