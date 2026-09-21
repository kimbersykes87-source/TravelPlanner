# Travel Planner v2: Site Review and Understanding

**Reviewed:** 19 September 2026
**Folder:** `C:\dev\TravelPlanner_v2`
**Live site:** https://travelplanner-ks.pages.dev
**Repo:** github.com/kimbersykes87-source/TravelPlanner (production branch `feat/globe-loader`)

This is my read of what the app is, how it works, what state it is in, and where I think the biggest improvements are. Questions for you are at the end.

---

## 1. What the app is

A private, mobile-first PWA for **Kimber and Siona** to run their nomadic life together. It answers four questions, one per bottom-nav tab:

| Tab | Sub-tabs | What it does |
|-----|----------|--------------|
| **Us** | (single page) | Two profile cards (passport(s), DOB, frequent flyer numbers, photo) plus visa/residency tiles: UK tax-year days (120 cap), UK work days (39 cap), Kimber's US ESTA 90-day admission, Siona's US B1/B2 rolling-365, Schengen 90/180 |
| **Past** | All Time, Relationship, Map | Country stats (days per person, together, rank, continents), a consolidated relationship timeline since 30 Sep 2023, and a Leaflet world map coloured Together / Kimber / Siona / Separately / Pre-relationship |
| **Present** | To Book, Booked | A booking task board: requests ("book a flight to X, budget Y, by deadline Z") assigned to Kimber or Siona, which get moved to Booked with confirmation details. Types: Flight, Accommodation, Hire Car, Ferry, Train |
| **Future** | Scenarios, Bucket List | Trip scenarios with stays (country, city, dates, who, accommodation incl. VanFrito / VanTutu / Airbnb / hotel), a rating, icon, map, share link and a **Visa Check** that simulates the scenario against the same rules as the Us tab. Plus a per-person bucket list |

There is also a **viewer mode** at `/view`: no password, edit buttons hidden, passport details replaced by "Hidden for obvious reasons". The header reads "Travel Planner *by Jenny*" and the password screen says "This is a mirage".

## 2. How it is built

- **Frontend:** React 19 + Vite 7 + React Router 7, Leaflet maps, Lottie globe loader, `vite-plugin-pwa` with a custom service worker (`public/sw.js`), install prompt and push-notification prompt. Dark theme, styles mostly inline, design tokens in `src/index.css`.
- **Data:** Supabase (Postgres), 13 app tables + 2 push tables. All data is read in one hook, `useTravelData`, which fetches all 13 tables in parallel.
- **Two sources of truth, by design:**
  - **Google Sheets** (spreadsheet `1OcJ76...`) is still the master for Profiles, Countries, RelationshipLog (the daily "where was each of us" log), Statistics, VisaRules, PreRelationshipCountries, BucketList. Apps Script (`apps-script/SyncToSupabase.gs`) pushes these to Supabase on a menu click or daily trigger; `02-PAST-TAB.gs` recalculates Statistics at midnight.
  - **App-only tables** (to_book, booked_upcoming, future_scenarios, scenario_stays, booking_type_meta) are edited in the app and live only in Supabase.
- **Push notifications:** DB webhooks call the `enqueue-notification` Edge Function on INSERT to scenarios / bucket list / to-book / booked / statistics; `process-notification-queue` batches and sends Web Push ("Travel Planner: 2 new scenarios, 1 booked...").
- **Hosting:** Cloudflare Pages, auto-deploys from `feat/globe-loader`. A GitHub Action pings Supabase every 5 days so the free project does not pause.
- **Tooling:** Cursor rule `.cursor/rules/deploy.mdc` means "deploy" = `git add -A`, commit, force-push to `feat/globe-loader`.
- **History:** v1 was a single HTML file (`reference/digital-nomad-planner.html`, "Fionas Kimberinho") reading Sheets via a Cloudflare Function and writing via an Apps Script web app. v2 migrated to React + Supabase in Jan/Feb 2026.

## 3. Current state

- 8 commits, last one in **late March 2026** (fourth frequent flyer slot). About six months without changes.
- Working tree has **uncommitted edits in 11 files** (mostly docs, `.env.example`, keep-alive workflow, deploy rule). Git also shows ~75 files as modified, which is almost certainly Windows line endings rather than real changes.
- No automated tests. ESLint is configured.
- Audits in `docs/audits/`: self-scored 72/100 (Jan), Lighthouse on the dev server (Feb): Accessibility 98, Best Practices 96, SEO 92, Performance 47 (dev build, so not representative).

---

## 4. What I found (prioritised)

### 4.1 Bugs in the visa maths (high: these tiles are the point of the Us tab)

1. **Country matching uses substring checks, so "US" matches lots of countries.** In `src/lib/visaCalculations.js` and `src/lib/scenarioVisaValidation.js`, a country counts as the US if its name *contains* "us". I tested it: **Australia, Austria, Russia, Belarus, Cyprus and Mauritius all register as the US**, and in scenarios "South America" does too. Consequences:
   - Days logged in Australia count toward Kimber's ESTA admission and Siona's rolling-365 US days.
   - In Scenario Visa Check, Austria is renamed to "united states" before the Schengen check, so Austria days count as US and **not** as Schengen.
   - Same pattern for the UK: "Ukraine" counts as UK tax days.
   Fix: match exact normalised names or ISO codes (the `countries` table already has iso2/iso3).
2. **Schengen list is out of date.** Bulgaria and Romania became full Schengen members on 1 Jan 2025 and are missing from both lists, so days there are not counted toward 90/180.
3. ~~UK work-day warning is off by one.~~ **Correction (20 Sep):** this was my mistake. 39 work days are allowed and the tie starts at 40, so the old behaviour was right. The new tile says so explicitly.
4. Two separate implementations of the same rules (Us tab vs Scenario Visa Check) with slightly different country lists. Worth merging into one module so they cannot drift.

### 4.2 Privacy and security (high)

1. **Your passport numbers, DOBs and US visa number are effectively public.** The Supabase anon key ships in the JavaScript bundle (normal for Supabase), and every table has an "allow all for anon" RLS policy. The `/view` route loads the full app without a password, so anyone with the share link (or anyone who finds the site) can pull the key from the bundle and **read, edit or delete every table directly**, including `profiles`. Hiding the passport text in viewer mode is cosmetic only.
2. **The site password is in the client bundle** (fallback `betterthanlego2026!` in `PasswordGate.jsx`, also written in `ARCHITECTURE.md`, which is in the GitHub repo). If `VITE_APP_PASSWORD` is set in Cloudflare it is still inlined into the JS at build time. Client-side password checks are a curtain, not a lock.
3. **`.env.local` holds very powerful secrets** (service role key, DB password, Supabase account email *and password*). It is correctly gitignored, but the account password should not live in a project file at all.
4. The Sheets sync writes with the anon key, which only works *because* RLS is wide open. Tightening RLS means moving the sync to the service role key (kept in Apps Script properties).

Suggested direction: real auth (Supabase magic link or your 4-digit PIN idea backed by an Edge Function), RLS limited to authenticated users, and viewer mode served from a read-only view that excludes the `profiles` sensitive columns.

### 4.3 Data and performance (medium)

- Every page calls `useTravelData()` separately, so **each tab switch re-downloads all 13 tables**, including the whole daily relationship log. A shared cache (context or TanStack Query) would make navigation instant and cut Supabase usage.
- `present_bookings` is fetched but not used by any screen (superseded by `to_book` / `booked_upcoming`).
- The Sheets to Supabase split means the daily RelationshipLog is edited in a spreadsheet, not in the app. Adding a "where are we today" quick entry in the app would remove the Sheets dependency for the most-used data.

### 4.4 Code health (medium)

- Page files are large: `FutureScenarios.jsx` 1,605 lines, `PresentToBook.jsx` 863, `PresentBooked.jsx` 774. Helpers are copy-pasted between them (`ISO3_TO_ISO2`, `getCountryIso2`, `BOOKING_TYPES`, icon lists, modal styles). To Book and Booked are near-duplicates.
- A hand-written ISO3 to ISO2 and ISO2 to continent map (about 110 countries) is used for flags and the continent count. Countries outside it will show no flag and not count toward continents.
- Inline styles throughout make consistent restyling hard; the design tokens exist but are not always used.
- No tests. The visa calculators are the ideal first candidates.

### 4.5 Docs and repo hygiene (low)

- Docs are duplicated (`docs/GOOGLE_SETUP.md` and `docs/setup/GOOGLE_SETUP.md`, same for PHASE_AUDIT, VISA_LOGIC, the migration plan).
- `ARCHITECTURE.md` and `APPLICATION_SUMMARY.md` still describe v1 in places (Cloudflare Function reading Sheets, `js/00-all-tabs.js`, "open digital-nomad-planner.html", "bookings local only").
- `lighthouse-report.report.*` (~640 KB) is committed; only the non-`.report` variants are ignored.
- Production branch is called `feat/globe-loader` and deploys use `--force` push. Works, but a `main` branch would be safer and clearer.

### 4.6 UX ideas (for discussion)

- A "Today" view: where each of you is, days left on the current visa clock, next booking.
- Proactive alerts via the push system you already built (e.g. "Schengen: 10 days left", "ESTA admission ends in 14 days", "passport expires in 6 months").
- Link Future scenarios to Present: turn an agreed scenario's stays into To Book tasks in one tap.
- Show the passport-expiry and visa-expiry dates as warnings on the Us tab.

### 4.7 Google Sheets sync check (20 Sep 2026)

Checked the Apps Script code, the live Supabase data (read-only) and the Sheet.

**The sync itself is working.** Supabase has the log up to date, including this week (Kimber in Australia from 17 Sep, Siona in the Dominican Republic), and the Profiles row has the fourth frequent flyer slot added in March. RelationshipLog has 1,451 rows (30 Sep 2023 to 20 Sep 2027, future dates pre-filled blank), Countries 194, Statistics 199, VisaRules 4.

**But the app only reads the first 1,000 days of the log.** Supabase returns at most 1,000 rows per request by default, and `useTravelData` asks for the whole log in one go. So the app sees 30 Sep 2023 to **26 Jun 2026** and nothing after. Confirmed on the live site: the Relationship timeline stops at 26 Jun 2026. Knock-on effects:
- ESTA tile ignores Kimber's US stay 31 Jul to 16 Sep 2026 (48 days) and still treats the 20 to 26 Jun trip as the latest admission.
- Siona's US days miss August and September; UK tax-year, Schengen, Past stats, map and Scenario Visa Check all miss everything since late June.
- This got worse every day since June and will not fix itself. Fix: page through the log (or only fetch the date range each calculation needs).

**Data problems in the Sheet** (you fix these in the Sheet, then sync):
- ~~Siona's US visa dates swapped~~ **Fixed in the Sheet 20 Sep** (expiry 2034-05-19, issued 2024-05-24).
- ~~2024-11-12 twice, no 2024-11-13~~ **Fixed in the Sheet 20 Sep.**
- Both fixes reach the app on the next sync run (still showing the old values in Supabase at time of check).

**Weaknesses in the sync script:**
- It only adds and updates; it never deletes. A row removed or re-dated in the Sheet stays in Supabase forever.
- No record of when it last ran or whether it failed (errors only go to the Apps Script log). There is no way to tell from the app that data is stale.
- The PreRelationshipCountries, BucketList and PresentBookings tables in Supabase are empty (0 rows). **Confirmed 20 Sep: "visited before we met" is not needed**; the map already colours from Statistics (Kimber visited, Siona visited, Together), so PreRelationshipCountries is dead code to remove.
- If a BucketList tab is ever added back without an ID column, every sync would create duplicate items with random IDs, and it would overwrite bucket-list edits made in the app.
- Writes use the anon key, which only works because the database is wide open (see 4.2).
- Dates typed as text in odd formats fall back to JavaScript date parsing and can shift by a day depending on the script time zone.

**Proposed sync fixes (Phase 1):**
1. App: fetch the full log in pages of 1,000 (fixes every visa number).
2. Script: add a `sync_runs` table recording time, rows per table and errors; show "Last synced ..." in the app and warn if older than 2 days.
3. Script: after upserting, delete Supabase rows no longer in the Sheet (log, countries, statistics, visa rules only).
4. Script: validate before sending (duplicate dates, gaps in the log, unknown country names, expiry before issue) and list problems in the result message.
5. Script and database: remove PreRelationshipCountries and PresentBookings (sync mappings, tables, app fetches, old docs). BucketList stays app-only, so remove its Sheet mapping too.
6. Script: use the service role key once the database is locked down.

---

## 5. Confirmed with Kimber (19 Sep 2026)

- **In regular use** by Kimber and Siona. It was an early coding project; goal now is to **tighten it up and make it professional**.
- **Google Sheets stays** as the place the daily country log and master data are kept. The Sheets to Supabase sync remains.
- **Users: only Kimber and Siona** log in and edit (no Jenny). The `/view` link is kept for occasional read-only sharing.
- **US tracking:** Kimber travels on an **ESTA**; Siona holds a **10-year US B1/B2 visa**.
- **Passports:** both hold **British** passports; Kimber also holds an **Australian** passport.
- **Proper login: yes**, replace the shared password.

- **UK tiles stay** as they are (120 UK days, 39 UK work days are correct).
- **Viewer mode stays**, but must be locked down properly.
- **Login: email + password**, stay signed in on each phone.
- **Uncommitted March edits:** reviewed. They are docs-only (Apps Script trigger notes, ScenarioCache marked removed, APPLICATION_SUMMARY rewritten for v2) plus a Supabase CLI version file. All accurate; recommend committing them as a "docs: Feb 2026 updates" commit before Phase 1.

### Implications

- Two Supabase Auth accounts (Kimber, Siona) with email + password; RLS allows read/write only to those two.
- Viewer mode rebuilt as a **secret share link** (`/view/<token>`). A Supabase Edge Function checks the token and returns read-only data with passport, visa, DOB and frequent-flyer fields stripped out, so no viewer ever touches the database directly. The token can be rotated if a link leaks.
- Siona's card should say "British Passport" too (currently labelled just "Passport"). Kimber's second passport should read Australian.
- ESTA (Kimber): 90 days per admission, trips to Canada/Mexico/adjacent islands do not reset the clock. B1/B2 (Siona): lawful stay is set by each I-94 admission; the rolling-365 total is a sensible "don't look like you live here" heuristic, so keep it but label it as a guide.
- Schengen 90/180 applies to both on British passports.

## 6. Still open

1. Should the Us tab warn on passport and visa expiry (e.g. 6 months before)?
2. Which email addresses should the two accounts use?

## 7. Plan

**Phase 1: Correct numbers** (no visible change except right answers)
- Fetch the whole relationship log (currently capped at 1,000 rows, so nothing after 26 Jun 2026 is seen) and the sync fixes in 4.7.
- One shared country-matching module using exact names and ISO codes from the `countries` table; delete the substring checks.
- One shared visa-rules engine used by both the Us tab and the Scenario Visa Check.
- Add Bulgaria and Romania to Schengen; fix the UK work-day off-by-one.
- Unit tests (Vitest) for ESTA, B1/B2 rolling-365, Schengen 90/180 and UK tax year, using real-shaped log data.

**Phase 2: Lock it down**
- Supabase Auth for two accounts; remove `PasswordGate` and the hard-coded password.
- RLS: only those two users can read or write; drop the "allow all for anon" policies.
- Sheets sync switched to the service role key (in Apps Script properties).
- Rebuild `/view` as a token share link served by an Edge Function; scrub the password from docs; move the Supabase account password out of `.env.local`.

**Phase 3: Professional polish**
- Load data once and share it across tabs (no reload on every tab switch).
- Split the big page files into components; one set of shared helpers, form fields and modal.
- Full country list for flags and continents (from the `countries` table rather than hand-typed maps).
- Consistent styling via design tokens; loading skeletons, empty states, error toasts.
- ESLint clean, `main` as the production branch, no force-push deploys.

**Phase 4: Docs and repo tidy**
- Remove duplicate docs, rewrite `ARCHITECTURE.md` for v2, ignore Lighthouse reports, retire `present_bookings` if unused.

**Later (optional features):** Today view, visa and passport-expiry push alerts, turn a scenario into To Book tasks.

---

## 8. Work done (20 Sep 2026)

All changes are in the project folder, not yet committed or deployed. Checks: 21 unit tests pass, ESLint clean, production build OK, and a browser run against a copy of the real travel log.

**Phase 1: correct numbers (done)**
- All tables now load in pages of 1,000 rows, so the app sees the whole log again (it had stopped at 26 Jun 2026).
- Data loads once and is shared by every tab (`TravelDataProvider`); saving refreshes in the background.
- New visa engine in `src/lib/visa/`, used by both the Us tab and the Scenario Visa Check: exact country matching, Schengen with Bulgaria and Romania, US territories (Puerto Rico etc.) count as the US, ESTA clock keeps running through Canada, Mexico and the Caribbean, windows counted inclusively, time-zone-safe day maths.
- Us tab tiles rewritten: days left, day X of 90 with must-leave-by date, last and next US stay, planned breaches, UK days used vs planned, work-tie status. Passport labels fixed (both British; Kimber's second is Australian); Siona's US visa shown.
- Scenario cards now show Schengen and USA together when a trip has both; the Visa Check lists each person and rule with baseline, peak and days left; the editor warns about visa limits before saving.
- 21 unit tests (`npm test`).

**Phase 1: Google Sheets sync (done, needs pasting into Apps Script)**
- New `apps-script/SyncToSupabase.gs`: checks the Sheet (duplicate/missing dates, unknown countries, swapped expiry dates), upserts in batches, removes rows deleted from the Sheet (with a safety limit), records every run in `sync_runs`, fails loudly in scheduled runs, reads dates in the Sheet's time zone, and adds a **Check data only** menu item.
- Us tab shows "Synced from Google Sheets x ago" (amber after 48 hours, red on failure) and any data warnings.
- Removed dead PreRelationshipCountries, PresentBookings and BucketList sync (the bucket list is app-only).

**Phase 2: sign-in and lock-down (built, needs the rollout in docs/setup/AUTH_SETUP.md)**
- Email + password sign-in (Supabase Auth); stays signed in per phone. Shared password removed.
- Migration `20260920130000_auth_and_rls.sql`: member-only access via `app_members`; sheet tables writable only by the sync.
- `/view?k=<token>` share links served by the new `viewer-data` Edge Function, without passports, visas, DOB, frequent flyer or UK work days. Links are created and replaced on the Us tab.

**Phase 3 and 4: polish and docs (mostly done)**
- One country/flag/continent library (full ISO list) replaces three hand-typed copies.
- ESLint now clean (was 16 errors, 12 warnings); keyboard focus ring and labelled login fields.
- Docs: new ARCHITECTURE, GOOGLE_SETUP, AUTH_SETUP, VISA_RULES, VIEWER_MODE; README rewritten; deploy steps now run tests, lint and build first and use `--force-with-lease`.
- Not done yet: splitting the largest page files (FutureScenarios is ~1,600 lines) and moving inline styles to shared components. Worth doing next, with a few UI tests first.
