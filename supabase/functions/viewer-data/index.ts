/**
 * viewer-data: read-only data for the /view share link.
 *
 * The share link is https://<site>/view?k=<token>. The app sends the token
 * here; if it is an active row in viewer_links we return the travel data using
 * the service role key. Passport, visa, date-of-birth and frequent-flyer
 * details are never included.
 *
 * Links are created and replaced from the Us tab ("Read-only share link").
 * Deploy: supabase functions deploy viewer-data --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TABLES: Record<string, { table: string; order: string; columns?: string }> = {
  // Names and photos only; the Us tab shows nothing else to viewers.
  profiles: { table: 'profiles', order: 'profile_id', columns: 'profile_id,full_name,profile_picture_url' },
  countries: { table: 'countries', order: 'country_name' },
  relationshipLog: { table: 'relationship_log', order: 'date' },
  statistics: { table: 'statistics', order: 'country' },
  futureScenarios: { table: 'future_scenarios', order: 'scenario_id' },
  scenarioStays: { table: 'scenario_stays', order: 'start_date' },
  toBookTasks: { table: 'to_book', order: 'task_id' },
  bookedUpcoming: { table: 'booked_upcoming', order: 'booking_id' },
  bookingTypeMeta: { table: 'booking_type_meta', order: 'type' },
  visaRules: { table: 'visa_rules', order: 'rule_id' },
  bucketList: { table: 'bucket_list', order: 'id' },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let token = '';
  try {
    token = String((await req.json())?.token ?? '');
  } catch {
    /* empty body */
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let valid = false;
  if (/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    const { data } = await supabase.from('viewer_links').select('token').eq('token', token).is('revoked_at', null).maybeSingle();
    valid = !!data;
  }
  if (!valid) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return json({ error: 'This share link is not valid.' }, 401);
  }

  async function fetchAll(table: string, order: string, columns = '*') {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select(columns).order(order).range(from, from + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) return rows;
    }
  }

  const data: Record<string, unknown[]> = {};
  const failed: { key: string; message: string }[] = [];
  await Promise.all(
    Object.entries(TABLES).map(async ([key, t]) => {
      try {
        data[key] = await fetchAll(t.table, t.order, t.columns);
      } catch (e) {
        failed.push({ key, message: String((e as Error)?.message ?? e) });
      }
    })
  );
  // UK work-day flags are nobody else's business.
  data.relationshipLog = (data.relationshipLog ?? []).map((r) => {
    const { ks_uk_work_days: _k, ss_uk_work_days: _s, ...rest } = r as Record<string, unknown>;
    return rest;
  });

  return json({ data, failed });
});
