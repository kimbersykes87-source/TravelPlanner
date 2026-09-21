import { useState } from 'react';

/**
 * "Last synced from Google Sheets" line, amber when the data is getting stale
 * and red when the last sync reported problems.
 */
const STALE_AFTER_HOURS = 48;

function timeAgo(date, now) {
  const mins = Math.round((now - date) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const d = Math.round(hours / 24);
  return `${d} days ago`;
}

export function LastSynced({ lastSync }) {
  // Captured once per mount; good enough for an "x hours ago" label.
  const [now] = useState(() => Date.now());
  if (!lastSync?.finished_at) return null;
  const at = new Date(lastSync.finished_at);
  if (Number.isNaN(at.getTime())) return null;
  const stale = now - at.getTime() > STALE_AFTER_HOURS * 3600 * 1000;
  const failed = lastSync.ok === false;
  const color = failed ? 'var(--color-error, #ef4444)' : stale ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-tertiary)';
  let text = `Synced from Google Sheets ${timeAgo(at.getTime(), now)}`;
  if (failed) text += '. Last sync had problems: open the Sheet and run Travel Planner, Sync to Supabase.';
  else if (stale) text += '. Data may be out of date.';
  const problems = Array.isArray(lastSync.problems) ? lastSync.problems : [];
  return (
    <div role="status" style={{ margin: '-12px 0 16px', fontSize: 12, color }}>
      <p style={{ margin: 0 }}>{text}</p>
      {problems.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: 'pointer' }}>{problems.length} data {problems.length === 1 ? 'warning' : 'warnings'} in the Sheet</summary>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {problems.slice(0, 20).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
