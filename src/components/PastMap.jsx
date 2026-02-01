import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useTravelData } from '../hooks/useTravelData';
import { getCountryIds } from '../lib/getCountryIds';
import { codeToIso2, ISO3_TO_ISO2 } from '../lib/countryFlags';
import { Icon } from './Icon';
import 'leaflet/dist/leaflet.css';

const NATURAL_EARTH_110M_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const MICROSTATES_URL = '/assets/data/microstates.geojson';

const KEY_ITEMS = [
  { label: 'Together', color: '#28a745' },
  { label: 'Both', color: '#a855f7' },
  { label: 'Kimber', color: '#3b82f6' },
  { label: 'Siona', color: '#ec4899' },
];

const COUNTRY_NAME_ALIASES = {
  uk: 'united kingdom',
  usa: 'united states',
  us: 'united states',
  uae: 'united arab emirates',
};

export function PastMap({ onLoad }) {
  const [geoJson, setGeoJson] = useState(null);
  const [microstatesJson, setMicrostatesJson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const { data } = useTravelData();
  const statistics = data?.statistics || [];
  const countries = data?.countries || [];

  const statsByCode = useMemo(() => {
    const m = new Map();
    statistics.forEach((s) => {
      const code = (s.country_code || '').trim().toUpperCase();
      if (code) {
        m.set(code, s);
        if (code.length === 3 && ISO3_TO_ISO2[code]) {
          m.set(ISO3_TO_ISO2[code], s);
        }
      }
      const name = (s.country || '').trim().toLowerCase();
      if (name) {
        m.set(name, s);
        const alt = COUNTRY_NAME_ALIASES[name];
        if (alt) m.set(alt, s);
      }
    });
    return m;
  }, [statistics]);

  const findStat = useCallback(
    (ids) => {
      if (!ids) return null;
      const byIso3 = statsByCode.get((ids.iso3 || '').toUpperCase());
      if (byIso3) return byIso3;
      const byIso2 = statsByCode.get((ids.iso2 || '').toUpperCase());
      if (byIso2) return byIso2;
      const byName = statsByCode.get((ids.name || '').trim().toLowerCase());
      if (byName) return byName;
      const alias = (() => {
        const n = (ids.name || '').trim().toLowerCase();
        const aliases = {
          'united kingdom of great britain and northern ireland': 'united kingdom',
          'united kingdom': 'united kingdom',
          'uk': 'united kingdom',
          'united states of america': 'united states',
          'united states': 'united states',
          'usa': 'united states',
          'russian federation': 'russia',
          "korea, republic of": 'south korea',
          'viet nam': 'vietnam',
          'bolivia (plurinational state of)': 'bolivia',
          'venezuela (bolivarian republic of)': 'venezuela',
        };
        return aliases[n] || n;
      })();
      const byAlias = statsByCode.get(alias);
      if (byAlias) return byAlias;
      const geoName = (ids.name || '').trim().toLowerCase();
      const revAliases = { 'united kingdom': ['uk'], 'united states': ['usa', 'us'] };
      const aliasVariants = revAliases[alias] ? [alias, ...revAliases[alias]] : [alias];
      return statistics.find((s) => {
        const sc = (s.country_code || '').trim().toUpperCase();
        const sn = (s.country || '').trim().toLowerCase();
        const codeMatch = sc === (ids.iso2 || '').toUpperCase() || sc === (ids.iso3 || '').toUpperCase();
        const nameMatch = sn === geoName || aliasVariants.some((a) => sn === a);
        return codeMatch || nameMatch;
      }) || null;
    },
    [statsByCode, statistics]
  );

  const geoJsonStyle = useMemo(
    () => (feature) => {
      const ids = getCountryIds(feature);
      const stat = findStat(ids);
      let color = '#3a3a3a';
      if (stat) {
        if (stat.together_visited || (stat.together_days || 0) > 0) color = '#28a745';
        else if (stat.kimber_visited && stat.siona_visited) color = '#a855f7';
        else if (stat.kimber_visited) color = '#3b82f6';
        else if (stat.siona_visited) color = '#ec4899';
      }
      return {
        fillColor: color,
        fillOpacity: 0.6,
        color: '#1a1a1a',
        weight: 1,
      };
    },
    [findStat]
  );

  const handleFeatureClick = useCallback(
    (e) => {
      const layer = e.target;
      const feature = layer.feature;
      if (!feature) return;
      const ids = getCountryIds(feature);
      const stat = findStat(ids);
      setSelectedCountry({
        name: ids.name || 'Unknown',
        iso2: ids.iso2,
        iso3: ids.iso3,
        stat: stat || null,
      });
      layer.bringToFront();
    },
    [findStat]
  );

  const onEachFeature = useCallback(
    (feature, layer) => {
      layer.on('click', handleFeatureClick);
    },
    [handleFeatureClick]
  );

  useEffect(() => {
    Promise.all([
      fetch(NATURAL_EARTH_110M_URL).then((r) => r.json()),
      fetch(MICROSTATES_URL).then((r) => r.json()),
    ])
      .then(([mainGeo, microstatesGeo]) => {
        setGeoJson(mainGeo);
        setMicrostatesJson(microstatesGeo);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        onLoad?.();
      });
  }, [onLoad]);

  if (loading) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Key with coloured squares */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {KEY_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                backgroundColor: item.color,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ height: '60vh', minHeight: 300, borderRadius: 15, overflow: 'hidden' }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoJson && (
            <GeoJSON data={geoJson} style={geoJsonStyle} onEachFeature={onEachFeature} />
          )}
          {microstatesJson && (
            <GeoJSON data={microstatesJson} style={geoJsonStyle} onEachFeature={onEachFeature} />
          )}
        </MapContainer>
      </div>

      {/* Centered popup when country clicked */}
      {selectedCountry && (
        <CountryPopup
          country={selectedCountry}
          countries={countries}
          statistics={statistics}
          findStat={findStat}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
}

function getTogetherDaysFromStat(stat) {
  if (!stat || typeof stat !== 'object') return null;
  const tryKeys = ['together_days', 'Together_Days', 'togetherDays', 'TogetherDays'];
  for (const k of tryKeys) {
    if (k in stat) {
      const v = stat[k];
      if (v != null && v !== '') {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      }
    }
  }
  for (const k of Object.keys(stat)) {
    if (/together/i.test(k) && /day/i.test(k)) {
      const v = stat[k];
      if (v != null && v !== '') {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
      }
    }
  }
  return null;
}

function CountryPopup({ country, countries, statistics, findStat, onClose }) {
  const ids = { name: country.name, iso2: country.iso2, iso3: country.iso3 };
  const stat = country.stat ?? (findStat ? findStat(ids) : null) ?? (statistics || []).find((s) => {
    const sc = (s.country_code || '').trim().toUpperCase();
    const sn = (s.country || '').trim().toLowerCase();
    return sc === (ids.iso2 || '').toUpperCase() || sc === (ids.iso3 || '').toUpperCase() || sn === (ids.name || '').trim().toLowerCase();
  });
  const iso2 =
    (country.iso2 && String(country.iso2).length === 2 ? String(country.iso2).toUpperCase() : '') ||
    (stat?.country_code && String(stat.country_code).length === 2 ? String(stat.country_code).toUpperCase() : '') ||
    codeToIso2(stat?.country_code || country.iso3, countries, country.name);
  const flagSrc =
    iso2.length === 2
      ? `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`
      : null;
  const numDays = getTogetherDaysFromStat(stat) ?? 0;
  const showTogetherDays = stat != null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-popup-title"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: 16,
          border: '1px solid var(--color-bg-quaternary)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          padding: 24,
          position: 'relative',
          minWidth: 220,
          maxWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Icon name="x-close" size={24} style={{ display: 'block', color: '#fff' }} />
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            paddingTop: 8,
          }}
        >
          {flagSrc && (
            <img
              src={flagSrc}
              alt=""
              style={{
                width: 80,
                height: 60,
                objectFit: 'cover',
                borderRadius: 8,
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <h2
            id="country-popup-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              textAlign: 'center',
            }}
          >
            {country.name}
          </h2>
          {showTogetherDays && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              Together: {numDays} days
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
