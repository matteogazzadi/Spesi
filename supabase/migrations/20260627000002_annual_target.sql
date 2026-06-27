-- Add optional annual spending target to user settings
alter table public.user_settings
  add column annual_target numeric;
