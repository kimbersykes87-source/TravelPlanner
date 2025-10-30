# Digital Nomad Travel Planner - Project Summary

## Project Overview
Building a Digital Nomad life planner focused on transport and accommodation for Kimber and Siona, with separate profiles and Google Sheets backend.

## Key Requirements

### Users
- **Kimber**: British + Australian passport holder, ESTA visa for US
- **Siona**: British passport holder, B1/B2 visa for US  
- Both are tax residents of Georgia, need to stay outside tax windows in other countries

### Core Features
1. **Us Tab**: Profile tiles with visa tracking (UK tax days, US days, Schengen rolling days)
2. **Past Tab**: World map with visited countries + relationship timeline from 30 Sep 2023
3. **Present Tab**: Chronological travel list + calendar + booking forms
4. **Future Tab**: Scenario planning with map overlays

### Critical Travel Patterns
- **Together**: Same country, same dates
- **Separate**: Different countries, coordinated itineraries
- **Pre-relationship**: Individual country visits before 30 Sep 2023 (no dates needed)

## Data Structure (Final Design)

### 1. RelationshipLog Sheet (Daily Rows)
```
Columns: Date | KimberCountry | SionaCountry | Notes
```
- One row per day from 30/09/2023 onwards
- Same country = together, different countries = separate
- App consolidates into periods for display

### 2. PreRelationshipCountries Sheet (New)
```
Columns: ProfileID | CountryName | VisitedBefore
```
- Simple list of countries visited before relationship start
- Used only for map visualization (different color)

### 3. PresentBookings Sheet (Enhanced)
```
Columns: BookingID | ProfileID | Type | SubType | StartDate | EndDate | Country | City | Details | LinkedBookingID
```
- One booking per person
- LinkedBookingID connects related bookings
- App auto-detects "together" if same country/dates

### 4. FutureScenarios Sheet (Multi-Mode)
```
Columns: ScenarioID | CreatedBy | ScenarioName | SectionID | StartDate | EndDate | KimberCountry | SionaCountry | KimberCities | SionaCities | KimberAccommodation | SionaAccommodation | KimberNotes | SionaNotes | CoordinationNotes
```
- Each section can be together or separate
- Empty cells = person not traveling that period

### 5. Countries Sheet
```
Columns: CountryName | Alpha3Code | Alpha2Code | FlagSVG
```
- All UN-recognized countries, alphabetically sorted
- Flag URLs from: https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/[alpha2code].svg

### 6. Profiles Sheet
```
Columns: ProfileID | FullName | DOB | PassportNumber | PassportExpiry | PassportIssued | PlaceOfBirth | FrequentFlyer1 | FFNumber1 | FFStatus1 | FrequentFlyer2 | FFNumber2 | FFStatus2 | FrequentFlyer3 | FFNumber3 | FFStatus3 | ProfilePictureURL
```

## Visa Tracking Requirements

### Kimber
- **UK Tax Days**: Under 183 days per tax year
- **US Days**: ESTA - 90 days rolling window
- **Schengen**: 90 days rolling window

### Siona  
- **UK Tax Days**: Under 183 days per tax year
- **US Days**: B1/B2 - 180 days rolling window
- **Schengen**: 90 days rolling window

## User Data Sources

### CSV Files (Provided)
- `Europe Project Plan - SS IMPORT.csv` (Siona's travel)
- `Europe Project Plan - KS IMPORT.csv` (Kimber's travel)  
- `Europe Project Plan - COMBINED.csv` (Combined data)

### Google Sheets Credentials
- **API Key**: `AIzaSyC-gqtpKGeG1c9AVMWWrVKbcS60XWlm9zk`
- **Spreadsheet ID**: `1o8cuawg6nx36rzQ9t7YDfVmu1rZfqFgXtFZCZGaTQL4`

## Technical Stack
- **Backend**: Google Sheets (database)
- **Frontend**: Single HTML file with CSS/JavaScript
- **Maps**: Leaflet.js
- **Deployment**: Cloudflare Pages (static hosting)

## Key Implementation Notes

### Past Tab Logic
- Map colors: Green (together), Blue (Kimber only), Pink (Siona only)
- Timeline toggle: Individual view vs Combined view
- Both views start from 30/09/2023
- Pre-relationship countries shown only on map

### Present Tab Logic  
- Booking form: "Who is traveling?" → Kimber/Siona/Both
- Calendar: Multi-person Gantt chart with color coding
- Auto-detect together bookings

### Future Tab Logic
- Scenario creation: "Will you be together?" → Yes/No/Partially
- Map overlays: Solid fill (together), Hatched (same country), Different colors (separate)

## Files to Create
1. `create-travel-planner-sheet.gs` - Google Apps Script to create spreadsheet
2. `digital-nomad-planner.html` - Complete web application
3. Supporting documentation

## Current Status
- ✅ Requirements analysis complete
- ✅ Data structure designed  
- ✅ Travel pattern analysis complete
- ✅ Core architecture planned
- 🔄 Ready to implement Google Apps Script for spreadsheet creation
- ⏳ Ready to build web application

## Next Steps
1. Create Google Apps Script to generate spreadsheet with all sheets
2. Build complete web application with all four tabs
3. Test with real data
4. Deploy to Cloudflare Pages
