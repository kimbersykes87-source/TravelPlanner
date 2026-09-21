You are helping me put the September 2026 Travel Planner update live. The code changes are already in this folder (C:\dev\TravelPlanner_v2) but are not committed or deployed. Read these first, then follow the plan below exactly, one step at a time:

- docs/SITE_REVIEW_2026-09.md (section 8: what changed)
- docs/setup/AUTH_SETUP.md (the rollout order; this is the source of truth for steps 3 to 8)
- docs/setup/GOOGLE_SETUP.md
- docs/deployment/DEPLOY_INSTRUCTIONS.md

Ground rules:
- Use PowerShell, and chain commands with `;` not `&&`.
- Never print, echo, log or commit secrets (.env.local, service role key, database password, account password). Never put a secret in a VITE_ variable.
- The ORDER matters. Deploying the database lock-down before the new app and the two accounts exist would lock us out of our own data. Do not skip ahead or combine steps.
- Where a step needs me to do something in a dashboard, stop, tell me exactly what to click, and wait for me to reply "done" before continuing.
- If anything fails, stop and explain it in plain English before trying a fix. Don't force anything.
- Don't use em dashes or en dashes in anything you write for me.

STEP 1: Install and check
1. Run `npm install` (adds vitest, which the new tests need).
2. Run `npm test`, `npm run lint`, `npm run build`. All three must pass. Expect 21 passing tests and no lint errors. If anything fails, stop and show me.
3. Run `git status`. Make sure `.env.local`, `data.csv`, `dist/` and `node_modules/` are NOT listed as things to commit (they should be ignored). If any secret file would be committed, stop.
4. Note: many files may show as modified only because of Windows line endings. That's fine.

STEP 2: Commit on a safety branch (not live yet)
1. Create and switch to a branch `improvements-2026-09`.
2. `git add -A`, then commit with the message: "September 2026 update: correct visa maths, full log loading, hardened Sheets sync, sign-in, secure share links, docs".
3. Push that branch to origin (`git push -u origin improvements-2026-09`). This does NOT deploy; Cloudflare only deploys `feat/globe-loader`.
4. Tell me when it's pushed.

STEP 3: Accounts (me, in Supabase). Stop and walk me through AUTH_SETUP.md step 1:
- Create the two users (Kimber and Siona) with "Auto confirm user" ticked.
- Turn off "Allow new users to sign up".
Ask me to reply "done" and to tell you the two email addresses (you'll need them in step 7; they are not secret, but don't commit them anywhere).

STEP 4: Google Sheets sync (me, in Apps Script). Walk me through AUTH_SETUP.md step 2:
- Copy the service_role key from Supabase > Project Settings > API Keys into Apps Script > Project Settings > Script properties as SUPABASE_SERVICE_ROLE_KEY (keep SUPABASE_URL).
- Replace the whole contents of the SyncToSupabase script file with apps-script/SyncToSupabase.gs from this repo, and save.
- Reload the Sheet and run Travel Planner > Sync to Supabase. It should say "Sync complete" (a note that it couldn't record the run is expected until step 6).
- Check the daily trigger for runScheduledSync still exists (Apps Script > Triggers).
Wait for "done" and ask me to paste the sync summary so you can check it.

STEP 5: Deploy the new app
1. Merge `improvements-2026-09` into `feat/globe-loader` (fast-forward if possible).
2. Run `npm test; npm run lint; npm run build` again on feat/globe-loader.
3. Push with `git push origin feat/globe-loader --force-with-lease` (NOT plain --force).
4. Tell me to wait 1 to 3 minutes, then open https://travelplanner-ks.pages.dev and check I get the "Sign in" screen, and that I can sign in on my phone and see my data (the database is still open at this point, so everything should load).
5. Remind me I can delete VITE_APP_PASSWORD from Cloudflare's environment variables (no longer used). Do not remove VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.
Wait for me to confirm sign-in works before continuing.

STEP 6: Share-link function and database changes
1. `npx supabase login` (I'll approve in the browser), then `npx supabase link --project-ref xaxbbtzsyrtchtjrjvqy`.
2. `npx supabase functions deploy viewer-data --no-verify-jwt`.
3. Run `npx supabase migration list` and show me which migrations are local-only vs already on the remote.
   - If ONLY the three new ones are pending (20260920120000_sync_runs, 20260920121000_drop_unused_tables, 20260920130000_auth_and_rls), tell me we're about to lock the database, have the step 7 SQL ready, then run `npx supabase db push`.
   - If older migrations also show as pending, do NOT run db push. Instead give me the three new files to paste into the Supabase SQL Editor, in date order, and wait for "done".

STEP 7: Add us as members (straight away after step 6)
Give me this SQL with the two emails from step 3 filled in, in lower case, to run in the Supabase SQL Editor:
INSERT INTO app_members (email, profile_id) VALUES ('<kimber email>', 'kimber'), ('<siona email>', 'siona');
Wait for "done".

STEP 8: Verify everything
Ask me to check each of these and report back:
1. Signed in, the site loads all tabs. Past > Relationship shows the timeline right up to this month (not stopping at June 2026).
2. The Us tab shows visa tiles with "days left", and at the top "Synced from Google Sheets ... ago" after I run the sync once more from the Sheet.
3. Signed out (or in a private window), the site shows only the sign-in screen.
4. Us tab > Read-only share link > Create link, open it in a private window: Past, Present and Future load; the Us tab says "Hidden for obvious reasons".
5. Supabase > Advisors > Security: no warnings saying RLS is disabled or that tables are open to anon.
If anything fails, use the "If something goes wrong" section of AUTH_SETUP.md.

STEP 9: Wrap up
1. Delete the `improvements-2026-09` branch locally and on origin once feat/globe-loader has everything.
2. Give me a short summary of what's live and anything left to do.
