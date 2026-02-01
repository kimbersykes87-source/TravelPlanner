# Remaining Push Notification Steps (5 min)

Most setup is done. Complete these two items:

---

## 1. Create Database Webhooks (~5 min)

Full step-by-step: **[WEBHOOKS_INSTALL_GUIDE.md](WEBHOOKS_INSTALL_GUIDE.md)**

### Open the webhooks page

Go to: **Integrations** → **Database Webhooks** → **Webhooks** tab  
Or: https://supabase.com/dashboard/project/xaxbbtzsyrtchtjrjvqy/integrations/webhooks/webhooks

### Enable webhooks (first time only)

If you see "Enable database webhooks on your project", scroll down and click the enable button. Then go to the **Webhooks** tab.

### Create each of the 5 webhooks

Click **Create a new hook** and repeat for each table:

| # | Webhook name     | Table            |
|---|------------------|------------------|
| 1 | future_scenarios | future_scenarios |
| 2 | statistics       | statistics       |
| 3 | bucket_list      | bucket_list      |
| 4 | to_book          | to_book          |
| 5 | booked_upcoming  | booked_upcoming  |

### Step-by-step for each webhook

**Step 1 – Conditions**

- **Webhook name**: Use the table name (e.g. `future_scenarios`). No spaces.
- **Table**: Click the Table dropdown and select the matching table from the list.
- **Events**: Tick **Insert** only. Leave Update and Delete unchecked.
- Click **Next** or continue to the configuration step.

**Step 2 – Webhook configuration**

- **Type**: Choose **Supabase Edge Functions** (lightning bolt icon), NOT HTTP Request.
- **Method**: POST
- **Select which edge function to trigger**: Choose `enqueue-notification`
- **Timeout**: 5000 (default is fine)
- **HTTP Headers**: `Content-type: application/json` should already be present. If you see **"+ Add a new header"** with an option like **"Add auth header with service key"**, use that so the webhook is authenticated.
- Click **Create webhook**.

Repeat for all 5 tables.

---

## 2. Schedule the Queue Processor

Run in the project folder:

```
npm run setup-push-cron
```

This enables pg_cron and pg_net, and schedules the notification processor to run every 2 minutes.

**Alternative (manual):** Enable extensions in **Database → Extensions**, then run `node scripts/setup-push-cron.mjs` and paste the SQL output into **SQL Editor**.

---

## 3. Deploy Frontend

If you deploy to Cloudflare Pages (or similar), add this env var:

- `VITE_VAPID_PUBLIC_KEY` = (already in your .env.local – copy that value)

---

## Test

1. Open the app as an installed PWA on your phone
2. Tap **Enable** when the notification prompt appears
3. Add a new scenario (or sync from Sheets with new data)
4. You should get a notification within ~2 minutes
