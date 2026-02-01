import { useState, useEffect } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { PastMap as PastMapComponent } from '../components/PastMap';
import { LoadingState } from '../components/LoadingState';

export function PastMap() {
  const { data, loading: dataLoading, error } = useTravelData();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (dataLoading) setMapReady(false);
  }, [dataLoading]);

  const allLoading = dataLoading || !mapReady;

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={allLoading} message="Loading map…">
      <div>
        <h1>MAP</h1>
        {!dataLoading && <PastMapComponent onLoad={() => setMapReady(true)} />}
      </div>
    </LoadingState>
  );
}
