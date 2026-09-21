/**
 * Country codes for flags (flagcdn.com) and continent counts.
 * Name matching is done by lib/countries/resolve.js (exact, normalised).
 */
import { ISO3_TO_ISO2 } from './countries/iso3';
import { resolveCountry } from './countries/resolve';
import CONTINENTS from './countries/continents.json';

export { ISO3_TO_ISO2 };

/**
 * ISO2 for a Statistics/Countries code (ISO2 or ISO3) or, failing that, a country name.
 * The second argument is kept for compatibility; names from the Countries
 * sheet are already registered with the resolver when data loads.
 */
// eslint-disable-next-line no-unused-vars
export function codeToIso2(code, _countries = [], countryName = '') {
  const raw = String(code || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  if (/^[A-Z]{3}$/.test(raw) && ISO3_TO_ISO2[raw]) return ISO3_TO_ISO2[raw];
  return resolveCountry(countryName) || resolveCountry(code) || '';
}

/** ISO2 for a free-text country name ('' if unknown). */
export function countryToIso2(name) {
  return resolveCountry(name) || '';
}

/** Continent name for an ISO2 code. */
export function continentOf(iso2) {
  return CONTINENTS[String(iso2 || '').toUpperCase()] || 'Other';
}
