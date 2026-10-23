-- Usage tracking (CUT-2026-10-23). Additive only: no existing column/row altered or dropped.
alter table public.entitlements add column if not exists redemption_event_id text;
alter table public.redemption_events add column if not exists first_room_started_at timestamptz;

create table if not exists public.game_sessions (
  id text primary key,
  redemption_event_id text,
  product_code_id text references public.product_codes (id) on delete set null,
  is_demo boolean not null,
  is_test boolean not null default false,
  board_id text not null,
  game_type text not null,
  player_count integer not null default 0 check (player_count >= 0),
  questions_answered integer not null default 0 check (questions_answered >= 0),
  minutes numeric(6,1) not null default 0 check (minutes >= 0),
  outcome text not null check (outcome in ('finished','abandoned')),
  action_errors integer not null default 0 check (action_errors >= 0),
  host_rating smallint check (host_rating in (-1, 1)),
  host_note text check (host_note is null or char_length(host_note) <= 500),
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_sessions_created_idx on public.game_sessions (created_at desc);
create index if not exists game_sessions_pc_idx on public.game_sessions (product_code_id);

alter table public.game_sessions enable row level security;   -- no policies: server (service_role) only
revoke all on table public.game_sessions from anon, authenticated, public;
grant select, insert, update on table public.game_sessions to service_role;  -- explicit GRANT (Supabase, from Oct 30)

create or replace function public.ut_record_room_start(p_product_code_id text, p_redemption_event_id text)
returns void language sql security invoker set search_path = public as $$
  update public.product_codes set sessions_started = coalesce(sessions_started, 0) + 1 where id = p_product_code_id;
  update public.redemption_events set first_room_started_at = coalesce(first_room_started_at, now())
   where id = p_redemption_event_id;
$$;
revoke all on function public.ut_record_room_start(text, text) from public, anon, authenticated;
grant execute on function public.ut_record_room_start(text, text) to service_role;

create or replace view public.game_sessions_sales_v with (security_invoker = true) as
  select * from public.game_sessions where not is_demo and not is_test;
revoke all on public.game_sessions_sales_v from anon, authenticated, public;
grant select on public.game_sessions_sales_v to service_role;
