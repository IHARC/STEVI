-- Extend core.get_people_list_with_types sorting to support updated_at and last_service_date.
-- Keeps privacy + paging logic intact and preserves existing signature.

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
