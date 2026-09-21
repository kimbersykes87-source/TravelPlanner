# Sign-in and database lock-down (one-time rollout)

**Why:** until this is done, anyone with the website's public key can read and
change every table, including passport numbers. After it, only Kimber and
Siona (signed in) can read or write, the Google Sheets sync uses a private key,
and the `/view` share link goes through a server function that hides personal
details.

**Order matters.** Follow the steps top to bottom. The site keeps working at
every step except for the minute between steps 5 and 6.

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
on each phone once; it stays signed in. (The database is still open at this
point, so everything works exactly as before once you are signed in.)

You can remove `VITE_APP_PASSWORD` from Cloudflare's environment variables; it
is no longer used.

## 4. Deploy the share-link function

From Cursor's terminal in `C:\dev\TravelPlanner_v2`:

```powershell
npx supabase login
npx supabase link --project-ref xaxbbtzsyrtchtjrjvqy
npx supabase functions deploy viewer-data --no-verify-jwt
```

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
  anon" warnings for the app tables.
- The old `/view` link without `?k=...` says the link is not valid.

## If something goes wrong

Everything can be reverted in the SQL Editor. To reopen the database
temporarily (for example while fixing an email typo), run for the affected
table: `CREATE POLICY "temp open" ON <table> FOR SELECT TO anon USING (true);`
and drop it again afterwards with `DROP POLICY "temp open" ON <table>;`.
