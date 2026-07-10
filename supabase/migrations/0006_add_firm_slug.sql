-- ============================================================
-- JusticeHub — 0006_add_firm_slug.sql
-- Adds unique slug column to firm table.
-- ============================================================

-- 1. Add slug column allowing nulls initially
ALTER TABLE firm ADD COLUMN IF NOT EXISTS slug text;

-- 2. Populate slugs for any existing firms (e.g. from local seeds/development)
-- Lowercase, replace non-alphanumeric chars with hyphen, trim leading/trailing hyphens.
UPDATE firm 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) 
WHERE slug IS NULL;

UPDATE firm 
SET slug = regexp_replace(slug, '^-+|-+$', '', 'g') 
WHERE slug LIKE '-%' OR slug LIKE '%-';

-- Fallback for empty names
UPDATE firm 
SET slug = 'firm-' || substring(id::text, 1, 8) 
WHERE slug = '' OR slug IS NULL;

-- 3. Set NOT NULL and UNIQUE constraints
ALTER TABLE firm ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'firm_slug_unique'
  ) THEN
    ALTER TABLE firm ADD CONSTRAINT firm_slug_unique UNIQUE (slug);
  END IF;
END $$;
