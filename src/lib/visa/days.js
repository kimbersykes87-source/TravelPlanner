/**
 * Calendar-day arithmetic for visa counting.
 *
 * All dates are handled as whole calendar days ("day numbers" since 1970-01-01)
 * computed in UTC, so results never shift by a day with the phone's time zone.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' (or anything starting with it) -> integer day number, or NaN. */
export function toDayNumber(value) {
  if (value == null) return NaN;
  if (value instanceof Date) {
    return Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / MS_PER_DAY);
  }
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return NaN;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_DAY);
}

/** Integer day number -> 'YYYY-MM-DD'. */
export function fromDayNumber(dayNumber) {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Today's local calendar date as a day number. */
export function todayDayNumber(now = new Date()) {
  return toDayNumber(now);
}

/** Today's local calendar date as 'YYYY-MM-DD'. */
export function todayIsoDate(now = new Date()) {
  return fromDayNumber(todayDayNumber(now));
}

/** Add whole days to 'YYYY-MM-DD'. */
export function addDays(isoDate, days) {
  return fromDayNumber(toDayNumber(isoDate) + days);
}

/** UK tax year (6 April to 5 April) containing the given day number. */
export function ukTaxYearBounds(dayNumber) {
  const iso = fromDayNumber(dayNumber);
  const year = +iso.slice(0, 4);
  const apr6ThisYear = toDayNumber(`${year}-04-06`);
  const startYear = dayNumber >= apr6ThisYear ? year : year - 1;
  return {
    start: toDayNumber(`${startYear}-04-06`),
    end: toDayNumber(`${startYear + 1}-04-05`),
  };
}
