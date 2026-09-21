import { useMemo } from 'react';
import { useTravelData } from '../hooks/useTravelData';
import { Icon } from '../components/Icon';
import { CountryChip } from '../components/CountryChip';
import { LoadingState } from '../components/LoadingState';
import { codeToIso2, continentOf } from '../lib/countryFlags';

function countContinents(countryList) {
  return new Set(countryList.map((c) => continentOf(c.iso2)).filter((c) => c !== 'Other')).size;
}

export function PastAllTime() {
  const { data, loading, error } = useTravelData();
  const statistics = data.statistics;
  const countries = data.countries;
  const profiles = data.profiles;

  const togetherCountries = useMemo(() => {
    const seen = new Set();
    return statistics
      .filter((s) => s.together_visited === true)
      .filter((s) => {
        const key = (s.country || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({
        country: s.country,
        iso2: codeToIso2(s.country_code, countries, s.country),
      }))
      .sort((a, b) => (a.country || '').localeCompare(b.country || ''));
  }, [statistics, countries]);

  const kimberCountries = useMemo(() => {
    const seen = new Set();
    return statistics
      .filter((s) => s.kimber_visited === true)
      .filter((s) => {
        const key = (s.country || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({
        country: s.country,
        iso2: codeToIso2(s.country_code, countries, s.country),
      }))
      .sort((a, b) => (a.country || '').localeCompare(b.country || ''));
  }, [statistics, countries]);

  const sionaCountries = useMemo(() => {
    const seen = new Set();
    return statistics
      .filter((s) => s.siona_visited === true)
      .filter((s) => {
        const key = (s.country || '').trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({
        country: s.country,
        iso2: codeToIso2(s.country_code, countries, s.country),
      }))
      .sort((a, b) => (a.country || '').localeCompare(b.country || ''));
  }, [statistics, countries]);

  const counts = useMemo(
    () => ({
      together: togetherCountries.length,
      kimber: kimberCountries.length,
      siona: sionaCountries.length,
    }),
    [togetherCountries.length, kimberCountries.length, sionaCountries.length]
  );

  const continentCounts = useMemo(
    () => ({
      kimber: countContinents(kimberCountries),
      siona: countContinents(sionaCountries),
    }),
    [kimberCountries, sionaCountries]
  );

  const kimberProfile = profiles.find((p) => (p.full_name || '').toLowerCase().includes('kimber'));
  const sionaProfile = profiles.find((p) => (p.full_name || '').toLowerCase().includes('siona'));

  if (error) return <p style={{ color: 'var(--color-error)' }}>{error}</p>;

  return (
    <LoadingState loading={loading}>
      <div>
        <h1>ALL TIME</h1>

      {/* ALL TIME COUNTRY COUNTS */}
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
          <Icon name="earth" size={18} />
          All Time Country Counts
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              background: 'var(--color-bg-tertiary)',
              borderRadius: 12,
              borderLeft: '4px solid var(--color-together)',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Together</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
              {counts.together}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              background: 'var(--color-bg-tertiary)',
              borderRadius: 12,
              borderLeft: '4px solid var(--color-kimber)',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              Kimber&apos;s Countries
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
              {counts.kimber}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              background: 'var(--color-bg-tertiary)',
              borderRadius: 12,
              borderLeft: '4px solid var(--color-siona)',
            }}
          >
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              Siona&apos;s Countries
            </span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
              {counts.siona}
            </span>
          </div>
        </div>
      </section>

      {/* ALL TIME COUNTRIES */}
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
          <Icon name="medal" size={18} />
          All Time Countries
        </h2>

        {/* Countries Visited Together */}
        <div
          style={{
            padding: 20,
            background: 'var(--color-bg-secondary)',
            borderRadius: 15,
            border: '1px solid var(--color-together)',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              <Icon name="relationship" size={18} style={{ color: 'var(--color-siona)' }} />
              Countries Visited Together
            </span>
            <span
              style={{
                padding: '4px 10px',
                background: 'var(--color-bg-tertiary)',
                borderRadius: 20,
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              {counts.together} countries
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            {togetherCountries.map((c, i) => (
              <CountryChip key={i} country={c.country} iso2={c.iso2} variant="together" />
            ))}
          </div>
        </div>

        {/* Kimber & Siona cards: equal fit, two columns each */}
        <div className="past-all-time-cards">
          {/* Kimber's Countries Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'var(--color-bg-secondary)',
              borderRadius: 15,
              border: '1px solid var(--color-kimber)',
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {kimberProfile?.profile_picture_url && (
                <img
                  src={kimberProfile.profile_picture_url}
                  alt="Kimber"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Kimber
                </h3>
                <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
                  Continents: {continentCounts.kimber}
                </span>
              </div>
              <span
                style={{
                  padding: '6px 12px',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 20,
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                }}
              >
                {counts.kimber} countries
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                flex: 1,
                alignContent: 'start',
              }}
            >
              {kimberCountries.map((c, i) => (
                <CountryChip key={i} country={c.country} iso2={c.iso2} variant="kimber" />
              ))}
            </div>
          </div>

          {/* Siona's Countries Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'var(--color-bg-secondary)',
              borderRadius: 15,
              border: '1px solid var(--color-siona)',
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {sionaProfile?.profile_picture_url && (
                <img
                  src={sionaProfile.profile_picture_url}
                  alt="Siona"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Siona
                </h3>
                <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
                  Continents: {continentCounts.siona}
                </span>
              </div>
              <span
                style={{
                  padding: '6px 12px',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 20,
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                }}
              >
                {counts.siona} countries
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                flex: 1,
                alignContent: 'start',
              }}
            >
              {sionaCountries.map((c, i) => (
                <CountryChip key={i} country={c.country} iso2={c.iso2} variant="siona" />
              ))}
            </div>
          </div>
        </div>
      </section>
      </div>
    </LoadingState>
  );
}
