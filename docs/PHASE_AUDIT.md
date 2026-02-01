# Phase 0–6 Audit – Travel Planner v2

## Phase Checklist

| Phase | Status | Notes |
|-------|--------|-------|
| **0: Scaffold & Copy** | Done | React+Vite scaffolded; copy script runs; assets/docs in place |
| **1: Supabase Schema** | Done | Migration pushed; 13 tables + RLS |
| **2: Sheets Sync** | Done | SyncToSupabase.gs; daily trigger optional |
| **3: React PWA Foundation** | Done | manifest, vite-plugin-pwa, routing, bottom nav, sub-menu, Icon |
| **4: Port UI & Data** | Partial | Password gate, useTravelData, UsPage shows profiles; many pages are placeholders |
| **5: Map** | Done | Natural Earth 110m, getCountryIds, Leaflet |
| **6: Deploy & Keep-Alive** | Pending | GitHub Actions workflow present; deploy when ready |

---

## Local Testing

**Run:** `npm run dev` → http://localhost:5173

**Password gate:** Disabled in dev; enabled in production builds.

---

## Functions That Work Locally

- **Routing** – All routes (Us, Past, Present, Future + sub-routes)
- **Bottom nav** – Us | Past | Present | Future
- **Sub-menu** – All Time | Relationship | Map (Past); To Book | Booked (Present); Scenarios | Bucket List (Future)
- **Us page** – Loads profiles from Supabase; shows “No profiles” or profile cards
- **Past / Map** – Loads GeoJSON from Natural Earth; renders map (needs network for tiles + GeoJSON)
- **Data loading** – useTravelData fetches from Supabase when env vars set

---

# Implementation Audit – What Still Needs to Be Built

Reference: v1 `digital-nomad-planner.html` + `APPLICATION_SUMMARY.md` + `ARCHITECTURE.md`

---

## 1. Us Tab – Profiles & Visa Tracking

### Implemented ✓

- Profile cards (name, DOB)
- Data from `profiles` table via useTravelData

### Not Implemented

| Item | v1 Source | Data | Priority |
|------|-----------|------|----------|
| **Profile detail** | profilesGrid | `profiles`: passport, us_visa, frequent_flyer, profile_picture_url | High |
| **UK Tax Days** | visa-tracker | `relationship_log` (kimber_country/siona_country = UK), UK tax year (Apr 6 – Apr 5), “Remaining UK days = 120 − UK_midnights” | High |
| **UK Work Days** | visa-tracker | `relationship_log` (ks_uk_work_days, ss_uk_work_days), “Remaining UK work days = 39 − UK_work_days”, warning if ≥ 40 | High |
| **US ESTA (Kimber)** | visa-tracker | `relationship_log`, `visa_rules`, max 90 days per admission; Canada/Mexico contiguous; entry day = Day 1 | High |
| **US B1/B2 (Siona)** | visa-tracker | `relationship_log`, rolling 365-day heuristic | High |
| **Schengen** | visa-tracker | `relationship_log`, `visa_rules`, 90 days in rolling 180 | High |
| **Visa tile UI** | visa-item, visa-days, visa-reset | Standard format: blue metric top-right, 3 grey lines below, DD-MM-YY dates | Medium |

---

## 2. Past Tab – All Time & Relationship

### Implemented ✓

- Past / Map: Leaflet map, Natural Earth 110m GeoJSON, country coloring by statistics
- Entry count on Past All Time

### Not Implemented

| Item | v1 Source | Data | Priority |
|------|-----------|------|----------|
| **All Time timeline** | timeline-all-time | `relationship_log` ordered by date; consolidate consecutive same-country days into periods; show date range, country, notes | High |
| **Relationship timeline** | timeline-relationship | Same as All Time but “relationship” view (logic may differ in v1) | High |
| **Timeline UI** | .timeline | Period cards, country badges, notes | Medium |
| **Map fullscreen** | fullscreenBtn, toggleMapFullscreen | Fullscreen toggle | Low |
| **Map legend** | .map-legend | Together | Siona | Kimber | Separately | Low |
| **Map loading overlay** | mapLoadingOverlay | Spinner + “Loading your map…” | Low |

---

## 3. Present Tab – To Book & Booked

### Implemented ✓

- Placeholder pages; data available via useTravelData (`toBookTasks`, `bookedUpcoming`, `bookingTypeMeta`)

### Not Implemented

| Item | v1 Source | Data | Priority |
|------|-----------|------|----------|
| **To Book form** | toBookForm | Assignee, type, start/end date, deadline, instruction, notes → `to_book` | High |
| **To Book lists** | kimberToBookList, sionaToBookList | Two columns by assignee; task cards with edit/delete | High |
| **Save To Book** | saveToBookTask | Supabase insert/upsert `to_book` | High |
| **Booked timeline** | bookedTimeline | `booked_upcoming` as timeline cards | High |
| **Add Booking** | openBookedEditor, bookedEditorForm | Type, travellers, headline, dates, details, confirmation, notes → `booked_upcoming` | High |
| **Convert to Booked** | presentDialog, convertToBookedForm | Move task from `to_book` to `booked_upcoming`; fill headline, travellers, dates, confirmation | High |
| **Edit/delete Booked** | bookedEditorDialog | Update/delete `booked_upcoming` | Medium |
| **Travel Calendar** | calendarGrid, currentMonth | Monthly calendar with booking indicators; prev/next month | Medium |
| **Booking type meta** | toBookType, bookedEditorType | `booking_type_meta` for type options, icons, colors | Low |

---

## 4. Future Tab – Scenarios & Bucket List

### Implemented ✓

- Placeholder pages; data available (`futureScenarios`, `scenarioStays`, `bucketList`)

### Not Implemented

| Item | v1 Source | Data | Priority |
|------|-----------|------|----------|
| **Scenario list** | scenarioList | Scenario tiles: headline, creator, rating, dates, summary badges | High |
| **Scenario filter** | scenarioFilter | Filter by Kimber | Siona | Both | Medium |
| **Scenario editor modal** | scenarioEditorModal | Headline, creator, icon picker, dates, rating, summary, accommodation; dynamic stay rows (country, city, dates, notes) | High |
| **Scenario CRUD** | submitScenarioEditor | Supabase: `future_scenarios` + `scenario_stays` (upsert/delete) | High |
| **Check Scenario** | checkScenario | Visa validation against scenario stays; warnings/errors | Medium |
| **Scenario detail drawer** | (expand scenario) | Itinerary timeline, visa projection table, map with highlighted countries | Medium |
| **Bucket list** | bucketList | List of bucket list items | High |
| **Bucket list editor** | bucketListItemEditorModal | User, icon, description, country, image URL, notes, completed checkbox | High |
| **Bucket list CRUD** | submitBucketListItem | Supabase `bucket_list` insert/update/delete | High |

---

## 5. Cross-Cutting

### Not Implemented

| Item | Description | Priority |
|------|-------------|----------|
| **Supabase write layer** | Hooks/helpers for insert, update, delete (to_book, booked_upcoming, future_scenarios, scenario_stays, bucket_list) | High |
| **Loading states** | Spinner, skeleton, or “Loading…” on pages that fetch | Medium |
| **Error handling** | User-visible error messages when Supabase fails | Medium |
| **Icon component** | Replace placeholder with Lucide icons per plan | Low |
| **Offline cache** | IndexedDB cache of Supabase data; “Offline – cached data” banner | Low |
| **Kosovo overlay** | Separate GeoJSON overlay if Natural Earth 110m omits Kosovo | Low |

---

## 6. Deployment

### Pending

- Deploy to Cloudflare Pages
- Set env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Custom domain (travelplanner.kimbersykes.com)
- Re-enable password gate for production (already conditional on `import.meta.env.DEV`)

---

## Priority Summary

| Priority | Items |
|----------|-------|
| **High** | Us: visa tracking (UK tax/work, US ESTA/B1/B2, Schengen), profile detail; Past: All Time & Relationship timelines; Present: To Book form + lists, Booked timeline + add/convert/edit; Future: scenario list + editor + CRUD, bucket list + editor + CRUD; Supabase write layer |
| **Medium** | Visa tile UI; map legend/fullscreen; edit/delete booked; travel calendar; scenario filter + detail + validation; loading/error states |
| **Low** | Icon component; offline cache; Kosovo overlay |

---

## Dependencies for Full Functionality

- **Supabase** – `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Network** – Map tiles (OpenStreetMap) + Natural Earth GeoJSON
- **Synced data** – Run Sheets → Supabase sync so tables have data
