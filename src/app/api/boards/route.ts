import { NextResponse } from "next/server";
import { TEACHER_NO_GENERATE_MESSAGE } from "@/lib/product-policy";

export const dynamic = "force-dynamic";

/**
 * No public game catalog. Teachers do not list or create boards.
 * Access is redeem-code → single board only.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "NO_PUBLIC_CATALOG",
      message: TEACHER_NO_GENERATE_MESSAGE,
    },
    { status: 403 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "TEACHER_CREATE_DISABLED",
      message: TEACHER_NO_GENERATE_MESSAGE,
    },
    { status: 403 },
  );
}
