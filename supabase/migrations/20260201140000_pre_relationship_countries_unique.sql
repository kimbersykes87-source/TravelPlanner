-- PreRelationshipCountries: one row per (profile_id, country_name).
-- Remove duplicates, add unique constraint for upsert on sync.

-- 1. Delete duplicate rows, keeping the one with the highest id per (profile_id, country_name)
DELETE FROM pre_relationship_countries
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(profile_id)), LOWER(TRIM(country_name))
        ORDER BY id DESC
      ) AS rn
    FROM pre_relationship_countries
  ) sub
  WHERE rn > 1
);

-- 2. Add unique constraint so sync can use on_conflict to upsert
ALTER TABLE pre_relationship_countries
  ADD CONSTRAINT pre_relationship_countries_profile_country_unique
  UNIQUE (profile_id, country_name);
