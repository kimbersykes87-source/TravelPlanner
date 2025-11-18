# Fionas Kimberinho - Travel Planner

A comprehensive travel planning and tracking application for managing digital nomad lifestyle, visa tracking, and travel history.

## 🌐 Live Site

**Production URL**: https://travelplanner-ks.pages.dev/

The application is deployed on Cloudflare Pages and automatically updates when changes are pushed to the `feat/globe-loader` branch.

## 🚀 Quick Start

### Running Locally (Development)

1. Open terminal in project directory
2. Run: `python -m http.server 8000`
3. Open browser to: `http://localhost:8000/digital-nomad-planner.html`

**Note**: Local development uses CORS proxy fallback. Production uses Cloudflare Pages Function for faster data loading.

## 📱 Application Features

### Us Tab - Profiles & Visa Tracking
- Dual profile system (Kimber & Siona)
- Passport and visa information
- Real-time visa tracking:
  - **UK Tax Days**: 120-day limit per tax year (Apr 6 - Apr 5)
  - **UK Work Days**: 39-day limit per tax year
  - **US ESTA** (Kimber): 90 days per admission
  - **US B1/B2** (Siona): Rolling 365-day tracking
  - **Schengen**: 90 days in any rolling 180-day window

### Past Tab - Travel History
- Interactive world map with country visit visualization
- Relationship timeline from September 30, 2023
- Color-coded countries by visit type (together, separate, individual)

### Present Tab - Current Bookings
- Booking management form
- Calendar view with travel indicators
- Track accommodations, transport, and activities

### Future Tab - Scenario Planning
- View and plan future travel scenarios
- Grouped scenario display with together/separate periods

## 🛠️ Technical Stack

- **Hosting**: Cloudflare Pages (production deployment)
- **Frontend**: Single-page HTML application (4,337 lines)
- **Maps**: Leaflet.js with OpenStreetMap
- **Data Source**: Google Sheets (via Cloudflare Pages Function)
- **Write API**: Google Apps Script Web App
- **Animations**: Lottie Player
- **Backend Scripts**: Google Apps Script for statistics management and write operations

## 📊 Data Structure

The application reads from the following Google Sheets:
- **Profiles**: Personal information, passports, visas, frequent flyer
- **Countries**: Master country list with standardized names
- **RelationshipLog**: Daily travel log from Sept 30, 2023
- **PreRelationshipCountries**: Countries visited before relationship
- **Statistics**: Auto-calculated country statistics (refreshed daily)
- **PresentBookings**: Current travel bookings
- **FutureScenarios**: Planned future travel scenarios

## 🔧 Configuration

### Google Sheets
- **Spreadsheet ID**: `1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8`
- **Read Access**: Via Cloudflare Pages Function (`/api/sheets`)
- **Write Access**: Via Google Apps Script Web App
- **Statistics Refresh**: Runs automatically at midnight via Apps Script trigger

### Cloudflare Pages
- **Project**: `travelplanner-ks`
- **Branch**: `feat/globe-loader` (auto-deploys on push)
- **Function**: `functions/api/sheets.js` (serverless read API)

### Apps Script Files
1. **`statistics-manager.gs`**: Manages Statistics sheet calculations and midnight refresh
2. **`create-travel-planner-sheet.gs`**: Initial spreadsheet setup (run once)
3. **Write API handlers** (in Apps Script project): Handle POST requests for creating/updating/deleting bookings, scenarios, etc.

## 🔄 Automatic Updates

- **Statistics Sheet**: Refreshes daily at midnight (00:00)
- **Today's Row Highlight**: Automatically highlights today's date in RelationshipLog
- **Manual Refresh**: Run `incrementalRefreshStatistics()` in Apps Script anytime
- **Site Deployment**: Automatically deploys when changes are pushed to `feat/globe-loader` branch

## 📖 Documentation

- **`ARCHITECTURE.md`**: Complete system architecture and deployment guide
- **`APPLICATION_SUMMARY.md`**: Application features and data structure
- **`STARTUP_PROCEDURE.md`**: Local development setup
- See inline code comments for detailed function documentation

## 🔧 Troubleshooting

### Data Not Loading
- Check browser console (F12) for error messages
- Look for: `"✅ Data loaded via Cloudflare Pages API"` (success)
- Test API directly: Visit `https://travelplanner-ks.pages.dev/api/sheets`
- Verify internet connection
- Try refreshing the page

### Write Operations Failing
- Check browser console for error messages
- Verify write API configuration in `js/00-all-tabs.js`
- Ensure Google Apps Script web app is active

### Changes Not Appearing on Live Site
- Wait 1-3 minutes after pushing to GitHub (deployment time)
- Check Cloudflare Dashboard → Pages → Latest deployment status
- Hard refresh browser (Ctrl+F5)

### Profile Images Not Loading
- This is normal - app shows placeholder images instead
- Images are hosted on GitHub and may have loading delays

## ✨ Features

- **Full CRUD Operations**: Create, read, update, and delete bookings, scenarios, and tasks
- **Real-time Sync**: Changes saved directly to Google Sheets via Apps Script API
- **Fast Data Loading**: Single API call via Cloudflare Pages Function (instead of 11 separate requests)
- **Offline Fallback**: Falls back to CORS proxy if Cloudflare function unavailable

## 📞 Resources

- **Live Site**: https://travelplanner-ks.pages.dev/
- **Cloudflare Dashboard**: https://dash.cloudflare.com/pages/view/travelplanner-ks
- **GitHub Repository**: https://github.com/kimbersykes87-source/TravelPlanner
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit
- **Apps Script Project**: https://script.google.com/u/0/home/projects/1-SddHsWBT2lhkUc8ZCbh7CA5YaaqxcQuzp9RTBKx3czs3RvFBIT40o93/edit

---

## 🔐 Security

The application is protected by password authentication:
- **Password Required**: Users must enter the correct password to access the site
- **Session-based**: Authentication persists for the browser session
- **Password**: Set in `js/00-all-tabs.js` (CORRECT_PASSWORD constant)

---

**Version**: 2.1 (Password Protection Added)  
**Last Updated**: 2025-11-18
