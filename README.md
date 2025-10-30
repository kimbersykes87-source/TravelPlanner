# Fionas Kimberinho - Travel Planner

## 🚀 How to Run the App

### Step 1: Set Up JSON Data Sheet
1. **Open your Google Sheets** (the one with your travel data)
2. **Go to Apps Script** (Extensions → Apps Script)
3. **Create a new script** and paste the code from `create-json-data-sheet.gs`
4. **Run the `createJSONDataSheet()` function** to create the JSON data sheet
5. **That's it!** The app will automatically find the sheet

### Step 2: Run the App
1. **Right-click** on `digital-nomad-planner.html`
2. **Select "Open with"** → **Your web browser**
3. **The app will automatically find and load your data!**

### Alternative: Using Local Server
1. **Run `python -m http.server 8000`** in the project directory
2. **Open your browser** and go to: `http://localhost:8000`
3. **Click on `digital-nomad-planner.html`** to open the app

## 🔧 Troubleshooting

### If you see CORS errors:
- **Use Option 1** (local server) instead of opening the file directly
- The local server bypasses CORS restrictions

### If the loading animation doesn't show:
- **Check the browser console** for error messages
- **Try refreshing** the page
- **Make sure you have an internet connection** (the app loads data from Google Sheets)

### If profile images don't load:
- This is normal - the app will show placeholder images instead
- The 403 errors for images are expected and won't break the app

## 📱 Features

- **Interactive World Map** showing visited countries
- **Travel Timeline** with past and future trips
- **Country Statistics** and counts
- **Visa Tracking** for both travelers
- **Future Trip Planning**

## 🛠️ Technical Details

- **Frontend**: HTML, CSS, JavaScript
- **Maps**: Leaflet.js with OpenStreetMap
- **Data Source**: Google Sheets API
- **Animations**: Lottie Player for loading animation

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Try using the local server method
3. Ensure you have a stable internet connection
