-- LG-ROOM-STORE R2 (P2-L1): enqueue + load in ONE round trip for the tap path.
create or replace function public.live_room_enqueue_load(p_code text, p_action jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare v_id bigint;
begin
  if not exists (select 1 from public.live_rooms where code = p_code) then
    return null;
  end if;
  insert into public.live_room_actions (code, action) values (p_code, p_action) returning id into v_id;
  return public.live_room_load(p_code) || jsonb_build_object('own_id', v_id);
end
$$;
revoke all on function public.live_room_enqueue_load(text, jsonb) from public, anon, authenticated;
grant execute on function public.live_room_enqueue_load(text, jsonb) to service_role;
