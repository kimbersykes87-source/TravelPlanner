/**
 * Country name resolution.
 *
 * Every visa and map calculation needs to know *which* country a free-text
 * name from the Google Sheet refers to. We resolve names to ISO 3166-1
 * alpha-2 codes using exact (normalised) matches only. Never use substring
 * matching: "Australia" contains "us" and "Ukraine" contains "uk".
 */
import COUNTRY_NAMES from './countryNames.json';
import { ISO3_TO_ISO2 } from './iso3';

// ISO3 codes appear in the Statistics sheet's Country_Code column.
const ISO3_INDEX = new Map(Object.entries(ISO3_TO_ISO2));

/** Lowercase, strip accents and punctuation, unify "St"/"Saint" and "&"/"and". */
export function normalizeCountryName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’,()]/g, ' ')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\bst\b/g, 'saint')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

/** Extra everyday names that the ISO list does not include. */
const EXTRA_ALIASES = {
  GB: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Britain', 'U.K.'],
  US: ['United States', 'America'],
  NL: ['Holland', 'The Netherlands'],
  AE: ['UAE', 'Dubai', 'Abu Dhabi'],
  SX: ['St Maarten', 'Sint Maarten', 'St. Maarten'],
  MF: ['Saint Martin', 'St Martin', 'Saint-Martin'],
  BL: ['St Barts', 'St Barths', 'Saint Barth', 'St. Barthelemy'],
  CZ: ['Czech Republic', 'Czechia'],
  TR: ['Turkey', 'Turkiye', 'Türkiye'],
  KR: ['Korea'],
  VA: ['Vatican', 'Vatican City', 'Holy See'],
  CI: ["Cote d'Ivoire", 'Ivory Coast'],
  MK: ['Macedonia', 'North Macedonia'],
  XK: ['Kosovo'],
  VN: ['Vietnam', 'Viet Nam'],
  LA: ['Laos'],
  RU: ['Russia'],
  BO: ['Bolivia'],
  VE: ['Venezuela'],
  IR: ['Iran'],
  SY: ['Syria'],
  TZ: ['Tanzania'],
  MD: ['Moldova'],
  BN: ['Brunei'],
  CV: ['Cape Verde', 'Cabo Verde'],
  SZ: ['Swaziland', 'Eswatini'],
  MM: ['Burma', 'Myanmar'],
  TW: ['Taiwan'],
  PS: ['Palestine'],
  FM: ['Micronesia'],
  BQ: ['Bonaire', 'Caribbean Netherlands'],
  VG: ['BVI', 'British Virgin Islands'],
  VI: ['USVI', 'US Virgin Islands', 'U.S. Virgin Islands'],
  KN: ['St Kitts', 'Saint Kitts', 'St Kitts and Nevis'],
  VC: ['St Vincent', 'Saint Vincent', 'St Vincent and the Grenadines'],
  LC: ['St Lucia'],
  PM: ['St Pierre and Miquelon'],
  TC: ['Turks and Caicos'],
  CD: ['DRC', 'DR Congo', 'Democratic Republic of the Congo'],
  CG: ['Republic of the Congo', 'Congo'],
};

function buildIndex(extraRows = []) {
  const index = new Map();
  const add = (name, iso2) => {
    const key = normalizeCountryName(name);
    if (key && !index.has(key)) index.set(key, iso2);
  };
  // Rows from the Countries sheet win, so the Sheet is the source of truth.
  for (const row of extraRows) {
    const iso2 = String(row?.iso2 || '').trim().toUpperCase();
    if (iso2.length === 2 && row?.country_name) add(row.country_name, iso2);
  }
  for (const [iso2, names] of Object.entries(COUNTRY_NAMES)) {
    add(iso2, iso2);
    names.forEach((n) => add(n, iso2));
  }
  for (const [iso2, names] of Object.entries(EXTRA_ALIASES)) names.forEach((n) => add(n, iso2));
  return index;
}

let index = buildIndex();

/**
 * Teach the resolver the names used in the Countries sheet (country_name + iso2).
 * Safe to call repeatedly; the latest table wins.
 */
export function registerCountries(countriesTable) {
  index = buildIndex(Array.isArray(countriesTable) ? countriesTable : []);
}

/** Resolve a free-text country name (or ISO2/ISO3 code) to ISO2, or null if unknown. */
export function resolveCountry(name) {
  if (name == null) return null;
  const raw = String(name).trim();
  if (!raw) return null;
  const hit = index.get(normalizeCountryName(raw));
  if (hit) return hit;
  if (/^[A-Za-z]{3}$/.test(raw)) {
    const byIso3 = ISO3_INDEX.get(raw.toUpperCase());
    if (byIso3) return byIso3;
  }
  return null;
}

/** Display name for an ISO2 code (first English name). */
export function countryDisplayName(iso2) {
  const names = COUNTRY_NAMES[String(iso2 || '').toUpperCase()];
  return names ? names[0] : '';
}
