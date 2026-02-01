-- Statistics: one row per country. Remove duplicates, add unique constraint.
-- This allows SyncToSupabase to upsert instead of inserting duplicates on each sync.

-- 1. Delete duplicate rows, keeping the one with the highest id per (lowercase) country
DELETE FROM statistics
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(country)) ORDER BY id DESC) AS rn
    FROM statistics
  ) sub
  WHERE rn > 1
);

-- 2. Add unique constraint so sync can use on_conflict=country to upsert
ALTER TABLE statistics ADD CONSTRAINT statistics_country_unique UNIQUE (country);
