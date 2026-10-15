# Teach4Texas Score Desk (apps/score-desk)

Next.js 16 app. Vercel project `teach4texas-score-desk`, Root Directory `apps/score-desk`.

- **Sample mode** (default, public): seeded classes/students/scores in `sessionStorage` (resets per session). Persistent CTA to the free TPT listing 17493794.
- **Unlocked mode**: `POST /api/redeem` checks `product_codes` (sha256 of normalized code, same model as apps/live-game) where `board_id = SCORE_DESK_BOARD_ID` (`score_desk_full`). Success sets an HttpOnly HMAC cookie; data lives in `localStorage` on the teacher's device. No student data leaves the browser; no schema changes needed beyond the proposed boards row in `supabase/migrations`.
- Rubrics: `src/data/rubrics.json`, extracted verbatim from the original Score Desk.

Env (server-only, never `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SCORE_DESK_COOKIE_SECRET`, `SCORE_DESK_BOARD_ID`, preview-only `SCORE_DESK_PREVIEW_CODE_HASHES`.
