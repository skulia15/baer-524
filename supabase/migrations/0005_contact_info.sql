-- Add phone number to profile
alter table profile add column phone text;

-- Allow all authenticated users to read head (owner) profiles for the contact directory
drop policy "profile_read_own" on profile;
create policy "profile_read" on profile for select to authenticated
  using (
    id = auth.uid()
    or household_id = (select household_id from profile where id = auth.uid())
    or is_head()
    or role = 'head'
  );
