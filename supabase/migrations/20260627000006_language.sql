alter table public.user_settings
  add column if not exists language text default null
    check (language in ('en', 'it', 'es', 'fr', 'de', 'pt'));
