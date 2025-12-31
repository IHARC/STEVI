-- Add soft-delete fields for people aliases (MVP inline editing)
ALTER TABLE core.people_aliases
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid;

UPDATE core.people_aliases
SET is_active = true
WHERE is_active IS NULL;
