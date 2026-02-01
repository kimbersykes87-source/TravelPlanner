# Travel Planner v2 - Deployment

## Cloudflare build settings (required)

**Build command:** `npm run build`  
**Build output directory:** `dist`  
**Root directory:** (empty)

If these are wrong, the site can show **"Failed to load module script... MIME type text/jsx"** because the server would serve source files instead of the built `dist/` output. Fix in Dashboard → Workers & Pages → travelplanner-ks → Settings → Build configuration.

---

## How to deploy (Cursor / agents)

**When the user says "deploy", "redeploy", or "push to production":** follow **[docs/DEPLOY_INSTRUCTIONS.md](docs/DEPLOY_INSTRUCTIONS.md)** and run the steps there. That document is the single source of truth for deploying all changes from this project.

- **Project folder:** `c:\dev\TravelPlanner_v2`
- **Remote:** `https://github.com/kimbersykes87-source/TravelPlanner.git`
- **Branch:** `feat/globe-loader`
- **Live site:** https://travelplanner-ks.pages.dev

---

## Dev Workflow Rules

- **Always close any existing running dev servers** before starting a new one (Ctrl+C)
- **Open or refresh the browser** when new updates are reflected (e.g. after starting dev server, after UI changes)
- Dev server: `npm run dev` → http://localhost:5173

---

## Supabase CLI Access

Supabase CLI is installed **globally via Scoop** and available to Cursor/terminals:

- **Version:** 2.72.7 (or latest via `scoop update supabase`)
- **Commands:** `supabase`, `supabase login`, `supabase link`, `supabase db push`, etc.

**Project link:**
```bash
supabase link --project-ref xaxbbtzsyrtchtjrjvqy
```

**Credentials** (from `.env.local`):
- `SUPABASE_DB_PASSWORD` – database password for Postgres connections
- `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` – API access

---

## Local Development

1. Ensure `.env.local` exists with Supabase URL, anon key, and DB password
2. `npm install`
3. `npm run dev`

---

## Deploy to Cloudflare Pages

1. **Build**: `npm run build` → output in `dist/`
2. **Connect**: Cloudflare Dashboard → Pages → Create project → Connect to Git
3. **Settings**:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: (leave empty if repo root)
4. **Env vars** (Settings → Environment variables):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

---

## Supabase Keep-Alive (7-Day Free Tier)

Supabase free tier **pauses projects after 7 days of inactivity**. You need activity at least every 5–6 days.

**Option A – Daily Sheets sync (recommended):** Add a time-based trigger in Apps Script for `runScheduledSync` (daily). Syncs data and counts as activity. See [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md).

**Option B – GitHub Actions:** `.github/workflows/supabase-keepalive.yml` pings Supabase every 5 days. Add secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Run manually: Actions → Supabase Keep-Alive → Run workflow.

**Either option satisfies the 7-day requirement.** Daily sync also keeps data fresh.

---

## Sheets to Supabase Sync

Full setup: **[docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md)**

1. Open your [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit) → **Extensions** → **Apps Script**
2. Add `apps-script/SyncToSupabase.gs` as a new script file
3. Script properties: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (values in GOOGLE_SETUP.md)
4. Run `onAddTravelPlannerMenu()` once to add menu
5. Use menu: **Travel Planner → Sync to Supabase**
6. **Optional – daily trigger:** Triggers → Add trigger → `runScheduledSync`, day timer. Keeps Supabase active (7-day free tier requirement). See [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md#step-6-optional--daily-trigger-keeps-supabase-active).

---

## Custom Domain

Target: `travelplanner.kimbersykes.com`

- Cloudflare Pages → Custom domains → Add
- Point DNS CNAME to your Pages project

---

## Share Link (view-only mode)

The app has a **view-only** route at `/view` (no password). When users tap **Share** on a scenario, the modal shows:

**Share this link:** `https://your-domain.com/view`

- The link is built from `window.location.origin` + `/view`, so it automatically uses your deployed URL (e.g. `https://travelplanner.kimbersykes.com/view`).
- Recipients can open that URL to see the read-only planner; no env config needed.
