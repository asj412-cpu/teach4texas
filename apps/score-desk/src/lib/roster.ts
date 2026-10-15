/** Paste: one name per line (commas inside "Last, First" are kept if the line has exactly one comma and no other columns). */
export function parsePaste(text: string): string[] {
  return dedupe(text.split(/\r?\n|;/).map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean));
}
function dedupe(xs: string[]) {
  const seen = new Set<string>();
  return xs.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 200);
}
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
export type CsvResult = { ok: true; names: string[] } | { ok: false; error: string };
/**
 * Accepts: a single column of names (with or without a header), or a header row with
 * name / student / "first name" + "last name" columns (Skyward/Google Classroom exports).
 */
export function parseCsv(text: string, fileName = ""): CsvResult {
  if (fileName && !/\.(csv|txt)$/i.test(fileName)) return { ok: false, error: `"${fileName}" isn't a CSV file. Save your roster as .csv (File → Download → CSV) and try again.` };
  if (/\u0000/.test(text) || /^PK/.test(text)) return { ok: false, error: "That file looks like a spreadsheet (.xlsx), not a CSV. Save it as .csv and try again." };
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { ok: false, error: "That CSV is empty. Add one student name per row and try again." };
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (re: RegExp) => head.findIndex((h) => re.test(h));
  const first = idx(/^first(\s|_)?name$|^first$/), last = idx(/^last(\s|_)?name$|^last$/);
  const name = idx(/^(student(\s|_)?name|name|student|full(\s|_)?name)$/);
  let names: string[];
  if (first >= 0) names = lines.slice(1).map((l) => { const c = splitCsvLine(l); return [c[first], last >= 0 ? c[last] : ""].filter(Boolean).join(" "); });
  else if (name >= 0) names = lines.slice(1).map((l) => splitCsvLine(l)[name] ?? "");
  else if (head.length === 1) names = lines.map((l) => splitCsvLine(l)[0]);
  else return { ok: false, error: 'We couldn\'t find a name column. Add a header called "Name" (or "First Name" and "Last Name") and try again.' };
  names = dedupe(names.map((s) => s.trim()).filter((s) => s && !/^\d+$/.test(s)));
  if (!names.length) return { ok: false, error: "We didn't find any student names in that file. Check that names are in the first column or under a \"Name\" header." };
  return { ok: true, names };
}
