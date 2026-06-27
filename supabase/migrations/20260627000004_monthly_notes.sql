alter table public.monthly_totals
  add column if not exists note text;
