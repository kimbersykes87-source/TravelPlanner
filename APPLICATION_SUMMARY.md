# Fionas Kimberinho - Travel Planner Application Summary

**Last Updated**: 2025-01-16  
**Status**: Fully Functional Production Application

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
- **File**: `digital-nomad-planner.html` (4,337 lines)
- **Technology Stack**:
  - Single-page HTML application with embedded CSS and JavaScript
  - Leaflet.js for interactive world maps
  - Lottie Player for loading animations
  - Responsive design with dark theme

### Backend (Google Sheets)
- **Spreadsheet ID**: `1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8`
- **Data Loading**: CSV export via Google Sheets API with CORS proxy fallbacks
- **API Key**: `AIzaSyC-gqtpKGeG1c9AVMWWrVKbcS60XWlm9zk` (hardcoded in HTML)

### Google Apps Script Files
1. **`statistics-manager.gs`** - Manages Statistics sheet calculations and midnight refresh
2. **`create-travel-planner-sheet.gs`** - Initial spreadsheet setup and sheet creation

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
- **Calculation**: Processed by `statistics-manager.gs`
- **Refresh**: Automatic midnight refresh via trigger

#### 6. **PresentBookings Sheet**
- **Purpose**: Current travel bookings
- **Columns**: BookingID, ProfileID, Type, SubType, StartDate, EndDate, Country, City, Details, LinkedBookingID

#### 7. **FutureScenarios Sheet**
- **Purpose**: Scenario-level metadata for planned future travel
- **Columns**: ScenarioID, ScenarioHeadline, ScenarioCreatedBy, ScenarioRating, ScenarioStart, ScenarioEnd, ScenarioSummary, ScenarioIcon, AccommodationType, LastUpdated

#### 8. **ScenarioStays Sheet**
- **Purpose**: Detailed stays within a scenario
- **Columns**: ScenarioID, StayID, ProfileScope, Country, City, StartDate, EndDate, Notes, AccommodationType, RouteNotes

#### 9. **VisaRules Sheet**
- **Purpose**: Centralized visa rule definitions for validation
- **Columns**: RuleID, Jurisdiction, WindowDays, MaxDays, ContiguousTerritory, Notes

#### 10. **ScenarioCalendar Sheet** *(REMOVED - Redundant)*
- **Status**: Removed in redundancy cleanup - data derived from ScenarioStays when needed
- **Previous Purpose**: Normalized day-level entries for scenario validation and analytics
- **Reason for Removal**: Redundant storage - all day-level data can be derived from ScenarioStays date ranges

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
- **CRUD**: Create/update/delete scenarios persisted to Sheets (`FutureScenarios`, `ScenarioStays`)
- **Note**: `ScenarioCalendar` sheet was removed - data derived on-demand from `ScenarioStays`

---

## 🔄 Data Flow

### Loading Process
1. **Page Load**: App automatically loads after 1 second delay
2. **Data Fetch**: Loads all 6 sheets in parallel using Promise.allSettled
3. **CORS Handling**: Uses multiple proxy fallbacks:
   - `https://api.allorigins.win/raw?url=`
   - `https://corsproxy.io/?`
4. **Error Handling**: Individual sheet failures don't break entire app
5. **Display**: Data processed and displayed in respective tabs

### Statistics Sheet Refresh
- **Trigger**: Midnight refresh (00:00 daily) via Google Apps Script trigger
- **Function**: `midnightRefreshStatistics()` in `statistics-manager.gs`
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
TravelPlanner/
├── digital-nomad-planner.html      # Main application (4,337 lines)
├── statistics-manager.gs            # Statistics calculations & midnight refresh
├── create-travel-planner-sheet.gs   # Initial spreadsheet setup
├── APPLICATION_SUMMARY.md           # This file (current application state)
├── assets/
│   ├── app-icons/
│   │   └── icon.svg                 # Main app icon
│   ├── icons/
│   │   ├── us.svg                   # Us tab icon
│   │   ├── past.svg                 # Past tab icon
│   │   ├── present.svg              # Present tab icon
│   │   └── future.svg               # Future tab icon
│   └── lottie/
│       ├── Globe.json               # Globe animation
│       └── loading-earth-spinner.json  # Loading spinner animation
```

---

## 🔧 Setup & Deployment

### Running Locally
1. **Open** `digital-nomad-planner.html` in a web browser
   - Note: May encounter CORS issues with some browsers
2. **Alternative**: Use local server:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to: `http://localhost:8000/digital-nomad-planner.html`

### Google Sheets Setup
1. **Spreadsheet**: Already exists at provided ID
2. **Statistics Refresh**: Run `setupMidnightRefresh()` in Apps Script to enable automatic daily refresh
3. **Manual Refresh**: Run `incrementalRefreshStatistics()` anytime

---

## ⚠️ Known Limitations

1. **Booking Persistence**: Present tab bookings are not saved to Google Sheets (local only)
2. **Scenario Creation**: Future tab scenario creation form is placeholder only (being replaced by full CRUD workflow)
3. **Data Write**: App is read-only (no write functionality to Sheets)
4. **CORS**: Relies on proxy services for data loading (may fail if proxies are down)

## 🔄 Recent Database Optimizations

### Redundancy Removals (2025-01-16)
1. **ScenarioCalendar Sheet**: Removed - redundant day-level data derived from `ScenarioStays` on-demand
2. **ScenarioCache Sheets**: Disabled - cache sheets (`ScenarioCacheMetadata`, `ScenarioCacheDays`, `ScenarioCacheSummary`) not used in frontend, data calculated on-demand from source sheets
3. **Historical Data Processing**: Consolidated - `buildHistoryEntries_()` and `buildHistoricalVisaDayNumbers_()` now share a consolidated helper that reads `RelationshipLog` once per profile instead of twice
4. **Statistics Sheet**: Intentional redundancy retained - auto-calculated aggregate for performance, refreshed daily at midnight

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
- ✅ Cleaned up `statistics-manager.gs` (removed 22+ redundant functions)
- ✅ Removed unused functions from HTML (formatDDMMYY_SLASH, calculateUpcomingSchengenDays, getResetDate)

---

## 📞 Resources

- **GitHub Repository**: https://github.com/kimbersykes87-source/TravelPlanner
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit
- **Local Server**: http://localhost:8000/digital-nomad-planner.html

---

**Application Version**: 1.0 (Production Ready)  
**Last Major Update**: 2025-01-16 (Code cleanup and statistics manager refactor)

