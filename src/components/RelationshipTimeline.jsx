import { useState } from 'react';
import { consolidatePeriods } from '../lib/timeline';
import { codeToIso2 } from '../lib/countryFlags';
import { parseLocalDate, daysBetween, todayIso } from '../lib/dates';
import { Icon } from './Icon';

function formatTimelineDate(d) {
  if (!d) return '';
  const s = String(d).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? s : '';
}

function isOngoing(endDate) {
  if (!endDate) return false;
  const end = parseLocalDate(endDate);
  const today = parseLocalDate(todayIso());
  if (!end || !today) return false;
  return end >= today;
}

/** Day count for a period within a specific year. 2025 ends 31 Dec; 2026+ capped at today. */
function effectiveDayCountInYear(period, year) {
  const today = todayIso();
  const currentYear = today.slice(0, 4);
  const yearStr = String(year || '');
  const yearStart = `${yearStr}-01-01`;
  const yearEnd =
    yearStr === currentYear
      ? today
      : `${yearStr}-12-31`;
  const periodStart = String(period.startDate || '').slice(0, 10);
  const periodEnd = String(period.endDate || '').slice(0, 10);
  const overlapStart = periodStart > yearStart ? periodStart : yearStart;
  const overlapEnd = periodEnd < yearEnd ? periodEnd : yearEnd;
  if (overlapStart > overlapEnd) return 0;
  return daysBetween(overlapStart, overlapEnd);
}

function getIso2ForCountry(countryName, statistics, countries) {
  const stat = statistics.find(
    (s) => (s.country || '').trim().toLowerCase() === (countryName || '').trim().toLowerCase()
  );
  return codeToIso2(stat?.country_code, countries, countryName);
}

/** Parse Notes for "Kimber in X, Siona in Y" or "Together in X". */
function parseNotesCountries(notes) {
  const n = (notes || '').trim();
  if (!n) return { kimber: '', siona: '', together: '' };
  const togetherMatch = n.match(/Together in (.+?)(?:[,.·]|$)/i);
  if (togetherMatch) {
    const c = togetherMatch[1].trim();
    return { kimber: c, siona: c, together: c };
  }
  const kimberMatch = n.match(/Kimber in ([^,]+)/i);
  const sionaMatch = n.match(/Siona in (.+?)(?:[,.·]|$)/i);
  return {
    kimber: (kimberMatch?.[1] || '').trim(),
    siona: (sionaMatch?.[1] || '').trim(),
    together: '',
  };
}

export function RelationshipTimeline({ log, countries = [], statistics = [] }) {
  const today = todayIso();
  const filteredLog = (log || []).filter(
    (r) => r?.date && String(r.date).slice(0, 10) <= today
  );
  const periods = consolidatePeriods(filteredLog);

  const byYear = {};
  periods.forEach((p) => {
    const startYear = parseInt(String(p.startDate || '').slice(0, 4), 10);
    const endYear = parseInt(String(p.endDate || '').slice(0, 4), 10);
    if (isNaN(startYear)) return;
    for (let y = startYear; y <= endYear; y++) {
      const yearStr = String(y);
      const overlapDays = effectiveDayCountInYear(p, yearStr);
      if (overlapDays <= 0) continue;
      if (!byYear[yearStr]) byYear[yearStr] = [];
      byYear[yearStr].push({ period: p, overlapDays });
    }
  });

  const years = Object.keys(byYear).sort((a, b) => (b || '').localeCompare(a || ''));

  const [expanded, setExpanded] = useState(() => new Set());

  const toggle = (year) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (years.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, margin: 0 }}>
        No timeline periods yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {years.map((year) => {
        const yearEntries = byYear[year].sort((a, b) =>
          String(b.period.startDate || '').localeCompare(String(a.period.startDate || ''))
        );

        const kimberCountries = new Set();
        const sionaCountries = new Set();
        let daysApart = 0;
        yearEntries.forEach(({ period: p, overlapDays }) => {
          let k = (p.kimber_country || '').trim();
          let s = (p.siona_country || '').trim();
          if (!k || !s) {
            const parsed = parseNotesCountries(p.notes);
            if (!k) k = parsed.kimber || parsed.together;
            if (!s) s = parsed.siona || parsed.together;
          }
          if (k) kimberCountries.add(k.toLowerCase());
          if (s) sionaCountries.add(s.toLowerCase());
          if (!p.isTogether) daysApart += overlapDays;
        });

        const isExpanded = expanded.has(year);

        return (
          <div
            key={year}
            style={{
              background: 'var(--color-bg-tertiary)',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--color-bg-quaternary)',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(year)}
              aria-expanded={isExpanded}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-primary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="calendar-days" size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                {year} — Kimber: {kimberCountries.size} · Siona: {sionaCountries.size}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                {daysApart > 0 && (
                  <span style={{ color: 'var(--color-warning, #f59e0b)', fontWeight: 600 }}>
                    Days Apart: {daysApart}
                  </span>
                )}
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              </span>
            </button>
            {isExpanded && (
              <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {yearEntries.map(({ period: p, overlapDays }, i) => {
                  const endStr = isOngoing(p.endDate) ? 'Present' : formatTimelineDate(p.endDate);
                  const dateRange = `${formatTimelineDate(p.startDate)} - ${endStr}`;
                  const borderColor = p.isTogether
                    ? 'var(--color-success, #28a745)'
                    : 'var(--color-warning, #f59e0b)';

                  if (p.isTogether) {
                    let country = (p.kimber_country || p.siona_country || '').trim();
                    if (!country) {
                      const parsed = parseNotesCountries(p.notes);
                      country = parsed.together || parsed.kimber || parsed.siona;
                    }
                    const iso2 = getIso2ForCountry(country, statistics, countries);
                    const flagSrc =
                      iso2.length === 2
                        ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
                        : null;

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          padding: 12,
                          background: 'var(--color-bg-secondary)',
                          borderRadius: 10,
                          borderLeft: `4px solid ${borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            {dateRange}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                            {overlapDays} days
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {flagSrc && (
                            <img
                              src={flagSrc}
                              alt=""
                              style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 2 }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {country}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                          Together in {country}
                        </span>
                      </div>
                    );
                  }

                  let kimberCountry = (p.kimber_country || '').trim();
                  let sionaCountry = (p.siona_country || '').trim();
                  if (!kimberCountry || !sionaCountry) {
                    const parsed = parseNotesCountries(p.notes);
                    if (!kimberCountry) kimberCountry = parsed.kimber;
                    if (!sionaCountry) sionaCountry = parsed.siona;
                  }
                  const kimberIso2 = getIso2ForCountry(kimberCountry, statistics, countries);
                  const sionaIso2 = getIso2ForCountry(sionaCountry, statistics, countries);

                  const FlagCell = ({ country, iso2 }) => {
                    const src =
                      iso2.length === 2
                        ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
                        : null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {src && (
                          <img
                            src={src}
                            alt=""
                            style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 2 }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {country}
                        </span>
                      </div>
                    );
                  };

                  const notes =
                    (p.notes || '').trim() ||
                    (kimberCountry && sionaCountry
                      ? `Kimber in ${kimberCountry}, Siona in ${sionaCountry}`
                      : '');

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        padding: 12,
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 10,
                        borderLeft: `4px solid ${borderColor}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {dateRange}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                          {overlapDays} days
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {kimberCountry && (
                          <div>
                            <FlagCell country={`${kimberCountry} (Kimber)`} iso2={kimberIso2} />
                          </div>
                        )}
                        {sionaCountry && (
                          <div>
                            <FlagCell country={`${sionaCountry} (Siona)`} iso2={sionaIso2} />
                          </div>
                        )}
                        {notes && (
                          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                            {notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
