-- Shared weeks (Verslunarmannahelgi, spring) have no single owner: every household can
-- sign up for the days it will be at the house, so a day may have several plans —
-- one per household. Own weeks are unaffected (only the owner may plan them).
alter table day_plan drop constraint if exists day_plan_week_allocation_id_date_key;
alter table day_plan
  add constraint day_plan_allocation_date_household_key unique (week_allocation_id, date, household_id);
