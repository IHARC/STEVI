-- Enforce public-safe donation catalogue items at the database layer.
-- Active catalogue items must have >= 1 active+public category tag and no non-public tags.
-- Active catalogue items must have a cost set on the linked inventory item.

create or replace function donations.assert_catalog_item_can_be_active(p_catalog_item_id uuid, p_inventory_item_id uuid)
returns void
language plpgsql
as $$
declare
  public_count integer;
  non_public_count integer;
  inv_cost numeric;
  stripe_price text;
begin
  select ci.stripe_price_id
  into stripe_price
  from donations.catalog_items ci
  where ci.id = p_catalog_item_id;

  if stripe_price is null or stripe_price !~ '^price_' then
    raise exception 'Cannot activate catalogue item: sync a Stripe price first.' using errcode = 'P0001';
  end if;

  select count(*)
  into public_count
  from donations.catalog_item_categories cic
  join donations.catalog_categories cc on cc.id = cic.category_id
  where cic.catalog_item_id = p_catalog_item_id
    and cc.is_active = true
    and cc.is_public = true;

  if public_count < 1 then
    raise exception 'Cannot activate catalogue item: select at least one public category.' using errcode = 'P0001';
  end if;

  select count(*)
  into non_public_count
  from donations.catalog_item_categories cic
  join donations.catalog_categories cc on cc.id = cic.category_id
  where cic.catalog_item_id = p_catalog_item_id
    and cc.is_public = false;

  if non_public_count > 0 then
    raise exception 'Cannot activate catalogue item: remove non-public categories before activating.' using errcode = 'P0001';
  end if;

  select i.cost_per_unit
  into inv_cost
  from core.items i
  where i.id = p_inventory_item_id;

  if inv_cost is null then
    raise exception 'Cannot activate catalogue item: set a typical cost on the linked inventory item first.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function donations.validate_catalog_item_activation()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = true then
    perform donations.assert_catalog_item_can_be_active(new.id, new.inventory_item_id);
  end if;
  return new;
end;
$$;

drop trigger if exists validate_catalog_items_activation on donations.catalog_items;
create trigger validate_catalog_items_activation
before insert or update of is_active on donations.catalog_items
for each row
execute function donations.validate_catalog_item_activation();
