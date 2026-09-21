import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EMPTY_DATA, TABLES, loadLastSync, loadTravelData } from '../lib/dataLoader';
import { registerCountries } from '../lib/countries/resolve';
import { TravelDataContext } from './travel-data-context';

const NOT_CONFIGURED =
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the Cloudflare Pages environment variables, then redeploy.';

/**
 * Loads all travel data once and shares it with every page, so switching tabs
 * is instant. Pages call refetch() after saving; it refreshes in the
 * background without showing the full-page loader again.
 */
export function TravelDataProvider({ children, loader = loadTravelData, loadSync = loadLastSync }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (keys = Object.keys(TABLES)) => {
      if (!supabase) {
        setError(NOT_CONFIGURED);
        setLoading(false);
        return;
      }
      if (!loadedOnce.current) setLoading(true);
      try {
        const [{ data: fresh, failed }, sync] = await Promise.all([loader(keys), loadSync ? loadSync() : null]);
        if (fresh.countries) registerCountries(fresh.countries);
        setData((prev) => ({ ...prev, ...fresh }));
        setLastSync(sync);
        setError(failed.length ? `Could not load: ${failed.map((f) => f.key).join(', ')}` : null);
      } catch (err) {
        setError(err?.message || 'Failed to load data');
      } finally {
        loadedOnce.current = true;
        setLoading(false);
      }
    },
    [loader, loadSync]
  );

  useEffect(() => {
    // Initial load; state updates happen after the network round trip.
    load();
  }, [load]);

  const value = useMemo(() => ({ data, loading, error, lastSync, refetch: load }), [data, loading, error, lastSync, load]);
  return <TravelDataContext.Provider value={value}>{children}</TravelDataContext.Provider>;
}
