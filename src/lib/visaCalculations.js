/**
 * Visa tracking calculations for Us tab.
 * Uses parseLocalDate for all date parsing (avoids UTC timezone shift).
 */
import { parseLocalDate } from './dates';

const UK_ALIASES = ['united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'];

const US_ALIASES = ['united states', 'usa', 'us', 'united states of america'];
const CANADA_ALIASES = ['canada'];
const MEXICO_ALIASES = ['mexico'];

const SCHENGEN_COUNTRIES = new Set([
  'austria', 'belgium', 'croatia', 'czech republic', 'denmark', 'estonia', 'finland', 'france', 'germany',
  'greece', 'hungary', 'iceland', 'italy', 'latvia', 'liechtenstein', 'lithuania', 'luxembourg', 'malta',
  'netherlands', 'norway', 'poland', 'portugal', 'slovakia', 'slovenia', 'spain', 'sweden', 'switzerland',
  'monaco', 'san marino', 'vatican city',
]);

function isUk(country) {
  if (!country) return false;
  const c = (country || '').trim().toLowerCase();
  return UK_ALIASES.some((a) => c === a || c.includes(a));
}

export function isUs(country) {
  if (!country) return false;
  const c = (country || '').trim().toLowerCase();
  return US_ALIASES.some((a) => c === a || c.includes(a));
}

function isCanada(country) {
  if (!country) return false;
  const c = (country || '').trim().toLowerCase();
  return CANADA_ALIASES.some((a) => c === a || c.includes(a));
}

function isMexico(country) {
  if (!country) return false;
  const c = (country || '').trim().toLowerCase();
  return MEXICO_ALIASES.some((a) => c === a || c.includes(a));
}

function isEstaContiguous(country) {
  return isUs(country) || isCanada(country) || isMexico(country);
}

export function isSchengen(country) {
  if (!country) return false;
  const c = (country || '').trim().toLowerCase();
  return SCHENGEN_COUNTRIES.has(c) || [...SCHENGEN_COUNTRIES].some((s) => c.includes(s));
}

function getUkTaxYearBounds() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  let startYear = year;
  if (month < 3 || (month === 3 && day < 6)) startYear = year - 1;
  return {
    start: new Date(startYear, 3, 6),
    end: new Date(startYear + 1, 3, 5),
  };
}

/**
 * Count UK days in current tax year for a profile.
 * @param {Array} relationshipLog - relationship_log rows
 * @param {string} profileKey - 'kimber' or 'siona' (matches kimber_country / siona_country)
 * @returns {{ ukDays: number, remaining: number }}
 */
export function calcUkTaxDays(relationshipLog, profileKey) {
  if (!relationshipLog?.length) return { ukDays: 0, remaining: 120 };
  const { start, end } = getUkTaxYearBounds();
  const getCountry = (row) => (profileKey === 'kimber' ? row.kimber_country : row.siona_country) || '';
  let ukDays = 0;
  const seen = new Set();
  for (const row of relationshipLog) {
    const d = row.date ? parseLocalDate(row.date) : null;
    if (!d || d < start || d > end) continue;
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    if (isUk(getCountry(row))) ukDays++;
  }
  return {
    ukDays,
    remaining: Math.max(0, 120 - ukDays),
    taxYearEnd: end,
  };
}

/** UK Work Days: count days where KSUKWorkDays/SSUKWorkDays = "Yes" in current tax year. Limit 39. */
export function calcUkWorkDays(relationshipLog, profileKey) {
  if (!relationshipLog?.length) return { workDays: 0, remaining: 39 };
  const { start, end } = getUkTaxYearBounds();
  const col = profileKey === 'kimber' ? 'ks_uk_work_days' : 'ss_uk_work_days';
  let workDays = 0;
  const seen = new Set();
  for (const row of relationshipLog) {
    const d = row.date ? parseLocalDate(row.date) : null;
    if (!d || d < start || d > end) continue;
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    if ((row[col] || '').toString().toLowerCase() === 'yes') workDays++;
  }
  return {
    workDays,
    remaining: Math.max(0, 39 - workDays),
    warning: workDays >= 40,
  };
}

/** US ESTA (Kimber): max 90 days per admission. US + Canada/Mexico contiguous. */
export function calcUsEsta(relationshipLog) {
  if (!relationshipLog?.length) return { admissionDays: 0, remaining: 90, inAdmission: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDate = new Map();
  for (const row of relationshipLog) {
    if (!row.date) continue;
    const d = parseLocalDate(row.date);
    if (d > today) continue;
    const key = row.date;
    if (!byDate.has(key)) byDate.set(key, row);
  }
  const dates = [...byDate.keys()].sort();
  let admissionDays = 0;
  let admissionStart = null;
  for (let i = dates.length - 1; i >= 0; i--) {
    const row = byDate.get(dates[i]);
    const inContiguous = isEstaContiguous(row.kimber_country);
    if (inContiguous) {
      admissionDays++;
      admissionStart = parseLocalDate(row.date);
    } else {
      break;
    }
  }
  const inAdmission = admissionDays > 0;
  return {
    admissionDays,
    remaining: Math.max(0, 90 - admissionDays),
    inAdmission,
    admissionStart,
  };
}

/** Siona US B1/B2: rolling window US days (default 365/180 from VisaRules). */
export function calcSionaUsDays(relationshipLog, visaRule = null) {
  const windowDays = visaRule?.window_days ?? 365;
  const maxDays = visaRule?.max_days ?? 180;
  if (!relationshipLog?.length) return { usDays: 0, remaining: maxDays };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  let usDays = 0;
  const seen = new Set();
  for (const row of relationshipLog) {
    const d = row.date ? parseLocalDate(row.date) : null;
    if (!d || d > today || d < cutoff) continue;
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    if (isUs(row.siona_country)) usDays++;
  }
  return { usDays, remaining: Math.max(0, maxDays - usDays) };
}

/** Schengen: 90 days in rolling 180 (or use rule's window_days/max_days). */
export function calcSchengen(relationshipLog, profileKey, visaRule = null) {
  const windowDays = visaRule?.window_days ?? 180;
  const maxDays = visaRule?.max_days ?? 90;
  if (!relationshipLog?.length) return { daysUsed: 0, remaining: maxDays };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const getCountry = (row) => (profileKey === 'kimber' ? row.kimber_country : row.siona_country) || '';
  let daysUsed = 0;
  const seen = new Set();
  for (const row of relationshipLog) {
    const d = row.date ? parseLocalDate(row.date) : null;
    if (!d || d > today || d < cutoff) continue;
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    if (isSchengen(getCountry(row))) daysUsed++;
  }
  const remaining = Math.max(0, maxDays - daysUsed);
  const lastSchengenDay = [...(relationshipLog || [])]
    .filter((r) => {
      const d = parseLocalDate(r.date);
      return d && d <= today && d >= cutoff && isSchengen(getCountry(r));
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  let fullRefreshDate = null;
  if (lastSchengenDay?.date) {
    const ld = parseLocalDate(lastSchengenDay.date);
    fullRefreshDate = new Date(ld);
    fullRefreshDate.setDate(fullRefreshDate.getDate() + windowDays);
  }
  return { daysUsed, remaining, fullRefreshDate };
}

/**
 * Get visa rule from visaRules array by jurisdiction (case-insensitive partial match).
 * e.g. "SCHENGEN" matches "SCHENGEN-ROLLING", "US" matches "US-ROLLING365"
 */
export function findVisaRule(visaRules, jurisdictionHint) {
  if (!visaRules?.length || !jurisdictionHint) return null;
  const hint = String(jurisdictionHint).toLowerCase();
  return visaRules.find((r) => (r.jurisdiction || '').toLowerCase().includes(hint)) || null;
}

/**
 * Format date as DD-MM-YY for display.
 */
export function formatDdMmYy(d) {
  if (!d) return '';
  const x = parseLocalDate(d);
  if (!x) return '';
  const day = String(x.getDate()).padStart(2, '0');
  const month = String(x.getMonth() + 1).padStart(2, '0');
  const year = String(x.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Format DOB as "Born: Thursday 4 June 1987".
 */
export function formatBorn(dob) {
  if (!dob) return '';
  const d = parseLocalDate(dob);
  if (!d) return '';
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return `Born: ${d.toLocaleDateString('en-GB', options)}`;
}
