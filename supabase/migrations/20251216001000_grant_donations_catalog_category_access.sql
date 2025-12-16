begin;

grant select, insert, update, delete on table donations.catalog_categories to authenticated;
grant select, insert, update, delete on table donations.catalog_item_categories to authenticated;

grant select, insert, update, delete on table donations.catalog_categories to service_role;
grant select, insert, update, delete on table donations.catalog_item_categories to service_role;

commit;
