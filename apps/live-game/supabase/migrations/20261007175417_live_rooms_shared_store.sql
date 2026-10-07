-- LG-ROOM-STORE: shared live room state so every serverless instance sees the same room.
-- One row per live room. No student accounts; state holds display names + scores only. Rows purged after 6h idle.
create table public.live_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index live_rooms_updated_at_idx on public.live_rooms (updated_at);
alter table public.live_rooms enable row level security;
revoke all on table public.live_rooms from anon, authenticated, public;
grant all on table public.live_rooms to service_role;
