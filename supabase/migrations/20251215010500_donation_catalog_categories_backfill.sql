-- Backfill: seed categories from existing `donations.catalog_items.category` values,
-- and attach them to the corresponding catalogue items.

insert into donations.catalog_categories (slug, label, sort_order, is_active, is_public)
select distinct
  nullif(
    lower(
      regexp_replace(
        regexp_replace(btrim(ci.category), '[^a-z0-9]+', '-', 'gi'),
        '(^-+|-+$)',
        '',
        'g'
      )
    ),
    ''
  ) as slug,
  btrim(ci.category) as label,
  100 as sort_order,
  true as is_active,
  true as is_public
from donations.catalog_items ci
where ci.category is not null and btrim(ci.category) <> ''
on conflict (slug) do update
set label = excluded.label;

insert into donations.catalog_item_categories (catalog_item_id, category_id)
select
  ci.id,
  cc.id
from donations.catalog_items ci
join donations.catalog_categories cc
  on cc.label = btrim(ci.category)
where ci.category is not null and btrim(ci.category) <> ''
on conflict do nothing;

