-- Expand metrics view so public catalogue can derive display fields from inventory without duplicating data.

create or replace view donations.catalog_item_metrics as
select
  ci.id as catalog_item_id,
  ci.inventory_item_id,
  v.name as inventory_item_name,
  v.category as inventory_item_category,
  v.unit_type,
  coalesce(v.onhand_qty, 0::bigint) as current_stock,
  coalesce(ci.target_buffer, v.minimum_threshold, 0)::bigint as target_buffer,
  coalesce(d30.units_distributed, 0::bigint) as distributed_last_30_days,
  coalesce(d365.units_distributed, 0::bigint) as distributed_last_365_days,
  v.description as inventory_item_description,
  v.cost_per_unit as inventory_cost_per_unit
from donations.catalog_items ci
left join inventory.v_items_with_balances v on v.id = ci.inventory_item_id
left join donations.v_distribution_30d d30 on d30.inventory_item_id = ci.inventory_item_id
left join donations.v_distribution_365d d365 on d365.inventory_item_id = ci.inventory_item_id;
