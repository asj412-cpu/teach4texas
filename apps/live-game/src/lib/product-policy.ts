/**
 * Commercial product policy for Teach4Texas Live Game Show.
 *
 * Teachers NEVER generate, invent, or browse free games in this app.
 * Games are sold as discrete products on Teachers Pay Teachers.
 * Each purchase includes an access code that unlocks that one paid game for hosting.
 *
 * Who can create content?
 * - Operator / publisher only (you), via secret-gated admin APIs or offline tooling.
 * Who can play as host?
 * - Anyone with a valid, unrevoked product access code for that board.
 */

export const TEACHER_CAPABILITIES = {
  redeemAccessCode: true,
  hostUnlockedGame: true,
  startLiveSession: true, // when multiplayer ships
  /** Teachers cannot create or AI-generate boards. */
  generateGames: false,
  createBoards: false,
  editBoardContent: false,
  listAllGames: false,
  freePlayWithoutCode: false,
} as const;

export const OPERATOR_CAPABILITIES = {
  createBoards: true,
  generateBoardsWithAi: true, // inventory pipeline only — not exposed to teachers
  mintProductAccessCodes: true,
  revokeCodes: true,
  listInventory: true,
} as const;

export const TEACHER_NO_GENERATE_MESSAGE =
  "Games are sold on Teachers Pay Teachers. This site only unlocks games you purchased (via access code). There is no free game generator for teachers.";
