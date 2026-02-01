-- Add optional image_url to scenario_stays (per FUTURE_SCENARIOS_SPEC)
ALTER TABLE scenario_stays ADD COLUMN IF NOT EXISTS image_url TEXT;
