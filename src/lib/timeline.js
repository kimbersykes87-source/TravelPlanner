/**
 * Timeline utilities – consolidate relationship_log into periods for display.
 */

import { formatDdMmYy } from './visaCalculations';

/**
 * Consolidate consecutive same-country days into periods.
 * @param {Array} log - relationship_log rows { date, kimber_country, siona_country, notes }
 * @returns {Array} periods { startDate, endDate, kimber_country, siona_country, notes, isTogether, dayCount }
 */
export function consolidatePeriods(log) {
  if (!Array.isArray(log) || log.length === 0) return [];

  const sorted = [...log]
    .filter((r) => r && r.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const periods = [];
  let current = null;

  for (const row of sorted) {
    const k = (row.kimber_country || '').trim();
    const s = (row.siona_country || '').trim();
    const key = `${k}|${s}`;
    const notes = (row.notes || '').trim();
    const isTogether = k && s && k.toLowerCase() === s.toLowerCase();

    if (!current || current.key !== key) {
      current = {
        startDate: row.date,
        endDate: row.date,
        kimber_country: k,
        siona_country: s,
        notes,
        isTogether,
        dayCount: 1,
        key,
      };
      periods.push(current);
    } else {
      current.endDate = row.date;
      current.dayCount++;
      if (notes && (!current.notes || !current.notes.includes(notes))) {
        current.notes = current.notes ? `${current.notes} · ${notes}` : notes;
      }
    }
  }

  return periods;
}

/**
 * Format a period's date range for display.
 */
export function formatPeriodDates(startDate, endDate) {
  const startStr = formatDdMmYy(startDate);
  const endStr = formatDdMmYy(endDate);
  if (!startStr || !endStr) return startStr || endStr || '';
  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}
