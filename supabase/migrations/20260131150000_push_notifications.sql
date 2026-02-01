-- Push Notifications: subscriptions and queue for debounced Web Push
-- Migration for Travel Planner v2 PWA notifications

-- Push subscriptions: stores Web Push subscription objects from each device
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue: webhooks insert here; scheduled job batches and sends
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('scenario', 'country', 'bucket_list', 'to_book', 'booked')),
  record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Edge functions and cron use service_role; anon can register (with validation in function)
CREATE POLICY "Allow anon insert push_subscriptions" ON push_subscriptions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow service_role all push_subscriptions" ON push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all notification_queue" ON notification_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
