import { NextRequest } from "next/server";

export function operatorSecret(): string {
  return process.env.OPERATOR_SECRET ?? "change-me-in-production";
}

export function isOperatorAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("x-operator-secret");
  if (header && header === operatorSecret()) return true;
  // Cookie set by /api/admin/login
  const cookie = req.cookies.get("t4t_operator")?.value;
  return cookie === shaSimple(operatorSecret());
}

function shaSimple(s: string): string {
  // lightweight cookie marker (not for high security; use real auth later)
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `op_${Math.abs(h).toString(16)}`;
}

export function operatorCookieValue(): string {
  return shaSimple(operatorSecret());
}
