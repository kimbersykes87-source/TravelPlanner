/**
 * ALL TABS - Shared Utilities for Statistics (02-PAST-TAB)
 * Trimmed for v2: supports only RelationshipLog, PreRelationshipCountries, Countries, Statistics.
 * Write API and visa/scenario logic removed (deleted with 01-US-TAB, 03-PRESENT-TAB, 04-FUTURE-TAB).
 */

// Country name mapping for better matching
const COUNTRY_NAME_MAPPING = {
  'United States': 'United States of America',
  'United States of America': 'United States of America',
  'US': 'United States of America',
  'USA': 'United States of America',
  'America': 'United States of America',
  'United Kingdom': 'United Kingdom',
  'UK': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Britain': 'United Kingdom',
  'England': 'United Kingdom',
  'Scotland': 'United Kingdom',
  'Wales': 'United Kingdom',
  'Northern Ireland': 'United Kingdom',
  'South Korea': 'Korea, Republic of',
  'Republic of Korea': 'Korea, Republic of',
  'Korea': 'Korea, Republic of',
  'South Africa': 'South Africa',
  'Republic of South Africa': 'South Africa',
  'Czech Republic': 'Czechia',
  'Czechia': 'Czechia',
  'Slovakia': 'Slovakia',
  'Slovak Republic': 'Slovakia',
  'Netherlands': 'Netherlands',
  'Holland': 'Netherlands',
  'United Arab Emirates': 'United Arab Emirates',
  'UAE': 'United Arab Emirates',
  'Russia': 'Russian Federation',
  'Russian Federation': 'Russian Federation',
  'China': 'China',
  'People\'s Republic of China': 'China',
  'Taiwan': 'Taiwan, Province of China',
  'Republic of China': 'Taiwan, Province of China',
  'Hong Kong': 'Hong Kong',
  'Hong Kong SAR': 'Hong Kong',
  'Kosovo': 'Kosovo',
  'Republic of Kosovo': 'Kosovo',
  'North Macedonia': 'North Macedonia',
  'Republic of North Macedonia': 'North Macedonia',
  'Macedonia': 'North Macedonia',
  'Serbia': 'Serbia',
  'Republic of Serbia': 'Serbia',
  'Serbian': 'Serbia',
  'Vietnam': 'Viet Nam',
  'Viet Nam': 'Viet Nam',
  'Socialist Republic of Vietnam': 'Viet Nam',
  'Vietnam (Socialist Republic)': 'Viet Nam',
  'Vietnam, Socialist Republic of': 'Viet Nam',
  'U.S.': 'United States of America',
  'U.S.A.': 'United States of America',
  'U.S.A': 'United States of America',
  'United States of America (USA)': 'United States of America',
  'US of A': 'United States of America'
};

const SHEET_NAME_ALIASES = {
  'RelationshipLog': ['relationship log', 'relationship_log', 'relationship-log'],
  'PreRelationshipCountries': ['pre relationship countries', 'pre-relationship countries', 'pre_relationship_countries'],
  'Countries': ['countries master', 'country list', 'countrylist', 'countries (master)'],
  'Statistics': ['stats', 'statistics sheet']
};

/**
 * Normalize sheet name for matching
 */
function normalizeSheetName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]+/g, '');
}

/**
 * Get sheet by expected name with alias support
 */
function getSheetByExpectedName(expectedName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const direct = ss.getSheetByName(expectedName);
  if (direct) return direct;

  const normalizedTargets = [normalizeSheetName(expectedName)];
  const aliasList = SHEET_NAME_ALIASES[expectedName] || [];
  aliasList.forEach(alias => normalizedTargets.push(normalizeSheetName(alias)));

  const fallback = ss.getSheets().find(sheet => normalizedTargets.includes(normalizeSheetName(sheet.getName())));
  if (fallback) {
    console.log(`ℹ️ Using sheet "${fallback.getName()}" for expected "${expectedName}"`);
    return fallback;
  }

  return null;
}

/**
 * Normalize key for matching
 */
function normalizeKey_(value) {
  return value ? value.toString().trim().toLowerCase() : '';
}

/**
 * Normalize yes/no flag
 */
function normalizeYesFlag_(value) {
  const str = value === null || value === undefined ? '' : value.toString().trim().toLowerCase();
  return str === 'yes' || str === 'y' || str === 'true' || str === '1';
}

/**
 * Normalize country names for matching
 */
function normalizeCountryName(countryName) {
  if (!countryName) return '';

  if (COUNTRY_NAME_MAPPING[countryName]) {
    return COUNTRY_NAME_MAPPING[countryName];
  }

  const lowerName = countryName.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return countryName;
}
