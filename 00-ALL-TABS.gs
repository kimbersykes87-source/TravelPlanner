/**
 * ALL TABS - Shared Utilities and Constants
 * This file contains shared code used across all tabs (US, PAST, PRESENT, FUTURE)
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
  // United States additional variations
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
  'Statistics': ['stats', 'statistics sheet'],
  'BookedUpcoming': ['booked upcoming', 'booked_upcoming', 'booked'],
  'ToBook': ['to book', 'to_book', 'to-book'],
  'FutureScenarios': ['future scenarios', 'futurescenarios', 'future_scenarios'],
  'ScenarioStays': ['scenario stays', 'scenariostays', 'scenario_stays'],
  'VisaRules': ['visa rules', 'visarules', 'visa_rules']
  // Note: ScenarioCalendar removed - redundant, data derived from ScenarioStays
};

const WRITE_API_TOKEN = 'KIMBER_SIONA_TRAVEL_PLANNER';
const BOOKED_UPCOMING_SHEET_NAME = 'BookedUpcoming';
const TO_BOOK_SHEET_NAME = 'ToBook';
const FUTURE_SCENARIOS_SHEET_NAME = 'FutureScenarios';
const SCENARIO_STAYS_SHEET_NAME = 'ScenarioStays';
const VISA_RULES_SHEET_NAME = 'VisaRules';
// Note: SCENARIO_CALENDAR_SHEET_NAME removed - redundant, data derived from ScenarioStays
const DEFAULT_SCENARIO_WINDOW_DAYS = 365;
const DEFAULT_SCENARIO_MAX_DURATION_DAYS = 366;
const DEFAULT_VISA_RULES = [
  { ruleId: 'US-ADMISSION', jurisdiction: 'US', windowDays: 90, maxDays: 90, contiguousTerritory: true },
  { ruleId: 'US-ROLLING365', jurisdiction: 'US365', windowDays: 365, maxDays: 180, contiguousTerritory: false },
  { ruleId: 'UK-TAX', jurisdiction: 'UK', windowDays: 365, maxDays: 120, contiguousTerritory: false },
  { ruleId: 'SCHENGEN-ROLLING', jurisdiction: 'SCHENGEN', windowDays: 180, maxDays: 90, contiguousTerritory: false }
];
const SUPPORTED_SCENARIO_PROFILE_SCOPES = ['kimber', 'siona', 'both'];

const SCHENGEN_COUNTRIES = [
  'Austria','Belgium','Bulgaria','Croatia','Czech Republic','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Italy','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta','Netherlands','Norway','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Switzerland','Monaco','San Marino','Vatican City'
];

const US_CONTIGUOUS_TERRITORIES = ['United States', 'United States of America', 'Canada', 'Mexico'];

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
  
  // First try direct mapping
  if (COUNTRY_NAME_MAPPING[countryName]) {
    return COUNTRY_NAME_MAPPING[countryName];
  }
  
  // Try case-insensitive mapping
  const lowerName = countryName.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_NAME_MAPPING)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Return original name if no mapping found
  return countryName;
}

/**
 * Sanitize string value
 */
function sanitizeString_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Sanitize ISO date
 */
function sanitizeISODate_(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const iso = new Date(value.getTime());
    iso.setHours(0, 0, 0, 0);
    return iso.toISOString().split('T')[0];
  }

  const str = value.toString().trim();
  if (!str) return '';
  const match = str.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date.toISOString().split('T')[0];
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed.toISOString().split('T')[0];
  }
  return '';
}

/**
 * Clamp number between min and max
 */
function clampNumber_(value, min, max, fallback) {
  const num = Number(value);
  if (isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

/**
 * Get day number from date string
 */
function getDayNumber_(dateStr) {
  if (!dateStr) return Number.NaN;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return Number.NaN;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(date.getTime())) return Number.NaN;
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Get today's start date
 */
function getTodayStart_() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Convert day number to date
 */
function dayNumberToDate_(dayNumber) {
  const date = new Date(dayNumber * 24 * 60 * 60 * 1000);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Get day number from date
 */
function getDayNumberFromDate_(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Check if country is Schengen
 */
function isSchengenCountry(country) {
  if (!country) return false;
  const normalized = normalizeCountryName(country);
  return SCHENGEN_COUNTRIES.some(name => normalizeCountryName(name) === normalized);
}

/**
 * Get jurisdiction for country
 */
function getJurisdictionForCountry_(country) {
  const normalized = normalizeCountryName(country);
  if (!normalized) return '';

  if (US_CONTIGUOUS_TERRITORIES.some(name => normalizeCountryName(name) === normalized)) {
    return 'US';
  }

  if (normalizeCountryName('United Kingdom') === normalized) {
    return 'UK';
  }

  if (SCHENGEN_COUNTRIES.map(name => normalizeCountryName(name)).includes(normalized)) {
    return 'SCHENGEN';
  }

  return '';
}

/**
 * Load visa rules from sheet
 * Note: Falls back to DEFAULT_VISA_RULES if sheet is missing or incomplete
 * For production, ensure VisaRules sheet exists and matches default rules to avoid inconsistencies
 */
function loadVisaRules_() {
  const sheet = getSheetByExpectedName(VISA_RULES_SHEET_NAME);
  if (!sheet) return DEFAULT_VISA_RULES;

  const data = sheet.getDataRange().getValues();
  const rules = [];
  for (let i = 1; i < data.length; i++) {
    const [ruleId, jurisdictionRaw, windowDaysRaw, maxDaysRaw, contiguousTerritoryRaw] = data[i];
    const jurisdiction = sanitizeString_(jurisdictionRaw).toUpperCase();
    if (!jurisdiction) continue;
    const windowDays = Number(windowDaysRaw) || DEFAULT_VISA_RULES.find(r => r.jurisdiction === jurisdiction)?.windowDays || 0;
    const maxDays = Number(maxDaysRaw) || DEFAULT_VISA_RULES.find(r => r.jurisdiction === jurisdiction)?.maxDays || 0;
    const contiguousTerritory = normalizeYesFlag_(contiguousTerritoryRaw);
    rules.push({
      ruleId: sanitizeString_(ruleId) || jurisdiction,
      jurisdiction,
      windowDays,
      maxDays,
      contiguousTerritory
    });
  }

  return rules.length ? rules : DEFAULT_VISA_RULES;
}

/**
 * Create JSON response
 */
function createJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Check if write API is configured
 */
function isWriteApiConfigured_() {
  return WRITE_API_TOKEN && WRITE_API_TOKEN !== 'REPLACE_WITH_SECURE_TOKEN';
}

/**
 * Collect day numbers for jurisdiction
 */
function collectDayNumbersForJurisdiction_(entries, jurisdiction) {
  return entries
    .filter(entry => {
      if (!entry || !entry.country) return false;
      switch (jurisdiction) {
        case 'US':
          return isUSOrContiguous_(entry.country);
        case 'US365':
          return normalizeCountryName(entry.country) === normalizeCountryName('United States');
        case 'SCHENGEN':
          return isSchengenCountry(entry.country);
        case 'UK':
          return normalizeCountryName(entry.country) === normalizeCountryName('United Kingdom');
        default:
          return false;
      }
    })
    .map(entry => entry.dayNumber)
    .sort((a, b) => a - b);
}

/**
 * Count numbers in window
 */
function countNumbersInWindow_(sortedNumbers, windowStart, windowEnd) {
  if (!Array.isArray(sortedNumbers) || sortedNumbers.length === 0) return 0;
  let startIndex = 0;
  while (startIndex < sortedNumbers.length && sortedNumbers[startIndex] < windowStart) {
    startIndex++;
  }
  let count = 0;
  for (let i = startIndex; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] > windowEnd) break;
    count++;
  }
  return count;
}


