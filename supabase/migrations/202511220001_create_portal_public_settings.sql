-- Create a public-safe settings store for marketing (and other) dynamic content.
-- This avoids exposing sensitive core.system_settings values to anonymous readers.

create schema if not exists portal;

create table if not exists portal.public_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text,
  setting_type text not null default 'string',
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_profile_id uuid references portal.profiles(id) on delete set null,
  updated_by_profile_id uuid references portal.profiles(id) on delete set null
);

comment on table portal.public_settings is 'Publicly consumable site settings (e.g., marketing copy) with strict RLS.';
comment on column portal.public_settings.setting_key is 'Stable, namespaced key such as marketing.footer.primary_text';
comment on column portal.public_settings.is_public is 'Only rows explicitly marked public are readable by anonymous clients';

-- Keep updated_at fresh
create or replace function portal.set_public_settings_updated_at()
returns trigger
language plpgsql
security definer as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_public_settings_updated_at on portal.public_settings;
create trigger trg_public_settings_updated_at
before update on portal.public_settings
for each row
execute procedure portal.set_public_settings_updated_at();

-- RLS
alter table portal.public_settings enable row level security;

-- Allow anonymous/public readers to fetch only rows explicitly marked public.
create policy "Public can read published settings"
  on portal.public_settings
  for select
  using (is_public = true);

-- Permit portal admins (role claim) to insert/update.
create policy "Portal admins manage settings"
  on portal.public_settings
  for all
  using (
    auth.role() = 'authenticated'
    and 'portal_admin' = any(public.get_user_roles(auth.uid()))
  )
  with check (
    auth.role() = 'authenticated'
    and 'portal_admin' = any(public.get_user_roles(auth.uid()))
  );

-- Seed footer values from core.system_settings if they exist.
insert into portal.public_settings (setting_key, setting_value, setting_type, description, is_public, created_at, updated_at)
select
  setting_key,
  setting_value,
  coalesce(setting_type, 'string'),
  'Migrated from core.system_settings',
  true,
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from core.system_settings
where setting_key in ('marketing.footer.primary_text', 'marketing.footer.secondary_text')
on conflict (setting_key) do update
  set setting_value = excluded.setting_value,
      setting_type = excluded.setting_type,
      description = excluded.description,
      is_public = true,
      updated_at = excluded.updated_at;

