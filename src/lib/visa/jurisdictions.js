/**
 * Which countries count toward which rule. All sets are ISO 3166-1 alpha-2.
 */
import { resolveCountry } from '../countries/resolve';

/** Days here count as being in the United States (states plus inhabited territories). */
export const US_SOIL = new Set(['US', 'PR', 'VI', 'GU', 'MP', 'AS', 'UM']);

/**
 * ESTA / Visa Waiver Program: time in Canada, Mexico or the "adjacent islands"
 * after entering the US does not reset the 90-day admission (INA 101(b)(5) and
 * 8 CFR 217.3). Adjacent islands are the Caribbean islands, Bermuda and
 * Saint Pierre and Miquelon.
 */
export const ESTA_CONTIGUOUS = new Set([
  'CA', 'MX', 'PM', 'BM',
  'AG', 'AI', 'AW', 'BB', 'BL', 'BQ', 'BS', 'CU', 'CW', 'DM', 'DO', 'GD', 'GP', 'HT',
  'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'SX', 'TC', 'TT', 'VC', 'VG',
]);

/**
 * Schengen area (29 members, including Bulgaria and Romania since 1 Jan 2025)
 * plus the micro-states with open borders to it (Monaco, San Marino, Vatican).
 */
export const SCHENGEN = new Set([
  'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV',
  'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
  'MC', 'SM', 'VA',
]);

/** UK tax residence counts days in the United Kingdom only (not Jersey, Guernsey or the Isle of Man). */
export const UK = new Set(['GB']);

const inSet = (set) => (country) => {
  const iso2 = resolveCountry(country);
  return iso2 != null && set.has(iso2);
};

export const isUsSoil = inSet(US_SOIL);
export const isEstaContiguous = inSet(ESTA_CONTIGUOUS);
export const isSchengen = inSet(SCHENGEN);
export const isUk = inSet(UK);
