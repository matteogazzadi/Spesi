alter table public.user_settings
  add column if not exists theme text default 'light'
    check (theme in ('light', 'dark'));
