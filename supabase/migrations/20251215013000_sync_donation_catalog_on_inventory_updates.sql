-- Prevent staleness: keep donation catalogue fields in sync with the linked inventory item.
-- When inventory cost changes, deactivate and clear Stripe price so checkout can't mismatch amounts.

create or replace function donations.sync_catalog_items_from_inventory()
returns trigger
language plpgsql
as $$
declare
  next_unit_cost_cents integer;
  cost_changed boolean;
begin
  cost_changed := old.cost_per_unit is distinct from new.cost_per_unit;

  if new.cost_per_unit is null then
    next_unit_cost_cents := null;
  else
    next_unit_cost_cents := greatest(0, round(new.cost_per_unit * 100)::int);
  end if;

  update donations.catalog_items ci
  set
    title = new.name,
    unit_cost_cents = next_unit_cost_cents,
    stripe_price_id = case when cost_changed then null else ci.stripe_price_id end,
    is_active = case when cost_changed then false else ci.is_active end
  where ci.inventory_item_id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_catalog_items_from_inventory on core.items;
create trigger sync_catalog_items_from_inventory
after update of name, cost_per_unit
on core.items
for each row
execute function donations.sync_catalog_items_from_inventory();

