-- RLS: an authenticated user can remove a 'bought' log entry (undo of "mark as bought").
-- Runs inside a transaction that is always rolled back, so it is safe against any DB.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_shopping_log.sql
begin;

do $$
declare
  v_user uuid;
  v_house uuid;
  v_log uuid;
  v_deleted int;
begin
  select p.id, h.house_id into v_user, v_house
  from profile p join household h on h.id = p.household_id
  limit 1;

  insert into shopping_item_log (house_id, action, item_name, created_by)
  values (v_house, 'bought', '__rls_test__', v_user)
  returning id into v_log;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;

  delete from shopping_item_log where id = v_log;
  get diagnostics v_deleted = row_count;

  if v_deleted <> 1 then
    raise exception 'FAIL: authenticated user deleted % shopping_item_log rows, expected 1', v_deleted;
  end if;
  raise notice 'PASS: authenticated user can delete shopping_item_log rows';
end $$;

rollback;
