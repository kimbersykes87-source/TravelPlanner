# Travel Planner v2 - Google Sheets & Apps Script Setup

## Links You Need

| What | URL |
|------|-----|
| **Google Spreadsheet** | [https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit](https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit) |
| **Apps Script** (via sheet) | Open spreadsheet → **Extensions** → **Apps Script** |
| **Apps Script** (direct) | [https://script.google.com/home](https://script.google.com/home) → select your Travel Planner project |

---

## Step 1: Open Apps Script

1. Open your [Travel Planner spreadsheet](https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit)
2. Go to **Extensions** → **Apps Script**
3. If prompted, create a new project or open the existing one linked to this sheet

---

## Step 2: Add the Sync Script

1. In the Apps Script editor, create a new file: **File** → **New** → **Script file**
2. Name it: `SyncToSupabase`
3. Replace all contents with the code from [apps-script/SyncToSupabase.gs](../../apps-script/SyncToSupabase.gs)
4. Save (**Ctrl+S**)

---

## Step 3: Add Script Properties

1. In Apps Script: **Project settings** (gear icon) or **File** → **Project properties**
2. Open **Script properties** (left sidebar)
3. Click **Add script property** and add:

| Property | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xaxbbtzsyrtchtjrjvqy.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJidHpzeXJ0Y2h0anJqdnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzUxMDgsImV4cCI6MjA4NTQ1MTEwOH0.f9R130Ol_lhSmsgOdso58yQ1IMqkIZW6U8Rlx1ItPcs` |

4. Save

---

## Step 4: Add the Menu

1. In Apps Script, select the `SyncToSupabase` file
2. In the function dropdown, choose `onAddTravelPlannerMenu`
3. Click **Run**
4. Approve permissions when prompted (first time only)
5. Or: the menu is added automatically when you open the spreadsheet (via `onOpen`)

---

## Step 5: Run Sync

1. Go back to your [spreadsheet](https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit)
2. Refresh the page (F5) so the menu loads
3. Use **Travel Planner** → **Sync to Supabase**
4. Wait for "Sync completed."

---

## Step 6: Optional – Daily Trigger (Keeps Supabase Active)

Supabase free tier **pauses projects after 7 days of inactivity**. A daily sync counts as activity and keeps the project active.

1. In Apps Script: **Triggers** (clock icon, left sidebar)
2. Click **+ Add Trigger**
3. Settings:
   - **Function:** `runScheduledSync`
   - **Event:** Time-driven
   - **Type:** Day timer
   - **Time of day:** e.g. 6am–7am (or any time)
4. Save. The trigger will run daily and sync tables to Supabase.

You can still use **Travel Planner → Sync to Supabase** manually anytime. The daily trigger is just for keep-alive and fresh data.

---

## Required Sheet Names

The script expects these sheet names (case-sensitive):

- Profiles
- Countries
- RelationshipLog
- Statistics
- PresentBookings
- FutureScenarios
- ScenarioStays
- ToBook
- BookedUpcoming
- BookingTypeMeta
- VisaRules
- PreRelationshipCountries
- BucketList

Sheets that don't exist are skipped. Rename sheets to match if needed.
