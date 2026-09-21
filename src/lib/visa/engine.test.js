import { describe, it, expect } from 'vitest';
import { resolveCountry, normalizeCountryName } from '../countries/resolve';
import { isUsSoil, isSchengen, isUk, isEstaContiguous } from './jurisdictions';
import { toDayNumber, fromDayNumber, ukTaxYearBounds } from './days';
import {
  estaStatus,
  rollingStatus,
  ukTaxYearStatus,
  validateScenario,
  scenarioRemaining,
  resolveRules,
} from './engine';

/** Build a log from runs like ['2026-01-01', 10, 'United States', 'United Kingdom'] */
function log(...runs) {
  const rows = [];
  for (const [start, days, kimber, siona = kimber, extra = {}] of runs) {
    for (let i = 0; i < days; i++) {
      rows.push({ date: fromDayNumber(toDayNumber(start) + i), kimber_country: kimber, siona_country: siona, ...extra });
    }
  }
  return rows;
}
const day = (iso) => toDayNumber(iso);

describe('country resolution', () => {
  it('matches exact names, not substrings', () => {
    for (const name of ['Australia', 'Austria', 'Russia', 'Belarus', 'Cyprus', 'Mauritius']) {
      expect(isUsSoil(name)).toBe(false);
    }
    expect(isUk('Ukraine')).toBe(false);
    expect(isUsSoil('South America')).toBe(false);
  });

  it('recognises common spellings', () => {
    expect(resolveCountry('United States')).toBe('US');
    expect(resolveCountry('USA')).toBe('US');
    expect(resolveCountry('United Kingdom')).toBe('GB');
    expect(resolveCountry('England')).toBe('GB');
    expect(resolveCountry('St. Barthélemy')).toBe('BL');
    expect(resolveCountry('St Maarten')).toBe('SX');
    expect(resolveCountry('Czech Republic')).toBe('CZ');
    expect(resolveCountry('Turkey')).toBe('TR');
    expect(resolveCountry('North Macedonia')).toBe('MK');
    expect(resolveCountry('Georgia')).toBe('GE');
    expect(resolveCountry('GBR')).toBe('GB');
    expect(resolveCountry('')).toBe(null);
    expect(resolveCountry('Narnia')).toBe(null);
    expect(normalizeCountryName('  The  Bahamas ')).toBe('bahamas');
  });

  it('knows the jurisdictions', () => {
    expect(isSchengen('Austria')).toBe(true);
    expect(isSchengen('Bulgaria')).toBe(true);
    expect(isSchengen('Romania')).toBe(true);
    expect(isSchengen('Croatia')).toBe(true);
    expect(isSchengen('Monaco')).toBe(true);
    expect(isSchengen('Ireland')).toBe(false);
    expect(isSchengen('Cyprus')).toBe(false);
    expect(isSchengen('Andorra')).toBe(false);
    expect(isSchengen('Montenegro')).toBe(false);
    expect(isUsSoil('Puerto Rico')).toBe(true);
    expect(isEstaContiguous('Dominican Republic')).toBe(true);
    expect(isEstaContiguous('Mexico')).toBe(true);
    expect(isEstaContiguous('Colombia')).toBe(false);
  });
});

describe('days', () => {
  it('round-trips dates without time-zone drift', () => {
    expect(fromDayNumber(toDayNumber('2026-09-20'))).toBe('2026-09-20');
    expect(fromDayNumber(toDayNumber('2024-02-29') + 1)).toBe('2024-03-01');
  });
  it('finds the UK tax year', () => {
    expect(fromDayNumber(ukTaxYearBounds(day('2026-04-05')).start)).toBe('2025-04-06');
    expect(fromDayNumber(ukTaxYearBounds(day('2026-04-06')).start)).toBe('2026-04-06');
    expect(fromDayNumber(ukTaxYearBounds(day('2026-09-20')).end)).toBe('2027-04-05');
  });
});

describe('ESTA (Kimber)', () => {
  it('does not count Australia as the US', () => {
    const rows = log(['2026-09-01', 30, 'Australia']);
    const s = estaStatus(rows, { today: day('2026-09-20') });
    expect(s.inAdmission).toBe(false);
  });

  it('counts the current admission from the first US day', () => {
    const rows = log(['2026-08-01', 10, 'Mexico'], ['2026-08-11', 20, 'United States']);
    const s = estaStatus(rows, { today: day('2026-08-20') });
    expect(s.inAdmission).toBe(true);
    expect(s.admissionStart).toBe('2026-08-11');
    expect(s.daysUsed).toBe(10);
    expect(s.remaining).toBe(80);
    expect(s.mustLeaveBy).toBe('2026-11-08');
    expect(s.plannedExit).toBe('2026-08-30');
  });

  it('keeps the clock running through Mexico and Caribbean side trips', () => {
    const rows = log(
      ['2026-06-01', 50, 'United States'],
      ['2026-07-21', 20, 'Mexico'],
      ['2026-08-10', 5, 'Dominican Republic'],
      ['2026-08-15', 30, 'United States'],
    );
    const s = estaStatus(rows, { today: day('2026-08-20') });
    expect(s.admissionStart).toBe('2026-06-01');
    expect(s.daysUsed).toBe(81);
    expect(s.plannedOverLimit).toBe(true);
  });

  it('starts a new admission after leaving for a non-adjacent country', () => {
    const rows = log(['2026-06-01', 60, 'United States'], ['2026-07-31', 10, 'Colombia'], ['2026-08-10', 5, 'United States']);
    const s = estaStatus(rows, { today: day('2026-08-12') });
    expect(s.admissionStart).toBe('2026-08-10');
    expect(s.daysUsed).toBe(3);
  });

  it('reports the next planned entry when not in the US', () => {
    const rows = log(['2026-09-01', 30, 'Australia'], ['2026-10-01', 95, 'United States']);
    const s = estaStatus(rows, { today: day('2026-09-20') });
    expect(s.nextEntry.start).toBe('2026-10-01');
    expect(s.nextEntry.overLimit).toBe(true);
  });
});

describe('rolling windows', () => {
  it('Schengen counts the 180 days ending today, inclusive', () => {
    const rows = log(['2026-01-01', 30, 'France'], ['2026-01-31', 200, 'Australia']);
    // 180-day window ending 2026-06-29 starts 2026-01-01.
    expect(rollingStatus(rows, 'kimber', 'SCHENGEN-ROLLING', { today: day('2026-06-29') }).used).toBe(30);
    expect(rollingStatus(rows, 'kimber', 'SCHENGEN-ROLLING', { today: day('2026-06-30') }).used).toBe(29);
  });

  it('Schengen includes Bulgaria and Romania, excludes non-members', () => {
    const rows = log(['2026-03-01', 5, 'Bulgaria'], ['2026-03-06', 5, 'Romania'], ['2026-03-11', 5, 'Montenegro'], ['2026-03-16', 5, 'Ireland']);
    expect(rollingStatus(rows, 'kimber', 'SCHENGEN-ROLLING', { today: day('2026-03-31') }).used).toBe(10);
  });

  it('Schengen flags a planned breach', () => {
    const rows = log(['2026-01-01', 100, 'Italy']);
    const s = rollingStatus(rows, 'kimber', 'SCHENGEN-ROLLING', { today: day('2026-02-01') });
    expect(s.plannedBreachOn).toBe('2026-04-01');
  });

  it('B1/B2 counts US soil including Puerto Rico for Siona', () => {
    const rows = log(['2026-08-01', 10, 'Australia', 'United States'], ['2026-08-11', 2, 'Australia', 'Puerto Rico'], ['2026-08-13', 5, 'Australia', 'St Maarten']);
    const s = rollingStatus(rows, 'siona', 'US-ROLLING365', { today: day('2026-08-31') });
    expect(s.used).toBe(12);
    expect(s.remaining).toBe(168);
  });
});

describe('UK tax year', () => {
  it('separates days used so far from planned days', () => {
    const rows = log(
      ['2026-04-01', 10, 'United Kingdom'], // 5 days before 6 Apr fall in the previous tax year
      ['2026-05-01', 20, 'United Kingdom', 'United Kingdom', { ks_uk_work_days: 'Yes' }],
      ['2026-12-01', 15, 'United Kingdom'],
      ['2026-06-01', 5, 'Ukraine'],
    );
    const s = ukTaxYearStatus(rows, 'kimber', { today: day('2026-09-20') });
    expect(s.days.used).toBe(25);
    expect(s.days.planned).toBe(15);
    expect(s.days.remaining).toBe(95);
    expect(s.days.remainingAfterPlans).toBe(80);
    expect(s.work.used).toBe(20);
    expect(s.work.remaining).toBe(19);
    expect(s.work.tieTriggered).toBe(false);
  });

  it('triggers the work tie on the 40th work day', () => {
    const rows = log(['2026-05-01', 40, 'United Kingdom', 'United Kingdom', { ks_uk_work_days: 'Yes' }]);
    const s = ukTaxYearStatus(rows, 'kimber', { today: day('2026-09-20') });
    expect(s.work.remaining).toBe(0);
    expect(s.work.tieTriggered).toBe(true);
  });
});

describe('scenario validation', () => {
  const history = log(['2026-01-01', 200, 'Australia']);

  it('scenario stays override the log and use the shared rules', () => {
    const stays = [
      { country: 'Austria', start_date: '2026-10-01', end_date: '2026-10-10', profile_scope: 'both' },
      { country: 'United States', start_date: '2026-10-11', end_date: '2026-10-20', profile_scope: 'both' },
    ];
    const { breakdown, errors } = validateScenario(stays, history, []);
    expect(errors).toEqual([]);
    const ids = breakdown.map((b) => `${b.profileId}:${b.ruleId}`).sort();
    expect(ids).toEqual(['kimber:SCHENGEN-ROLLING', 'kimber:US-ADMISSION', 'siona:SCHENGEN-ROLLING', 'siona:US-ROLLING365']);
    const kimberSchengen = breakdown.find((b) => b.profileId === 'kimber' && b.ruleId === 'SCHENGEN-ROLLING');
    expect(kimberSchengen.projected).toBe(10);
    expect(kimberSchengen.label).toBe('Kimber: Schengen');
    const kimberUs = breakdown.find((b) => b.ruleId === 'US-ADMISSION');
    expect(kimberUs.projected).toBe(10);
  });

  it('flags an ESTA overstay', () => {
    const stays = [{ country: 'United States', start_date: '2026-10-01', end_date: '2027-01-15', profile_scope: 'Kimber' }];
    const { errors, breakdown } = validateScenario(stays, history, []);
    expect(errors.length).toBe(1);
    expect(breakdown[0].status).toBe('error');
  });

  it('includes days already in the US before the scenario starts', () => {
    const h = log(['2026-09-01', 30, 'United States']);
    const stays = [{ country: 'United States', start_date: '2026-10-01', end_date: '2026-11-15', profile_scope: 'Kimber' }];
    const row = validateScenario(stays, h, []).breakdown[0];
    expect(row.baseline).toBe(30);
    expect(row.projected).toBe(76);
    expect(row.remaining).toBe(14);
    expect(row.status).toBe('warning');
  });

  it('card badges report both Schengen and US when a trip has both', () => {
    const stays = [
      { country: 'France', start_date: '2026-10-01', end_date: '2026-10-05', profile_scope: 'both' },
      { country: 'United States', start_date: '2026-10-06', end_date: '2026-10-07', profile_scope: 'both' },
    ];
    const r = scenarioRemaining(stays, history, []);
    expect(r.schengenRemaining).toBe(85);
    expect(r.usaRemaining).toBe(88);
  });

  it('reads limits from the VisaRules sheet', () => {
    const rules = resolveRules([{ rule_id: 'UK-TAX', max_days: 90 }, { rule_id: 'unknown', max_days: 1 }]);
    expect(rules['UK-TAX'].maxDays).toBe(90);
    expect(rules['SCHENGEN-ROLLING'].maxDays).toBe(90);
  });
});
