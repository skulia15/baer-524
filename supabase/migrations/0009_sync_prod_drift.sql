-- Capture schema changes that were applied to prod by hand and never recorded.
-- Idempotent: a no-op on prod, brings a fresh database in line with it.

-- Optional message from the sender on requests and swap proposals
alter table request add column if not exists sender_message text;
alter table swap_proposal add column if not exists sender_message text;

-- security definer lookup so profile_read does not recurse into profile's own RLS
create or replace function get_my_household_id()
returns uuid
language sql
security definer
stable
as $$
  select household_id from profile where id = auth.uid()
$$;

drop policy if exists "profile_read" on profile;
create policy "profile_read" on profile for select to authenticated
  using (
    id = auth.uid()
    or household_id = get_my_household_id()
    or is_head()
    or role = 'head'
  );

-- Only the creator may delete a shopping item
drop policy if exists "auth users delete shopping" on shopping_item;
create policy "auth users delete shopping" on shopping_item for delete to authenticated
  using (created_by = auth.uid());
