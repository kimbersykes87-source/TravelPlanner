/**
 * Date utilities – parse date-only strings as local dates to avoid timezone shift.
 * Root cause: new Date("1987-06-04") parses as UTC midnight, which displays
 * as the previous day in timezones west of UTC.
 *
 * Use parseLocalDate() for all YYYY-MM-DD strings from Supabase/Sheets.
 */

/**
 * Parse YYYY-MM-DD (or ISO-like) strings as local date. Avoids UTC-midnight shift.
 */
export function parseLocalDate(str) {
  if (!str) return null;
  if (typeof str === 'object' && str instanceof Date) return str;
  const s = String(str).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }
  return new Date(str);
}

/** Days between two YYYY-MM-DD strings (inclusive). */
export function daysBetween(startStr, endStr) {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

/** Add days to YYYY-MM-DD string, return YYYY-MM-DD. */
export function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD. */
export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
