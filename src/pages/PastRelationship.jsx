import { useMemo } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { Icon } from '../components/Icon';
import { codeToIso2 } from '../lib/countryFlags';
import { RelationshipTimeline } from '../components/RelationshipTimeline';
import { LoadingState } from '../components/LoadingState';

export function PastRelationship() {
  const { data, loading, error } = useTravelData();
  const statistics = data?.statistics || [];
  const countries = data?.countries || [];
  const relationshipLog = data?.relationshipLog || [];

  const top5RelationshipCountries = useMemo(() => {
    const byCountry = new Map();
    statistics
      .filter((s) => (s.together_days || 0) > 0)
      .forEach((s) => {
        const key = (s.country || '').trim().toLowerCase();
        if (!key) return;
        const existing = byCountry.get(key);
        if (!existing || (s.together_days || 0) > (existing.together_days || 0)) {
          byCountry.set(key, s);
        }
      });
    return Array.from(byCountry.values())
      .sort((a, b) => (b.together_days || 0) - (a.together_days || 0))
      .slice(0, 5);
  }, [statistics]);

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>RELATIONSHIP</h1>

      {/* Top 5 Relationship Countries */}
      <section style={{ marginBottom: 24 }}>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 0 16px 0',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <Icon name="star" size={18} />
          Top 5 Relationship Countries
        </h2>
        <div
          style={{
            padding: 20,
            background: 'var(--color-bg-secondary)',
            borderRadius: 15,
            border: '1px solid var(--color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {top5RelationshipCountries.length === 0 ? (
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, margin: 0 }}>
              No together days yet. Sync Statistics from Sheets.
            </p>
          ) : (
            top5RelationshipCountries.map((stat, i) => {
              const iso2 = codeToIso2(stat.country_code, countries, stat.country);
              const flagSrc =
                iso2.length === 2
                  ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
                  : null;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  {flagSrc && (
                    <img
                      src={flagSrc}
                      alt=""
                      style={{ width: 32, height: 24, objectFit: 'cover', borderRadius: 2 }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {stat.country || 'Unknown'}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {stat.together_days || 0} days
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Relationship Timeline */}
      <section>
        <h2
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 0 16px 0',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <Icon name="passport" size={18} />
          Relationship Timeline
        </h2>
        <RelationshipTimeline log={relationshipLog} countries={countries} statistics={statistics} />
      </section>
      </div>
    </LoadingState>
  );
}
