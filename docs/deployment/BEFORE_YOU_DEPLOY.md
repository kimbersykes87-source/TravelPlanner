# Before You Deploy — Simple Checklist

Do these steps **before** running the deployment. Deployment is done **from this folder** (TravelPlanner_v2) by pushing to GitHub; see [docs/deployment/DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md).

---

## ✅ Already Done (by the agent)

- [x] `_redirects` file created (SPA routing will work)
- [x] Local build verified — `npm run build` works
- [x] `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] Git auth verified (push works)
- [x] Backup branch `backup-v1-before-v2` created and pushed to GitHub

---

## 📋 You Need To Do These

### 1. Supabase Migrations (one-time)

If you haven’t already run migrations:

1. Open a terminal.
2. Go to the project: `cd c:\dev\TravelPlanner_v2`
3. Link Supabase: `supabase link --project-ref xaxbbtzsyrtchtjrjvqy`
4. Push migrations: `supabase db push`

*(If Supabase CLI isn’t installed, use the Supabase dashboard: SQL Editor → run the migration files from `supabase/migrations/`.)*

### 2. Sync Google Sheets → Supabase (one-time + optional daily)

If your data is still in Google Sheets:

1. Open [your spreadsheet](https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit)
2. **Extensions** → **Apps Script**
3. Add the script from `apps-script/SyncToSupabase.gs` (see [docs/setup/GOOGLE_SETUP.md](../setup/GOOGLE_SETUP.md))
4. Add script properties: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (from your `.env.local`)
5. Run **Travel Planner → Sync to Supabase**
6. *(Optional)* Add a daily trigger for `runScheduledSync` to keep Supabase active (7-day free tier)

### 3. Get Your Credentials for Cloudflare

1. Open `c:\dev\TravelPlanner_v2\.env.local`
2. Copy these two values (you’ll paste them into Cloudflare):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 🚀 After deployment runs

When the agent deploys (from this folder, per [docs/deployment/DEPLOY_INSTRUCTIONS.md](DEPLOY_INSTRUCTIONS.md)):

1. **Cloudflare** — Ensure [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → travelplanner-ks → Settings has:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (from `.env.local`)

2. **Test** — Visit https://travelplanner-ks.pages.dev and check that data loads.

---

## 🔙 Rollback

If something goes wrong and you need to restore a previous deploy, use an earlier commit from `feat/globe-loader` in this repo, or the backup branch if you have one (e.g. `backup-v1-before-v2` in the TravelPlanner repo). Then revert Cloudflare settings in the dashboard if needed.
