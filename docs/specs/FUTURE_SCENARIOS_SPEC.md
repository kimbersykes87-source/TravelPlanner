# Future Scenarios – Detailed Spec for Rebuild (Supabase)

This document describes **how all calculations work** and **how all menus and UI flows work** for Future Scenarios, so a Cursor Agent can rebuild the feature in a new project using a Supabase database.

---

## 1. Data Model

### 1.1 Scenario (metadata)

| Field | Type | Notes |
|-------|------|--------|
| `scenarioId` | string, PK | Generated: `SC-` + 8-char alphanumeric (e.g. from UUID). Must be unique. |
| `headline` | string | Required. Display title. |
| `createdBy` | enum | `'kimber'` \| `'siona'` \| `'both'` – who created the scenario (for filter). |
| `rating` | number 0–5 | Half-step allowed (0, 0.5, 1, … 5). Default 0. |
| `startDate` | ISO date | Derived from stays min(startDate) when saving; must be set for validation. |
| `endDate` | ISO date | Derived from stays max(endDate). |
| `summary` | string | Overview/notes. |
| `icon` | string | Key into scenario icon set (e.g. `'camping'`, `'beach'`, `'future'`). |
| `accommodationType` | string | Optional; used for card badge. |
| `lastUpdated` | ISO datetime | Set on create/update. |

### 1.2 Stay (itinerary segment)

One scenario has many stays. Stays define country, date range, and who travels.

| Field | Type | Notes |
|-------|------|--------|
| `scenarioId` | string, FK | Parent scenario. |
| `stayId` | string | Generated: `ST-` + 8-char alphanumeric. Unique per stay. |
| `profileScope` | enum | `'kimber'` \| `'siona'` \| `'both'` – who is on this stay. |
| `country` | string | Required. Normalized country name (for visa logic). |
| `city` | string | Optional. |
| `startDate` | ISO date | Required. |
| `endDate` | ISO date | Required; can default to startDate. |
| `notes` | string | |
| `accommodationType` | string | Optional (e.g. hotel, Airbnb). |
| `routeNotes` | string | Key cities / route. |
| `imageUrl` | string | Optional. |

**Constraints (enforced at validation):**

- Scenario `startDate` / `endDate` must encompass all stays (every stay’s start/end within scenario range).
- Scenario total duration ≤ planning window (e.g. 366 days).
- All stays must have valid ISO dates and country.

### 1.3 Supporting data (for calculations)

- **RelationshipLog (history):** Rows with `date`, and per-profile country (e.g. column for Kimber, column for Siona). Used to build “history entries” up to scenario start for baseline visa math.
- **VisaRules:** Jurisdiction rules (see §2). Defaults if missing:
  - US-ADMISSION: 90 days, contiguous (US + Canada/Mexico), admission block.
  - US-ROLLING365: 365-day window, 180 days max (Siona B1/B2).
  - UK-TAX: 120 days per UK tax year (April 6 – April 5).
  - SCHENGEN-ROLLING: 180-day window, 90 days max.

---

## 2. Calculations (Visa / Day-Count Logic)

All visa calculations use **day numbers**: `floor(date_ms / (24*60*60*1000))`. Convert date ↔ day number consistently (same epoch).

### 2.1 Building “entries” from stays

- **Scenario entries by profile:** For each stay, expand `[startDate, endDate]` day-by-day. For each day, attach `date`, `dayNumber`, `country`, `source: 'scenario'`. If `profileScope === 'both'`, create entries for both `kimber` and `siona`; else only that profile.
- **History entries:** From RelationshipLog, one row per date with country per profile. Format: `{ date, dayNumber, country, source: 'history' }`.
- **Merged entries:** Merge history + scenario entries by date; scenario overwrites same date. Sort by dayNumber.

### 2.2 Jurisdiction helpers

- **US (ESTA contiguous):** US + Canada + Mexico (normalize country names).
- **US365:** United States only (for Siona’s rolling 365-day rule).
- **UK:** United Kingdom (normalize “UK”, “Great Britain”, etc.).
- **SCHENGEN:** Member country list (Austria, Belgium, …, Switzerland, Monaco, San Marino, Vatican City).

Implement:

- `getJurisdictionForCountry_(country)` → `'US'` | `'UK'` | `'SCHENGEN'` | `''`.
- `collectDayNumbersForJurisdiction_(entries, jurisdiction)`:
  - For `US`: entries where country is US or contiguous (Canada/Mexico).
  - For `US365`: entries where country is United States only.
  - For `UK`: entries where country is UK.
  - For `SCHENGEN`: entries where country is Schengen.
  - Return sorted array of day numbers.

### 2.3 ESTA (Kimber) – US 90-day admission

- **Rule:** Single admission = contiguous block of days in US/Canada/Mexico. No more than 90 days in one block. Leaving US (e.g. to Europe) starts a new admission.
- **Filter for ESTA:** `filterMergedEntriesForESTA_(mergedEntries, scenarioEntries)`:
  - History: include all US-contiguous days.
  - Scenario: include US days; include Canada/Mexico only if **adjacent day** (previous or next day in scenario) is US. This avoids counting Canada-only legs as ESTA.
- **Baseline (at scenario start):**
  - If the **day before** scenario start is US → treat as “exited US” → baseline = 0 (new admission).
  - Else: from history-only entries (up to but not including scenario start), compute current admission block length at scenario start day using `analyzeUSAdmissions_`.
- **Projected:** Run `analyzeUSAdmissions_` on ESTA-filtered merged entries (and if day-before was US, exclude that day from projected too). Read `maxLength` and `dayLengths` (per-day block length).
- **Remaining:** `limit - projected_length_at_scenario_end_day`.
- **Violation:** If any block length > 90, error; set violation date to that block’s start.

**analyzeUSAdmissions_(entries, referenceDayNumber, limit):**

- Group consecutive days that are US-contiguous into blocks.
- For each block, track startDay, endDay, list of day numbers.
- For each day in a block, store in a map: dayNumber → length of that block.
- Return: `{ dayLengths, maxLength, todayLength (length at referenceDayNumber), violationDay }`.

### 2.4 US B1/B2 rolling 365 (Siona)

- **Rule:** In any rolling 365-day window, Siona must not exceed 180 days in the US.
- **Baseline:** Count US days in history within `[scenarioStart - 365, scenarioStart)`.
- **Projected:** Merge history + scenario; collect US day numbers; run rolling-window analysis.
- **analyzeRollingWindow_(dayNumbers, windowDays, limit):**
  - Sort day numbers. For each day, count how many days fall in `[day - windowDays, day]`. Store count per day in `countsByDay`. Track max count and first violation day (first day where count > limit).
  - Return: `{ countsByDay, maxCount, violationDay }`.
- **Remaining:** `limit - projected_count_at_scenario_end_day`.

### 2.5 Schengen rolling 180

- **Rule:** In any rolling 180-day window, max 90 days in Schengen (both profiles).
- Same pattern as US365: baseline = Schengen days in history in window before scenario start; projected = merge history + scenario, collect Schengen day numbers, run `analyzeRollingWindow_(dayNumbers, 180, 90)`. Remaining and violation analogous.

### 2.6 UK tax year

- **Rule:** Max 120 days in the UK in a single tax year (April 6 – next April 5).
- **getTaxYearStartDay_(dayNumber):** Map day to its tax year start (April 6). If day is before April 6 in year Y, tax year start is April 6, Y-1.
- **Baseline:** UK days in history in the **same tax year** as scenario start, before scenario start.
- **Projected:** Merge history + scenario; collect UK day numbers; for each tax year spanned, count days in that tax year. If scenario bridges tax year, “current” tax year for “remaining” is the one containing scenario end; baseline for the new tax year can be 0.
- **analyzeUKTax_(dayNumbers, limit):** For each day, count how many of the given UK days fall in the same tax year and on or before that day. Store per-day count and per–tax-year max. Return `{ countsByDay, maxCount, violationDay, maxCountByTaxYear }`.
- **Remaining:** `limit - projected_UK_days_in_that_tax_year_at_scenario_end`. Violation if any tax year exceeds 120.

### 2.7 Validation output (per profile, per rule)

For each profile (kimber, siona) and each rule that applies (has days in scenario for that jurisdiction):

- **baseline:** Count at scenario start (as above).
- **projected:** Max (or end) value after adding scenario.
- **delta:** projected − baseline.
- **limit:** Rule limit (90, 180, 90, 120).
- **remaining:** limit − projected_at_scenario_end.
- **status:** `'ok'` or `'error'` (error if over limit).
- **label:** e.g. “Kimber – US ESTA 90-day admission”, “Siona – US B1/B2 rolling 365”.

Only include in breakdown jurisdictions that actually have days in the scenario (e.g. don’t show US ESTA if scenario has no US days).

### 2.8 Validation errors and warnings

- **Errors (block save):** Missing scenario start/end; duration > max window; any stay outside scenario date range; any visa rule exceeded (with violation date in message).
- **Warnings:** e.g. “Scenario does not contain any stays.”

---

## 3. API Contract (Replace with Supabase)

Current app uses a single Write API (Google Apps Script `doPost`) with `action` + token.

### 3.1 validateScenario

- **Input:** `{ scenario, stays }` (scenario metadata + array of stays). Same shape as payload below.
- **Output:**  
  `{ success, errors[], warnings[], breakdown[], dailyEntries? }`  
  - `breakdown`: array of `{ profileId, ruleId, label, baseline, projected, delta, limit, remaining, status }`.  
  - No persistence.

### 3.2 upsertScenario

- **Input:** Full scenario payload:
  - `scenarioId` (optional for create; server can generate),
  - `headline`, `createdBy`, `rating`, `startDate`, `endDate`, `summary`, `icon`, `accommodationType`, `lastUpdated`,
  - `stays`: array of stay objects (stayId, profileScope, country, city, startDate, endDate, notes, accommodationType, routeNotes, imageUrl).
- **Logic:** Validate with same rules as validateScenario. If errors, return `success: false` and validation. If OK: upsert scenario row, **replace all stays** for that scenarioId (delete existing, insert new).
- **Output:** `{ success, scenario, stays, validation }` (scenario/stays with ids filled).

### 3.3 deleteScenario

- **Input:** `scenarioId`.
- **Output:** `{ success, scenarioId }`. Delete scenario and all its stays.

### 3.4 Rating-only update

- Frontend can PATCH scenario rating without re-running full validation (optional; can be a separate RPC or update row).

---

## 4. Menus and UI Flows

### 4.1 Future tab structure

- **Main tab:** “Future” (top nav).
- **Sub-tabs:** “Scenarios” (default) | “Bucket List”.
- **Scenarios sub-tab:** List of scenario cards + toolbar. **Bucket List** is a separate list (bucket list items; optional for first rebuild).

### 4.2 Scenarios list (Scenarios sub-tab)

- **Toolbar:**
  - **Create New Scenario** → open scenario editor (new).
  - **Export scenarios** → open export view (read-only cards grid; print/PDF).
  - **Filter dropdown:** All Scenarios | Created by Kimber | Created by Siona | Created together. Filter by `createdBy` (value `all` | `kimber` | `siona` | `both`).
- **List:** Cards for each scenario (see §4.4). Empty state: “No scenarios yet. Start planning your next adventure!”

### 4.3 Scenario editor modal (create/edit)

- **Open:** Create → no id; Edit → load scenario + stays into local state.
- **Form state:** `scenarioEditorState = { scenario, stays, validation, errors }`. Scenario dates are **derived from stays** (min start, max end) on “Check” and “Save”; display-only “Scenario dates” summary updates when stays change.

**Fields:**

1. **Headline** – text, required.
2. **Created by** – select: Kimber | Siona | Both of us (`kimber` | `siona` | `both`).
3. **Scenario dates** – read-only summary (e.g. “1 Jan 2026 → 15 Mar 2026 • 74 days”). Updates from stays.
4. **Scenario icon** – custom dropdown: grid of icons (adventure, beach, camping, dining, hiking, …). Value stored as string key.
5. **Overview / notes** – textarea (summary).
6. **Itinerary builder:** Repeated “stay” cards (see §4.5). Button “Add stay” appends a new stay; each card has “Remove”.

**Footer:**

- **Cancel** – close modal, discard.
- **Check Scenario** – call validateScenario API; display errors/warnings and visa breakdown in validation area. **Enable “Save Scenario” only if validation has no errors** (errors array empty and no breakdown item with status `'error'`).
- **Save Scenario** – only enabled after a successful Check with no errors. Calls upsertScenario; on success, update local list and close.

**Validation area (in modal):**

- If errors: list “Validation Errors” and “Please fix these errors before saving.”
- If no errors and not checked: “Click ‘Check Scenario’ to validate…”
- If checked: “Visa Check Results”, warnings (if any), breakdown lines (label, baseline/projected/remaining, status). If all OK: “All visa checks passed!” and “Ready to save.”

### 4.4 Scenario card (list view)

- **Header:** Icon (from scenario icon), headline, meta line “Created by • date range”.
- **Actions:** Edit (open editor), Delete (confirm then deleteScenario).
- **Flags:** Up to 5 countries with day counts (from stays). “+N more countries” if >5.
- **Summary chips:** Duration, country count, travellers (Kimber solo / Siona solo / Together), accommodation badge if set.
- **Rating:** Star display (0–5, half steps). In list, read-only; in detail (see below) can be interactive with debounced persist.
- **Expandable:** “View itinerary & visa checks” → when opened, call validateScenario and render **scenario detail** (visa table, map, itinerary timeline, interactive rating). Cache validation result by scenarioId until scenario is edited/deleted.

### 4.5 Stay card (inside editor)

- **Stay N** + Remove button.
- **Travellers:** Together | Kimber | Siona (`profileScope`).
- **Country:** Text input with datalist/autocomplete from countries list; show flag. Resolve to canonical name on blur/commit.
- **Start date / End date:** Date inputs (with calendar trigger).
- **Accommodation:** Dropdown/select with icons (hotel, Airbnb, etc.).
- **Notes** – textarea.
- **Route / key cities** – textarea.
- **Image URL** – optional; preview thumbnail if present.

**Behavior:**

- On stay date change: “auto-align” next stays (e.g. next stay start ≥ previous end) and **sync scenario dates** from stays (min start, max end), then update “Scenario dates” summary.
- **Add stay:** New stay gets start/end = day after previous stay’s end (or scenario dates if no stays).

### 4.6 Scenario detail (expandable on card)

- **Rating:** Interactive stars (click/keyboard), debounced save (e.g. 500 ms) to update scenario rating only.
- **Map:** Leaflet (or equivalent) with world GeoJSON; highlight countries from scenario stays (color fill). Use country name/alpha2/alpha3 to match GeoJSON.
- **Visa table:** Columns – Rule, Start days, End days, Days used, Days remaining, Status. One row per breakdown item from validation. “Start days” = baseline, “End days” = projected, “Days used” = projected − baseline, “Days remaining” = remaining, Status = OK/Exceeded.
- **Warnings/errors** from validation.
- **Itinerary:** Timeline of stays (country, flag, date range, duration, travellers, notes, route, image thumbnail).

### 4.7 Scenario export view

- Full-screen view: “Scenario Export” title, Close, Print/PDF button. Grid of compact cards (headline, icon, dates, duration, countries, travellers). Used for printing or sharing.

### 4.8 Bucket list (optional)

- Separate sub-tab; list of bucket list items (user, icon, description, country, image, notes, completed, completed date). Add/Edit/Delete/Mark complete. Can be a separate Supabase table and spec if needed.

---

## 5. Derived and Display Helpers

- **Duration:** `(endDate - startDate) in days + 1` (inclusive).
- **Scenario derived (for list/detail):** From stays: `startDate`, `endDate`, `durationDays`, `countries[]`, `countryCount`, `travellers[]` (unique profileScope). Sort stays by startDate.
- **Country display:** Resolve name to alpha2/alpha3/flag URL from a countries reference table; show flag + code on cards and in stay rows.
- **Date formatting:** Long form for ranges (e.g. “1 January 2026”), relative for “Updated X ago”.

---

## 6. Constants and Config

- **Scenario ID prefix:** `SC-`; **Stay ID prefix:** `ST-`.
- **Planning window:** e.g. 366 days max scenario duration.
- **Visa defaults:** See §1.3 (90 ESTA, 180/365 US B1/B2, 90/180 Schengen, 120 UK tax year).
- **Profile scope:** `kimber` | `siona` | `both`.
- **Creator filter:** `all` | `kimber` | `siona` | `both` (filter by `createdBy`).
- **Rating:** 0–5, step 0.5; clamp and round to half.

---

## 7. Supabase Mapping Suggestions

- **Table `scenarios`:** Columns matching §1.1; `scenario_id` UUID or text PK; `created_at`, `updated_at` if desired.
- **Table `scenario_stays`:** Columns matching §1.2; `scenario_id` FK to `scenarios`, ON DELETE CASCADE. Unique `stay_id` or use UUID.
- **RPC or Edge Functions:**  
  - `validate_scenario(payload)` → returns `{ errors, warnings, breakdown }` (run same logic as §2).  
  - `upsert_scenario(payload)` → validate; if OK, upsert scenario and replace stays (transaction).  
  - `delete_scenario(scenario_id)`.
- **History data:** Either a `relationship_log` table (date, country_kimber, country_siona) or existing source; visa logic needs “history entries” per profile up to scenario start.
- **Visa rules:** Table `visa_rules` (jurisdiction, window_days, max_days, contiguous_territory) or server-side defaults.

---

## 8. Summary Checklist for Rebuild

- [ ] Data model: scenarios + scenario_stays; IDs; constraints.
- [ ] Day-number and date conversion utilities.
- [ ] Jurisdiction and country normalization (US, US365, UK, Schengen).
- [ ] build scenario entries by profile; merge history + scenario.
- [ ] ESTA: filterMergedEntriesForESTA; day-before-US reset; analyzeUSAdmissions.
- [ ] US365 and Schengen: analyzeRollingWindow; baseline within window before scenario start.
- [ ] UK: getTaxYearStartDay; analyzeUKTax; baseline and projected per tax year.
- [ ] validateScenario returns errors, warnings, breakdown (and optionally dailyEntries).
- [ ] upsertScenario: validate then upsert scenario + replace stays.
- [ ] deleteScenario: delete scenario and stays.
- [ ] UI: Future tab, Scenarios sub-tab, filter, list, card with expandable detail (visa table, map, timeline, rating).
- [ ] Scenario editor modal: form fields, stay cards, Add/Remove stay, sync dates from stays, Check Scenario, Save only when valid.
- [ ] Export view (optional): grid of scenario cards for print/PDF.
- [ ] Optional: Bucket list sub-tab and CRUD.

This spec is the single source of truth for calculations and menus for Future Scenarios when rebuilding with Supabase.
