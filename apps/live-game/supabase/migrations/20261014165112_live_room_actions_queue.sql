-- LG-ROOM-STORE D1: append-only action queue so concurrent taps never conflict or get lost.
-- Each tap/host action is inserted as its own row; any request folds pending rows into
-- live_rooms.state and deletes them in the same transaction (live_room_commit).
create table public.live_room_actions (
  id bigint generated always as identity primary key,
  code text not null references public.live_rooms (code) on delete cascade,
  action jsonb not null,
  created_at timestamptz not null default now()
);
create index live_room_actions_code_id_idx on public.live_room_actions (code, id);
alter table public.live_room_actions enable row level security;
revoke all on table public.live_room_actions from anon, authenticated, public;
grant all on table public.live_room_actions to service_role;

create or replace function public.live_room_load(p_code text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'state', r.state,
    'version', r.version,
    'updated_at', r.updated_at,
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'action', a.action) order by a.id)
      from public.live_room_actions a where a.code = r.code
    ), '[]'::jsonb)
  )
  from public.live_rooms r where r.code = p_code
$$;

create or replace function public.live_room_commit(
  p_code text, p_version integer, p_state jsonb, p_applied bigint[]
) returns boolean language plpgsql set search_path = public as $$
begin
  update public.live_rooms
     set state = p_state, version = p_version + 1, updated_at = now()
   where code = p_code and version = p_version;
  if not found then
    return false;
  end if;
  if p_applied is not null and coalesce(array_length(p_applied, 1), 0) > 0 then
    delete from public.live_room_actions where code = p_code and id = any (p_applied);
  end if;
  return true;
end
$$;

revoke all on function public.live_room_load(text) from public, anon, authenticated;
revoke all on function public.live_room_commit(text, integer, jsonb, bigint[]) from public, anon, authenticated;
grant execute on function public.live_room_load(text) to service_role;
grant execute on function public.live_room_commit(text, integer, jsonb, bigint[]) to service_role;
