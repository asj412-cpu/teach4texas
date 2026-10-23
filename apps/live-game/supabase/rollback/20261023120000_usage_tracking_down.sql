-- Rollback for 20261023120000_usage_tracking.sql. Removes ONLY objects that migration added.
drop view if exists public.game_sessions_sales_v;
drop function if exists public.ut_record_room_start(text, text);
drop table if exists public.game_sessions;
alter table public.redemption_events drop column if exists first_room_started_at;
alter table public.entitlements drop column if exists redemption_event_id;
