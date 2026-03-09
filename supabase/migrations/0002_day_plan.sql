-- Add unique constraint to day_release to support upsert on approval
alter table day_release add constraint day_release_allocation_date_unique
  unique (week_allocation_id, date);

-- day_plan: households mark which days they plan to use the house
create table day_plan (
  id uuid primary key default uuid_generate_v4(),
  week_allocation_id uuid not null references week_allocation(id) on delete cascade,
  date date not null,
  household_id uuid not null references household(id),
  created_at timestamptz not null default now(),
  unique(week_allocation_id, date)
);

create index idx_dp_allocation on day_plan(week_allocation_id);

alter table day_plan enable row level security;

-- all authenticated users can read plans (full transparency)
create policy "day_plan_read" on day_plan for select to authenticated using (true);

-- own household can insert/update/delete their plans
create policy "day_plan_write" on day_plan for all to authenticated
  using (household_id = (select household_id from profile where id = auth.uid()))
  with check (household_id = (select household_id from profile where id = auth.uid()));
