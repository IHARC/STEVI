-- Clean up existing data so it conforms to activation guardrails.
-- Any active catalogue item whose linked inventory item lacks `cost_per_unit` is forcibly deactivated.

update donations.catalog_items ci
set is_active = false
from core.items i
where i.id = ci.inventory_item_id
  and ci.is_active = true
  and i.cost_per_unit is null;

