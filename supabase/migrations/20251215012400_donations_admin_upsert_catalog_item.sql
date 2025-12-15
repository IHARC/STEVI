-- Transactional upsert so catalog item details + category tags + activation are applied atomically.
-- This avoids transient states where an item is temporarily inactive or missing tags.

create or replace function donations.admin_upsert_catalog_item(
  p_inventory_item_id uuid,
  p_slug text,
  p_short_description text default null,
  p_long_description text default null,
  p_currency text default 'CAD',
  p_default_quantity integer default 1,
  p_priority integer default 100,
  p_target_buffer integer default null,
  p_image_url text default null,
  p_category_ids uuid[] default '{}'::uuid[],
  p_should_be_active boolean default false,
  p_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_title text;
  v_description text;
  v_minimum_threshold integer;
  v_cost numeric;
  v_unit_cost_cents integer;
  v_category_label text;
  v_slug text;
begin
  select i.name, i.description, i.cost_per_unit, i.minimum_threshold
  into v_title, v_description, v_cost, v_minimum_threshold
  from core.items i
  where i.id = p_inventory_item_id;

  if v_title is null or btrim(v_title) = '' then
    raise exception 'Inventory item not found.' using errcode = 'P0001';
  end if;

  if v_cost is null then
    v_unit_cost_cents := null;
  else
    v_unit_cost_cents := greatest(0, round(v_cost * 100)::int);
  end if;

  v_slug := p_slug;
  if v_slug is null or btrim(v_slug) = '' then
    v_slug := nullif(
      lower(
        regexp_replace(
          regexp_replace(btrim(v_title), '[^a-z0-9]+', '-', 'gi'),
          '(^-+|-+$)',
          '',
          'g'
        )
      ),
      ''
    );
  end if;

  v_slug := left(coalesce(v_slug, concat('donation-', extract(epoch from now())::bigint)), 80);

  if array_length(p_category_ids, 1) is null then
    p_category_ids := '{}'::uuid[];
  end if;

  if array_length(p_category_ids, 1) is not null then
    select cc.label
    into v_category_label
    from donations.catalog_categories cc
    where cc.id = any(p_category_ids)
    order by cc.sort_order asc, cc.label asc
    limit 1;
  end if;

  if p_id is null then
    insert into donations.catalog_items (
      slug,
      title,
      short_description,
      long_description,
      category,
      inventory_item_id,
      unit_cost_cents,
      currency,
      default_quantity,
      priority,
      target_buffer,
      image_url,
      is_active
    ) values (
      v_slug,
      v_title,
      p_short_description,
      p_long_description,
      v_category_label,
      p_inventory_item_id,
      v_unit_cost_cents,
      p_currency,
      p_default_quantity,
      p_priority,
      p_target_buffer,
      p_image_url,
      false
    )
    returning id into v_id;
  else
    update donations.catalog_items ci
    set
      slug = v_slug,
      title = v_title,
      short_description = p_short_description,
      long_description = p_long_description,
      category = v_category_label,
      inventory_item_id = p_inventory_item_id,
      unit_cost_cents = v_unit_cost_cents,
      currency = p_currency,
      default_quantity = p_default_quantity,
      priority = p_priority,
      target_buffer = p_target_buffer,
      image_url = p_image_url,
      is_active = false
    where ci.id = p_id
    returning ci.id into v_id;
  end if;

  if v_id is null then
    raise exception 'Catalogue item not found.' using errcode = 'P0001';
  end if;

  delete from donations.catalog_item_categories where catalog_item_id = v_id;

  insert into donations.catalog_item_categories (catalog_item_id, category_id)
  select v_id, category_id
  from unnest(p_category_ids) as category_id;

  update donations.catalog_items
  set is_active = p_should_be_active
  where id = v_id;

  return v_id;
end;
$$;
