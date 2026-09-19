import { NextResponse } from "next/server";
import { TEACHER_NO_GENERATE_MESSAGE } from "@/lib/product-policy";

export const dynamic = "force-dynamic";

/**
 * Intentionally disabled for teachers.
 * Game inventory is created by the operator and sold on TPT with access codes.
 * Do not implement a public generate path here.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "TEACHER_GENERATION_DISABLED",
      message: TEACHER_NO_GENERATE_MESSAGE,
    },
    { status: 403 },
  );
}

export async function GET() {
  return POST();
}
