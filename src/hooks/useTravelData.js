import { useContext } from 'react';
import { TravelDataContext } from '../contexts/travel-data-context';

/**
 * Shared travel data: { data, loading, error, lastSync, refetch }.
 * Must be used inside <TravelDataProvider>.
 */
export function useTravelData() {
  const ctx = useContext(TravelDataContext);
  if (!ctx) throw new Error('useTravelData must be used inside <TravelDataProvider>');
  return ctx;
}
