/** Host name chips. 24px type on navy clears WCAG AA against the chip, not the yellow line. */
export const NL_NAME_FG = "#ffffff";
export const NL_NAME_BG = "#07111f";
export const NL_NAME_FONT_PX = 24;

/** Matches the track CSS at a 16px root. */
export const NL_DOT_MIN_PX = 10;
export const NL_DOT_GAP_PX = 2;
export const NL_DOT_MAX_PX = 22;
export const NL_STACK_PREF_PX = 10;
export const NL_BIN_PX = 14;
export const NL_DOT_TOP_IN_RAIL = 34.4;
export const NL_LINE_BOTTOM_IN_RAIL = 50;
/** .nl-truth top 3.35rem plus the 1.1rem flag, at a 16px root. */
export const NL_FLAG_BOTTOM_IN_RAIL = 53.6 + 17.6;
export const NL_RAIL_PX = 88;
export const NL_LABELS_PX = 40;
export const NL_CHIP_H = 32;
export const NL_CHIP_GAP_PX = 4;
/** Names on one chip stay inside this window of the anchor. */
export const NL_GROUP_WINDOW_PX = 48;

const NL_CHAR_PX = 17;
const NL_CHIP_PAD_X = 12;
const NL_MAX_LANES = 8;

/**
 * Header plus the question block before the track.
 * The phone value includes the room-code block and a wrapped prompt.
 * The live host replaces this with a measurement.
 */
export const NL_CHROME_BEFORE_DESKTOP_PX = 240;
export const NL_CHROME_BEFORE_MOBILE_PX = 280;
/** One Exact/Within row. A phone wraps the two pills, so the row is taller. */
export const NL_SCORE_ROW_PX = 48;
export const NL_SCORE_ROW_PHONE_PX = 112;
/** Header, question, and the exact/within row on a 1366-wide projector. */
export const NL_CHROME_DESKTOP_PX = NL_CHROME_BEFORE_DESKTOP_PX + NL_SCORE_ROW_PX;
/**
 * One-row host bar from the button CSS.
 * Phone: 4px border + 12px pad + 36px control = 52.
 * Desktop: 4px border + 16px pad + 52px control = 72.
 */
export const NL_BAR_PHONE_PX = 52;
export const NL_BAR_DESKTOP_PX = 72;
/** Clearance between the flag, dots, or chips and the bar. */
export const NL_BAR_GAP_PX = 8;
/** @deprecated Use hostBarPx. Desktop bar plus the 8px gap. */
export const NL_CONTROLS_PX = NL_BAR_DESKTOP_PX + NL_BAR_GAP_PX;
/** Lobby name list scrolls inside this, so Start stays on screen. */
export const NL_LOBBY_LIST_MAX_PX = 176;

export function hostViewportPx(width: number): number {
  if (width <= 500) return NL_MOBILE_VIEWPORT_PX;
  if (width >= 1400) return 900;
  return NL_DESKTOP_VIEWPORT_PX;
}

export function hostBarPx(width: number): number {
  return width <= 500 ? NL_BAR_PHONE_PX : NL_BAR_DESKTOP_PX;
}

/**
 * Phone bar controls at 16px/800. Names and Hide share one width.
 * Padding is 8px, gap is 4px, so the row stays inside 375 with an 8px margin.
 */
const NL_PHONE_BAR_PAD_X = 8;
const NL_PHONE_BAR_GAP = 4;
const NL_PHONE_BTN_PX: Record<string, number> = {
  Pause: 67.140625,
  Next: 54.6875,
  Reveal: 71.59375,
  Names: 72.484375,
  End: 50.21875,
};

export function hostBarControlRights(namesOn: boolean, viewport = 375): number[] {
  const labels = ["Pause", "Next", "Reveal", namesOn ? "Hide" : "Names", "End"];
  let x = NL_PHONE_BAR_PAD_X;
  return labels.map((label, index) => {
    x += NL_PHONE_BTN_PX[label === "Hide" ? "Names" : label] ?? 0;
    const right = x;
    if (index < labels.length - 1) x += NL_PHONE_BAR_GAP;
    return right;
  });
}

export function hostChromeBeforePx(width: number): number {
  return width <= 500 ? NL_CHROME_BEFORE_MOBILE_PX : NL_CHROME_BEFORE_DESKTOP_PX;
}

export function hostScoreRowPx(width: number): number {
  return width <= 500 ? NL_SCORE_ROW_PHONE_PX : NL_SCORE_ROW_PX;
}

/** Wrapped host prompt. 24px type, 32px line, no ellipsis. */
export function hostPromptBlockPx(prompt: string, width: number): number {
  const inner = Math.max(1, width - 16);
  const lines = Math.max(1, Math.ceil((prompt.length * 14.5) / inner));
  return lines * 32;
}
export const NL_DESKTOP_VIEWPORT_PX = 768;
/** Phone header plus question, before the track. */
export const NL_CHROME_MOBILE_PX = NL_CHROME_BEFORE_MOBILE_PX;
export const NL_MOBILE_VIEWPORT_PX = 812;

export const NL_HOST_CHROME_PX = NL_CHROME_DESKTOP_PX;
export const NL_VIEWPORT_H_PX = NL_DESKTOP_VIEWPORT_PX;
export const NL_REVEAL_BUDGET_PX =
  NL_DESKTOP_VIEWPORT_PX - NL_CHROME_DESKTOP_PX - NL_CONTROLS_PX;

export type NameLayoutDot = {
  id: string;
  /** 0–100 along the line. */
  xPercent: number;
  name: string | null;
  value?: number;
};

export type Box = { left: number; top: number; right: number; bottom: number };

export type RevealDot = {
  id: string;
  x: number;
  stack: number;
  /** Outer diameter. One size for the whole reveal. */
  size: number;
  box: Box;
};

export type RevealBadge = {
  id: string;
  text: string;
  count: number;
  memberIds: string[];
  names: string[];
  box: Box;
};

export type RevealChip = {
  id: string;
  text: string;
  fullNames: string[];
  memberIds: string[];
  box: Box;
  anchorX: number;
};

export type RevealLeader = {
  x: number;
  y1: number;
  y2: number;
};

export type NumberLineRevealLayout = {
  width: number;
  dotSize: number;
  dots: RevealDot[];
  /** Undrawn placements, only when a 10px stack still will not fit a narrow host. */
  badges: RevealBadge[];
  chips: RevealChip[];
  leaders: RevealLeader[];
  aboveSpace: number;
  belowSpace: number;
  /** @deprecated Use aboveSpace. Kept so callers reading the old name still work. */
  nameSpace: number;
  revealHeight: number;
  /** Header and question above the track. */
  chromePx: number;
  /** Measured or CSS bar height used to cap the stack. */
  barPx: number;
  /** In-flow reconnecting banner. Zero when that bar is not on the page. */
  bannerPx: number;
  viewportPx: number;
  /** Exact / Within row. A wrapped phone row is taller than one line. */
  scoreRowPx: number;
};

export function hostPageHeight(layout: NumberLineRevealLayout): number {
  return (
    layout.bannerPx +
    layout.chromePx +
    layout.scoreRowPx +
    layout.revealHeight +
    layout.barPx +
    NL_BAR_GAP_PX
  );
}

/** Bottom of the Exact / Within pills. */
export function hostStatsBottom(layout: NumberLineRevealLayout): number {
  return layout.chromePx + layout.revealHeight + layout.scoreRowPx;
}

/** Page y the flag, a dot, or a chip must stay at or above. */
export function hostClearY(layout: NumberLineRevealLayout): number {
  return layout.viewportPx - layout.bannerPx - layout.barPx - NL_BAR_GAP_PX;
}

export function flagBottomY(layout: NumberLineRevealLayout): number {
  return layout.chromePx + layout.aboveSpace + NL_FLAG_BOTTOM_IN_RAIL;
}

/** Top of the sticky Start / Lock bar. The list above it never grows past its cap. */
export function lobbyStartTop(players: number, width: number): number {
  const cols = width >= 768 ? 4 : 2;
  const rows = Math.ceil(Math.max(0, players) / cols);
  const list = Math.min(NL_LOBBY_LIST_MAX_PX, rows * 48);
  const header = width <= 500 ? 168 : 104;
  const intro = width <= 500 ? 248 : 176;
  return header + intro + list;
}

/** Y of the line's bottom edge, measured from the top of the host page. */
export function lineFoldY(layout: NumberLineRevealLayout, chromeAbove: number): number {
  return chromeAbove + layout.aboveSpace + NL_LINE_BOTTOM_IN_RAIL;
}

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

export function chipWidthPx(name: string, railWidth = Number.POSITIVE_INFINITY): number {
  const raw = Math.ceil(name.length * NL_CHAR_PX + NL_CHIP_PAD_X * 2);
  return Math.max(NL_CHIP_H, Math.min(raw, Math.max(1, railWidth)));
}

export function truncateName(name: string, max = 10): string {
  if (name.length <= max) return name;
  return `${name.slice(0, Math.max(1, max - 1))}…`;
}

/** At least one name, then +N. Long names ellipsize at about 10 characters. */
export function formatChipText(names: string[]): string {
  const clean = names.filter((name) => name.length > 0);
  if (clean.length === 0) return "";
  const first = truncateName(clean[0]!, 10);
  if (clean.length === 1) return first;
  return `${first} +${clean.length - 1}`;
}

/** @deprecated Use formatChipText. Kept for older call sites. */
export function chipLabel(names: string[]): string {
  return formatChipText(names);
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function valueKey(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

function clampLeft(center: number, boxWidth: number, rail: number): number {
  if (boxWidth >= rail) return 0;
  return Math.max(0, Math.min(rail - boxWidth, center - boxWidth / 2));
}

type Group = {
  id: string;
  anchorX: number;
  ids: string[];
  names: string[];
  stacks: number[];
};

type Draft = {
  id: string;
  names: string[];
  memberIds: string[];
  anchorX: number;
  left: number;
  width: number;
  lane: number;
  text: string;
};

/**
 * One placement per dot, drawn at that value's true x. Values closer than one
 * dot share one vertical stack: every dot gets its own slot, lowest values at
 * the bottom, with a 2px gap. One diameter fits the tallest stack on the fold.
 * A 375 host that still cannot fit shows a +N badge for the dots it hides.
 */
export function layoutNumberLineReveal(
  inputs: NameLayoutDot[],
  widthPx: number,
  options?: {
    barPx?: number;
    bannerPx?: number;
    viewportPx?: number;
    chromePx?: number;
    scoreRowPx?: number;
  },
): NumberLineRevealLayout {
  const width = Math.max(1, widthPx);
  const viewportPx = options?.viewportPx ?? hostViewportPx(width);
  const barPx = options?.barPx ?? hostBarPx(width);
  const bannerPx = Math.max(0, options?.bannerPx ?? 0);
  const chromePx = options?.chromePx ?? hostChromeBeforePx(width);
  const scoreRowPx = options?.scoreRowPx ?? hostScoreRowPx(width);
  const placed = inputs.map((dot) => ({
    ...dot,
    x: (Math.min(100, Math.max(0, dot.xPercent)) / 100) * width,
  }));

  const bins = new Map<number, typeof placed>();
  for (const dot of placed) {
    const bin = Math.round(dot.x / NL_BIN_PX);
    const list = bins.get(bin) ?? [];
    list.push(dot);
    bins.set(bin, list);
  }

  const groups: Group[] = [];
  const drawX = new Map<string, number>();

  for (const bin of [...bins.keys()].sort((a, b) => a - b)) {
    const dots = bins.get(bin)!;
    const byValue = new Map<string, typeof dots>();
    for (const dot of dots) {
      const key = dot.value == null ? `id:${dot.id}` : `v:${valueKey(dot.value)}`;
      const list = byValue.get(key) ?? [];
      list.push(dot);
      byValue.set(key, list);
    }
    for (const list of byValue.values()) {
      const anchor = list[0]!.x;
      const ids = list.map((dot) => dot.id);
      for (const dot of list) drawX.set(dot.id, dot.x);
      groups.push({
        id: list[0]!.id,
        anchorX: anchor,
        ids,
        names: list.flatMap((dot) => (dot.name ? [dot.name] : [])),
        stacks: ids.map((_, index) => index),
      });
    }
  }

  const chipGroups: Group[] = [];
  for (const group of groups) {
    const host = chipGroups[chipGroups.length - 1];
    const hostXs = host ? host.ids.map((id) => drawX.get(id) ?? host.anchorX) : [];
    const nextXs = group.ids.map((id) => drawX.get(id) ?? group.anchorX);
    const inside =
      host != null &&
      host.names.length > 0 &&
      group.names.length > 0 &&
      [...hostXs, ...nextXs].every((x) => Math.abs(x - host.anchorX) <= NL_GROUP_WINDOW_PX);
    if (host && inside) {
      host.ids.push(...group.ids);
      host.names.push(...group.names);
      continue;
    }
    chipGroups.push({
      id: group.id,
      anchorX: group.anchorX,
      ids: [...group.ids],
      names: [...group.names],
      stacks: group.stacks,
    });
  }

  const drafts: Draft[] = [];
  for (const group of chipGroups) {
    if (group.names.length === 0) continue;
    const text = formatChipText(group.names);
    const chip = chipWidthPx(text, width);
    drafts.push({
      id: group.id,
      names: group.names,
      memberIds: [...group.ids],
      anchorX: group.anchorX,
      width: chip,
      left: clampLeft(group.anchorX, chip, width),
      lane: 0,
      text,
    });
  }

  const parked = new Set<string>();

  function hits(draft: Draft, lane: number): boolean {
    const right = draft.left + draft.width;
    for (const other of drafts) {
      if (other.id === draft.id || !parked.has(other.id) || other.lane !== lane) continue;
      if (
        draft.left < other.left + other.width + NL_CHIP_GAP_PX &&
        other.left < right + NL_CHIP_GAP_PX
      ) {
        return true;
      }
    }
    return false;
  }

  function tryPlace(draft: Draft, maxLanes: number): boolean {
    draft.left = clampLeft(draft.anchorX, draft.width, width);
    for (let lane = 0; lane < maxLanes; lane++) {
      if (!hits(draft, lane)) {
        draft.lane = lane;
        return true;
      }
    }
    for (let shift = 4; shift <= NL_BIN_PX; shift += 4) {
      for (const sign of [-1, 1]) {
        draft.left = clampLeft(draft.anchorX + sign * shift, draft.width, width);
        for (let lane = 0; lane < maxLanes; lane++) {
          if (!hits(draft, lane)) {
            draft.lane = lane;
            return true;
          }
        }
      }
    }
    draft.left = clampLeft(draft.anchorX, draft.width, width);
    return false;
  }

  const pending = [...drafts].sort((a, b) => a.anchorX - b.anchorX || a.id.localeCompare(b.id));
  const pack = (maxLanes: number) => {
    parked.clear();
    for (const draft of pending) {
      if (!tryPlace(draft, maxLanes)) return false;
      parked.add(draft.id);
    }
    return true;
  };

  function compose(
    mergeBadges: boolean,
    slotCap: number | null,
    laneMax: number,
  ): NumberLineRevealLayout {
  let laneCap = 1;
  const laneCeiling = Math.max(laneMax, 1);
  while (laneCap < laneCeiling && !pack(laneCap)) laneCap += 1;
  if (laneMax <= 0) parked.clear();
  else pack(laneCap);
  const foldRows = mergeBadges && laneMax < NL_MAX_LANES;
  const chipDrafts = foldRows ? drafts.filter((draft) => parked.has(draft.id)) : drafts;
  const foldedIds = new Set(
    foldRows
      ? drafts.filter((draft) => !parked.has(draft.id)).flatMap((draft) => draft.memberIds)
      : [],
  );

  let aboveRows = 0;
  let belowRows = 0;
  for (const draft of chipDrafts) {
    const row = Math.floor(draft.lane / 2) + 1;
    if (draft.lane % 2 === 0) aboveRows = Math.max(aboveRows, row);
    else belowRows = Math.max(belowRows, row);
  }

  const aboveChip =
    aboveRows === 0 ? 0 : aboveRows * NL_CHIP_H + Math.max(0, aboveRows - 1) * NL_CHIP_GAP_PX;
  const belowSpace =
    belowRows === 0 ? 0 : belowRows * NL_CHIP_H + Math.max(0, belowRows - 1) * NL_CHIP_GAP_PX;

  const chipBlock = aboveChip + (aboveRows > 0 ? NL_CHIP_GAP_PX : 0) + belowSpace;
  const limit = viewportPx - bannerPx - barPx - NL_BAR_GAP_PX;
  const trackPastFlag = NL_RAIL_PX + NL_LABELS_PX + belowSpace + scoreRowPx - NL_FLAG_BOTTOM_IN_RAIL;
  const protrusionRoom = Math.max(
    0,
    limit - chromePx - aboveChip - (aboveRows > 0 ? NL_CHIP_GAP_PX : 0) - NL_FLAG_BOTTOM_IN_RAIL - Math.max(0, trackPastFlag),
  );

  const stackRoom = protrusionRoom + NL_FLAG_BOTTOM_IN_RAIL;
  const ranked = [...placed].sort((a, b) => {
    const av = a.value ?? 0;
    const bv = b.value ?? 0;
    if (av !== bv) return av - bv;
    if (a.x !== b.x) return a.x - b.x;
    return a.id.localeCompare(b.id);
  });

  function slotOf(diameter: number): Map<string, number> {
    const slots = new Map<string, number>();
    const used: { x: number; slot: number }[] = [];
    for (const dot of ranked) {
      const blocked = new Set<number>();
      for (const prev of used) {
        if (Math.abs(prev.x - dot.x) < diameter) blocked.add(prev.slot);
      }
      let slot = 0;
      while (blocked.has(slot)) slot += 1;
      slots.set(dot.id, slot);
      used.push({ x: dot.x, slot });
    }
    return slots;
  }

  function maxSlotOf(packed: Map<string, number>, skip?: Set<string>): number {
    let max = 0;
    for (const [id, slot] of packed) {
      if (skip?.has(id)) continue;
      max = Math.max(max, slot);
    }
    return max;
  }

  function stackHeight(maxSlot: number, size: number): number {
    return maxSlot * (size + NL_DOT_GAP_PX) + size;
  }

  let diameter = NL_DOT_MIN_PX;
  let slots = slotOf(diameter);
  for (let candidate = NL_DOT_MAX_PX; candidate >= NL_DOT_MIN_PX; candidate -= 0.25) {
    const packed = slotOf(candidate);
    if (stackHeight(maxSlotOf(packed), candidate) <= stackRoom + 0.05) {
      diameter = candidate;
      slots = packed;
      break;
    }
  }

  const capped = stackHeight(maxSlotOf(slots), diameter) > stackRoom + 0.05;
  let hidden = new Set<string>();
  if (capped) {
    const badgeBlock = NL_CHIP_H + NL_DOT_GAP_PX;
    const dotRoom = Math.max(NL_DOT_MIN_PX, stackRoom - badgeBlock);
    const pitch = NL_DOT_MIN_PX + NL_DOT_GAP_PX;
    const visibleMax = Math.max(0, Math.floor((dotRoom - NL_DOT_MIN_PX) / pitch));
    slots = slotOf(NL_DOT_MIN_PX);
    diameter = NL_DOT_MIN_PX;
    hidden = new Set(
      ranked.filter((dot) => (slots.get(dot.id) ?? 0) > visibleMax).map((dot) => dot.id),
    );
  }
  if (slotCap !== null) {
    diameter = NL_DOT_MIN_PX;
    slots = slotOf(diameter);
    hidden = new Set(
      ranked.filter((dot) => (slots.get(dot.id) ?? 0) > slotCap).map((dot) => dot.id),
    );
  }
  for (const id of foldedIds) hidden.add(id);

  const pitch = diameter + NL_DOT_GAP_PX;
  const usedSlot = maxSlotOf(slots, hidden);
  const badgeBlock = hidden.size > 0 ? NL_CHIP_H + NL_DOT_GAP_PX : 0;
  let base = NL_LINE_BOTTOM_IN_RAIL - diameter;
  const topLimit = -protrusionRoom + badgeBlock;
  if (base - usedSlot * pitch < topLimit) base = topLimit + usedSlot * pitch;
  if (base + diameter > NL_FLAG_BOTTOM_IN_RAIL) base = NL_FLAG_BOTTOM_IN_RAIL - diameter;

  const relTop = new Map<string, number>();
  for (const dot of ranked) {
    if (hidden.has(dot.id)) continue;
    relTop.set(dot.id, base - (slots.get(dot.id) ?? 0) * pitch);
  }

  type BadgeDraft = {
    id: string;
    text: string;
    count: number;
    memberIds: string[];
    names: string[];
    left: number;
    top: number;
    width: number;
  };
  let badgeDrafts: BadgeDraft[] = [];
  if (hidden.size > 0) {
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      const next = parent.get(id) ?? id;
      if (next === id) return id;
      const root = find(next);
      parent.set(id, root);
      return root;
    };
    for (const dot of ranked) parent.set(dot.id, dot.id);
    for (let i = 0; i < ranked.length; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        if (Math.abs(ranked[i]!.x - ranked[j]!.x) >= diameter) continue;
        parent.set(find(ranked[i]!.id), find(ranked[j]!.id));
      }
    }
    const members = new Map<string, typeof ranked>();
    for (const dot of ranked) {
      const root = find(dot.id);
      const list = members.get(root) ?? [];
      list.push(dot);
      members.set(root, list);
    }
    for (const [root, list] of members) {
      const concealed = list.filter((dot) => hidden.has(dot.id));
      if (concealed.length === 0) continue;
      const shown = list.filter((dot) => !hidden.has(dot.id));
      const anchor =
        shown.length > 0
          ? shown.reduce((sum, dot) => sum + dot.x, 0) / shown.length
          : list.reduce((sum, dot) => sum + dot.x, 0) / list.length;
      const text = `+${concealed.length}`;
      const badgeWidth = chipWidthPx(text, width);
      const highest = shown.reduce(
        (top, dot) => Math.min(top, relTop.get(dot.id) ?? NL_DOT_TOP_IN_RAIL),
        NL_DOT_TOP_IN_RAIL,
      );
      badgeDrafts.push({
        id: `badge-${root}`,
        text,
        count: concealed.length,
        memberIds: concealed.map((dot) => dot.id),
        names: concealed.flatMap((dot) => (dot.name ? [dot.name] : [])),
        left: clampLeft(anchor, badgeWidth, width),
        top: highest - NL_DOT_GAP_PX - NL_CHIP_H,
        width: badgeWidth,
      });
    }
    for (let guard = 0; guard < badgeDrafts.length + ranked.length; guard++) {
      let moved = false;
      for (const badge of badgeDrafts) {
        const box = {
          left: badge.left,
          right: badge.left + badge.width,
          top: badge.top,
          bottom: badge.top + NL_CHIP_H,
        };
        let ceiling = box.top;
        for (const dot of ranked) {
          if (hidden.has(dot.id)) continue;
          const top = relTop.get(dot.id) ?? 0;
          const dotBox = {
            left: dot.x - diameter / 2,
            right: dot.x + diameter / 2,
            top,
            bottom: top + diameter,
          };
          if (boxesOverlap(box, dotBox)) ceiling = Math.min(ceiling, top - NL_DOT_GAP_PX - NL_CHIP_H);
        }
        for (const other of badgeDrafts) {
          if (other.id === badge.id) continue;
          const otherBox = {
            left: other.left,
            right: other.left + other.width,
            top: other.top,
            bottom: other.top + NL_CHIP_H,
          };
          if (boxesOverlap(box, otherBox)) ceiling = Math.min(ceiling, other.top - NL_DOT_GAP_PX - NL_CHIP_H);
        }
        if (ceiling < badge.top - 0.5) {
          badge.top = ceiling;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }
  if (mergeBadges && badgeDrafts.length > 0) {
    const memberIds = [...new Set(badgeDrafts.flatMap((badge) => badge.memberIds))];
    const names = badgeDrafts.flatMap((badge) => badge.names);
    const text = `+${memberIds.length}`;
    const badgeWidth = chipWidthPx(text, width);
    const anchor =
      badgeDrafts.reduce((sum, badge) => sum + badge.left + badge.width / 2, 0) / badgeDrafts.length;
    badgeDrafts = [
      {
        id: "badge-merged",
        text,
        count: memberIds.length,
        memberIds,
        names,
        left: clampLeft(anchor, badgeWidth, width),
        top: -protrusionRoom,
        width: badgeWidth,
      },
    ];
  }

  let highest = NL_DOT_TOP_IN_RAIL;
  for (const top of relTop.values()) highest = Math.min(highest, top);
  for (const badge of badgeDrafts) highest = Math.min(highest, badge.top);
  const protrusion = Math.max(0, -highest);
  const aboveSpace = aboveChip + (aboveRows > 0 ? NL_CHIP_GAP_PX : 0) + protrusion;
  const belowStart = aboveSpace + NL_RAIL_PX + NL_LABELS_PX;

  const dots: RevealDot[] = ranked.flatMap((dot) => {
    if (hidden.has(dot.id)) return [];
    const top = aboveSpace + (relTop.get(dot.id) ?? NL_DOT_TOP_IN_RAIL);
    return [
      {
        id: dot.id,
        x: dot.x,
        stack: slots.get(dot.id) ?? 0,
        size: diameter,
        box: {
          left: dot.x - diameter / 2,
          right: dot.x + diameter / 2,
          top,
          bottom: top + diameter,
        },
      },
    ];
  });
  const badges: RevealBadge[] = badgeDrafts.map((badge) => ({
    id: badge.id,
    text: badge.text,
    count: badge.count,
    memberIds: badge.memberIds,
    names: badge.names,
    box: {
      left: badge.left,
      right: badge.left + badge.width,
      top: aboveSpace + badge.top,
      bottom: aboveSpace + badge.top + NL_CHIP_H,
    },
  }));

  const chips: RevealChip[] = chipDrafts.map((draft) => {
    const row = Math.floor(draft.lane / 2);
    const above = draft.lane % 2 === 0;
    const top = above
      ? aboveChip - (row + 1) * NL_CHIP_H - row * NL_CHIP_GAP_PX
      : belowStart + row * (NL_CHIP_H + NL_CHIP_GAP_PX);
    return {
      id: draft.id,
      text: draft.text,
      fullNames: [...draft.names],
      memberIds: [...draft.memberIds],
      anchorX: draft.anchorX,
      box: {
        left: draft.left,
        right: draft.left + draft.width,
        top,
        bottom: top + NL_CHIP_H,
      },
    };
  });

  const leaders: RevealLeader[] = [];
  const labelTop = aboveSpace + NL_RAIL_PX;
  const labelBottom = labelTop + NL_LABELS_PX;
  function pushLeader(x: number, y1: number, y2: number) {
    const lo = Math.min(y1, y2);
    const hi = Math.max(y1, y2);
    const pieces: [number, number][] = [];
    if (hi <= labelTop || lo >= labelBottom) pieces.push([lo, hi]);
    else {
      if (lo < labelTop - 1) pieces.push([lo, Math.min(hi, labelTop)]);
      if (hi > labelBottom + 1) pieces.push([Math.max(lo, labelBottom), hi]);
    }
    for (const [start, end] of pieces) {
      if (end > start + 1) leaders.push({ x, y1: start, y2: end });
    }
  }

  for (const chip of chips) {
    const members = dots.filter((dot) => chip.memberIds.includes(dot.id));
    if (members.length === 0) continue;
    const x = Math.min(chip.box.right - 2, Math.max(chip.box.left + 2, chip.anchorX));
    const above = chip.box.bottom <= aboveSpace + 1;
    let y1 = above ? chip.box.bottom : Math.min(...members.map((dot) => dot.box.bottom));
    let y2 = above ? Math.min(...members.map((dot) => dot.box.top)) : chip.box.top;
    if (y2 < y1) [y1, y2] = [y2, y1];
    const obstacles = [
      ...chips.filter((item) => item.id !== chip.id).map((item) => item.box),
      ...badges.map((item) => item.box),
    ];
    for (const other of obstacles) {
      if (x <= other.left || x >= other.right) continue;
      if (other.top >= y1 && other.top < y2) y2 = other.top;
      if (other.bottom > y1 && other.bottom <= y2) y1 = other.bottom;
    }
    if (y2 > y1 + 1) pushLeader(x, y1, y2);
  }

  const revealHeight = aboveSpace + NL_RAIL_PX + NL_LABELS_PX + belowSpace;
  return {
    width,
    dotSize: diameter,
    dots,
    badges,
    chips,
    leaders,
    aboveSpace,
    belowSpace,
    nameSpace: aboveSpace,
    revealHeight,
    chromePx,
    barPx,
    bannerPx,
    viewportPx,
    scoreRowPx,
  };
  }

  const clearLimit = viewportPx - bannerPx - barPx - NL_BAR_GAP_PX;
  const fits = (laid: NumberLineRevealLayout) => hostStatsBottom(laid) <= clearLimit + 0.05;
  let laid = compose(false, null, NL_MAX_LANES);
  if (!fits(laid)) {
    const merged = compose(true, null, NL_MAX_LANES);
    if (fits(merged)) laid = merged;
    else {
      let found: NumberLineRevealLayout | null = null;
      for (let cap = 24; cap >= -1; cap -= 1) {
        const candidate = compose(true, cap, NL_MAX_LANES);
        if (fits(candidate)) {
          found = candidate;
          break;
        }
      }
      if (found) laid = found;
    }
  }
  return laid;
}
