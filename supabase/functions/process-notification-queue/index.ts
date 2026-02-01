import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as webpush from 'jsr:@negrel/webpush@0.5';

const TYPE_LABELS: Record<string, string> = {
  scenario: 'scenarios',
  country: 'countries',
  bucket_list: 'bucket list items',
  to_book: 'to-book items',
  booked: 'booked items',
};

interface QueueRow {
  id: string;
  type: string;
  record_id: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Optional: require auth/cron secret to prevent public invocation
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Fetch queued items from last 5 minutes (covers 2-min debounce window)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: rows, error: fetchError } = await supabase
    .from('notification_queue')
    .select('id, type, record_id, created_at')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: true });

  if (fetchError || !rows?.length) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, message: 'No items to process' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  // Group by type and count
  const counts: Record<string, number> = {};
  for (const r of rows as QueueRow[]) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
  }

  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    const label = TYPE_LABELS[type] ?? type;
    parts.push(`${count} new ${label}`);
  }
  const body = parts.join(', ');
  const title = 'Travel Planner';

  // Load VAPID keys
  const vapidKeysJson = Deno.env.get('VAPID_KEYS_JSON');
  if (!vapidKeysJson) {
    console.error('VAPID_KEYS_JSON not set');
    return new Response(JSON.stringify({ ok: false, error: 'VAPID_KEYS_JSON not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let vapidKeys: CryptoKeyPair;
  try {
    const vapidJwk = JSON.parse(vapidKeysJson);
    vapidKeys = await webpush.importVapidKeys(vapidJwk);
  } catch (e) {
    console.error('VAPID import error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Invalid VAPID_KEYS_JSON' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const appServer = await webpush.ApplicationServer.new({
    contactInformation: 'mailto:support@example.com',
    vapidKeys,
  });

  // Fetch all push subscriptions
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth');

  if (subsError || !subs?.length) {
    await supabase.from('notification_queue').delete().in('id', rows.map((r) => r.id));
    return new Response(
      JSON.stringify({ ok: true, sent: 0, message: 'No subscriptions' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const payload = JSON.stringify({ title, body, tag: 'travel-planner-batch' });
  let sentCount = 0;
  const goneEndpoints: string[] = [];

  for (const sub of subs) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      };
      const subscriber = appServer.subscribe(subscription);
      await subscriber.pushMessage(new TextEncoder().encode(payload), {});
      sentCount++;
    } catch (e: unknown) {
      const err = e as { isGone?: () => boolean; response?: Response };
      if (typeof err?.isGone === 'function' && err.isGone()) {
        goneEndpoints.push(sub.endpoint);
      } else {
        console.error('Push error:', e);
      }
    }
  }

  // Remove expired subscriptions
  if (goneEndpoints.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', goneEndpoints);
  }

  // Delete processed queue items
  await supabase.from('notification_queue').delete().in('id', rows.map((r) => r.id));

  return new Response(
    JSON.stringify({
      ok: true,
      sent: sentCount,
      removed: goneEndpoints.length,
      message: `Sent to ${sentCount} subscriptions`,
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );
});
