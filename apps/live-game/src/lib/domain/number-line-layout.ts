/** Host name chips. 24px type on navy clears WCAG AA against the chip, not the yellow line. */
export const NL_NAME_FG = "#ffffff";
export const NL_NAME_BG = "#07111f";
export const NL_NAME_FONT_PX = 24;
export const NL_LANE_PX = 36;
const NL_CHIP_PAD_X = 10;
const NL_DOT_HIT_PX = 22;
const NL_CHIP_GAP_PX = 6;

export type NameLayoutDot = {
  id: string;
  /** 0–100 along the line. */
  xPercent: number;
  name: string | null;
};

export type NameLayout = {
  id: string;
  stack: number;
  lane: number;
  /** Added to a centered translateX so the chip stays on the rail. */
  shiftPx: number;
  leaderPx: number;
  chip: boolean;
};

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const read = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const r = channel((n >> 16) & 255);
    const g = channel((n >> 8) & 255);
    const b = channel(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const left = read(foreground);
  const right = read(background);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

export function chipWidthPx(name: string): number {
  return Math.ceil(name.length * (NL_NAME_FONT_PX * 0.62) + NL_CHIP_PAD_X * 2);
}

/**
 * Stack dots that would paint on top of each other, and park name chips in lanes
 * so close values get a leader line instead of one overwritten label.
 */
export function layoutNumberLineNames(dots: NameLayoutDot[], widthPx: number): NameLayout[] {
  const width = Math.max(1, widthPx);
  const placed = dots.map((dot) => ({
    ...dot,
    x: (Math.min(100, Math.max(0, dot.xPercent)) / 100) * width,
  }));
  const order = [...placed].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  const stacks = new Map<string, number>();
  let lastX = Number.NEGATIVE_INFINITY;
  let nextStack = 0;
  for (const dot of order) {
    if (dot.x - lastX < NL_DOT_HIT_PX) {
      stacks.set(dot.id, nextStack);
      nextStack += 1;
    } else {
      nextStack = 1;
      stacks.set(dot.id, 0);
    }
    lastX = dot.x;
  }

  const laneRight: number[] = [];
  const lanes = new Map<string, { lane: number; shiftPx: number; leaderPx: number }>();
  for (const dot of order) {
    if (!dot.name) {
      lanes.set(dot.id, { lane: 0, shiftPx: 0, leaderPx: 0 });
      continue;
    }
    const chip = chipWidthPx(dot.name);
    const rawLeft = dot.x - chip / 2;
    const left = Math.max(0, Math.min(Math.max(0, width - chip), rawLeft));
    const shiftPx = left - rawLeft;
    const right = left + chip;
    let lane = 0;
    while (lane < laneRight.length && left < laneRight[lane]! + NL_CHIP_GAP_PX) lane += 1;
    laneRight[lane] = right;
    lanes.set(dot.id, { lane, shiftPx, leaderPx: 10 + lane * NL_LANE_PX });
  }

  return dots.map((dot) => {
    const lane = lanes.get(dot.id) ?? { lane: 0, shiftPx: 0, leaderPx: 0 };
    return {
      id: dot.id,
      stack: stacks.get(dot.id) ?? 0,
      lane: lane.lane,
      shiftPx: lane.shiftPx,
      leaderPx: lane.leaderPx,
      chip: Boolean(dot.name),
    };
  });
}

export function chipSpan(
  dot: NameLayoutDot,
  layout: NameLayout,
  widthPx: number,
): { left: number; right: number; lane: number } | null {
  if (!dot.name || !layout.chip) return null;
  const width = Math.max(1, widthPx);
  const x = (Math.min(100, Math.max(0, dot.xPercent)) / 100) * width;
  const chip = chipWidthPx(dot.name);
  const left = x - chip / 2 + layout.shiftPx;
  return { left, right: left + chip, lane: layout.lane };
}
