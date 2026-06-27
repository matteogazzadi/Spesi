-- Initial schema
-- Enum types
create type public.match_type as enum ('contains', 'exact');
create type public.budgeting_mode as enum ('all_time', 'rolling_12mo');

-- monthly_totals: one row per user per calendar month
create table public.monthly_totals (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  month            text        not null,   -- YYYY-MM
  total_spent      numeric     not null default 0,
  last_imported_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id, month)
);

-- exclusion_rules: reusable rules to strip noise from totals
create table public.exclusion_rules (
  id         uuid             primary key default gen_random_uuid(),
  user_id    uuid             not null references auth.users (id) on delete cascade,
  pattern    text             not null,
  match_type public.match_type not null default 'contains',
  active     boolean          not null default true,
  created_at timestamptz      not null default now()
);

-- transactions: persisted individual expense rows from each import
create table public.transactions (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users (id) on delete cascade,
  monthly_total_id    uuid        not null references public.monthly_totals (id) on delete cascade,
  date                date        not null,
  description         text        not null,
  amount              numeric     not null check (amount >= 0),  -- absolute value
  excluded            boolean     not null default false,
  excluded_by_rule_id uuid        references public.exclusion_rules (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- user_settings: one row per user, created on first access
create table public.user_settings (
  user_id        uuid                  primary key references auth.users (id) on delete cascade,
  budgeting_mode public.budgeting_mode not null default 'all_time'
);

-- Indexes
create index on public.transactions (user_id, monthly_total_id);
create index on public.transactions (user_id, excluded);
create index on public.exclusion_rules (user_id, active);

-- Row Level Security
alter table public.monthly_totals  enable row level security;
alter table public.exclusion_rules enable row level security;
alter table public.transactions    enable row level security;
alter table public.user_settings   enable row level security;

create policy "own monthly_totals"
  on public.monthly_totals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own exclusion_rules"
  on public.exclusion_rules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own user_settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
