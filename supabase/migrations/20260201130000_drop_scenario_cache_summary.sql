-- Drop scenario_cache_summary: no longer used after Sheets cleanup.
-- Sheet deleted, sync removed, app calculates visa on-demand via scenarioVisaValidation.js.
DROP TABLE IF EXISTS scenario_cache_summary;
