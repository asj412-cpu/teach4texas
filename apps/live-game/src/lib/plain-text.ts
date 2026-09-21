/**
 * Kid-safe display: strip markdown so students never see `*`, `#`, or link syntax.
 * Always render the result as React text — never as HTML.
 */
export function kidPlainText(raw: string, maxLen = 200): string {
  if (!raw) return "";
  let s = raw.replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(\*|_)(.*?)\1/g, "$2");
  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/[<>]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}
