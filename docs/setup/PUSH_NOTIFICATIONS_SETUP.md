# Push Notifications Setup

This guide explains how to complete the push notifications setup for Travel Planner v2.

## Prerequisites

- Supabase project linked
- Migration applied (`supabase db push` or migrations run)
- Edge Functions deployed

## 1. Generate VAPID Keys

Use one of the project scripts:

```bash
# Node.js (recommended)
node scripts/generate-vapid-keys.mjs

# Or with Deno
deno run scripts/generate-vapid-keys.ts
```

To verify key format compatibility:

```bash
node scripts/verify-vapid-format.mjs
```

The generator outputs:
- `VAPID_KEYS_JSON` – for the Supabase Edge Function secret
- `VITE_VAPID_PUBLIC_KEY` – for the frontend `.env.local`

## 2. Environment Variables

### Frontend (`.env.local` or deployment env)

Add to your existing Supabase vars:

```
VITE_VAPID_PUBLIC_KEY=<your-vapid-public-key-base64url>
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` should already be set.

### Supabase Edge Functions (Secrets)

Set the VAPID keys and optional cron secret:

```bash
# Use the VAPID_KEYS_JSON from the generate-vapid-keys.ts script output
supabase secrets set VAPID_KEYS_JSON='<paste from script output>'

# Optional: restrict who can invoke the process-queue function
supabase secrets set CRON_SECRET='your-random-secret'
```

The `VAPID_KEYS_JSON` must be the exact output from `scripts/generate-vapid-keys.ts`. If you used `web-push generate-vapid-keys`, you get two base64 strings; use them like:

```json
{"publicKey":"<public-key>","privateKey":"<private-key>"}
```

The `@negrel/webpush` library expects keys in a format compatible with `importVapidKeys`. Check the library docs for the exact structure. If using `web-push`-style keys, you may need to convert; the library’s `importVapidKeys` accepts `{ publicKey, privateKey }` as strings.

## 3. Deploy Edge Functions

```bash
supabase functions deploy enqueue-notification
supabase functions deploy process-notification-queue
supabase functions deploy register-push
```

## 4. Database Webhooks

In Supabase Dashboard: **Integrations** → **Database Webhooks** → **Webhooks** tab.

If prompted, enable database webhooks on the project first. Then create one webhook per table:

| Webhook name     | Table            | Events |
|------------------|------------------|--------|
| future_scenarios | future_scenarios | Insert |
| statistics       | statistics       | Insert |
| bucket_list      | bucket_list      | Insert |
| to_book          | to_book          | Insert |
| booked_upcoming  | booked_upcoming  | Insert |

### For each webhook (two-step flow)

**Step 1 – Conditions to fire webhook**

1. **Webhook name**: Use the table name (no spaces).
2. **Table**: Select the matching table from the dropdown.
3. **Events**: Tick **Insert** only. Leave Update and Delete unchecked.

**Step 2 – Webhook configuration**

1. **Type**: Select **Supabase Edge Functions** (not HTTP Request).
2. **Method**: POST
3. **Function**: Choose `enqueue-notification` from the dropdown.
4. **Timeout**: 5000 ms (default).
5. **HTTP Headers**: Ensure `Content-type: application/json` is present. If available, use **Add auth header with service key** for authentication.
6. Click **Create webhook**.

## 5. Schedule the Queue Processor (pg_cron)

The `process-notification-queue` function should run every 2 minutes.

**Automated (recommended):**

```bash
npm run setup-push-cron
```

This script enables pg_cron and pg_net, then schedules the job. It reads credentials from `.env.local`.

**Manual:** Enable pg_cron and pg_net in **Database → Extensions**, then run `node scripts/setup-push-cron.mjs` and paste the SQL into **SQL Editor**.

**External cron alternative:** Use cron-job.org to POST to your function URL every 2 minutes with the Authorization header.

## 6. Test

1. Deploy the frontend and open the app as an installed PWA.
2. The notification prompt should appear; tap **Enable**.
3. Add a scenario, to-book item, or run a Sheets sync with new data.
4. Within ~2 minutes, a notification should appear on the device.

## Troubleshooting

- **No prompt**: Ensure the app is installed (standalone) and `VITE_VAPID_PUBLIC_KEY` is set.
- **Subscribe fails**: Check browser console; confirm VAPID key is valid base64url.
- **No notifications**: Verify database webhooks are firing, the queue has rows, and the cron job is running.
- **iOS**: PWA must be added to Home Screen; permission must be requested from a user tap.
