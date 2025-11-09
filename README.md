# Fionas Kimberinho - Travel Planner

A comprehensive travel planning and tracking application for managing digital nomad lifestyle, visa tracking, and travel history.

## 🚀 Quick Start

### Running the Application

**Option 1: Direct File Opening**
1. Right-click on `digital-nomad-planner.html`
2. Select "Open with" → Your web browser
3. The app will automatically load data from Google Sheets

**Option 2: Local Server (Recommended)**
1. Open terminal in project directory
2. Run: `python -m http.server 8000`
3. Open browser to: `http://localhost:8000/digital-nomad-planner.html`

**Note**: Option 2 bypasses CORS restrictions and is recommended for development.

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

- **Frontend**: Single-page HTML application (4,337 lines)
- **Maps**: Leaflet.js with OpenStreetMap
- **Data Source**: Google Sheets (CSV export via API)
- **Animations**: Lottie Player
- **Backend Scripts**: Google Apps Script for statistics management

## 📊 Data Structure

The application reads from the following Google Sheets:
- **Profiles**: Personal information, passports, visas, frequent flyer
- **Countries**: Master country list with standardized names
- **RelationshipLog**: Daily travel log from Sept 30, 2023
- **PreRelationshipCountries**: Countries visited before relationship
- **Statistics**: Auto-calculated country statistics (refreshed daily)
- **PresentBookings**: Current travel bookings
- **FutureScenarios**: Planned future travel scenarios

## 🔧 Setup & Configuration

### Google Sheets
- **Spreadsheet ID**: `1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8`
- **API Key**: Hardcoded in HTML (for public read access)
- **Statistics Refresh**: Runs automatically at midnight via Apps Script trigger

### Apps Script Files
1. **`statistics-manager.gs`**: Manages Statistics sheet calculations and midnight refresh
2. **`create-travel-planner-sheet.gs`**: Initial spreadsheet setup (run once)

## 🔄 Automatic Updates

- **Statistics Sheet**: Refreshes daily at midnight (00:00)
- **Today's Row Highlight**: Automatically highlights today's date in RelationshipLog
- **Manual Refresh**: Run `incrementalRefreshStatistics()` in Apps Script anytime

## 📖 Documentation

- **`APPLICATION_SUMMARY.md`**: Comprehensive application documentation
- See inline code comments for detailed function documentation

## 🔧 Troubleshooting

### CORS Errors
- Use local server method (Option 2) instead of opening file directly

### Data Not Loading
- Check browser console for error messages
- Verify internet connection
- Ensure Google Sheets API key is valid
- Try refreshing the page

### Profile Images Not Loading
- This is normal - app shows placeholder images instead
- Images are hosted on GitHub and may have loading delays

## ⚠️ Known Limitations

- **Booking Persistence**: Present tab bookings are local only (not saved to Sheets)
- **Scenario Creation**: Future tab creation form is placeholder only
- **Data Write**: App is read-only (no write functionality to Sheets)
- **CORS**: Relies on proxy services (may fail if proxies are down)

## 📞 Resources

- **GitHub Repository**: https://github.com/kimbersykes87-source/TravelPlanner
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit
- **Local Server**: http://localhost:8000/digital-nomad-planner.html

---

**Version**: 1.0 (Production Ready)  
**Last Updated**: 2025-01-16
