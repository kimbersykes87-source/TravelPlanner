-- Lock the database down to Kimber and Siona.
--
-- Before this migration every table allowed anyone holding the public anon key
-- (which ships inside the website) to read, change and delete everything,
-- including passport numbers.
--
-- After it:
--   * Only signed-in users whose email is in app_members can read or write.
--   * The Google Sheets sync uses the service role key (bypasses RLS).
--   * The /view share link reads through the `viewer-data` Edge Function,
--     which checks a secret token and never returns passport or visa details.
--
-- APPLY ONLY AFTER: the new app (with the sign-in screen) is deployed, both
-- accounts exist in Supabase Auth, and the Apps Script has
-- SUPABASE_SERVICE_ROLE_KEY set. See docs/setup/AUTH_SETUP.md.

-- 1. Who is allowed in ---------------------------------------------------
CREATE TABLE IF NOT EXISTS app_members (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  profile_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_members ENABLE ROW LEVEL SECURITY;

-- Add your two emails after running this migration, e.g.
--   INSERT INTO app_members (email, profile_id) VALUES
--     ('you@example.com', 'kimber'), ('partner@example.com', 'siona');

CREATE OR REPLACE FUNCTION public.is_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_members
    WHERE email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
REVOKE ALL ON FUNCTION public.is_member() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_member() TO authenticated;

CREATE POLICY "Members can see members" ON app_members
  FOR SELECT TO authenticated USING (public.is_member());

-- 2. Replace the open policies ------------------------------------------
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'countries', 'relationship_log', 'statistics', 'future_scenarios',
    'scenario_stays', 'to_book', 'booked_upcoming', 'booking_type_meta', 'visa_rules',
    'bucket_list', 'sync_runs'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Members read" ON public.%I FOR SELECT TO authenticated USING (public.is_member())', t);
  END LOOP;

  -- Tables edited in the app: members can also write.
  FOREACH t IN ARRAY ARRAY['future_scenarios', 'scenario_stays', 'to_book', 'booked_upcoming', 'booking_type_meta', 'bucket_list']
  LOOP
    EXECUTE format(
      'CREATE POLICY "Members write" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_member())', t);
    EXECUTE format(
      'CREATE POLICY "Members update" ON public.%I FOR UPDATE TO authenticated USING (public.is_member()) WITH CHECK (public.is_member())', t);
    EXECUTE format(
      'CREATE POLICY "Members delete" ON public.%I FOR DELETE TO authenticated USING (public.is_member())', t);
  END LOOP;
END $$;

-- Sheet-owned tables (profiles, countries, relationship_log, statistics,
-- visa_rules) and sync_runs are written only by the sync (service role).

-- 3. Read-only share links (/view?k=<token>) -----------------------------
-- Tokens are created from the Us tab. The viewer-data Edge Function checks
-- them with the service role key; viewers never query the database directly.
CREATE TABLE IF NOT EXISTS viewer_links (
  token TEXT PRIMARY KEY CHECK (length(token) >= 32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
ALTER TABLE viewer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read" ON viewer_links FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "Members write" ON viewer_links FOR INSERT TO authenticated WITH CHECK (public.is_member());
CREATE POLICY "Members update" ON viewer_links FOR UPDATE TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

-- 4. Push notifications: registration goes through the Edge Function
DROP POLICY IF EXISTS "Allow anon insert push_subscriptions" ON push_subscriptions;
