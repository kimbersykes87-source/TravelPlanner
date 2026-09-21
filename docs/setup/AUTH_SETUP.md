# Sign-in and database lock-down

**Status: complete (21 September 2026).** Kimber and Siona sign in with email
and password. Only those two can read or write. The Google Sheets sync uses
the service role key. The `/view` share link goes through the `viewer-data`
function, which hides personal details.

What shipped, and the problems we hit: [GO_LIVE_2026-09.md](../deployment/GO_LIVE_2026-09.md).

The steps below are the one-time rollout, kept here for recovery. Do not run
them again unless you are rebuilding from scratch.

**Order matters.** The site stays usable at every step except the minute
between steps 5 and 6. Do not lock the database before the new app and both
accounts exist.

You need: the Supabase dashboard for project `xaxbbtzsyrtchtjrjvqy`, the
Google Sheet's Apps Script editor, and Cursor with this repo.

---

## 1. Create the two accounts (Supabase dashboard)

1. **Authentication > Users > Add user > Create new user** for Kimber and again
   for Siona. Enter each email and a password, and tick **Auto confirm user**.
2. **Authentication > Sign In / Providers > Email**: keep Email enabled.
3. **Authentication > Sign In / Providers**: turn **off** "Allow new users to
   sign up". Nobody else should be able to create an account.

## 2. Give the Google Sheets sync its own key

1. Supabase: **Project Settings > API Keys** and copy the **service_role**
   (secret) key. Never put this key in the website or in git.
2. Google Sheet: **Extensions > Apps Script > Project Settings > Script
   properties**. Add `SUPABASE_SERVICE_ROLE_KEY` with that value. Keep
   `SUPABASE_URL`. You can delete `SUPABASE_ANON_KEY`.
3. Replace the `SyncToSupabase` script file with the new
   [`apps-script/SyncToSupabase.gs`](../../apps-script/SyncToSupabase.gs) and save.
4. In the Sheet, run **Travel Planner > Sync to Supabase**. It should say
   "Sync complete". (Until step 5 it cannot record the run history yet; that
   only shows in the Apps Script log and is expected.)

## 3. Deploy the new app

Deploy as usual (see [DEPLOY_INSTRUCTIONS.md](../deployment/DEPLOY_INSTRUCTIONS.md)).
The site now shows a **Sign in** screen instead of the shared password. Sign in
on each phone once; it stays signed in.

The old "allow all for anon" policies do **not** cover signed-in users
(role `authenticated`). After this step the Us tab will look empty until
steps 5 and 6. That is expected. Do not add a temporary `anon` policy to
"fix" it; go on to the lock-down and add the members.

You can remove `VITE_APP_PASSWORD` from Cloudflare's environment variables; it
is no longer used.

## 4. Deploy the share-link function

From Cursor's terminal in `C:\dev\TravelPlanner_v2`:

```powershell
npx supabase login
npx supabase link --project-ref xaxbbtzsyrtchtjrjvqy
npx supabase functions deploy viewer-data --no-verify-jwt --use-api
```

Run `npx supabase login` in a normal Cursor terminal (not the agent shell):
the agent cannot open the browser login. Use the Travel Planner Supabase
account, not another org on the same machine.

## 5. Apply the database changes

Have the next step's SQL ready, then run:

```powershell
npx supabase db push
```

If it lists older migrations as well (from January to March), stop: those are
already in the database. Instead paste the three new files into the **SQL
Editor** and run them in date order.

It applies three migrations: `sync_runs` (sync history), `drop_unused_tables`
(removes two empty tables) and `auth_and_rls` (the lock-down). From this moment
the app shows empty pages until step 6 is done.

## 6. Add yourselves as members (straight away)

Supabase **SQL Editor**, with the exact emails from step 1 in lower case:

```sql
INSERT INTO app_members (email, profile_id) VALUES
  ('kimber-email@example.com', 'kimber'),
  ('siona-email@example.com', 'siona');
```

Reload the site: everything loads again. Then run **Travel Planner > Sync to
Supabase** in the Sheet; the Us tab now shows "Synced from Google Sheets ... ago".

## 7. Make a share link (optional)

Us tab > **Read-only share link > Create link**, then **Copy link**. Anyone with
it can browse Past, Present and Future, but not passports, visas or UK work
days. **Make a new link** switches off the old one.

---

## Checking it worked

- Signed out, the site shows only the sign-in screen.
- **Supabase > Advisors > Security** shows no "RLS disabled" or "policy allows
  anon" warnings for the app tables. Two other warnings are expected and
  harmless: `is_member()` is SECURITY DEFINER (needed), and leaked password
  protection is optional (Authentication > Attack Protection).
- The old `/view` link without `?k=...` says the link is not valid.

## If something goes wrong

Everything can be reverted in the SQL Editor. To reopen one table temporarily
(for example while fixing an email typo), signed-in users need
`authenticated`, not `anon`:

```sql
CREATE POLICY "temp open" ON <table> FOR SELECT TO authenticated USING (true);
```

Drop it again with `DROP POLICY "temp open" ON <table>;`. Then fix
`app_members` and reload.
