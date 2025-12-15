-- Public donation catalogue view for iharc.ca.
-- - Only includes active catalogue items.
-- - Only surfaces public+active category tags (prevents sensitive inventory categories leaking to marketing).
-- - Derives title/short description/cost from inventory metrics when not explicitly set.
-- - Exposes category tags for multi-category filtering on the marketing site.

create or replace view portal.donation_catalog_public as
select
  ci.id,
  ci.slug,
  coalesce(metrics.inventory_item_name, ci.title) as title,
  coalesce(ci.short_description, metrics.inventory_item_description) as short_description,
  ci.long_description,
  primary_category.label as category,
  case
    when ci.unit_cost_cents is not null then ci.unit_cost_cents
    when metrics.inventory_cost_per_unit is null then null
    else greatest(0, round(metrics.inventory_cost_per_unit * 100)::int)
  end as unit_cost_cents,
  ci.currency,
  ci.default_quantity,
  ci.priority,
  ci.image_url,
  metrics.target_buffer,
  metrics.current_stock,
  metrics.distributed_last_30_days,
  metrics.distributed_last_365_days,
  coalesce(public_categories.category_ids, '{}'::uuid[]) as category_ids,
  coalesce(public_categories.category_slugs, '{}'::text[]) as category_slugs,
  coalesce(public_categories.category_labels, '{}'::text[]) as category_labels
from donations.catalog_items ci
left join donations.catalog_item_metrics metrics on metrics.catalog_item_id = ci.id
left join lateral (
  select
    array_agg(cc.id order by cc.sort_order asc, cc.label asc)
      filter (where cc.is_active = true and cc.is_public = true) as category_ids,
    array_agg(cc.slug order by cc.sort_order asc, cc.label asc)
      filter (where cc.is_active = true and cc.is_public = true) as category_slugs,
    array_agg(cc.label order by cc.sort_order asc, cc.label asc)
      filter (where cc.is_active = true and cc.is_public = true) as category_labels
  from donations.catalog_item_categories cic
  join donations.catalog_categories cc on cc.id = cic.category_id
  where cic.catalog_item_id = ci.id
) public_categories on true
left join lateral (
  select cc.label
  from donations.catalog_item_categories cic
  join donations.catalog_categories cc on cc.id = cic.category_id
  where cic.catalog_item_id = ci.id
    and cc.is_active = true
    and cc.is_public = true
  order by cc.sort_order asc, cc.label asc
  limit 1
) primary_category on true
where ci.is_active = true
  and primary_category.label is not null;

