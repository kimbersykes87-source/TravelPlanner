-- ScenarioCacheSummary: Cached visa remaining per scenario per jurisdiction
-- Populated by sync from ScenarioCacheSummary sheet (or computed by Apps Script)
CREATE TABLE IF NOT EXISTS scenario_cache_summary (
  id BIGSERIAL PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  days_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, jurisdiction)
);

ALTER TABLE scenario_cache_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON scenario_cache_summary FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_scenario_cache_summary_scenario ON scenario_cache_summary(scenario_id);
