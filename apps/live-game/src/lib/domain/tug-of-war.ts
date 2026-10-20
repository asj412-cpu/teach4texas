import type { GameBoard, TugOfWarItem } from "@/lib/domain/board";
import { kidPlainText } from "@/lib/plain-text";

/** CUT-2026-10-19-tug_of_war: 2 teams, MCQ rounds, pull = correct / team size. */
export type TowTeam = "red" | "blue";
export const TOW_TEAMS: TowTeam[] = ["red", "blue"];
export const TOW_TEAM_NAME: Record<TowTeam, string> = {
  red: "Red Rockets",
  blue: "Blue Comets",
};
/** Rope moves (blue_pull − red_pull) × STEP per round; ±1 is a team's line. */
export const TOW_STEP = 0.25;
export const TOW_ROUND_CHOICES = [8, 12, 16] as const;
export const TOW_DEFAULT_ROUNDS = 8;
export const TOW_POINTS_PER_CORRECT = 100;

export type TowStage = "ready" | "question" | "reveal";

export type TowRoundResult = {
  /** Server-only snapshot of who answered what (stripped from views). */
  answers?: Record<string, number>;
  round: number;
  item_id: string;
  red_correct: number;
  red_size: number;
  red_pull: number;
  blue_correct: number;
  blue_size: number;
  blue_pull: number;
  /** Signed move this round: + toward Blue's line, − toward Red's line. */
  move: number;
  position_after: number;
};

export type TowState = {
  teams: Record<string, TowTeam>;
  rounds_total: number;
  /** Rounds opened so far (1-based number of the current/last round; 0 before the first). */
  round: number;
  stage: TowStage;
  paused: boolean;
  /** −1 = Red's line … 0 center … +1 = Blue's line. */
  position: number;
  /** player_id → choice index for the open round (students only). */
  answers: Record<string, number>;
  history: TowRoundResult[];
  winner: TowTeam | "tie" | null;
  win_kind: "line" | "rounds" | "ended" | null;
};

export function createTowState(rounds = TOW_DEFAULT_ROUNDS): TowState {
  return {
    teams: {},
    rounds_total: rounds,
    round: 0,
    stage: "ready",
    paused: false,
    position: 0,
    answers: {},
    history: [],
    winner: null,
    win_kind: null,
  };
}

export function towItemsFromBoard(board: GameBoard): TugOfWarItem[] {
  return (board.tow_items ?? []).slice(0, 16);
}

export function teamCounts(teams: Record<string, TowTeam>, ids?: string[]) {
  const c = { red: 0, blue: 0 };
  for (const [pid, t] of Object.entries(teams)) {
    if (ids && !ids.includes(pid)) continue;
    c[t] += 1;
  }
  return c;
}

/** Balanced auto-split: join the smaller team; on a tie alternate by join order (red first). */
export function pickTeamForNewPlayer(teams: Record<string, TowTeam>): TowTeam {
  const c = teamCounts(teams);
  if (c.red < c.blue) return "red";
  if (c.blue < c.red) return "blue";
  return Object.keys(teams).length % 2 === 0 ? "red" : "blue";
}

export function roundPull(correct: number, size: number): number {
  return size > 0 ? correct / size : 0;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Pure round scoring. `answers` are player_id → choice; `teams` the roster at round time.
 * Pull = correct ÷ team size, so a 3-player team and a 4-player team are scored fairly.
 */
export function scoreTowRound(input: {
  round: number;
  item: TugOfWarItem;
  teams: Record<string, TowTeam>;
  answers: Record<string, number>;
  position: number;
}): TowRoundResult {
  const size = teamCounts(input.teams);
  const correct = { red: 0, blue: 0 };
  for (const [pid, team] of Object.entries(input.teams)) {
    if (input.answers[pid] === input.item.correct_index) correct[team] += 1;
  }
  const red_pull = roundPull(correct.red, size.red);
  const blue_pull = roundPull(correct.blue, size.blue);
  const move = (blue_pull - red_pull) * TOW_STEP;
  const position_after = Math.max(-1, Math.min(1, r4(input.position + move)));
  return {
    round: input.round,
    item_id: input.item.id,
    red_correct: correct.red,
    red_size: size.red,
    red_pull: r4(red_pull),
    blue_correct: correct.blue,
    blue_size: size.blue,
    blue_pull: r4(blue_pull),
    move: r4(move),
    position_after,
  };
}

/** Winner after a reveal: line crossed, or round limit reached (side of center; 0 = tie). */
export function towOutcome(
  position: number,
  round: number,
  roundsTotal: number,
): { winner: TowTeam | "tie"; win_kind: "line" | "rounds" } | null {
  if (position >= 1) return { winner: "blue", win_kind: "line" };
  if (position <= -1) return { winner: "red", win_kind: "line" };
  if (round >= roundsTotal) {
    if (Math.abs(position) < 1e-9) return { winner: "tie", win_kind: "rounds" };
    return { winner: position > 0 ? "blue" : "red", win_kind: "rounds" };
  }
  return null;
}

/** Same rule for "End game" early: whoever has ground wins, center = tie. */
export function towOutcomeEnded(position: number): TowTeam | "tie" {
  if (Math.abs(position) < 1e-9) return "tie";
  return position > 0 ? "blue" : "red";
}

export type TowQuestionView = {
  prompt: string;
  choices: [string, string, string, string];
  teks: string | null;
  /** Only after reveal. */
  correct_index: number | null;
};

export function towQuestionView(
  items: TugOfWarItem[],
  st: TowState,
): TowQuestionView | null {
  if (st.round < 1 || st.stage === "ready") return null;
  const item = items[(st.round - 1) % Math.max(1, items.length)];
  if (!item) return null;
  return {
    prompt: kidPlainText(item.prompt, 200),
    choices: item.choices.map((c) => kidPlainText(c, 60)) as [string, string, string, string],
    teks: item.teks ?? null,
    correct_index: st.stage === "reveal" ? item.correct_index : null,
  };
}

export function fmtPull(n: number): string {
  return n.toFixed(2);
}
