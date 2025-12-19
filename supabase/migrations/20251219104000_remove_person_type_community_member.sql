-- Remove deprecated community_member person type (pre-production, no back-compat).

-- 1) Move any lingering community_member records to client.
update core.people
set person_type = 'client'
where person_type = 'community_member';

-- Remove duplicates where a client entry already exists for the same field.
delete from core.person_field_visibility as pfv
using core.person_field_visibility as existing
where pfv.person_type = 'community_member'
  and existing.person_type = 'client'
  and existing.field_name = pfv.field_name;

update core.person_field_visibility
set person_type = 'client'
where person_type = 'community_member';

-- Drop generated column/index that depend on person_type to allow type change.
drop index if exists core.idx_people_person_category;

alter table core.people
  drop column if exists person_category;

-- Drop dependent view before changing enum type.
drop view if exists core.v_organization_contacts;

-- 2) Recreate enum without community_member.
alter type core.person_type rename to person_type_old;

create type core.person_type as enum (
  'client',
  'former_client',
  'potential_client',
  'resident',
  'concerned_citizen',
  'agency_contact',
  'case_worker',
  'healthcare_provider',
  'emergency_contact',
  'family_member',
  'support_person'
);

alter table core.people
  alter column person_type drop default,
  alter column person_type type core.person_type
  using person_type::text::core.person_type,
  alter column person_type set default 'client';

alter table core.person_field_visibility
  alter column person_type type core.person_type
  using person_type::text::core.person_type;

-- Recreate generated category column and index with updated type set.
alter table core.people
  add column person_category core.person_category
  generated always as (
    case
      when (person_type = any (array['client'::core.person_type, 'former_client'::core.person_type, 'potential_client'::core.person_type])) then 'service_recipient'::core.person_category
      when (person_type = any (array['resident'::core.person_type, 'concerned_citizen'::core.person_type])) then 'community'::core.person_category
      when (person_type = any (array['agency_contact'::core.person_type, 'case_worker'::core.person_type, 'healthcare_provider'::core.person_type])) then 'professional'::core.person_category
      when (person_type = any (array['emergency_contact'::core.person_type, 'family_member'::core.person_type, 'support_person'::core.person_type])) then 'support'::core.person_category
      else null::core.person_category
    end
  ) stored;

create index idx_people_person_category on core.people (person_category);

-- Recreate the view after enum change.
create view core.v_organization_contacts as
select
  op.id,
  op.organization_id,
  op.person_id,
  op.relationship_type,
  op.job_title,
  op.is_primary,
  op.notes,
  op.start_date,
  op.end_date,
  op.created_at,
  op.updated_at,
  op.created_by,
  op.updated_by,
  p.first_name,
  p.last_name,
  p.person_type,
  p.organization_name as legacy_organization_name,
  p.professional_title,
  p.phone,
  p.email,
  p.preferred_contact_method,
  p.status as person_status,
  trim(both from concat_ws(' ', p.first_name, p.last_name)) as full_name
from core.organization_people op
  join core.people p on p.id = op.person_id;

-- 3) Drop functions bound to the old enum type.
drop function if exists core.get_people_list_with_types(
  text,
  core.person_type_old[],
  core.person_category,
  core.person_status,
  integer,
  integer,
  text,
  text
);

drop function if exists core.get_person_field_visibility(core.person_type_old, text);

-- 4) Drop the old enum type.
drop type core.person_type_old;

-- 5) Recreate functions using the new enum type.
create or replace function core.get_people_list_with_types(
  p_search_term text default null,
  p_person_types core.person_type[] default null,
  p_person_category core.person_category default null,
  p_status core.person_status default null,
  p_page integer default 1,
  p_page_size integer default 25,
  p_sort_by text default 'created_at',
  p_sort_order text default 'DESC'
)
returns table (
  id bigint,
  first_name text,
  last_name text,
  email text,
  phone text,
  person_type core.person_type,
  person_category core.person_category,
  status core.person_status,
  housing_status text,
  risk_level text,
  organization_name text,
  professional_title text,
  relationship_to_client text,
  last_service_date date,
  data_sharing_consent boolean,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
as $function$
declare
  v_offset integer;
  v_total_count bigint;
  v_privacy_check boolean := false;
begin
  -- Privacy protection: require search term for client records
  if p_person_types is not null then
    select exists(
      select 1 from unnest(p_person_types) as pt
      where pt::text in ('client', 'potential_client')
    ) into v_privacy_check;

    if v_privacy_check and (p_search_term is null or length(trim(p_search_term)) < 2) then
      raise exception 'Search term of at least 2 characters required for client records (privacy protection)';
    end if;
  end if;

  v_offset := (p_page - 1) * p_page_size;

  select count(*) into v_total_count
  from core.people p
  where
    (p_search_term is null or (
      p.first_name ilike '%' || p_search_term || '%'
      or p.last_name ilike '%' || p_search_term || '%'
      or p.email ilike '%' || p_search_term || '%'
      or p.phone ilike '%' || p_search_term || '%'
      or p.organization_name ilike '%' || p_search_term || '%'
    ))
    and (p_person_types is null or p.person_type = any(p_person_types))
    and (p_person_category is null or p.person_category = p_person_category)
    and (p_status is null or p.status = p_status);

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.person_type,
    p.person_category,
    p.status,
    p.housing_status::text as housing_status,
    p.risk_level::text as risk_level,
    p.organization_name,
    p.professional_title,
    p.relationship_to_client,
    p.last_service_date,
    p.data_sharing_consent,
    p.created_at,
    p.updated_at,
    v_total_count
  from core.people p
  where
    (p_search_term is null or (
      p.first_name ilike '%' || p_search_term || '%'
      or p.last_name ilike '%' || p_search_term || '%'
      or p.email ilike '%' || p_search_term || '%'
      or p.phone ilike '%' || p_search_term || '%'
      or p.organization_name ilike '%' || p_search_term || '%'
    ))
    and (p_person_types is null or p.person_type = any(p_person_types))
    and (p_person_category is null or p.person_category = p_person_category)
    and (p_status is null or p.status = p_status)
  order by
    case
      when p_sort_order = 'ASC' and p_sort_by = 'first_name' then p.first_name
      when p_sort_order = 'ASC' and p_sort_by = 'last_name' then p.last_name
      when p_sort_order = 'ASC' and p_sort_by = 'created_at' then p.created_at::text
      when p_sort_order = 'ASC' and p_sort_by = 'updated_at' then p.updated_at::text
      when p_sort_order = 'ASC' and p_sort_by = 'person_type' then p.person_type::text
      when p_sort_order = 'ASC' and p_sort_by = 'last_service_date' then coalesce(p.last_service_date::text, '9999-12-31')
    end asc,
    case
      when p_sort_order = 'DESC' and p_sort_by = 'first_name' then p.first_name
      when p_sort_order = 'DESC' and p_sort_by = 'last_name' then p.last_name
      when p_sort_order = 'DESC' and p_sort_by = 'created_at' then p.created_at::text
      when p_sort_order = 'DESC' and p_sort_by = 'updated_at' then p.updated_at::text
      when p_sort_order = 'DESC' and p_sort_by = 'person_type' then p.person_type::text
      when p_sort_order = 'DESC' and p_sort_by = 'last_service_date' then coalesce(p.last_service_date::text, '0000-01-01')
      else p.created_at::text
    end desc
  limit p_page_size
  offset v_offset;
end;
$function$;

create or replace function core.get_person_field_visibility(
  p_person_type core.person_type,
  p_field_name text default null
)
returns table(field_name text, is_visible boolean, is_required boolean, is_editable boolean, privacy_level text)
language plpgsql
security definer
as $function$
begin
  return query
  select
    pfv.field_name,
    pfv.is_visible,
    pfv.is_required,
    pfv.is_editable,
    pfv.privacy_level
  from core.person_field_visibility pfv
  where pfv.person_type = p_person_type
    and (p_field_name is null or pfv.field_name = p_field_name);
end;
$function$;
