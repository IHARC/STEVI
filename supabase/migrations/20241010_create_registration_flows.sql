-- Create table to capture registration and intake submissions across portal flows
create table if not exists portal.registration_flows (
  id uuid primary key default gen_random_uuid(),
  flow_type text not null check (flow_type in (
    'client_intake',
    'community_registration',
    'partner_application',
    'volunteer_application',
    'concern_report'
  )),
  status text not null default 'pending',
  portal_code text unique,
  supabase_user_id uuid,
  profile_id uuid,
  chosen_name text not null,
  legal_name text,
  pronouns text,
  contact_email text,
  contact_phone text,
  contact_phone_safe_call boolean default false,
  contact_phone_safe_text boolean default false,
  contact_phone_safe_voicemail boolean default false,
  contact_window text,
  date_of_birth_month smallint,
  date_of_birth_year smallint,
  postal_code text,
  indigenous_identity text,
  disability text,
  gender_identity text,
  consent_data_sharing boolean,
  consent_contact boolean,
  consent_terms boolean,
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default portal.now_toronto(),
  updated_at timestamptz not null default portal.now_toronto(),
  created_by_user_id uuid default auth.uid(),
  updated_by_user_id uuid,
  constraint registration_flows_supabase_user_fk foreign key (supabase_user_id) references auth.users (id),
  constraint registration_flows_profile_fk foreign key (profile_id) references portal.profiles (id)
);

comment on table portal.registration_flows is 'Stores submissions for STEVI registration flows, including client intake, community signup, partner and volunteer applications, and concern reports.';

create index if not exists registration_flows_flow_type_idx on portal.registration_flows(flow_type);
create index if not exists registration_flows_status_idx on portal.registration_flows(status);
create index if not exists registration_flows_contact_email_idx on portal.registration_flows(lower(contact_email));
create index if not exists registration_flows_contact_phone_idx on portal.registration_flows(contact_phone);

create trigger registration_flows_set_updated_at
before update on portal.registration_flows
for each row
execute function portal.set_updated_at();

alter table portal.registration_flows enable row level security;

drop policy if exists registration_flows_public_insert on portal.registration_flows;
create policy registration_flows_public_insert
on portal.registration_flows
for insert
to public
with check (
  flow_type in ('client_intake','community_registration','partner_application','volunteer_application','concern_report')
  and (
    (auth.uid() is null and supabase_user_id is null and profile_id is null)
    or (auth.uid() is not null and supabase_user_id = auth.uid())
  )
);

drop policy if exists registration_flows_staff_select on portal.registration_flows;
create policy registration_flows_staff_select
on portal.registration_flows
for select
to authenticated
using (portal.current_role_in(ARRAY['moderator'::portal.profile_role,'admin'::portal.profile_role]));

drop policy if exists registration_flows_staff_update on portal.registration_flows;
create policy registration_flows_staff_update
on portal.registration_flows
for update
to authenticated
using (portal.current_role_in(ARRAY['moderator'::portal.profile_role,'admin'::portal.profile_role]))
with check (portal.current_role_in(ARRAY['moderator'::portal.profile_role,'admin'::portal.profile_role]));

drop policy if exists registration_flows_staff_delete on portal.registration_flows;
create policy registration_flows_staff_delete
on portal.registration_flows
for delete
to authenticated
using (portal.current_role_in(ARRAY['moderator'::portal.profile_role,'admin'::portal.profile_role]));

create or replace function portal.claim_registration_flow(
  p_portal_code text default null,
  p_chosen_name text default null,
  p_date_of_birth_month smallint default null,
  p_date_of_birth_year smallint default null,
  p_contact_email text default null,
  p_contact_phone text default null
)
returns table(success boolean, reason text, portal_code text, registration_id uuid) as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_candidate portal.registration_flows%rowtype;
  v_matches integer := 0;
  v_email_lower text;
  v_phone_normalized text;
  v_code text;
  v_now timestamptz := portal.now_toronto();
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to claim a record.';
  end if;

  v_profile_id := portal.current_profile_id();
  if v_profile_id is null then
    raise exception 'Profile not found for current user.';
  end if;

  if coalesce(trim(p_portal_code), '') <> '' then
    v_code := upper(regexp_replace(p_portal_code, '[^A-Z0-9]', '', 'g'));
  end if;

  if coalesce(trim(p_contact_email), '') <> '' then
    v_email_lower := lower(trim(p_contact_email));
  end if;

  if coalesce(trim(p_contact_phone), '') <> '' then
    v_phone_normalized := portal.normalize_phone(p_contact_phone);
  end if;

  if coalesce((v_code is not null)::int, 0)
     + coalesce(((p_chosen_name is not null and p_date_of_birth_month is not null and p_date_of_birth_year is not null))::int, 0)
     + coalesce((v_email_lower is not null)::int, 0)
     + coalesce((v_phone_normalized is not null)::int, 0) < 2 then
    return query select false, 'insufficient_identifiers', null, null;
    return;
  end if;

  select rf.*
  into v_candidate
  from portal.registration_flows rf
  where rf.flow_type = 'client_intake'
    and rf.status in ('pending','submitted')
    and rf.supabase_user_id is null
    and (
      (v_code is not null and rf.portal_code = v_code)
      or (
        p_chosen_name is not null
        and rf.chosen_name is not null
        and lower(rf.chosen_name) = lower(p_chosen_name)
        and p_date_of_birth_month is not null
        and rf.date_of_birth_month = p_date_of_birth_month
        and p_date_of_birth_year is not null
        and rf.date_of_birth_year = p_date_of_birth_year
      )
      or (v_email_lower is not null and rf.contact_email is not null and lower(rf.contact_email) = v_email_lower)
      or (v_phone_normalized is not null and rf.contact_phone is not null and rf.contact_phone = v_phone_normalized)
    )
  order by rf.created_at asc
  limit 1
  for update;

  if not found then
    return query select false, 'no_match', null, null;
    return;
  end if;

  if v_code is not null and v_candidate.portal_code is not null and v_candidate.portal_code = v_code then
    v_matches := v_matches + 1;
  end if;

  if p_chosen_name is not null and v_candidate.chosen_name is not null
     and lower(v_candidate.chosen_name) = lower(p_chosen_name)
     and p_date_of_birth_month is not null and v_candidate.date_of_birth_month = p_date_of_birth_month
     and p_date_of_birth_year is not null and v_candidate.date_of_birth_year = p_date_of_birth_year then
    v_matches := v_matches + 1;
  end if;

  if v_email_lower is not null and v_candidate.contact_email is not null
     and lower(v_candidate.contact_email) = v_email_lower then
    v_matches := v_matches + 1;
  end if;

  if v_phone_normalized is not null and v_candidate.contact_phone is not null
     and v_candidate.contact_phone = v_phone_normalized then
    v_matches := v_matches + 1;
  end if;

  if v_matches < 2 then
    return query select false, 'insufficient_match', null, null;
    return;
  end if;

  update portal.registration_flows
  set
    supabase_user_id = v_user_id,
    profile_id = v_profile_id,
    status = 'claimed',
    claimed_at = v_now,
    updated_by_user_id = v_user_id,
    contact_email = coalesce(v_email_lower, contact_email),
    contact_phone = coalesce(v_phone_normalized, contact_phone),
    metadata = metadata || jsonb_build_object(
      'claim', jsonb_build_object(
        'matched_fields', v_matches,
        'claimed_at', v_now,
        'claimed_by', v_profile_id
      )
    )
  where id = v_candidate.id;

  perform public.portal_log_audit_event(
    'registration.claimed',
    'portal.registration_flows',
    v_candidate.id,
    jsonb_build_object(
      'flow_type', v_candidate.flow_type,
      'matched_fields', v_matches
    ),
    v_profile_id
  );

  return query select true, 'claimed', coalesce(v_candidate.portal_code, v_code), v_candidate.id;
end;
$$ language plpgsql security definer set search_path to 'portal','public','auth';

grant execute on function portal.claim_registration_flow(text, text, smallint, smallint, text, text) to authenticated;
