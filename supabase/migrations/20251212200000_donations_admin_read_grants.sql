begin;

-- Admin UI reads these tables via the authenticated role; RLS still applies.
grant usage on schema donations to authenticated;

grant select on table donations.donation_subscriptions to authenticated;
grant select on table donations.donors to authenticated;
grant select on table donations.stripe_webhook_events to authenticated;
grant select on table donations.donation_intent_items to authenticated;
grant select on table donations.stripe_products to authenticated;
grant select on table donations.stripe_amount_prices to authenticated;

commit;

