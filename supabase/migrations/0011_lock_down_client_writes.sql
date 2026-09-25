-- The anon key is public, so RLS is the only thing stopping a signed-in user from
-- writing directly. Server actions authorise every change and write with the
-- service role, so clients get read access only to these tables.
-- Apply only after the app version that writes through the service role is deployed.

-- profile: rows are created by the service role (invite sign-up, admin);
-- users may change nothing but their phone number.
drop policy if exists "profile_insert" on profile;
revoke insert, update on profile from authenticated, anon;
grant update (phone) on profile to authenticated;

-- Rotation data: read-only for clients
drop policy if exists "house_write" on house;
drop policy if exists "household_write" on household;
drop policy if exists "year_write" on year;
drop policy if exists "wa_write" on week_allocation;
drop policy if exists "dr_write" on day_release;
drop policy if exists "req_insert" on request;
drop policy if exists "req_update" on request;
drop policy if exists "swap_insert" on swap_proposal;
drop policy if exists "swap_update" on swap_proposal;
drop policy if exists "ac_write" on allocation_change;
