/**
 * Display formatting helpers.
 */
import { parseLocalDate } from './dates';

/** DD-MM-YY, e.g. 20-09-26. */
export function formatDdMmYy(d) {
  if (!d) return '';
  const x = parseLocalDate(d);
  if (!x || Number.isNaN(x.getTime())) return '';
  const day = String(x.getDate()).padStart(2, '0');
  const month = String(x.getMonth() + 1).padStart(2, '0');
  const year = String(x.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/** "Born: Thursday 4 June 1987". */
export function formatBorn(dob) {
  if (!dob) return '';
  const d = parseLocalDate(dob);
  if (!d) return '';
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return `Born: ${d.toLocaleDateString('en-GB', options)}`;
}

const DEMONYMS = {
  australia: 'Australian',
  'united kingdom': 'British',
  uk: 'British',
  'great britain': 'British',
  ireland: 'Irish',
  'new zealand': 'New Zealand',
  'united states': 'US',
  canada: 'Canadian',
};

/** "British Passport", "Australian Passport". */
export function passportLabel(country) {
  const c = String(country || '').trim();
  if (!c) return 'Passport';
  return `${DEMONYMS[c.toLowerCase()] || c} Passport`;
}

/** "3 days" / "1 day". */
export function days(n) {
  return `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`;
}
