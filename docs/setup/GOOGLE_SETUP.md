# Google Sheets to Supabase sync

The Google Sheet **Travel Planner - Digital Nomad** is the source of truth for:

| Tab | Supabase table | Key |
|-----|----------------|-----|
| Profiles | `profiles` | ProfileID |
| Countries | `countries` | CountryName |
| RelationshipLog | `relationship_log` | Date |
| Statistics | `statistics` | Country |
| VisaRules | `visa_rules` | RuleID |

Everything else (To Book, Booked, Scenarios, Bucket List) is edited in the app
and lives only in Supabase.

- Sheet: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit
- Script: open the Sheet, **Extensions > Apps Script**

## What a sync does

1. Reads the five tabs and checks them:
   - duplicate or missing dates in RelationshipLog
   - country names in RelationshipLog that are not in the Countries tab
   - passport or visa expiry dates earlier than the issue date (swapped columns)
2. Upserts every row into Supabase in batches of 500.
3. Removes rows from Supabase that are no longer in the Sheet (for example a
   corrected date). As a safety net it refuses to remove more than a quarter of
   a table in one go and reports that instead.
4. Records the run in `sync_runs`. The app's Us tab shows "Synced from Google
   Sheets x hours ago", turns amber after 48 hours, red if the last sync failed,
   and lists any data warnings.

Dates are read in the Sheet's own time zone, so a date never shifts by a day.

## Setup

1. **Apps Script > Project Settings > Script properties**:

   | Property | Value |
   |----------|-------|
   | `SUPABASE_URL` | `https://xaxbbtzsyrtchtjrjvqy.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase **Project Settings > API Keys > service_role** (secret; never commit it) |

   `SUPABASE_ANON_KEY` is still accepted as a fallback, but stops working once
   the database is locked down ([AUTH_SETUP.md](AUTH_SETUP.md)).

2. Replace the `SyncToSupabase` script file with
   [`apps-script/SyncToSupabase.gs`](../../apps-script/SyncToSupabase.gs). Keep
   `00-ALL-TABS.gs` and `02-PAST-TAB.gs` (they build the Statistics tab).

3. Reload the Sheet. The **Travel Planner** menu has:
   - **Sync to Supabase**: full sync with a summary
   - **Check data only (no sync)**: runs the checks without touching Supabase

## Daily trigger

Apps Script **Triggers > Add Trigger**: function `runScheduledSync`,
time-driven, day timer, any hour. This keeps data fresh and stops the free
Supabase project from pausing. If a scheduled sync fails, it now throws an
error, so it shows as **Failed** in **Executions** and Google emails you.

The only other trigger should be `midnightRefreshStatistics` (from
`02-PAST-TAB.gs`) if you use it. Do not add `rebuildScenarioCache` (removed).

## Keeping the data clean

- One row per day in RelationshipLog, no gaps. Pre-filling future days with the
  plan is fine; the app treats days after today as planned.
- Use the country names from the Countries tab (for example "United States",
  "United Kingdom"). The app understands common variants too, but the sync
  flags anything it does not recognise.
- UK work days: put `Yes` in KSUKWorkDays / SSUKWorkDays.
