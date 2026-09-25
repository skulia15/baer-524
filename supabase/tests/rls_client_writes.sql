-- RLS: what an authenticated user may write directly with the public anon key.
-- Every write the app needs beyond these goes through server actions (service role).
-- Runs inside a transaction that is always rolled back, so it is safe against any DB.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_client_writes.sql
begin;

create temp table rls_results (check_name text, passed boolean, detail text) on commit drop;
grant all on rls_results to authenticated;

do $$
declare
  v_head uuid;
  v_household uuid;
  v_other_household uuid;
  v_week uuid;
  v_request uuid;
  v_stranger uuid := gen_random_uuid();
  n int;
begin
  select p.id, p.household_id into v_head, v_household
  from profile p where p.role = 'head' limit 1;
  select id into v_other_household from household where id <> v_household limit 1;
  select id into v_week from week_allocation where household_id = v_other_household limit 1;
  select id into v_request from request limit 1;

  -- an auth user with no profile yet (e.g. from public sign-up)
  insert into auth.users (id, email, aud, role) values (v_stranger, 'stranger@example.com', 'authenticated', 'authenticated');
  insert into invite (household_id, created_by, expires_at) values (v_household, v_head, now() + interval '7 days');

  perform set_config('request.jwt.claims', json_build_object('sub', v_head, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- forbidden: reading invites (tokens are only useful with a matching unused row, but keep them private)
  begin
    select count(*) into n from invite;
    insert into rls_results values ('cannot read invites', n = 0, n || ' visible');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot read invites', true, 'permission denied');
  end;

  -- allowed: own phone
  update profile set phone = '5555555' where id = v_head;
  get diagnostics n = row_count;
  insert into rls_results values ('can update own phone', n = 1, n || ' rows');

  -- forbidden: own role / email / household
  begin
    update profile set role = 'head', email = 'x@example.com', household_id = v_other_household where id = v_head;
    get diagnostics n = row_count;
    insert into rls_results values ('cannot update own role/email/household', n = 0, n || ' rows');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot update own role/email/household', true, 'permission denied');
  end;

  -- forbidden: take over another household's week
  begin
    update week_allocation set household_id = v_household where id = v_week;
    get diagnostics n = row_count;
    insert into rls_results values ('cannot reassign weeks', n = 0, n || ' rows');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot reassign weeks', true, 'permission denied');
  end;

  -- forbidden: claim days directly
  begin
    insert into day_release (week_allocation_id, date, status, claimed_by_household_id)
    values (v_week, '2099-01-01', 'claimed', v_household);
    insert into rls_results values ('cannot write day_release', false, 'insert succeeded');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot write day_release', true, 'rejected');
  end;

  -- forbidden: approve requests directly
  begin
    update request set status = 'approved' where id = v_request;
    get diagnostics n = row_count;
    insert into rls_results values ('cannot change request status', n = 0, n || ' rows');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot change request status', true, 'permission denied');
  end;

  -- forbidden: edit the year / rotation
  begin
    update year set rotation_order = '{}';
    get diagnostics n = row_count;
    insert into rls_results values ('cannot edit year', n = 0, n || ' rows');
  exception when insufficient_privilege then
    insert into rls_results values ('cannot edit year', true, 'permission denied');
  end;

  -- forbidden: a fresh sign-up creating their own profile as a head
  perform set_config('request.jwt.claims', json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
  begin
    insert into profile (id, email, name, household_id, role)
    values (v_stranger, 'stranger@example.com', 'Stranger', v_household, 'head');
    insert into rls_results values ('sign-up cannot create own profile', false, 'insert succeeded');
  exception when insufficient_privilege then
    insert into rls_results values ('sign-up cannot create own profile', true, 'rejected');
  end;
end $$;

reset role;
select case when passed then 'PASS' else 'FAIL' end as result, check_name, detail from rls_results;

do $$
begin
  if exists (select 1 from rls_results where not passed) then
    raise exception 'RLS client-write checks failed (see table above)';
  end if;
end $$;

rollback;
