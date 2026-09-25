-- Undoing "mark as bought" removes the matching 'bought' log entry. Without a
-- delete policy RLS silently matched 0 rows and the entry stayed in the log.
drop policy if exists "auth users delete shopping log" on shopping_item_log;
create policy "auth users delete shopping log" on shopping_item_log for delete to authenticated
  using (action = 'bought');
