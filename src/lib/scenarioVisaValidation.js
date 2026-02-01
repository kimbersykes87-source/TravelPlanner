/**
 * Scenario visa validation – full logic ported from TravelPlanner v1.
 * Merges relationship_log (history) + scenario stays, computes remaining at scenario end.
 * Uses parseLocalDate for consistent date handling.
 */
import { parseLocalDate } from './dates';

const DEFAULT_VISA_RULES = [
  { ruleId: 'US-ADMISSION', jurisdiction: 'US', windowDays: 90, maxDays: 90, contiguousTerritory: true },
  { ruleId: 'US-ROLLING365', jurisdiction: 'US365', windowDays: 365, maxDays: 180, contiguousTerritory: false },
  { ruleId: 'UK-TAX', jurisdiction: 'UK', windowDays: 365, maxDays: 120, contiguousTerritory: false },
  { ruleId: 'SCHENGEN-ROLLING', jurisdiction: 'SCHENGEN', windowDays: 180, maxDays: 90, contiguousTerritory: false },
];

const SCHENGEN_COUNTRIES = [
  'austria', 'belgium', 'croatia', 'czech republic', 'czechia', 'denmark', 'estonia', 'finland', 'france',
  'germany', 'greece', 'hungary', 'iceland', 'italy', 'latvia', 'liechtenstein', 'lithuania', 'luxembourg',
  'malta', 'monaco', 'netherlands', 'norway', 'poland', 'portugal', 'san marino', 'slovakia', 'slovenia',
  'spain', 'sweden', 'switzerland', 'vatican city',
];

const US_CONTIGUOUS = ['united states', 'united states of america', 'usa', 'us', 'canada', 'mexico'];
const UK_NAMES = ['united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'];

function norm(name) {
  return (name || '').trim().toLowerCase();
}

function normalizeCountryName(country) {
  const c = norm(country);
  if (!c) return '';
  if (['usa', 'us', 'america', 'united states'].some((a) => c === a || c.includes(a))) return 'united states';
  if (['uk', 'england', 'scotland', 'wales', 'great britain', 'britain'].some((a) => c === a || c.includes(a))) return 'united kingdom';
  return c;
}

function isUSOrContiguous(country) {
  const c = normalizeCountryName(country);
  return US_CONTIGUOUS.some((a) => c === a || c.includes(a) || a.includes(c));
}

function isSchengenCountry(country) {
  const c = norm(country);
  return SCHENGEN_COUNTRIES.some((s) => c === s || c.includes(s) || s.includes(c));
}

function isUsOnly(country) {
  const c = normalizeCountryName(country);
  return c === 'united states' || c.includes('united states');
}

function isUk(country) {
  const c = norm(country);
  return UK_NAMES.some((a) => c === a || c.includes(a));
}

function getDayNumber(dateStr) {
  if (!dateStr) return NaN;
  const d = parseLocalDate(typeof dateStr === 'string' ? dateStr : String(dateStr).slice(0, 10));
  if (!d || isNaN(d.getTime())) return NaN;
  return Math.floor(d.getTime() / (24 * 60 * 60 * 1000));
}

function dayNumberToDate(dayNum) {
  const d = new Date(dayNum * 24 * 60 * 60 * 1000);
  d.setHours(0, 0, 0, 0);
  return d;
}

function loadVisaRules(visaRulesFromDb) {
  if (!visaRulesFromDb?.length) return DEFAULT_VISA_RULES;
  return visaRulesFromDb.map((r) => ({
    ruleId: r.rule_id || r.jurisdiction,
    jurisdiction: (r.jurisdiction || '').toUpperCase(),
    windowDays: r.window_days ?? DEFAULT_VISA_RULES.find((d) => (d.jurisdiction || '').toUpperCase().includes((r.jurisdiction || '').toUpperCase()))?.windowDays ?? 180,
    maxDays: r.max_days ?? DEFAULT_VISA_RULES.find((d) => (d.jurisdiction || '').toUpperCase().includes((r.jurisdiction || '').toUpperCase()))?.maxDays ?? 90,
    contiguousTerritory: !!r.contiguous_territory,
  }));
}

function buildHistoryEntries(relationshipLog, profileId) {
  const col = profileId === 'siona' ? 'siona_country' : 'kimber_country';
  const entries = [];
  for (const row of relationshipLog || []) {
    const dateIso = row.date ? String(row.date).slice(0, 10) : '';
    const country = row[col] || '';
    if (!dateIso || !country) continue;
    const dayNumber = getDayNumber(dateIso);
    if (!Number.isFinite(dayNumber)) continue;
    entries.push({ date: dateIso, dayNumber, country, source: 'history' });
  }
  entries.sort((a, b) => a.dayNumber - b.dayNumber);
  return entries;
}

function buildScenarioEntriesByProfile(stays) {
  const byProfile = { kimber: [], siona: [] };
  for (const stay of stays || []) {
    const profiles = (stay.profile_scope || stay.profileScope || 'both').toLowerCase() === 'both' ? ['kimber', 'siona'] : [(stay.profile_scope || stay.profileScope || 'kimber').toLowerCase()];
    const startDate = stay.start_date || stay.startDate || '';
    const endDate = stay.end_date || stay.endDate || startDate;
    const startDay = getDayNumber(startDate);
    const endDay = getDayNumber(endDate);
    if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) continue;
    for (let day = startDay; day <= endDay; day++) {
      const d = dayNumberToDate(day);
      const iso = d.toISOString().slice(0, 10);
      for (const p of profiles) {
        if (byProfile[p]) byProfile[p].push({ date: iso, dayNumber: day, country: stay.country || '', source: 'scenario' });
      }
    }
  }
  byProfile.kimber.sort((a, b) => a.dayNumber - b.dayNumber);
  byProfile.siona.sort((a, b) => a.dayNumber - b.dayNumber);
  return byProfile;
}

function mergeHistoryAndScenarioEntries(historyEntries, scenarioEntries) {
  const map = new Map();
  for (const e of historyEntries || []) map.set(e.date, e);
  for (const e of scenarioEntries || []) map.set(e.date, e);
  return [...map.values()].sort((a, b) => a.dayNumber - b.dayNumber);
}

function collectDayNumbersForJurisdiction(entries, jurisdiction) {
  return (entries || [])
    .filter((e) => {
      if (!e?.country) return false;
      switch (jurisdiction) {
        case 'US': return isUSOrContiguous(e.country);
        case 'US365': return isUsOnly(e.country);
        case 'SCHENGEN': return isSchengenCountry(e.country);
        case 'UK': return isUk(e.country);
        default: return false;
      }
    })
    .map((e) => e.dayNumber)
    .sort((a, b) => a - b);
}

function filterMergedEntriesForESTA(mergedEntries, scenarioEntries) {
  const scenarioByDay = new Map();
  for (const e of scenarioEntries || []) {
    if (e?.dayNumber != null && e?.country) scenarioByDay.set(e.dayNumber, e.country);
  }
  return (mergedEntries || []).filter((entry) => {
    if (!entry?.country) return false;
    if (entry.source === 'history') return isUSOrContiguous(entry.country);
    if (entry.source === 'scenario') {
      if (isUsOnly(entry.country)) return true;
      if (normalizeCountryName(entry.country) === 'canada' || normalizeCountryName(entry.country) === 'mexico') {
        const prev = scenarioByDay.get(entry.dayNumber - 1);
        const next = scenarioByDay.get(entry.dayNumber + 1);
        return isUsOnly(prev) || isUsOnly(next);
      }
    }
    return false;
  });
}

function analyzeUSAdmissions(entries, referenceDayNumber, limit) {
  const dayLengths = new Map();
  const blocks = [];
  let current = null;
  for (const e of entries || []) {
    if (!isUSOrContiguous(e.country)) {
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    if (!current) {
      current = { startDay: e.dayNumber, endDay: e.dayNumber, days: [e.dayNumber] };
    } else if (e.dayNumber === current.endDay + 1) {
      current.endDay = e.dayNumber;
      current.days.push(e.dayNumber);
    } else {
      blocks.push(current);
      current = { startDay: e.dayNumber, endDay: e.dayNumber, days: [e.dayNumber] };
    }
  }
  if (current) blocks.push(current);
  let maxLength = 0;
  let violationDay = null;
  let todayLength = 0;
  for (const b of blocks) {
    const len = b.days.length;
    if (len > maxLength) maxLength = len;
    if (len > limit && violationDay == null) violationDay = b.startDay;
    for (const d of b.days) {
      dayLengths.set(d, len);
      if (d === referenceDayNumber) todayLength = len;
    }
  }
  return { dayLengths, maxLength, todayLength, violationDay };
}

function analyzeRollingWindow(dayNumbers, windowDays, limit) {
  const countsByDay = new Map();
  let maxCount = 0;
  let violationDay = null;
  let left = 0;
  const sorted = [...(dayNumbers || [])].sort((a, b) => a - b);
  for (let right = 0; right < sorted.length; right++) {
    const currentDay = sorted[right];
    while (left <= right && currentDay - sorted[left] >= windowDays) left++;
    const count = right - left + 1;
    countsByDay.set(currentDay, count);
    if (count > maxCount) maxCount = count;
    if (violationDay == null && count > limit) violationDay = currentDay;
  }
  return { countsByDay, maxCount, violationDay };
}

function getTaxYearStartDay(dayNumber) {
  const d = dayNumberToDate(dayNumber);
  const year = d.getFullYear();
  const apr6 = new Date(year, 3, 6);
  apr6.setHours(0, 0, 0, 0);
  const apr6Day = Math.floor(apr6.getTime() / (24 * 60 * 60 * 1000));
  if (dayNumber >= apr6Day) return apr6Day;
  const prevApr6 = new Date(year - 1, 3, 6);
  prevApr6.setHours(0, 0, 0, 0);
  return Math.floor(prevApr6.getTime() / (24 * 60 * 60 * 1000));
}

function analyzeUKTax(dayNumbers, limit) {
  const countsByDay = new Map();
  const maxCountByTaxYear = new Map();
  let violationDay = null;
  const sorted = [...(dayNumbers || [])].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const currentDay = sorted[i];
    const taxYearStart = getTaxYearStartDay(currentDay);
    let count = 0;
    for (let j = i; j >= 0; j--) {
      if (sorted[j] < taxYearStart) break;
      count++;
    }
    countsByDay.set(currentDay, count);
    const prev = maxCountByTaxYear.get(taxYearStart) || 0;
    if (count > prev) maxCountByTaxYear.set(taxYearStart, count);
    if (violationDay == null && count > limit) violationDay = currentDay;
  }
  const maxCount = Math.max(0, ...maxCountByTaxYear.values());
  return { countsByDay, maxCount, violationDay, maxCountByTaxYear };
}

/**
 * Validate scenario visa rules. Returns breakdown with remaining days at scenario end.
 * @param {Object} scenario - { scenario_id, start_date, end_date }
 * @param {Array} stays - [{ start_date, end_date, country, profile_scope }]
 * @param {Array} relationshipLog - from Supabase
 * @param {Array} visaRules - from Supabase (optional)
 * @returns {{ errors: string[], warnings: string[], breakdown: Array }}
 */
export function validateScenarioVisaRules(scenario, stays, relationshipLog, visaRulesFromDb = []) {
  const rules = loadVisaRules(visaRulesFromDb);
  const errors = [];
  const warnings = [];
  const breakdown = [];

  const scenarioStartDate = stays?.length && stays[0]?.start_date ? stays[0].start_date : (scenario?.start_date || '');
  const scenarioStartDayNumber = getDayNumber(scenarioStartDate);

  if (!Number.isFinite(scenarioStartDayNumber)) {
    errors.push('Scenario must have a valid start date.');
    return { errors, warnings, breakdown };
  }

  const scenarioEntriesByProfile = buildScenarioEntriesByProfile(stays);

  for (const profileId of ['kimber', 'siona']) {
    const historyEntries = buildHistoryEntries(relationshipLog, profileId);
    const scenarioEntries = scenarioEntriesByProfile[profileId] || [];

    const historyUpToScenarioStart = historyEntries.filter((e) => {
      const d = getDayNumber(e.date);
      return Number.isFinite(d) && d < scenarioStartDayNumber;
    });

    const dayBefore = scenarioStartDayNumber - 1;
    const dayBeforeEntry = historyEntries.find((e) => getDayNumber(e.date) === dayBefore);
    const dayBeforeIsUS = dayBeforeEntry && (isUsOnly(dayBeforeEntry.country));

    const estaBaselineEntries = dayBeforeIsUS
      ? historyUpToScenarioStart.filter((e) => getDayNumber(e.date) !== dayBefore)
      : historyUpToScenarioStart;

    const mergedEntries = mergeHistoryAndScenarioEntries(historyEntries, scenarioEntries);

    const ruleSchengen = rules.find((r) => (r.ruleId || '').includes('SCHENGEN') || (r.jurisdiction || '').includes('SCHENGEN')) || DEFAULT_VISA_RULES[3];
    const ruleUS365 = rules.find((r) => (r.ruleId || '').includes('US-ROLLING') || (r.jurisdiction || '').includes('US365')) || DEFAULT_VISA_RULES[1];

    const historyForSchengenBaseline = historyEntries.filter((e) => {
      const d = getDayNumber(e.date);
      return Number.isFinite(d) && d >= scenarioStartDayNumber - ruleSchengen.windowDays && d < scenarioStartDayNumber;
    });
    const historyForUS365Baseline = historyEntries.filter((e) => {
      const d = getDayNumber(e.date);
      return Number.isFinite(d) && d >= scenarioStartDayNumber - ruleUS365.windowDays && d < scenarioStartDayNumber;
    });

    const historyByJurisdiction = {
      US: collectDayNumbersForJurisdiction(historyUpToScenarioStart, 'US'),
      US365: collectDayNumbersForJurisdiction(historyForUS365Baseline, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction(historyForSchengenBaseline, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction(historyUpToScenarioStart, 'UK'),
    };

    const estaFilteredEntries = filterMergedEntriesForESTA(mergedEntries, scenarioEntries);
    const projectedByJurisdiction = {
      US: collectDayNumbersForJurisdiction(estaFilteredEntries, 'US'),
      US365: collectDayNumbersForJurisdiction(mergedEntries, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction(mergedEntries, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction(mergedEntries, 'UK'),
    };

    const hasUSDays = scenarioEntries.some((e) => isUsOnly(e.country));
    const hasSchengenDays = scenarioEntries.some((e) => isSchengenCountry(e.country));
    const hasUKDays = scenarioEntries.some((e) => isUk(e.country));

    const scenarioEndDayNumber = scenarioEntries.length ? Math.max(...scenarioEntries.map((e) => e.dayNumber)) : scenarioStartDayNumber;

    if (profileId === 'kimber' && hasUSDays) {
      const rule = rules.find((r) => (r.ruleId || '').includes('US-ADMISSION') || (r.jurisdiction || '').includes('US')) || DEFAULT_VISA_RULES[0];
      let baselineAdmissionLength = 0;
      if (!dayBeforeIsUS) {
        const scenarioStartEntryFromHistory = historyUpToScenarioStart.find((e) => getDayNumber(e.date) === scenarioStartDayNumber);
        const scenarioStartEntryFromScenario = scenarioEntries.find((e) => getDayNumber(e.date) === scenarioStartDayNumber);
        const scenarioStartIsUS = (scenarioStartEntryFromHistory && isUSOrContiguous(scenarioStartEntryFromHistory.country)) ||
          (scenarioStartEntryFromScenario && isUSOrContiguous(scenarioStartEntryFromScenario.country));
        if (scenarioStartIsUS && scenarioStartEntryFromHistory) {
          const baseline = analyzeUSAdmissions(estaBaselineEntries, scenarioStartDayNumber, rule.maxDays);
          baselineAdmissionLength = baseline.dayLengths.get(scenarioStartDayNumber) || 0;
        }
      }
      const projectedEntries = dayBeforeIsUS ? estaFilteredEntries.filter((e) => getDayNumber(e.date) !== dayBefore) : estaFilteredEntries;
      const projected = analyzeUSAdmissions(projectedEntries, scenarioStartDayNumber, rule.maxDays);
      const projectedLengthAtEnd = projected.dayLengths.get(scenarioEndDayNumber) || 0;
      const remaining = rule.maxDays - projectedLengthAtEnd;
      if (projected.maxLength > rule.maxDays) {
        errors.push(`Kimber would exceed US ESTA 90-day limit (${projected.maxLength}/${rule.maxDays}).`);
      }
      breakdown.push({ profileId, ruleId: 'US-ADMISSION', label: 'Kimber – US ESTA', baseline: baselineAdmissionLength, projected: projected.maxLength, limit: rule.maxDays, remaining, status: projected.maxLength > rule.maxDays ? 'error' : 'ok' });
    }

    if (profileId === 'siona' && hasUSDays) {
      const rule = rules.find((r) => (r.ruleId || '').includes('US-ROLLING') || (r.jurisdiction || '').includes('US365')) || DEFAULT_VISA_RULES[1];
      const projected = analyzeRollingWindow(projectedByJurisdiction.US365, rule.windowDays, rule.maxDays);
      const us365BeforeEnd = (projectedByJurisdiction.US365 || []).filter((d) => d <= scenarioEndDayNumber);
      const maxUs365BeforeEnd = us365BeforeEnd.length ? Math.max(...us365BeforeEnd) : null;
      const projectedCountAtEnd = maxUs365BeforeEnd != null ? (projected.countsByDay.get(maxUs365BeforeEnd) ?? 0) : 0;
      const remaining = rule.maxDays - projectedCountAtEnd;
      if (projected.maxCount > rule.maxDays) errors.push(`Siona would exceed US B1/B2 365-day limit (${projected.maxCount}/${rule.maxDays}).`);
      breakdown.push({ profileId, ruleId: 'US-ROLLING365', label: 'Siona – US B1/B2', baseline: historyByJurisdiction.US365.length, projected: projected.maxCount, limit: rule.maxDays, remaining, status: projected.maxCount > rule.maxDays ? 'error' : 'ok' });
    }

    if (hasSchengenDays) {
      const rule = rules.find((r) => (r.ruleId || '').includes('SCHENGEN') || (r.jurisdiction || '').includes('SCHENGEN')) || DEFAULT_VISA_RULES[3];
      const projected = analyzeRollingWindow(projectedByJurisdiction.SCHENGEN, rule.windowDays, rule.maxDays);
      const schengenBeforeEnd = (projectedByJurisdiction.SCHENGEN || []).filter((d) => d <= scenarioEndDayNumber);
      const maxSchengenBeforeEnd = schengenBeforeEnd.length ? Math.max(...schengenBeforeEnd) : null;
      const projectedCountAtEnd = maxSchengenBeforeEnd != null ? (projected.countsByDay.get(maxSchengenBeforeEnd) ?? 0) : 0;
      const remaining = rule.maxDays - projectedCountAtEnd;
      if (projected.maxCount > rule.maxDays) errors.push(`${profileId === 'kimber' ? 'Kimber' : 'Siona'} would exceed Schengen limit (${projected.maxCount}/${rule.maxDays}).`);
      breakdown.push({ profileId, ruleId: 'SCHENGEN-ROLLING', label: `${profileId === 'kimber' ? 'Kimber' : 'Siona'} – Schengen`, baseline: historyByJurisdiction.SCHENGEN.length, projected: projected.maxCount, limit: rule.maxDays, remaining, status: projected.maxCount > rule.maxDays ? 'error' : 'ok' });
    }

    if (hasUKDays) {
      const rule = rules.find((r) => (r.ruleId || '').includes('UK') || (r.jurisdiction || '').includes('UK')) || DEFAULT_VISA_RULES[2];
      const scenarioEndTaxYearStart = getTaxYearStartDay(scenarioEndDayNumber);
      const projected = analyzeUKTax(projectedByJurisdiction.UK, rule.maxDays);
      const ukDaysBeforeEnd = (projectedByJurisdiction.UK || []).filter((d) => d <= scenarioEndDayNumber);
      const maxUkDayBeforeEnd = ukDaysBeforeEnd.length ? Math.max(...ukDaysBeforeEnd) : null;
      const projectedCountAtEnd = maxUkDayBeforeEnd != null ? (projected.countsByDay.get(maxUkDayBeforeEnd) || 0) : 0;
      const remaining = rule.maxDays - projectedCountAtEnd;
      const hasViolation = (projected.maxCountByTaxYear?.get(scenarioEndTaxYearStart) || 0) > rule.maxDays;
      if (hasViolation) errors.push(`${profileId === 'kimber' ? 'Kimber' : 'Siona'} would exceed UK tax-year limit.`);
      breakdown.push({ profileId, ruleId: 'UK-TAX', label: `${profileId === 'kimber' ? 'Kimber' : 'Siona'} – UK tax`, baseline: historyByJurisdiction.UK.length, projected: projectedCountAtEnd, limit: rule.maxDays, remaining, status: hasViolation ? 'error' : 'ok' });
    }
  }

  return { errors, warnings, breakdown };
}

/**
 * Get Schengen and/or USA remaining for scenario card display.
 * Returns { schengenRemaining: number|null, usaRemaining: number|null }
 * Uses the most restrictive (lowest remaining) across profiles when both travel.
 */
export function getVisaRemainingForCard(scenario, stays, relationshipLog, visaRules) {
  const { breakdown } = validateScenarioVisaRules(scenario, stays, relationshipLog, visaRules);
  let schengenRemaining = null;
  let usaRemaining = null;

  const hasSchengen = breakdown.some((b) => (b.ruleId || '').includes('SCHENGEN'));
  const hasUs = breakdown.some((b) => (b.ruleId || '').includes('US-ADMISSION') || (b.ruleId || '').includes('US-ROLLING'));

  if (hasSchengen && !hasUs) {
    const schengenRows = breakdown.filter((b) => (b.ruleId || '').includes('SCHENGEN'));
    schengenRemaining = Math.min(...schengenRows.map((r) => r.remaining ?? Infinity));
    if (schengenRemaining === Infinity) schengenRemaining = null;
  }
  if (hasUs && !hasSchengen) {
    const usRows = breakdown.filter((b) => (b.ruleId || '').includes('US-ADMISSION') || (b.ruleId || '').includes('US-ROLLING'));
    usaRemaining = Math.min(...usRows.map((r) => r.remaining ?? Infinity));
    if (usaRemaining === Infinity) usaRemaining = null;
  }

  return { schengenRemaining, usaRemaining };
}
