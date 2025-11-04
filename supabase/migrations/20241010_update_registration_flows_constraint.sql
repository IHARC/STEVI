alter table portal.registration_flows
  drop constraint if exists registration_flows_flow_type_check;

alter table portal.registration_flows
  add constraint registration_flows_flow_type_check
    check (flow_type in (
      'client_intake',
      'client_claim',
      'community_registration',
      'partner_application',
      'volunteer_application',
      'concern_report'
    ));
