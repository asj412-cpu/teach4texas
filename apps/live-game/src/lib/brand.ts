/**
 * Teach4Texas brand tokens — ported from generators/brand.py
 * Keep hex values in sync with marketing/brand-guide.md and generators/brand.py.
 */

export const brand = {
  navy: "#1B365D",
  burnt: "#BF5700",
  green: "#548235",
  gold: "#BF8700",
  white: "#FFFFFF",
  lightBlue: "#E6F0FA",
  lightGray: "#F8F9FA",
  darkText: "#2D2D2D",
} as const;

export const subjectColors = {
  math: brand.burnt,
  rla: brand.green,
  science: brand.gold,
} as const;

export type Subject = keyof typeof subjectColors;

export const productName = "Teach4Texas Live Game Show";
export const protocolVersion = 1;
