-- Existing data cleanup: active catalogue items must be Stripe-ready (price linked).

update donations.catalog_items
set is_active = false
where is_active = true
  and (stripe_price_id is null or stripe_price_id !~ '^price_');

