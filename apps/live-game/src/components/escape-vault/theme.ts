export type EscapeVaultPalette = {
  bg: string;
  panel: string;
  accent: string;
  lock: string;
  text: string;
  chip: string;
};

export type EscapeVaultLines = {
  idle: string[];
  cheer: string[];
  hint: string[];
  oops: string[];
  unlock: string[];
  finale: string[];
  /** Game-over lines when the host ends before the gate opens (no mistake copy). */
  notEscaped: string[];
};

export type EscapeVaultTheme = {
  id: string;
  label: string;
  /** Finale headline when every room is unlocked. */
  finaleTitle: string;
  /** Fallback code word when chips are missing. */
  codeWord: string;
  /** Finale headline when the host ends before the last room opens. */
  notEscapedTitle: string;
  /** What students are called on screen. */
  playerNoun: string;
  palette: EscapeVaultPalette;
  roomAccent: Record<string, string>;
  lines: EscapeVaultLines;
};

export const THANKSGIVING_THEME: EscapeVaultTheme = {
  id: "thanksgiving",
  label: "Thanksgiving Escape",
  finaleTitle: "Gratitude Gate is open!",
  codeWord: "GIVE",
  notEscapedTitle: "The Gratitude Gate is still locked",
  playerNoun: "Cadet",
  palette: {
    bg: "#1a3a2a",
    panel: "#f4e8d0",
    accent: "#c45c26",
    lock: "#d4a017",
    text: "#1a2e1a",
    chip: "#2d6a4f",
  },
  roomAccent: {
    pie: "#c45c26",
    dinner: "#8b4513",
    harvest: "#d4a017",
    leftover: "#2d6a4f",
    gate: "#7b2d8e",
  },
  lines: {
    idle: [
      "Cadets ready? Let's crack this feast!",
      "Show your work — STAAR style.",
      "Four chips: G-I-V-E. You've got this.",
    ],
    cheer: [
      "Gate accepted! Chip logged!",
      "Nice work, Cadet Corps!",
      "Lock swung open — next room!",
    ],
    hint: [
      "Reread the question. Watch the units.",
      "Remainders aren't always leftovers.",
      "Multi-step? Don't stop after step one.",
    ],
    oops: [
      "Protocol miss — hint coming up.",
      "Shake it off — check your work.",
      "Almost! Hint in the bubble.",
    ],
    unlock: [
      "Vault unlocked! Moving out!",
      "Door's open. March on!",
    ],
    finale: [
      "Gratitude Gate is OPEN!",
      "You escaped with G-I-V-E!",
      "Certificate time, Cadets!",
    ],
    notEscaped: [
      "Great teamwork, Cadets! Every chip counts.",
      "Proud of this crew. The gate opens next time!",
      "Nice effort, Cadet Corps! Ready for another run?",
    ],
  },
};

export function pickLine(lines: string[], salt = 0): string {
  if (!lines.length) return "";
  return lines[Math.abs(salt) % lines.length]!;
}

/**
 * Theme registry. Add SKU 2+ themes here; boards pick one via `board.theme`
 * (matched by id or label). Thanksgiving stays the default so SKU 1 is unchanged.
 */
export const ESCAPE_VAULT_THEMES: EscapeVaultTheme[] = [THANKSGIVING_THEME];

export function resolveEscapeVaultTheme(
  boardTheme?: string | null,
): EscapeVaultTheme {
  const want = (boardTheme ?? "").trim().toLowerCase();
  if (want) {
    const hit = ESCAPE_VAULT_THEMES.find(
      (t) => t.id === want || t.label.toLowerCase() === want,
    );
    if (hit) return hit;
  }
  return THANKSGIVING_THEME;
}
