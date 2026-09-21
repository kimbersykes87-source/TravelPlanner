# Travel Planner v2: architecture

**Last updated:** 21 Sep 2026 (sign-in and lock-down live; see [GO_LIVE_2026-09.md](../deployment/GO_LIVE_2026-09.md))

A private PWA for Kimber and Siona: where we have been, what needs booking,
what we are planning, and how many days we have left under each visa or
residency rule.

```
Google Sheet ──(Apps Script sync, service key)──►  Supabase (Postgres + Auth + Edge Functions)
 Profiles, Countries,                                   │
 RelationshipLog, Statistics,                           ├─► App (signed in): reads/writes via RLS
 VisaRules                                              └─► viewer-data function ─► /view?k=token (read-only)
                                                        ▲
                         Cloudflare Pages (React/Vite build of this repo)
```

## Pieces

| Part | Where | Notes |
|------|-------|-------|
| Frontend | `src/` | React 19, Vite 7, React Router 7, Leaflet, PWA (`public/sw.js`) |
| Hosting | Cloudflare Pages `travelplanner-ks` | Builds `npm run build`, serves `dist/` |
| Data | Supabase project `xaxbbtzsyrtchtjrjvqy` | Schema in `supabase/migrations/` |
| Sign-in | Supabase Auth, email + password | Two accounts; members listed in `app_members` |
| Sheet sync | `apps-script/SyncToSupabase.gs` | See [GOOGLE_SETUP.md](../setup/GOOGLE_SETUP.md) |
| Statistics tab | `apps-script/02-PAST-TAB.gs` | Builds the Statistics tab from RelationshipLog |
| Share link | `supabase/functions/viewer-data` | Checks the token, returns data without personal details |
| Push | `supabase/functions/*-push*`, `*-notification*` | See [PUSH_NOTIFICATIONS_SETUP.md](../setup/PUSH_NOTIFICATIONS_SETUP.md) |
| Keep-alive | `.github/workflows/supabase-keepalive.yml` | Pings Supabase every 5 days |

## Frontend structure

```
src/
  App.jsx                      routes; LoginGate for members, ViewerApp for /view
  contexts/
    AuthContext.jsx            Supabase session (stays signed in per device)
    TravelDataProvider.jsx     loads all tables once, shares them with every page
  hooks/                       useTravelData, useAuth, useViewer, usePushNotifications
  lib/
    dataLoader.js              reads every table in pages of 1,000 rows
    viewerLoader.js            /view data via the viewer-data function
    visa/                      the visa and residency engine (tested)
      engine.js                ESTA, B1/B2, Schengen, UK tax year; scenario checks
      jurisdictions.js         which countries count for which rule
      days.js                  calendar-day maths in UTC (no time-zone drift)
      engine.test.js           unit tests (npm test)
    countries/                 name -> ISO code resolution, continents
    countryFlags.js            flag codes for flagcdn.com
    supabaseWrites.js          inserts/updates for app-edited tables
  pages/                       Us, Past (All Time, Relationship, Map), Present (To Book, Booked), Future (Scenarios, Bucket List)
  components/                  layout, nav, map, timeline, LoginGate, AccountPanel, LastSynced
```

## Data ownership

| Table | Written by |
|-------|-----------|
| profiles, countries, relationship_log, statistics, visa_rules | Google Sheet sync only |
| to_book, booked_upcoming, future_scenarios, scenario_stays, bucket_list, booking_type_meta | The app |
| sync_runs | Sheet sync (one row per run) |
| viewer_links | The app (Us tab, share link) |
| app_members | By hand in the SQL Editor |

## Security model

- Row Level Security on every table. Signed-in members (`public.is_member()`)
  can read everything and write the app-edited tables. Anonymous visitors get
  nothing.
- The sync uses the **service role** key, stored only in Apps Script properties.
- `/view?k=<token>` never touches the database directly. The `viewer-data`
  function validates the token against `viewer_links` and returns names,
  travel log, scenarios, bookings and bucket list; never passport, visa,
  date-of-birth, frequent-flyer or UK work-day data.
- Secrets live in `.env.local` (gitignored) and in the Supabase/Cloudflare
  dashboards. The browser only ever has the public anon key.

Rollout (completed 21 Sep 2026): [AUTH_SETUP.md](../setup/AUTH_SETUP.md).
What shipped: [GO_LIVE_2026-09.md](../deployment/GO_LIVE_2026-09.md).

## Visa and residency rules

See [VISA_RULES.md](../specs/VISA_RULES.md). One engine serves both the Us tab
(today's position) and the Future scenario Visa Check (what-if), so they always
agree.

## Development

```powershell
npm install
npm run dev        # http://localhost:5173 (sign in with your normal account)
npm test           # visa engine unit tests
npm run lint
npm run build
```

Deploy: [DEPLOY_INSTRUCTIONS.md](../deployment/DEPLOY_INSTRUCTIONS.md).
