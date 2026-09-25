-- Single-use invite links. The signed token carries the invite id (JWT jti);
-- sign-up claims the row by setting used_at, so a link works once.
-- Only the service role touches this table (RLS on, no policies).
create table if not exists invite (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references household(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table invite enable row level security;
