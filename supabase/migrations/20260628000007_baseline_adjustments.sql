create table public.baseline_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null,
  start_month text not null,
  end_month text,
  created_at timestamptz default now() not null,
  constraint start_month_fmt check (start_month ~ '^\d{4}-\d{2}$'),
  constraint end_month_fmt check (end_month is null or end_month ~ '^\d{4}-\d{2}$'),
  constraint end_after_start check (end_month is null or end_month >= start_month)
);

alter table public.baseline_adjustments enable row level security;

create policy "users manage own baseline_adjustments"
  on public.baseline_adjustments
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on public.baseline_adjustments to authenticated;
