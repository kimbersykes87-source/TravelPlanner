-- Drop unused Statistics columns: app only uses country, country_code, together_days, *_visited.
ALTER TABLE statistics
  DROP COLUMN IF EXISTS kimber_days,
  DROP COLUMN IF EXISTS siona_days,
  DROP COLUMN IF EXISTS total_days,
  DROP COLUMN IF EXISTS rank;
