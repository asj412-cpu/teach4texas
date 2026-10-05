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
};

export type EscapeVaultTheme = {
  id: string;
  label: string;
  palette: EscapeVaultPalette;
  roomAccent: Record<string, string>;
  lines: EscapeVaultLines;
};

export const THANKSGIVING_THEME: EscapeVaultTheme = {
  id: "thanksgiving",
  label: "Thanksgiving Escape",
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
      "Protocol miss. Try again.",
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
  },
};

export function pickLine(lines: string[], salt = 0): string {
  if (!lines.length) return "";
  return lines[Math.abs(salt) % lines.length]!;
}
