# List pattern (app standard)

This repo standardizes list UIs around the same URL-driven behaviors and shared shadcn-based components.

## URL contract (recommended)
- `q`: search term (string)
- `page`: 1-based page number (int)
- `pageSize`: page size (enum: 25, 50, 100)
- `sortBy`: backend sort key (string/enum)
- `sortOrder`: `ASC` or `DESC`
- `filters…`: list-specific values (enums, multi-select lists serialized as comma-separated)

## UI contract
- Filters and pagination are distinct sections.
- Sorting is done via clickable column headers with an asc/desc indicator.
- Pagination controls appear both above and below the table.
- List state is encoded in the URL (`router.replace`) so it’s shareable and survives refresh.

## Shared components
- `@shared/list/pagination-controls` (`ListPaginationControls`)
- `@shared/list/sortable-table-head` (`SortableTableHead`)

## Server/data contract
- Lists should return a `total_count` (or equivalent) to compute pages.
- RPCs/queries should accept `page`, `page_size`, `sort_by`, `sort_order`, and a `search_term` when applicable.
- If a list has privacy/RLS constraints, enforce them server-side and surface the error in the UI (don’t bypass with client filtering).

## Reference implementation
- Ops Clients directory: `src/app/(ops)/ops/clients/page.tsx`
- UI: `src/components/workspace/clients/clients-directory-table.tsx`

