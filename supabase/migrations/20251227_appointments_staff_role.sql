-- Add staff role to appointments for cost rate lookup
alter table portal.appointments
  add column if not exists staff_role text null;
