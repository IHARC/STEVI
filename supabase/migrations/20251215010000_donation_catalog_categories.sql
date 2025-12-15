-- Donation catalogue categories (admin-managed, reusable, and public-safe)
-- Note: marketing site still reads `donations.catalog_items.category` today; STEVI sets that to the primary category label.

create table donations.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  -- Non-public categories may exist for internal organization, but must not be used to activate items on the marketing site.
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_catalog_categories_updated_at
before update on donations.catalog_categories
for each row execute function set_updated_at_to_now();

alter table donations.catalog_categories enable row level security;

create policy catalog_categories_admin_read
on donations.catalog_categories
for select
to authenticated
using (check_iharc_admin_role());

create policy catalog_categories_admin_write
on donations.catalog_categories
for all
to authenticated
using (check_iharc_admin_role())
with check (check_iharc_admin_role());

create policy catalog_categories_service_role
on donations.catalog_categories
for all
to service_role
using (true)
with check (true);

create table donations.catalog_item_categories (
  catalog_item_id uuid not null references donations.catalog_items(id) on delete cascade,
  category_id uuid not null references donations.catalog_categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (catalog_item_id, category_id)
);

alter table donations.catalog_item_categories enable row level security;

create policy catalog_item_categories_admin_read
on donations.catalog_item_categories
for select
to authenticated
using (check_iharc_admin_role());

create policy catalog_item_categories_admin_write
on donations.catalog_item_categories
for all
to authenticated
using (check_iharc_admin_role())
with check (check_iharc_admin_role());

create policy catalog_item_categories_service_role
on donations.catalog_item_categories
for all
to service_role
using (true)
with check (true);

-- Prevent duplicate catalogue entries for the same inventory item.
alter table donations.catalog_items
  add constraint catalog_items_inventory_item_id_unique unique (inventory_item_id);

