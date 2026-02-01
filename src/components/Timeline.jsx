import { consolidatePeriods, formatPeriodDates } from '../lib/timeline';

/**
 * Timeline of travel periods from relationship_log.
 * @param {Object} props
 * @param {Array} props.log - relationship_log rows
 * @param {boolean} [props.relationshipOnly] - If true, show only "together" periods
 */
export function Timeline({ log, relationshipOnly = false }) {
  const periods = consolidatePeriods(log || []);
  const filtered = relationshipOnly ? periods.filter((p) => p.isTogether) : periods;

  if (filtered.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14, margin: 0 }}>
        {relationshipOnly ? 'No together periods yet.' : 'No travel history yet. Sync from Sheets to Supabase.'}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((period, i) => {
        const borderColor = period.isTogether
          ? 'var(--color-success, #28a745)'
          : 'var(--color-warning, #f59e0b)';
        const kimber = period.kimber_country || '';
        const siona = period.siona_country || '';
        const countries =
          kimber === siona
            ? kimber
            : kimber && siona
              ? `${kimber} · ${siona}`
              : kimber || siona;

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 14,
              background: 'var(--color-bg-tertiary)',
              borderRadius: 10,
              borderLeft: `4px solid ${borderColor}`,
            }}
          >
            <div
              style={{
                minWidth: 95,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {formatPeriodDates(period.startDate, period.endDate)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: period.notes ? 4 : 0,
                }}
              >
                {countries || '—'}
              </div>
              {period.notes && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--color-text-tertiary)',
                    lineHeight: 1.4,
                  }}
                >
                  {period.notes}
                </p>
              )}
              {period.dayCount > 1 && (
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                    marginTop: 4,
                    display: 'inline-block',
                  }}
                >
                  {period.dayCount} days
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
