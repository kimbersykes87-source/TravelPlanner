# Travel Planner - System Architecture

**Last Updated**: 2025-11-18  
**Status**: Production deployment on Cloudflare Pages (with password protection)

---

## 🌐 System Overview

The Travel Planner application is deployed on **Cloudflare Pages** and uses **Google Sheets** as the data store with **Google Apps Script** for write operations.

```
┌─────────────────┐
│  Cloudflare     │
│  Pages Site     │  https://travelplanner-ks.pages.dev/
│  (Frontend)     │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
    ┌────▼────┐    ┌────▼─────────┐
    │ GET /   │    │ POST to      │
    │ api/    │    │ Apps Script  │
    │ sheets  │    │ Write API    │
    └────┬────┘    └────┬─────────┘
         │              │
    ┌────▼──────────────▼────┐
    │   Google Sheets        │
    │   (Data Storage)       │
    └────────────────────────┘
```

---

## 📁 Project Structure

```
TravelPlanner/
├── digital-nomad-planner.html  # Main HTML application
├── index.html                  # Root redirect to main app
├── js/                         # JavaScript modules
│   ├── 00-all-tabs.js         # Core utilities, data loading, write API
│   ├── 01-us-tab.js           # Profiles & visa tracking
│   ├── 02-past-tab.js         # Travel history & map
│   ├── 03-present-tab.js      # Current bookings management
│   └── 04-future-tab.js       # Future scenarios planning
├── functions/                  # Cloudflare Pages Functions
│   └── api/
│       └── sheets.js          # Serverless function for reading Sheets
├── assets/                     # Static assets (icons, images, data)
├── package.json               # Node.js project config
├── .gitignore                 # Git ignore rules
└── *.gs                       # Google Apps Script files (deployed separately)
```

---

## 🔄 Data Flow

### Reading Data (GET)

1. **Client Request**: Browser loads page → JavaScript calls `/api/sheets`
2. **Cloudflare Pages Function**: `functions/api/sheets.js` handles request
   - Fetches all 11 sheets from Google Sheets via CSV export
   - Aggregates into single JSON response
   - Returns: `{ success: true, data: { profiles: [...], countries: [...], ... } }`
3. **Client Processing**: JavaScript parses response and populates UI

**Fallback**: If Cloudflare API unavailable, falls back to CORS proxy for individual sheet requests.

### Writing Data (POST)

1. **Client Action**: User creates/updates/deletes booking, scenario, or task
2. **JavaScript Function**: Calls `persistToBookRemote()`, `persistBookedToRemote()`, `upsertScenarioRemote()`, etc.
3. **Google Apps Script**: POST to `WRITE_API_URL` (Google Apps Script Web App)
   - URL: `https://script.google.com/macros/s/AKfycbw-FAVP_ipImIsN9tJ3gwFCdYWVYrRV7iRH-QQd5bwCGIYOLhewxXXESynuPSqwPPR3/exec`
   - Token: `KIMBER_SIONA_TRAVEL_PLANNER`
   - Actions: `upsertToBook`, `upsertBooked`, `upsertScenario`, `deleteScenario`, etc.
4. **Google Sheets Update**: Apps Script writes directly to appropriate sheet

---

## 🚀 Deployment

**v2 app (this project):** Deploy from **TravelPlanner_v2** by pushing to GitHub. **Canonical instructions:** [docs/deployment/DEPLOY_INSTRUCTIONS.md](../deployment/DEPLOY_INSTRUCTIONS.md). When the user says "deploy", Cursor/agents should follow that doc. Live site: https://travelplanner-ks.pages.dev

### Cloudflare Pages Configuration (v2)

- **Project Name**: `travelplanner-ks`
- **Production Branch**: `feat/globe-loader`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Deployment Process (v2)

1. From **TravelPlanner_v2**: `git add -A`, commit, `git branch -M feat/globe-loader`, `git push -u origin feat/globe-loader --force`
2. **Auto-Deploy**: Cloudflare Pages builds from the repo (npm run build → dist/)
3. **Live**: https://travelplanner-ks.pages.dev/

**Deployment Time**: ~1-3 minutes

---

## 🔧 Making Changes (v2)

### Frontend changes

1. **Edit files** in `c:\dev\TravelPlanner_v2` (this project)
2. **Test locally**: `npm run dev` → http://localhost:5173
3. **Deploy**: Follow [docs/deployment/DEPLOY_INSTRUCTIONS.md](../deployment/DEPLOY_INSTRUCTIONS.md) (add, commit, push to `feat/globe-loader`)
4. **Auto-deploy**: Cloudflare Pages builds and deploys in 1-3 minutes

### Cloudflare Pages Function Changes

To modify the read API (`/api/sheets`):

1. **Edit**: `functions/api/sheets.js`
2. **Commit and push**: Same as frontend changes
3. **Auto-deploy**: Function updates automatically

**Note**: Function changes may take slightly longer to propagate (2-5 minutes).

### Google Sheets Structure Changes

If you modify sheet structure (add/remove columns, rename sheets):

1. **Update Google Sheets** directly
2. **Update JavaScript** if column indices changed (in `js/*.js` files)
3. **Update Cloudflare Function** if sheet names changed (`functions/api/sheets.js`)
4. **Commit and push** changes
5. **Test** on live site

### Environment Variables

To change `SPREADSHEET_ID` or add new variables:

1. **Cloudflare Dashboard** → Pages → `travelplanner-ks` → Settings → Environment Variables
2. **Add/Edit variable**
3. **Redeploy** (automatic on next commit, or manually trigger redeploy)

---

## 📊 Data Sources

**v2 app:** Reads from **Supabase**. Google Sheets sync (via Apps Script) pushes data into Supabase. App-only data (ToBook, BookedUpcoming, FutureScenarios, ScenarioStays, BookingTypeMeta) is edited in the app and stored in Supabase directly—no Sheets tabs.

### Google Sheets synced to Supabase

| Sheet Name | Purpose | Key Columns |
|------------|---------|-------------|
| `Profiles` | User profiles (Kimber, Siona) | ProfileID, FullName, DOB, Passport, Visa info |
| `Countries` | Master country list | Country name, ISO3, ISO2, Flag URL |
| `RelationshipLog` | Daily travel log (since 2023-09-30) | Date, KimberCountry, SionaCountry, Status |
| `Statistics` | Auto-calculated country stats | Country, Days (Kimber/Siona/Both), Totals |
| `PresentBookings` | Current travel bookings | BookingID, ProfileID, Type, Dates, Country |
| `VisaRules` | Visa rule definitions | RuleID, Jurisdiction, WindowDays, MaxDays |
| `PreRelationshipCountries` | Countries visited before relationship | ProfileID, CountryName |
| `BucketList` | Bucket list items | User, Country, Description, Completed |

---

## 🔐 Security & Configuration

### Password Protection

- **Method**: Client-side password authentication via `sessionStorage`
- **Password**: Set in `js/00-all-tabs.js` as `CORRECT_PASSWORD` constant
- **Default Password**: `betterthanlego2026!`
- **Session-based**: Authentication persists for browser session (clears when tab closed)
- **Implementation**: Password screen (`#passwordScreen`) blocks access until correct password entered
- **Location**: Password check in `js/00-all-tabs.js` (`checkAuthentication()` and `handlePasswordSubmit()`)

**To change password**:
1. Update `CORRECT_PASSWORD` constant in `js/00-all-tabs.js`
2. Commit and push
3. Cloudflare Pages will redeploy automatically

### Read Access (Cloudflare Pages Function)

- **Method**: Public CSV export from Google Sheets
- **No authentication required** for reading (sheets are publicly readable)
- **Rate limiting**: Handled by Google Sheets API

### Write Access (Google Apps Script)

- **Method**: POST to Google Apps Script Web App
- **Authentication**: Token-based (`WRITE_API_TOKEN`)
- **Location**: Configured in `js/00-all-tabs.js`:
  ```javascript
  const WRITE_API_URL = 'https://script.google.com/macros/s/.../exec';
  const WRITE_API_TOKEN = 'KIMBER_SIONA_TRAVEL_PLANNER';
  ```

**To change write API**:
1. Update values in `js/00-all-tabs.js`
2. Commit and push
3. Cloudflare Pages will redeploy automatically

---

## 🐛 Troubleshooting

### Site Not Loading

1. **Check deployment status**: Cloudflare Dashboard → Pages → Deployments
2. **Check build logs**: Look for errors in deployment logs
3. **Verify root URL**: Should redirect to `digital-nomad-planner.html` (via `index.html`)

### Data Not Loading

1. **Check browser console** (F12):
   - Should see: `"✅ Data loaded via Cloudflare Pages API"`
   - If see: `"Using CORS proxy fallback"` - Function may not be deployed
2. **Test API directly**: Visit `https://travelplanner-ks.pages.dev/api/sheets`
   - Should return JSON (not 404)
3. **Check function logs**: Cloudflare Dashboard → Pages → Functions → Logs

### Write Operations Failing

1. **Check browser console** for error messages
2. **Verify `WRITE_API_URL`** is correct in `js/00-all-tabs.js`
3. **Test Apps Script**: Ensure Google Apps Script web app is still active
4. **Check token**: Verify `WRITE_API_TOKEN` matches Apps Script configuration

### Changes Not Appearing

1. **Wait 1-3 minutes** after pushing to GitHub (deployment time)
2. **Check deployment status**: Cloudflare Dashboard → Pages → Latest deployment
3. **Hard refresh browser**: Ctrl+F5 (or Cmd+Shift+R on Mac)
4. **Clear browser cache**: If still not working

---

## 📝 Key Files Reference

### Core Application
- `digital-nomad-planner.html` - Main application (includes password protection screen)
- `index.html` - Root redirect

### Authentication
- `js/00-all-tabs.js` - Password protection: `checkAuthentication()`, `handlePasswordSubmit()`, `initializeAppAfterAuth()`

### Data Loading
- `functions/api/sheets.js` - Cloudflare Pages Function (reads from Sheets)
- `js/00-all-tabs.js` - Client-side data loading, write API calls

### Write Operations
- `js/00-all-tabs.js` - Write functions: `persistToBookRemote()`, `persistBookedToRemote()`, `upsertScenarioRemote()`, etc.
- `*.gs` files - Google Apps Script handlers (deployed separately in Apps Script project)

### Configuration
- `package.json` - Node.js project metadata
- `.gitignore` - Git ignore rules
- `README.md` - Quick start guide

---

## 🔗 Useful Links

- **Live Site**: https://travelplanner-ks.pages.dev/
- **Cloudflare Dashboard**: https://dash.cloudflare.com/pages/view/travelplanner-ks
- **GitHub Repository**: https://github.com/kimbersykes87-source/TravelPlanner
- **Google Sheets**: https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit
- **Apps Script Project**: https://script.google.com/u/0/home/projects/1-SddHsWBT2lhkUc8ZCbh7CA5YaaqxcQuzp9RTBKx3czs3RvFBIT40o93/edit

---

## 📚 For Future Development

When making changes, remember:

1. **Read operations** go through Cloudflare Pages Function (`/api/sheets`)
2. **Write operations** go through Google Apps Script (configured in `js/00-all-tabs.js`)
3. **Deployments are automatic** when you push to `feat/globe-loader` branch
4. **Test locally** before pushing if making major changes
5. **Check browser console** for errors and debug messages

If you need to make significant architectural changes, update this document.

