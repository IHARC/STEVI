-- Rename community_registration flow type to client_registration (pre-production).
update portal.registration_flows
set flow_type = 'client_registration'
where flow_type = 'community_registration';
