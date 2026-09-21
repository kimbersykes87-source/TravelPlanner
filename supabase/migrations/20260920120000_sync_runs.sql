-- Record every Google Sheets -> Supabase sync so the app can show
-- "Synced x hours ago" and any data warnings found in the Sheet.
CREATE TABLE IF NOT EXISTS sync_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  message TEXT,
  tables JSONB,
  problems JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_finished_at ON sync_runs (finished_at DESC);

ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

-- Temporary: matches the other tables until the auth migration
-- (20260920130000_auth_and_rls.sql) replaces these with member-only policies.
CREATE POLICY "Allow read for anon" ON sync_runs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert for anon" ON sync_runs FOR INSERT TO anon WITH CHECK (true);
