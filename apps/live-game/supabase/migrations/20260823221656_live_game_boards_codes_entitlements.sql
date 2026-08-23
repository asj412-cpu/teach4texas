-- Durable live-game store: boards, hashed product codes, hashed host entitlements.
-- No student accounts, emails, or PII. Service role only; RLS on, no client write policies.

create table public.boards (
  id text primary key,
  title text not null,
  grade smallint not null check (grade in (3, 4, 5)),
  subject text not null check (subject in ('math', 'rla', 'science')),
  theme text,
  status text not null check (status in ('generating', 'draft', 'ready', 'failed')),
  tpt_sku text,
  cells jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boards_status_idx on public.boards (status);

create table public.product_codes (
  id text primary key,
  code_hash char(64) not null,
  board_id text not null references public.boards (id) on delete restrict,
  label text,
  max_sessions integer,
  sessions_started integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint product_codes_code_hash_hex check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint product_codes_max_sessions_pos check (max_sessions is null or max_sessions > 0),
  constraint product_codes_sessions_nonneg check (sessions_started >= 0)
);

create unique index product_codes_code_hash_uidx on public.product_codes (code_hash);
create index product_codes_board_id_idx on public.product_codes (board_id);

create table public.entitlements (
  entitlement_id text primary key,
  board_id text not null references public.boards (id) on delete restrict,
  product_code_id text not null references public.product_codes (id) on delete restrict,
  token_hash char(64) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint entitlements_token_hash_hex check (token_hash ~ '^[0-9a-f]{64}$')
);

create unique index entitlements_token_hash_uidx on public.entitlements (token_hash);
create index entitlements_board_id_idx on public.entitlements (board_id);
create index entitlements_product_code_id_idx on public.entitlements (product_code_id);

alter table public.boards enable row level security;
alter table public.product_codes enable row level security;
alter table public.entitlements enable row level security;

revoke all on table public.boards from anon, authenticated, public;
revoke all on table public.product_codes from anon, authenticated, public;
revoke all on table public.entitlements from anon, authenticated, public;

grant all on table public.boards to service_role;
grant all on table public.product_codes to service_role;
grant all on table public.entitlements to service_role;
