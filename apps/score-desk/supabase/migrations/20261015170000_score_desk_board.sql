-- PROPOSED, NOT APPLIED. Additive only: one boards row that Score Desk product_codes bind to.
-- status = 'draft' on purpose: apps/live-game redeem requires status 'ready', so a Score Desk
-- code typed into play.teach4texas.com is rejected (GAME_UNAVAILABLE) instead of opening an empty game.
-- apps/score-desk only checks product_codes.board_id = 'score_desk_full' (+ revoked/max_sessions).
-- The buyer code itself is minted the same way as live-game codes (hash only, never plaintext),
-- label '17493794', after Andrew approves prod.
insert into public.boards (id, title, grade, subject, theme, status, tpt_sku, cells)
values ('score_desk_full', 'Teach4Texas Score Desk (full mode unlock)', 3, 'rla', 'score-desk', 'draft', '17493794', '[]'::jsonb)
on conflict (id) do nothing;
