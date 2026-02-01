# Future Scenarios Visa Logic – Migration Documentation

This document analyzes the existing Future Scenarios visa logic so it can be replicated in a Supabase-based TravelPlanner_v2 project.

---

## Executive Summary

| Topic | Key points |
|-------|------------|
| **ScenarioCacheSummary** | DISABLED. Cache is not used; validation runs on demand via `validateScenario`. `buildVisaSummaryRows_()` used today as reference; `validateScenarioVisaRules_()` uses scenario start for baseline and scenario end for remaining. |
| **DEFAULT_VISA_RULES** | US-ADMISSION (90/90), US-ROLLING365 (365/180), UK-TAX (365/120), SCHENGEN-ROLLING (180/90). `loadVisaRules_()` falls back to defaults if sheet missing/empty. |
| **Jurisdiction / Profile** | Only show rules for jurisdictions with days in the scenario (`hasUSDays`, `hasSchengenDays`, `hasUKDays`). One breakdown row per (profile, rule). |
| **"Days Remaining" source** | Live `validateScenario` API, not cache. Appears only in expanded scenario detail (visa table), not on collapsed card. |
| **Porting** | For "Schengen: 42 days remaining" badge: call `validateScenario`, find breakdown entry with `ruleId === 'SCHENGEN-ROLLING'`, use `entry.remaining`. Use scenario-end as reference. Port core functions and constants listed in §5.3–5.4. |

---

## 1. ScenarioCacheSummary Calculation

### 1.1 Status: **DISABLED**

The ScenarioCache sheets (`ScenarioCacheMetadata`, `ScenarioCacheDays`, `ScenarioCacheSummary`) are **not used** in the frontend. `rebuildScenarioCache()` returns immediately and does nothing. Data is calculated **on-demand** via `validateScenario` API.

**Source:** `04-FUTURE-TAB.gs` lines 834–837, 817–821; `APPLICATION_SUMMARY.md` line 342.

### 1.2 How ScenarioCacheSummary Was Populated

`buildVisaSummaryRows_()` was called from `rebuildScenarioCache()` for each `(scenarioId, profileId)` pair. It produced rows written to the `ScenarioCacheSummary` sheet.

**Entry point:** `rebuildScenarioCache()` (disabled) → `buildVisaSummaryRows_()` (lines 899–907).

### 1.3 `buildVisaSummaryRows_()` vs `validateScenarioVisaRules_()`

| Aspect | `validateScenarioVisaRules_()` | `buildVisaSummaryRows_()` |
|--------|-------------------------------|---------------------------|
| **Reference date for baseline** | Scenario start | Today |
| **Reference date for remaining** | Scenario end | Today (or max in window) |
| **Jurisdiction filtering** | Yes: only rules where scenario has days (`hasUSDays`, `hasSchengenDays`, `hasUKDays`) | No: always emits US-ADMISSION (kimber), US-ROLLING365 (siona), SCHENGEN, UK for both |
| **ESTA remaining** | `limit - projectedLengthAtEnd` (at scenario end) | `limit - projected.todayLength` (at today) |
| **US365 / Schengen remaining** | `limit - projectedCountAtEnd` (count at scenario end) | `limit - projected.maxCount` (max in window) |
| **UK remaining** | `limit - projectedCountAtEnd` (tax year containing scenario end) | `limit - currentTaxYearProjectedMax` (tax year containing today) |

So the cache used **today** as the reference date, while the live validation uses **scenario start/end**.

**Files:** `04-FUTURE-TAB.gs`:
- `validateScenarioVisaRules_`: 392–813
- `buildVisaSummaryRows_`: 997–1065

### 1.4 Reference Date Summary

| Rule | Baseline (history) | Projected | Remaining |
|------|--------------------|-----------|-----------|
| **validateScenarioVisaRules_** | | | |
| US-ADMISSION (ESTA) | At scenario start (with day-before-US reset) | Max admission length including scenario | `limit - projectedLengthAtEnd` (at scenario end) |
| US-ROLLING365 | Days in `[scenarioStart - 365, scenarioStart)` | Rolling 365 analysis | `limit - projectedCountAtEnd` (at scenario end) |
| SCHENGEN-ROLLING | Days in `[scenarioStart - 180, scenarioStart)` | Rolling 180 analysis | `limit - projectedCountAtEnd` (at scenario end) |
| UK-TAX | UK days in same tax year as scenario start, before start | UK days in tax year(s) spanned | `limit - projectedCountAtEnd` (tax year containing scenario end) |
| **buildVisaSummaryRows_** | | | |
| All rules | History up to today / today’s tax year | Same logic but with today as reference | Today-based remaining |

### 1.5 ScenarioCacheSummary Columns

From `writeScenarioCacheSheet_` (lines 918–920):

| Column | Index | Derivation |
|--------|-------|------------|
| ScenarioId | 0 | `scenario.scenarioId` |
| ProfileId | 1 | `'kimber'` or `'siona'` |
| Jurisdiction | 2 | Rule ID: `US-ADMISSION`, `US-ROLLING365`, `SCHENGEN-ROLLING`, `UK-TAX` |
| BaselineDays | 3 | Baseline count/length at reference date |
| ProjectedDays | 4 | Projected count/length |
| RemainingDays | 5 | `limit - projected` |
| Limit | 6 | Rule `maxDays` |
| Status | 7 | `'ok'` or `'error'` |
| ViolationDate | 8 | ISO date of first violation, or empty |
| SummaryJson | 9 | JSON array (notes) |
| LastSynced | 10 | ISO timestamp |

**Source:** `04-FUTURE-TAB.gs` lines 903–915 (`pushSummary`), 918–920.

---

## 2. Visa Rules

### 2.1 DEFAULT_VISA_RULES

**Location:** `00-ALL-TABS.gs` lines 85–90

| ruleId | jurisdiction | window_days | max_days | contiguousTerritory |
|--------|--------------|-------------|----------|---------------------|
| US-ADMISSION | US | 90 | 90 | true |
| US-ROLLING365 | US365 | 365 | 180 | false |
| UK-TAX | UK | 365 | 120 | false |
| SCHENGEN-ROLLING | SCHENGEN | 180 | 90 | false |

**Note:** US-ADMISSION uses `windowDays: 90` and `maxDays: 90`; the window is effectively the admission block length.

### 2.2 `loadVisaRules_()` Behavior

**Location:** `00-ALL-TABS.gs` lines 291–314

1. Looks up sheet `VisaRules` via `getSheetByExpectedName(VISA_RULES_SHEET_NAME)`.
2. If sheet is missing → returns `DEFAULT_VISA_RULES`.
3. Reads data rows (skips header). Expected columns: `[ruleId, jurisdiction, windowDays, maxDays, contiguousTerritory]`.
4. Per row: `jurisdiction` required; `windowDays` / `maxDays` fall back to defaults if invalid.
5. If no valid rows → returns `DEFAULT_VISA_RULES`.

**Fallback chain:**  
Sheet missing → defaults. Row missing/invalid → use matching default for that jurisdiction.

### 2.3 Rule Lookup Pattern

Rules are resolved by `ruleId` or `jurisdiction`:

```javascript
rules.find(r => (r.ruleId || r.jurisdiction) === 'US-ADMISSION' || r.jurisdiction === 'US')
rules.find(r => (r.ruleId || r.jurisdiction) === 'US-ROLLING365' || r.jurisdiction === 'US365')
rules.find(r => (r.ruleId || r.jurisdiction) === 'SCHENGEN-ROLLING' || r.jurisdiction === 'SCHENGEN')
rules.find(r => (r.ruleId || r.jurisdiction) === 'UK-TAX' || r.jurisdiction === 'UK')
```

---

## 3. Jurisdiction and Profile Scope

### 3.1 Which Visa Rules Apply to a Scenario

**Location:** `04-FUTURE-TAB.gs` lines 477–493

- **US (ESTA, B1/B2):** Only if `hasUSDays` – scenario includes US (United States / United States of America).
- **Schengen:** Only if `hasSchengenDays` – scenario includes at least one Schengen country.
- **UK:** Only if `hasUKDays` – scenario includes United Kingdom.

```javascript
const hasUSDays = scenarioEntries.some(entry => … United States …);
const hasSchengenDays = scenarioEntries.some(entry => isSchengenCountry(entry.country));
const hasUKDays = scenarioEntries.some(entry => … United Kingdom …);
```

Only jurisdictions with days in the scenario get breakdown rows. ESTA and B1/B2 are profile-specific: ESTA for Kimber, B1/B2 for Siona.

### 3.2 Jurisdiction Helpers

**Files:** `00-ALL-TABS.gs`, `01-US-TAB.gs`, `04-FUTURE-TAB.gs`

- `getJurisdictionForCountry_(country)` → `'US'` | `'UK'` | `'SCHENGEN'` | `''`
- `collectDayNumbersForJurisdiction_(entries, jurisdiction)` → sorted day numbers
- `isUSOrContiguous_(country)` → US, Canada, Mexico
- US vs US365: US = contiguous (US + Canada + Mexico); US365 = US only

### 3.3 profileScope and Breakdown Rows

**Location:** `04-FUTURE-TAB.gs` lines 369–411, 497–687

- Iterates over `['kimber', 'siona']`.
- For each profile, builds `scenarioEntries` via `buildScenarioEntriesByProfile_(stays)`.
- `profileScope === 'both'` → both profiles get entries for that stay.
- `profileScope === 'kimber'` → only Kimber.
- `profileScope === 'siona'` → only Siona.

Breakdown rows are per profile. Example: Schengen scenario with `profileScope: 'both'` produces two Schengen rows (Kimber, Siona); with `profileScope: 'kimber'` only one.

**Source:** `buildScenarioEntriesByProfile_` (lines 9–29), `validateScenarioVisaRules_` loop (lines 411–810).

---

## 4. Data Flow for "Days Remaining" on Scenario Cards

### 4.1 Source of "Days Remaining"

**Source:** Live `validateScenario` API, not cache.

Flow: User expands "View itinerary & visa checks" → `renderScenarioDetail(scenarioId)` → `validateScenarioRemote(payload)` → backend `validateScenarioPayload_` → `validateScenarioVisaRules_` → returns `breakdown` with `remaining`.

**Files:**
- `js/04-future-tab.js`: `renderScenarioDetail` (1297–1329), `buildScenarioDetailHtml` (1331–1415)
- `js/00-all-tabs.js`: `validateScenarioRemote` (499–530)
- `03-PRESENT-TAB.gs`: `validateScenario` handler (89–95)
- `04-FUTURE-TAB.gs`: `validateScenarioPayload_` → `validateScenarioBundle_` → `validateScenarioVisaRules_`

### 4.2 Caching

- `scenarioValidationCache` (Map) caches by `scenarioId`.
- Cache is cleared before each expand: `scenarioValidationCache.delete(scenarioId)` (line 1311).
- So every expand triggers a new API call.

### 4.3 Breakdown Shape and Frontend Mapping

Backend breakdown item:

```javascript
{
  profileId, ruleId, label,
  baseline, projected, delta,
  limit, remaining, status
}
```

Frontend `computeScenarioVisaSummaryRows()` maps:

- `remaining` → `remainingDays`
- `baseline` → `startDays`
- `projected` → `endDays`
- `status` → `status`

**File:** `js/04-future-tab.js` lines 1983–2045.

### 4.4 Where "Days Remaining" Appears

- Scenario editor validation area (after "Check Scenario"): `item.remainingDays`
- Scenario detail (expanded card) visa table: "Days remaining" column
- Scenario detail uses `row.remainingDays` from `computeScenarioVisaSummaryRows()`

**Note:** The collapsed scenario card does **not** show "X days remaining". It shows duration, country count, travellers, accommodation. Visa info appears only after expand.

---

## 5. Porting to the New Project

### 5.1 Minimum Logic for "Schengen: 42 days remaining"

1. Call `validateScenario({ scenario, stays })` (or equivalent RPC).
2. Use `breakdown` from the response.
3. Find entry with `ruleId === 'SCHENGEN-ROLLING'` (and correct `profileId` if needed).
4. Use `entry.remaining` as "42 days remaining".

No ScenarioCacheSummary is involved.

### 5.2 Reference Date for Summary Tile

For scenario cards / tiles, **scenario-end-based remaining** is appropriate:

- Represents: “After this scenario, how many days are left before the limit?”
- Matches `validateScenarioVisaRules_()`.

Do **not** use today-based remaining (as in `buildVisaSummaryRows_`) for scenario summaries.

### 5.3 Core Functions to Port

| Function | File | Purpose |
|----------|------|---------|
| `getDayNumber_` | 00-ALL-TABS.gs | Date → day number |
| `dayNumberToDate_` | 00-ALL-TABS.gs | Day number → Date |
| `getJurisdictionForCountry_` | 00-ALL-TABS.gs | Country → jurisdiction |
| `collectDayNumbersForJurisdiction_` | 00-ALL-TABS.gs | Entries → day numbers |
| `isUSOrContiguous_` | 01-US-TAB.gs | US/Canada/Mexico check |
| `filterMergedEntriesForESTA_` | 01-US-TAB.gs | ESTA contiguous filter |
| `analyzeUSAdmissions_` | 01-US-TAB.gs | ESTA block analysis |
| `analyzeRollingWindow_` | 01-US-TAB.gs | US365, Schengen |
| `getTaxYearStartDay_` | 02-PAST-TAB.gs | UK tax year |
| `analyzeUKTax_` | 02-PAST-TAB.gs | UK tax year |
| `buildScenarioEntriesByProfile_` | 04-FUTURE-TAB.gs | Stays → entries by profile |
| `mergeHistoryAndScenarioEntries_` | 04-FUTURE-TAB.gs | Merge history + scenario |
| `buildHistoryEntries_` | 02-PAST-TAB.gs | RelationshipLog → entries |
| `validateScenarioVisaRules_` | 04-FUTURE-TAB.gs | Main validation logic |

### 5.4 Constants to Port

- `DEFAULT_VISA_RULES` (00-ALL-TABS.gs)
- `SCHENGEN_COUNTRIES` (00-ALL-TABS.gs)
- `US_CONTIGUOUS_TERRITORIES` (00-ALL-TABS.gs)

---

## 6. File and Function Reference

| Category | File | Functions / Constants |
|----------|------|------------------------|
| Visa defaults | `00-ALL-TABS.gs` | `DEFAULT_VISA_RULES`, `loadVisaRules_`, `getJurisdictionForCountry_`, `collectDayNumbersForJurisdiction_`, `getDayNumber_`, `dayNumberToDate_` |
| ESTA / US | `01-US-TAB.gs` | `isUSOrContiguous_`, `filterMergedEntriesForESTA_`, `analyzeUSAdmissions_`, `analyzeRollingWindow_` |
| UK | `02-PAST-TAB.gs` | `getTaxYearStartDay_`, `analyzeUKTax_` |
| History | `02-PAST-TAB.gs` | `buildHistoryEntries_` |
| Validation | `04-FUTURE-TAB.gs` | `validateScenarioVisaRules_`, `buildScenarioEntriesByProfile_`, `mergeHistoryAndScenarioEntries_`, `validateScenarioBundle_`, `validateScenarioPayload_` |
| Cache (disabled) | `04-FUTURE-TAB.gs` | `rebuildScenarioCache`, `buildVisaSummaryRows_` |
| API | `03-PRESENT-TAB.gs` | `validateScenario` action handler |
| Frontend | `js/04-future-tab.js` | `validateScenarioRemote`, `computeScenarioVisaSummaryRows`, `renderScenarioDetail`, `buildScenarioDetailHtml` |
| Frontend API | `js/00-all-tabs.js` | `validateScenarioRemote` |
