-- Redeem telemetry for money pulse: demo vs paid. No PII / student accounts.
create table public.redemption_events (
  id text primary key,
  board_id text not null references public.boards (id) on delete restrict,
  product_code_id text not null references public.product_codes (id) on delete restrict,
  kind text not null check (kind in ('demo', 'paid')),
  created_at timestamptz not null default now()
);
create index redemption_events_created_at_idx on public.redemption_events (created_at desc);
create index redemption_events_kind_created_idx on public.redemption_events (kind, created_at desc);
alter table public.redemption_events enable row level security;
revoke all on table public.redemption_events from anon, authenticated, public;
grant all on table public.redemption_events to service_role;
