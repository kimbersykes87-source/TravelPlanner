import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTravelData() {
  const [data, setData] = useState({
    profiles: [],
    countries: [],
    relationshipLog: [],
    statistics: [],
    presentBookings: [],
    futureScenarios: [],
    scenarioStays: [],
    toBookTasks: [],
    bookedUpcoming: [],
    bookingTypeMeta: [],
    visaRules: [],
    preRelationshipCountries: [],
    bucketList: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    if (!supabase) {
      setError(
        'Supabase is not configured. In Cloudflare Pages: Settings → Environment variables, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (use the same values as in .env.local), then trigger a new deploy so the build includes them. Until then, data will not load and edits will not save.'
      );
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        supabase.from('profiles').select('*'),
        supabase.from('countries').select('*'),
        supabase.from('relationship_log').select('*').order('date', { ascending: true }),
        supabase.from('statistics').select('*'),
        supabase.from('present_bookings').select('*'),
        supabase.from('future_scenarios').select('*'),
        supabase.from('scenario_stays').select('*').order('start_date', { ascending: true }),
        supabase.from('to_book').select('*'),
        supabase.from('booked_upcoming').select('*'),
        supabase.from('booking_type_meta').select('*'),
        supabase.from('visa_rules').select('*'),
        supabase.from('pre_relationship_countries').select('*'),
        supabase.from('bucket_list').select('*'),
      ]);

      const unwrap = (r) => (r?.status === 'fulfilled' ? r.value?.data || [] : []);

      setData({
        profiles: unwrap(results[0]),
        countries: unwrap(results[1]),
        relationshipLog: unwrap(results[2]),
        statistics: unwrap(results[3]),
        presentBookings: unwrap(results[4]),
        futureScenarios: unwrap(results[5]),
        scenarioStays: unwrap(results[6]),
        toBookTasks: unwrap(results[7]),
        bookedUpcoming: unwrap(results[8]),
        bookingTypeMeta: unwrap(results[9]),
        visaRules: unwrap(results[10]),
        preRelationshipCountries: unwrap(results[11]),
        bucketList: unwrap(results[12]),
      });
    } catch (err) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { data, loading, error, refetch: load };
}
