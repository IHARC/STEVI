-- Add observation to timeline event categories (must be committed before use)
DO $$ BEGIN
  ALTER TYPE core.timeline_event_category_enum ADD VALUE IF NOT EXISTS 'observation';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
