/**
 * Loads every table the app needs from Supabase.
 *
 * Supabase returns at most 1,000 rows per request, so each table is read in
 * pages until a short page comes back. (Before this, the app silently stopped
 * seeing the daily log after its 1,000th day, 26 Jun 2026.)
 */
import { supabase } from './supabase';

const PAGE_SIZE = 1000;

/** key in app data -> { table, order } */
export const TABLES = {
  profiles: { table: 'profiles', order: 'profile_id' },
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

export const EMPTY_DATA = Object.fromEntries(Object.keys(TABLES).map((k) => [k, []]));

/** Read every row of a table, 1,000 at a time. */
export async function fetchAllRows(table, orderColumn, client = supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client.from(table).select('*');
    if (orderColumn) query = query.order(orderColumn, { ascending: true, nullsFirst: false });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * Load the given data keys (default: all). Tables that fail are reported in
 * `failed` instead of throwing, so one bad table does not blank the app.
 */
export async function loadTravelData(keys = Object.keys(TABLES), client = supabase) {
  const results = await Promise.allSettled(keys.map((k) => fetchAllRows(TABLES[k].table, TABLES[k].order, client)));
  const data = {};
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') data[keys[i]] = r.value;
    else failed.push({ key: keys[i], message: r.reason?.message || String(r.reason) });
  });
  return { data, failed };
}

/** Most recent Google Sheets sync (null if the sync_runs table does not exist yet). */
export async function loadLastSync(client = supabase) {
  const { data, error } = await client
    .from('sync_runs')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(1);
  if (error) return null;
  return data?.[0] || null;
}
