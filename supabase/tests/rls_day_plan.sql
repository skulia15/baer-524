-- day_plan: two households can sign up for the same shared-week day, each only as itself.
-- Runs inside a transaction that is always rolled back, so it is safe against any DB.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_day_plan.sql
begin;

do $$
declare
  v_user_a uuid;
  v_hh_a uuid;
  v_user_b uuid;
  v_hh_b uuid;
  v_week uuid;
  v_day date;
begin
  select p.id, p.household_id into v_user_a, v_hh_a from profile p limit 1;
  select p.id, p.household_id into v_user_b, v_hh_b from profile p where p.household_id <> v_hh_a limit 1;
  select id, week_start into v_week, v_day from week_allocation where type <> 'household' limit 1;

  set local role authenticated;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  insert into day_plan (week_allocation_id, date, household_id) values (v_week, v_day, v_hh_a);

  perform set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  insert into day_plan (week_allocation_id, date, household_id) values (v_week, v_day, v_hh_b);

  begin
    insert into day_plan (week_allocation_id, date, household_id) values (v_week, v_day + 1, v_hh_a);
    raise exception 'FAIL: household B signed up household A';
  exception when insufficient_privilege then
    null; -- expected: RLS only lets you write your own household's plans
  end;

  if (select count(*) from day_plan where week_allocation_id = v_week and date = v_day) <> 2 then
    raise exception 'FAIL: expected two households signed up for the same day';
  end if;
  raise notice 'PASS: shared-week day has sign-ups from two households; cannot sign up others';
end $$;

rollback;
