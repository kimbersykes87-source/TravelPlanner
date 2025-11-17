# Travel Planner Startup Procedure

Follow these steps whenever the user issues the `startup` prompt in a fresh agent session. This sequence ensures the local web app, spreadsheet “database,” and Apps Script project are ready for use.

1. **Change directory**
   - `cd C:\Users\kimbe\Dropbox\Kimber\Apps\TravelPlanner`
2. **Start the local HTTP server (background)**
   - `python -m http.server 8000`
   - Run it in the background so the shell stays available for other commands.
3. **Open the web application**
   - `start http://localhost:8000/digital-nomad-planner.html`
4. **Open the Google Sheets data source**
   - `start https://docs.google.com/spreadsheets/d/1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8/edit`
5. **Open the Apps Script project**
   - `start https://script.google.com/u/0/home/projects/1-SddHsWBT2lhkUc8ZCbh7CA5YaaqxcQuzp9RTBKx3czs3RvFBIT40o93/edit`
6. **Confirm readiness**
   - Verify the Python server process is running and that each browser tab loads as expected.

If the server is already active, skip step 2 to avoid duplicate instances. Stop the server manually when you are finished (`Ctrl+C` in the server shell).

