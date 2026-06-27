-- Grant table access to authenticated role (required when pushing via db push)
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.monthly_totals  to authenticated;
grant select, insert, update, delete on public.exclusion_rules to authenticated;
grant select, insert, update, delete on public.transactions     to authenticated;
grant select, insert, update, delete on public.user_settings   to authenticated;
grant usage on all sequences in schema public to authenticated;
