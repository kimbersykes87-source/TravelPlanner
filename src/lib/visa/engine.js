/**
 * Visa and residency day-counting engine.
 *
 * One implementation shared by the Us tab (status today) and the Future
 * scenario Visa Check (what-if projections), so the two can never disagree.
 *
 * Input is the daily RelationshipLog (one row per date with kimber_country /
 * siona_country). Blank countries are treated as "not logged".
 */
import { toDayNumber, fromDayNumber, todayDayNumber, ukTaxYearBounds } from './days';
import { isUsSoil, isEstaContiguous, isSchengen, isUk } from './jurisdictions';

export const PEOPLE = ['kimber', 'siona'];

export const DEFAULT_RULES = {
  'US-ADMISSION': { ruleId: 'US-ADMISSION', label: 'US ESTA', windowDays: null, maxDays: 90 },
  'US-ROLLING365': { ruleId: 'US-ROLLING365', label: 'US B1/B2', windowDays: 365, maxDays: 180 },
  'SCHENGEN-ROLLING': { ruleId: 'SCHENGEN-ROLLING', label: 'Schengen', windowDays: 180, maxDays: 90 },
  'UK-TAX': { ruleId: 'UK-TAX', label: 'UK tax days', windowDays: null, maxDays: 120 },
  'UK-WORK': { ruleId: 'UK-WORK', label: 'UK work days', windowDays: null, maxDays: 39 },
};

/** Days of headroom below which a tile turns amber. */
export const WARNING_THRESHOLD = {
  'US-ADMISSION': 14,
  'US-ROLLING365': 30,
  'SCHENGEN-ROLLING': 14,
  'UK-TAX': 15,
  'UK-WORK': 5,
};

/** Which US rule applies to whom: Kimber travels on an ESTA, Siona on a 10-year B1/B2. */
export const US_RULE_FOR = { kimber: 'US-ADMISSION', siona: 'US-ROLLING365' };

/** Merge the VisaRules sheet over the defaults (matched on RuleID). */
export function resolveRules(visaRulesFromDb = []) {
  const rules = structuredClone(DEFAULT_RULES);
  for (const row of visaRulesFromDb || []) {
    const id = String(row?.rule_id || '').trim().toUpperCase();
    if (!rules[id]) continue;
    if (Number.isFinite(row.window_days) && row.window_days > 0) rules[id].windowDays = row.window_days;
    if (Number.isFinite(row.max_days) && row.max_days > 0) rules[id].maxDays = row.max_days;
  }
  return rules;
}

const countryKey = (person) => (person === 'siona' ? 'siona_country' : 'kimber_country');
const workKey = (person) => (person === 'siona' ? 'ss_uk_work_days' : 'ks_uk_work_days');

/** Map<dayNumber, country> for one person, skipping blank days. */
export function buildPresence(relationshipLog, person) {
  const presence = new Map();
  const col = countryKey(person);
  for (const row of relationshipLog || []) {
    const day = toDayNumber(row?.date);
    const country = String(row?.[col] ?? '').trim();
    if (Number.isFinite(day) && country) presence.set(day, country);
  }
  return presence;
}

/** Set<dayNumber> of days flagged as UK work days for one person. */
export function buildWorkDays(relationshipLog, person) {
  const days = new Set();
  const col = workKey(person);
  for (const row of relationshipLog || []) {
    const day = toDayNumber(row?.date);
    const flag = String(row?.[col] ?? '').trim().toLowerCase();
    if (Number.isFinite(day) && (flag === 'yes' || flag === 'y' || flag === 'true')) days.add(day);
  }
  return days;
}

function lastLoggedOnOrBefore(presence, day) {
  let best = null;
  for (const d of presence.keys()) if (d <= day && (best == null || d > best)) best = d;
  return best;
}

const inUsArea = (country) => isUsSoil(country) || isEstaContiguous(country);

/**
 * ESTA admission blocks: runs of consecutive days in the US or contiguous
 * territory that include at least one day on US soil. The 90-day clock starts
 * on the first US day and keeps running through Canada/Mexico/Caribbean
 * side trips; it is violated if you are on US soil after day 90.
 */
export function estaBlocks(presence) {
  const days = [...presence.keys()].sort((a, b) => a - b);
  const blocks = [];
  let run = null;
  const flush = () => {
    if (!run) return;
    const us = run.days.filter((d) => isUsSoil(presence.get(d)));
    if (us.length) {
      blocks.push({
        runStart: run.days[0],
        runEnd: run.days[run.days.length - 1],
        firstUs: us[0],
        lastUs: us[us.length - 1],
        length: us[us.length - 1] - us[0] + 1,
      });
    }
    run = null;
  };
  for (const d of days) {
    if (!inUsArea(presence.get(d))) { flush(); continue; }
    if (run && d === run.days[run.days.length - 1] + 1) run.days.push(d);
    else { flush(); run = { days: [d] }; }
  }
  flush();
  return blocks;
}

/** Current ESTA position for Kimber. */
export function estaStatus(relationshipLog, { today = todayDayNumber(), rules = DEFAULT_RULES, person = 'kimber' } = {}) {
  const limit = rules['US-ADMISSION'].maxDays;
  const presence = buildPresence(relationshipLog, person);
  const blocks = estaBlocks(presence);
  const current = blocks.find((b) => b.firstUs <= today && b.runEnd >= today)
    // Log not filled in for today yet: fall back to the latest logged day.
    || (() => {
      const last = lastLoggedOnOrBefore(presence, today);
      return last == null ? null : blocks.find((b) => b.firstUs <= last && b.runEnd === last) || null;
    })();

  if (current) {
    const countedTo = Math.min(today, current.runEnd);
    const daysUsed = countedTo - current.firstUs + 1;
    return {
      inAdmission: true,
      admissionStart: fromDayNumber(current.firstUs),
      daysUsed,
      remaining: Math.max(0, limit - daysUsed),
      mustLeaveBy: fromDayNumber(current.firstUs + limit - 1),
      plannedExit: current.lastUs > today ? fromDayNumber(current.lastUs) : null,
      plannedLength: current.length,
      plannedOverLimit: current.length > limit,
      limit,
    };
  }

  const past = blocks.filter((b) => b.lastUs <= today).pop() || null;
  const next = blocks.find((b) => b.firstUs > today) || null;
  return {
    inAdmission: false,
    daysUsed: 0,
    remaining: limit,
    limit,
    lastAdmission: past && { start: fromDayNumber(past.firstUs), end: fromDayNumber(past.lastUs), days: past.length },
    nextEntry: next && {
      start: fromDayNumber(next.firstUs),
      end: fromDayNumber(next.lastUs),
      days: next.length,
      overLimit: next.length > limit,
    },
  };
}

/**
 * Count matching days in every rolling window.
 * Window ending on day d covers [d - windowDays + 1, d].
 */
function windowCounter(matchingDays, windowDays) {
  const sorted = [...matchingDays].sort((a, b) => a - b);
  return (endDay) => {
    const startDay = endDay - windowDays + 1;
    let n = 0;
    for (const d of sorted) {
      if (d > endDay) break;
      if (d >= startDay) n++;
    }
    return n;
  };
}

function matchingDaysFor(presence, predicate) {
  const out = [];
  for (const [d, c] of presence) if (predicate(c)) out.push(d);
  return out.sort((a, b) => a - b);
}

/** Rolling-window rule status (Schengen 90/180, B1/B2 180/365 guide). */
export function rollingStatus(relationshipLog, person, ruleId, { today = todayDayNumber(), rules = DEFAULT_RULES } = {}) {
  const rule = rules[ruleId];
  const predicate = ruleId === 'SCHENGEN-ROLLING' ? isSchengen : isUsSoil;
  const presence = buildPresence(relationshipLog, person);
  const days = matchingDaysFor(presence, predicate);
  const count = windowCounter(days, rule.windowDays);
  const used = count(today);
  const lastDay = days.filter((d) => d <= today).pop();

  // Look ahead through planned (future) log entries for the first breach.
  let breachOn = null;
  let peak = used;
  for (const d of days) {
    if (d <= today) continue;
    const c = count(d);
    if (c > peak) peak = c;
    if (c > rule.maxDays && breachOn == null) breachOn = d;
  }

  return {
    used,
    remaining: Math.max(0, rule.maxDays - used),
    limit: rule.maxDays,
    windowDays: rule.windowDays,
    fullyClearsOn: lastDay != null && lastDay + rule.windowDays > today ? fromDayNumber(lastDay + rule.windowDays) : null,
    plannedPeak: peak,
    plannedBreachOn: breachOn != null ? fromDayNumber(breachOn) : null,
  };
}

/** UK tax-year counts (6 Apr to 5 Apr): days in the UK and flagged UK work days. */
export function ukTaxYearStatus(relationshipLog, person, { today = todayDayNumber(), rules = DEFAULT_RULES } = {}) {
  const { start, end } = ukTaxYearBounds(today);
  const presence = buildPresence(relationshipLog, person);
  const work = buildWorkDays(relationshipLog, person);
  let ukUsed = 0;
  let ukPlanned = 0;
  for (const [d, c] of presence) {
    if (d < start || d > end || !isUk(c)) continue;
    if (d <= today) ukUsed++;
    else ukPlanned++;
  }
  let workUsed = 0;
  let workPlanned = 0;
  for (const d of work) {
    if (d < start || d > end) continue;
    if (d <= today) workUsed++;
    else workPlanned++;
  }
  const dayLimit = rules['UK-TAX'].maxDays;
  const workLimit = rules['UK-WORK'].maxDays;
  return {
    taxYearStart: fromDayNumber(start),
    taxYearEnd: fromDayNumber(end),
    days: {
      used: ukUsed,
      planned: ukPlanned,
      limit: dayLimit,
      remaining: Math.max(0, dayLimit - ukUsed),
      remainingAfterPlans: dayLimit - ukUsed - ukPlanned,
    },
    work: {
      used: workUsed,
      planned: workPlanned,
      limit: workLimit,
      remaining: Math.max(0, workLimit - workUsed),
      remainingAfterPlans: workLimit - workUsed - workPlanned,
      /** More than the limit (40+ days) creates a UK work tie. */
      tieTriggered: workUsed > workLimit,
    },
  };
}

/** Everything the Us tab needs for one person. */
export function personVisaSummary(relationshipLog, person, { today = todayDayNumber(), visaRules = [] } = {}) {
  const rules = resolveRules(visaRules);
  const opts = { today, rules };
  return {
    uk: ukTaxYearStatus(relationshipLog, person, opts),
    schengen: rollingStatus(relationshipLog, person, 'SCHENGEN-ROLLING', opts),
    usEsta: US_RULE_FOR[person] === 'US-ADMISSION' ? estaStatus(relationshipLog, { ...opts, person }) : null,
    usB1B2: US_RULE_FOR[person] === 'US-ROLLING365' ? rollingStatus(relationshipLog, person, 'US-ROLLING365', opts) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Scenario projections                                                */
/* ------------------------------------------------------------------ */

function scopeToPeople(scope) {
  const s = String(scope || 'both').trim().toLowerCase();
  if (s === 'kimber') return ['kimber'];
  if (s === 'siona') return ['siona'];
  return ['kimber', 'siona'];
}

/** Scenario stays -> { kimber: Map<day,country>, siona: Map<day,country> } */
export function scenarioPresence(stays) {
  const out = { kimber: new Map(), siona: new Map() };
  for (const stay of stays || []) {
    const start = toDayNumber(stay?.start_date ?? stay?.startDate);
    const endRaw = toDayNumber(stay?.end_date ?? stay?.endDate);
    const end = Number.isFinite(endRaw) ? endRaw : start;
    const country = String(stay?.country ?? '').trim();
    if (!Number.isFinite(start) || !country || end < start) continue;
    for (const p of scopeToPeople(stay.profile_scope ?? stay.profileScope)) {
      for (let d = start; d <= end; d++) out[p].set(d, country);
    }
  }
  return out;
}

const NAME = { kimber: 'Kimber', siona: 'Siona' };

/**
 * Project a scenario on top of the log and check every relevant rule.
 * Scenario stays replace whatever the log says for those dates.
 * Returns { errors, warnings, breakdown[] } where each breakdown row is
 * { profileId, ruleId, label, baseline, projected, limit, remaining, status }.
 */
export function validateScenario(stays, relationshipLog, visaRules = []) {
  const rules = resolveRules(visaRules);
  const errors = [];
  const warnings = [];
  const breakdown = [];
  const planned = scenarioPresence(stays);

  for (const person of PEOPLE) {
    const scenarioDays = [...planned[person].keys()].sort((a, b) => a - b);
    if (!scenarioDays.length) continue;
    const start = scenarioDays[0];
    const end = scenarioDays[scenarioDays.length - 1];
    const merged = buildPresence(relationshipLog, person);
    for (const [d, c] of planned[person]) merged.set(d, c);
    const scenarioCountries = [...planned[person].values()];
    const who = NAME[person];

    const push = (row) => {
      const threshold = WARNING_THRESHOLD[row.ruleId] ?? 0;
      row.status = row.projected > row.limit ? 'error' : row.remaining <= threshold ? 'warning' : 'ok';
      if (row.status === 'error') errors.push(`${who} would exceed the ${row.label} limit (${row.projected}/${row.limit}).`);
      else if (row.status === 'warning') warnings.push(`${who} would be within ${row.remaining} days of the ${row.label} limit.`);
      breakdown.push({ profileId: person, ...row, label: `${who}: ${row.label}` });
    };

    // US
    if (scenarioCountries.some(isUsSoil)) {
      const ruleId = US_RULE_FOR[person];
      const rule = rules[ruleId];
      if (ruleId === 'US-ADMISSION') {
        const blocks = estaBlocks(merged).filter((b) => b.lastUs >= start && b.firstUs <= end);
        const projected = Math.max(0, ...blocks.map((b) => b.length));
        const baseline = Math.max(0, ...blocks.map((b) => (b.firstUs < start ? start - b.firstUs : 0)));
        push({ ruleId, label: rule.label, baseline, projected, limit: rule.maxDays, remaining: rule.maxDays - projected });
      } else {
        const count = windowCounter(matchingDaysFor(merged, isUsSoil), rule.windowDays);
        let projected = 0;
        for (let d = start; d <= end; d++) projected = Math.max(projected, count(d));
        push({ ruleId, label: rule.label, baseline: count(start - 1), projected, limit: rule.maxDays, remaining: rule.maxDays - count(end) });
      }
    }

    // Schengen
    if (scenarioCountries.some(isSchengen)) {
      const rule = rules['SCHENGEN-ROLLING'];
      const count = windowCounter(matchingDaysFor(merged, isSchengen), rule.windowDays);
      let projected = 0;
      for (let d = start; d <= end; d++) projected = Math.max(projected, count(d));
      push({ ruleId: rule.ruleId, label: rule.label, baseline: count(start - 1), projected, limit: rule.maxDays, remaining: rule.maxDays - count(end) });
    }

    // UK tax year(s) touched by the scenario
    if (scenarioCountries.some(isUk)) {
      const rule = rules['UK-TAX'];
      const ukDays = matchingDaysFor(merged, isUk);
      const endYear = ukTaxYearBounds(end);
      let projected = 0;
      for (let y = ukTaxYearBounds(start); y.start <= endYear.start; y = ukTaxYearBounds(y.end + 1)) {
        projected = Math.max(projected, ukDays.filter((d) => d >= y.start && d <= y.end).length);
      }
      const inEndYear = ukDays.filter((d) => d >= endYear.start && d <= endYear.end);
      push({
        ruleId: rule.ruleId,
        label: rule.label,
        baseline: inEndYear.filter((d) => d < start).length,
        projected,
        limit: rule.maxDays,
        remaining: rule.maxDays - inEndYear.length,
      });
    }
  }

  return { errors, warnings, breakdown };
}

/**
 * Tightest remaining days for the scenario card badges.
 * Returns { schengenRemaining, usaRemaining, breakdown, errors, warnings };
 * the remaining values are null when the rule does not apply.
 */
export function scenarioRemaining(stays, relationshipLog, visaRules = []) {
  const { breakdown, errors, warnings } = validateScenario(stays, relationshipLog, visaRules);
  const min = (rows) => (rows.length ? Math.min(...rows.map((r) => r.remaining)) : null);
  return {
    schengenRemaining: min(breakdown.filter((b) => b.ruleId === 'SCHENGEN-ROLLING')),
    usaRemaining: min(breakdown.filter((b) => b.ruleId === 'US-ADMISSION' || b.ruleId === 'US-ROLLING365')),
    breakdown,
    errors,
    warnings,
  };
}
