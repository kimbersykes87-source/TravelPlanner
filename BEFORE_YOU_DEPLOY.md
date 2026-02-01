# Before You Deploy — Simple Checklist

Do these steps **before** running the deployment (copying v2 into TravelPlanner and pushing).

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
3. Add the script from `apps-script/SyncToSupabase.gs` (see [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md))
4. Add script properties: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (from your `.env.local`)
5. Run **Travel Planner → Sync to Supabase**
6. *(Optional)* Add a daily trigger for `runScheduledSync` to keep Supabase active (7-day free tier)

### 3. Get Your Credentials for Cloudflare

1. Open `c:\dev\TravelPlanner_v2\.env.local`
2. Copy these two values (you’ll paste them into Cloudflare):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 🚀 After Deployment Runs

After the agent copies v2 into TravelPlanner and commits, you need to:

1. **Update Cloudflare** — [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → travelplanner-ks → Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Remove variable: `SPREADSHEET_ID`
   - Add variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (use the values from `.env.local`)

2. **Push** — `git push origin feat/globe-loader` (or ask the agent to do it)

3. **Test** — Visit your site and check that data loads.

---

## 🔙 Rollback

If something goes wrong, you can restore v1:

```powershell
cd c:\dev\TravelPlanner
git checkout backup-v1-before-v2
git push origin backup-v1-before-v2 --force  # to make Cloudflare use it
```

Then revert the Cloudflare settings (build command, env vars) in the dashboard.
