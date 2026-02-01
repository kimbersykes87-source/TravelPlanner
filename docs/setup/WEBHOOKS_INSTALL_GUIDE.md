# Database Webhooks – Full Install Guide

This guide walks you through creating all 5 push-notification webhooks in Supabase, step by step.

---

## 1. Open the webhooks page

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **TravelPlanner_v2** project
3. In the left sidebar: **Integrations** → **Database Webhooks**
4. Click the **Webhooks** tab

Direct link:  
https://supabase.com/dashboard/project/xaxbbtzsyrtchtjrjvqy/integrations/webhooks/webhooks

---

## 2. Enable webhooks (if needed)

If you see "Enable database webhooks on your project":

- Scroll down
- Click the enable button
- Then open the **Webhooks** tab

---

## 3. Create the 5 webhooks

Create one webhook for each row in this table:

| # | Webhook name     | Table to select   |
|---|------------------|-------------------|
| 1 | future_scenarios | future_scenarios  |
| 2 | statistics       | statistics        |
| 3 | bucket_list      | bucket_list       |
| 4 | to_book          | to_book           |
| 5 | booked_upcoming  | booked_upcoming   |

---

## 4. Step-by-step for each webhook

### Step 1 – Conditions

Click **Create a new hook** (or similar). You’ll see:

- **Webhook name**  
  Enter the table name, e.g. `future_scenarios`  
  No spaces or special characters.

- **Table**  
  Open the Table dropdown and select the same table (e.g. `future_scenarios`).

- **Events**  
  Check **Insert** only.  
  Leave **Update** and **Delete** unchecked.

Continue to the next step (e.g. **Next**).

---

### Step 2 – Webhook configuration

Choose **Supabase Edge Functions** (with the lightning bolt icon). Do not use HTTP Request.

Configure:

- **Method**: POST
- **Select which edge function to trigger**: `enqueue-notification`
- **Timeout**: 5000 (default)
- **HTTP Headers**:  
  - `Content-type: application/json` should already be set  
  - If you see **Add auth header with service key**, add it

Click **Create webhook**.

---

### Step 3 – Repeat for the other tables

Create the remaining webhooks using the same settings for each of the 5 tables.

---

## 5. Verify

In the Webhooks tab you should see 5 webhooks, one per table. Each should be Active.

---

## Troubleshooting

- **No "Supabase Edge Functions" option**  
  Ensure the `enqueue-notification` Edge Function is deployed.  
  Check: **Edge Functions** in the left sidebar.

- **Webhook fails (e.g. 401)**  
  Add the auth header with the service role key (or “Add auth header with service key” option).

- **Wrong tables in dropdown**  
  Make sure migrations have been applied (`supabase db push`).
