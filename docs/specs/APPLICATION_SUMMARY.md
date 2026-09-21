# Fionas Kimberinho - Travel Planner Application Summary

**Last Updated**: 2026-09-20  
**Status**: Fully Functional Production Application (Deployed on Cloudflare Pages)

---

## 📱 Application Overview

**Fionas Kimberinho** is a comprehensive travel planning and tracking application designed for Kimber and Siona to manage their digital nomad lifestyle. The app tracks travel history, visa requirements, bookings, and future scenarios across multiple countries.

### Key Features
- **Profile Management**: Dual profile system with passport, visa, and frequent flyer information
- **Visa Tracking**: Real-time calculations for UK tax days, US ESTA/B1/B2, and Schengen restrictions
- **Travel History**: Interactive world map with country visit visualization
- **Relationship Timeline**: Chronological view of travels since September 30, 2023
- **Current Bookings**: Track and manage present travel bookings
- **Future Scenarios**: Plan and visualize future travel scenarios

---

## 🏗️ Technical Architecture

### Frontend
- **Stack**: React + Vite; source in `src/` (App.jsx, pages, components, hooks, lib)
- **Technology**: React, Supabase client for data; Leaflet for maps; responsive design with dark theme

### Backend
- **Data**: Supabase (primary). Google Sheets data is synced to Supabase via Apps Script (`SyncToSupabase.gs`).
- **Spreadsheet ID**: `1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8` (synced to Supabase; app-only data stored in Supabase only)
- **Write Access**: Supabase (ToBook, BookedUpcoming, FutureScenarios, ScenarioStays, etc.); Sheets sync is read-from-Sheets → push to Supabase

### Deployment
- **Hosting**: Cloudflare Pages (`travelplanner-ks.pages.dev`)
- **Branch**: `feat/globe-loader` (auto-deploys on push)
- **Build**: `npm run build` → `dist/`; env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` required

### Google Apps Script Files
1. **`00-ALL-TABS.gs`** - Shared utilities, country mapping, sheet name resolution
2. **`02-PAST-TAB.gs`** - Statistics calculations, incremental refresh, midnight refresh (`midnightRefreshStatistics`, `setupMidnightRefresh`, `removeMidnightRefresh`)
3. **`SyncToSupabase.gs`** - Sync Sheets → Supabase; menu and scheduled sync (`runScheduledSync`)

Only two time-based triggers are used: `runScheduledSync` (optional daily) and `midnightRefreshStatistics` (optional 00:00). The `rebuildScenarioCache` function and trigger were removed (Feb 2026).

---

## 📊 Data Structure

### Google Sheets Used

#### 1. **Profiles Sheet**
- **Purpose**: Personal information for Kimber and Siona
- **Key Columns**: 
  - ProfileID, FullName, DOB
  - PassportNumber, PassportExpiry, PassportIssued
  - Passport2Number, Passport2Country, Passport2Expiry (for second passports)
  - USVisaNumber, USVisaExpiry, USVisaIssued (for Siona's B1/B2)
  - FrequentFlyer programs (up to 3 per person)
  - ProfilePictureURL

#### 2. **Countries Sheet**
- **Purpose**: Master list of all countries with standardized names and codes
- **Columns**: Country Name, Country Code (Alpha-3), Alpha-2 Code

#### 3. **RelationshipLog Sheet**
- **Purpose**: Daily travel log from September 30, 2023 onwards
- **Columns**: 
  - Date (YYYY-MM-DD format)
  - KimberCountry
  - SionaCountry
  - Notes
  - KSUKWorkDays (Kimber's UK work days - "Yes" or blank)
  - SSUKWorkDays (Siona's UK work days - "Yes" or blank)
- **Logic**: Same country = together, different countries = separate

#### 4. **PreRelationshipCountries Sheet**
- **Purpose**: Countries visited before relationship start (pre-Sept 30, 2023)
- **Columns**: ProfileID, CountryName, VisitedBefore
- **Usage**: Map visualization only (no dates tracked)

#### 5. **Statistics Sheet**
- **Purpose**: Auto-calculated country statistics
- **Columns**: 
  - Country, Country_Code
  - Kimber_Days, Siona_Days, Together_Days, Total_Days
  - Rank, Kimber_Visited, Siona_Visited, Together_Visited
- **Calculation**: Processed by `02-PAST-TAB.gs` (incremental refresh)
- **Refresh**: Automatic midnight refresh via trigger `midnightRefreshStatistics` (run `setupMidnightRefresh()` once to create)

#### 6. **PresentBookings Sheet**
- **Purpose**: Current travel bookings
- **Columns**: BookingID, ProfileID, Type, SubType, StartDate, EndDate, Country, City, Details, LinkedBookingID

#### 7. **VisaRules Sheet**
- **Purpose**: Centralized visa rule definitions for validation
- **Columns**: RuleID, Jurisdiction, WindowDays, MaxDays, ContiguousTerritory, Notes

### App-only data (Supabase, no Sheets)

These are edited in the app and stored in Supabase directly:

- **ToBook** – Tasks to book (Present → To Book)
- **BookedUpcoming** – Confirmed bookings (Present → Booked)
- **FutureScenarios** – Scenario metadata (Future → Scenarios)
- **ScenarioStays** – Scenario itineraries (with scenarios)
- **BookingTypeMeta** – Booking type icons/colors

---

## 🎯 Application Tabs

### 1. **Us Tab** - "Our Profiles & Visa Tracking"

#### Profile Cards
- **Display**: Two profile cards (Kimber and Siona)
- **Information Shown**:
  - Profile picture (hosted on GitHub)
  - Full name and date of birth
  - Passport information (primary and secondary)
  - US Visa information (for Siona: B1/B2 Visa number and expiry)
  - Frequent flyer programs (up to 3 per person)

#### Visa Tracking System

> Current rules and counting method: [VISA_RULES.md](VISA_RULES.md). The detail below is the original description and may be out of date.

**UK Tax Days Tracking**
- **Calculation**: Counts UK midnights in current UK tax year (April 6 - April 5)
- **Display**: "Remaining UK days = 120 − UK_midnights"
- **Reset Date**: Shows when tax year ends and resets

**UK Work Days Tracking**
- **Calculation**: Counts days where KSUKWorkDays or SSUKWorkDays = "Yes" in current tax year
- **Display**: "Remaining UK work days = 39 − UK_work_days"
- **Warning**: Highlights if UK_work_days ≥ 40 (work tie)

**US ESTA Tracking (Kimber)**
- **Rules**: 
  - Max 90 days per admission (not per year)
  - Days in Canada/Mexico after US entry count toward same 90-day admission
  - Entry day counts as Day 1
- **Display**:
  - "XX days since last [entry/exit]" (blue text, only dates ≤ today)
  - "Current admission: X days (Y days remaining)" with 90-day limit
  - "Upcoming visits: X days" from future RelationshipLog entries
  - "Planned entry: DD-MM-YY" and "Planned exit: DD-MM-YY"
  - "ESTA termination: DD-MM-YY" (90 days from entry, if in current admission)
- **Auto-detection**: Contiguous territory (Canada/Mexico) from RelationshipLog

**US B1/B2 Tracking (Siona)**
- **Rules**: 
  - Rolling 365-day US days total (heuristic, not legal requirement)
  - I-94 admit-until date governs lawful stay (not tracked in app)
- **Display**:
  - "XX days (XXX remaining)" in blue text for rolling 365 days
  - "Upcoming visits: XX days"
  - "Planned entry: DD-MM-YY" and "Planned exit: DD-MM-YY"
- **Warnings**: Displayed when approaching limits

**Schengen Tracking**
- **Rules**: 90 days in any rolling 180-day window
- **Display**:
  - "(XX days used)" in top right (blue text)
  - "Projected end date: DD-MM-YY" (when 90 days would be hit)
  - "Full refresh date: DD-MM-YY" (180 days after latest Schengen day in last 180 days)
- **Countries**: Includes all 29 Schengen countries + Monaco, San Marino, Vatican City

**Visa Tile Formatting**
- All visa tiles use standardized format:
  - Blue text at top right for main metric
  - Exactly three lines of smaller grey text below
  - All dates in DD-MM-YY format
  - Consistent font, size, and spacing

---

### 2. **Past Tab** - "Past Travels & Relationship Timeline"

#### Interactive World Map
- **Technology**: Leaflet.js with OpenStreetMap
- **Features**:
  - Fullscreen toggle
  - Country coloring based on visit type:
    - **Green**: Together (post-relationship)
    - **Blue**: Kimber only
    - **Pink**: Siona only
    - **Purple**: Separately (both visited but separately)
    - **Grey**: Pre-relationship (visited before Sept 30, 2023)
  - GeoJSON data from Natural Earth for country borders
  - Kosovo handled separately with custom GeoJSON

#### Timeline Controls
- **Toggle**: "All Time" vs "Relationship Log"
  - **All Time**: Shows all relationship log entries
  - **Relationship Log**: Shows consolidated periods

#### Relationship Timeline
- **Start Date**: September 30, 2023
- **Display**: Chronological list of travel periods
- **Consolidation**: Consecutive days in same country shown as periods
- **Information**: Dates, countries, and notes

---

### 3. **Present Tab** - "Current Travels & Bookings"

#### Booking Form
- **Fields**:
  - Who is traveling (Kimber/Siona/Both)
  - Booking type (Accommodation/Transport/Activity)
  - Sub-type dropdown
  - Start date and end date
  - Country and city
  - Details/notes
- **Status**: Currently saves to local memory only (not persisted to Sheets)

#### Calendar View
- **Features**:
  - Monthly calendar navigation
  - Travel indicators on dates with bookings
  - Booking display below calendar

---

### 4. **Future Tab** - "Future Scenarios"

#### Scenario Planner
- **Overview Tiles**: Icon, headline, rating, summary badges (duration, countries, travellers, accommodation), and last-updated timestamp
- **Filtering**: Quick filter by creator (Kimber/Siona/Both)
- **Detail Drawer**: Expandable view with itinerary timeline (flags, day counts, notes), visa projection table, and Leaflet map highlighting selected countries
- **Validation**: Server-side visa simulations reuse Us-tab rules (US ESTA admissions, Siona B1/B2 rolling 365, UK tax-year, Schengen rolling 180); warnings/errors surfaced before save
- **Editor**: Modal form supports headline, creator, icon picker, dates, rating, scenario notes, accommodation type, and dynamic stay rows (scope, country, city, notes, route highlights)
- **CRUD**: Create/update/delete scenarios persisted to Supabase (`future_scenarios`, `scenario_stays`)

---

## 🔄 Data Flow

### Loading Process
1. **Page Load**: React app loads; AuthContext/ViewerContext and hooks manage state
2. **Data Fetch**: `useTravelData` and Supabase client fetch data from Supabase (profiles, countries, relationship_log, statistics, present_bookings, visa_rules, pre_relationship_countries, bucket_list; plus app-only tables for ToBook, BookedUpcoming, FutureScenarios, ScenarioStays)
3. **Sheets → Supabase**: Google Sheets data is synced to Supabase via Apps Script (manual menu or daily trigger `runScheduledSync`); app does not read from Sheets directly
4. **Display**: Data processed and displayed in respective tabs (Past, Present, Future, Us)

### Statistics Sheet Refresh
- **Trigger**: Midnight refresh (00:00 daily) via Google Apps Script trigger
- **Function**: `midnightRefreshStatistics()` in `02-PAST-TAB.gs`
- **Process**:
  1. Processes RelationshipLog data up to current date (excludes future)
  2. Processes PreRelationshipCountries data
  3. Calculates statistics
  4. Updates Statistics sheet
  5. Highlights today's row in RelationshipLog (yellow background)

---

## 🎨 Design System

### Color Scheme
- **Background**: #000000 (black)
- **Text**: #f8fafc (off-white)
- **Primary Blue**: #4285f4
- **Accent Colors**: 
  - Green (#28a745) - Together
  - Blue (#3b82f6) - Kimber
  - Pink (#ec4899) - Siona
  - Purple (#a855f7) - Separately
  - Yellow (#FFF9C4) - Today's row highlight

### Typography
- **Title**: Encorpada Pro (36px, matches SVG icon height)
- **Body**: Inter font family
- **Tab Headers**: 16px, reduced height for compact header

### Components
- **Cards**: Rounded corners (15px), dark backgrounds
- **Tabs**: Compact design with white SVG icons
- **Visa Tiles**: Standardized format with blue/grey text hierarchy

---

## 📁 File Structure

```
TravelPlanner_v2/
├── src/                             # React/Vite frontend
├── apps-script/
│   ├── 00-ALL-TABS.gs               # Shared utilities, country mapping
│   ├── 02-PAST-TAB.gs               # Statistics, midnight refresh
│   └── SyncToSupabase.gs            # Sheets → Supabase sync
├── docs/specs/APPLICATION_SUMMARY.md  # This file (current application state)
├── public/                          # Static assets (icons, GeoJSON, etc.)
```

---

## 🔧 Setup & Deployment

### Running Locally
See the [README](../../README.md): `npm install`, `npm run dev`, sign in with your account.

### Google Sheets Setup
1. **Spreadsheet**: Already exists at provided ID
2. **Statistics Refresh**: Run `setupMidnightRefresh()` in Apps Script (in `02-PAST-TAB.gs`) to enable automatic daily refresh
3. **Manual Refresh**: Run `incrementalRefreshStatistics()` anytime
4. **Triggers**: Only add `runScheduledSync` and/or `midnightRefreshStatistics`; do not add `rebuildScenarioCache` (removed Feb 2026)

---

## ⚠️ Known Limitations

1. **Daily log lives in Google Sheets**: edits to RelationshipLog and Profiles are made in the Sheet and appear in the app after the next sync (daily, or Travel Planner > Sync to Supabase).
2. **B1/B2 tracking is a guide**: each stay's legal limit is the I-94 date, which the app cannot know.

## 🔄 Recent Database Optimizations

### Redundancy Removals (2025-01-16)
1. **ScenarioCalendar Sheet**: Removed - redundant day-level data derived from `ScenarioStays` on-demand
2. **ScenarioCache Sheets**: Removed - cache sheets and `rebuildScenarioCache()` were disabled; logic lived in removed files (01/03/04 tabs). Data is calculated on-demand. **Trigger removed Feb 2026** to stop "Script function not found: rebuildScenarioCache" errors.
3. **Historical Data Processing**: Consolidated - `buildHistoryEntries_()` and `buildHistoricalVisaDayNumbers_()` now share a consolidated helper that reads `RelationshipLog` once per profile instead of twice
4. **Statistics Sheet**: Intentional redundancy retained - auto-calculated aggregate for performance, refreshed daily at midnight

### App-Only Sheets Removed (2026-02)
ToBook, BookedUpcoming, FutureScenarios, ScenarioStays, and BookingTypeMeta are no longer synced from Google Sheets. These are edited only in the app and stored in Supabase directly. Sync script and docs updated.

---

## 🚀 Future Enhancements (Not Implemented)

- Write functionality for bookings to Google Sheets
- Scenario creation form, validation suite, and new Future tab experience
- Export/import functionality
- Email notifications for visa limits
- Mobile app version
- Offline mode with caching

---

## 📝 Maintenance Notes

### Regular Tasks
- **Statistics Sheet**: Auto-refreshes daily at midnight
- **Today's Row Highlight**: Updated automatically with midnight refresh
- **RelationshipLog**: Manually maintained (daily entries)

### Code Cleanup Completed
- ✅ Removed unused `JSON.gs` file (app uses direct CSV export)
- ✅ Cleaned up statistics logic in `02-PAST-TAB.gs` (removed 22+ redundant functions from legacy statistics-manager)
- ✅ Removed unused functions from HTML (formatDDMMYY_SLASH, calculateUpcomingSchengenDays, getResetDate)
- ✅ `rebuildScenarioCache` function and time-based trigger removed (Feb 2026); scenario cache logic was in removed 01/03/04 tabs

---

## 📞 Resources

- **GitHub Repository**: https://github.com/kimbersykes87-source/TravelPlanner
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit

---

**Application Version**: 1.0 (Production Ready)  
**Last Major Update**: 2026-02-03 (Docs: triggers, Apps Script files, rebuildScenarioCache removed; APPLICATION_SUMMARY aligned with v2 React/Supabase)

