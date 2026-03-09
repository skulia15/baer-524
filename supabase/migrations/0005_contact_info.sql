-- Add phone number to profile
alter table profile add column if not exists phone text;

-- Allow all authenticated users to read head (owner) profiles for the contact directory
drop policy if exists "profile_read_own" on profile;
drop policy if exists "profile_read" on profile;
create policy "profile_read" on profile for select to authenticated
  using (
    id = auth.uid()
    or household_id = (select household_id from profile where id = auth.uid())
    or is_head()
    or role = 'head'
  );
