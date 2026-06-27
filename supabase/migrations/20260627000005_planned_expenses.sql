create table if not exists public.planned_expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  month           text not null,          -- YYYY-MM
  description     text not null,
  amount          numeric(10,2) not null check (amount >= 0),
  unplanned_pct   integer not null default 100 check (unplanned_pct between 0 and 100),
  created_at      timestamptz default now()
);

alter table public.planned_expenses enable row level security;

create policy "Users manage own planned expenses"
  on public.planned_expenses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.planned_expenses to authenticated;
