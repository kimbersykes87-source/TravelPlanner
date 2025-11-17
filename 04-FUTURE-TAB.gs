/**
 * FUTURE TAB - Scenario Planning and Validation
 * Functions for managing future scenarios, scenario validation, and scenario cache
 */

/**
 * Build scenario entries by profile from stays
 */
function buildScenarioEntriesByProfile_(stays) {
  const byProfile = { kimber: new Map(), siona: new Map() };
  (stays || []).forEach(stay => {
    const profiles = stay.profileScope === 'both' ? ['kimber', 'siona'] : [stay.profileScope];
    profiles.forEach(profileId => {
      const map = byProfile[profileId];
      if (!map) return;
      const startDay = getDayNumber_(stay.startDate);
      const endDay = getDayNumber_(stay.endDate);
      if (!isFinite(startDay) || !isFinite(endDay)) return;
      for (let day = startDay; day <= endDay; day++) {
        const iso = dayNumberToDate_(day).toISOString().split('T')[0];
        map.set(iso, { date: iso, dayNumber: day, country: stay.country, source: 'scenario' });
      }
    });
  });
  return {
    kimber: Array.from(byProfile.kimber.values()).sort((a, b) => a.dayNumber - b.dayNumber),
    siona: Array.from(byProfile.siona.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  };
}

/**
 * Merge history and scenario entries
 */
function mergeHistoryAndScenarioEntries_(historyEntries, scenarioEntries) {
  const map = new Map();
  historyEntries.forEach(entry => map.set(entry.date, entry));
  scenarioEntries.forEach(entry => map.set(entry.date, entry));
  const merged = Array.from(map.values());
  merged.sort((a, b) => a.dayNumber - b.dayNumber);
  return merged;
}

/**
 * Generate scenario ID
 */
function generateScenarioId_() {
  return 'SC-' + Utilities.getUuid().replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}

/**
 * Generate stay ID
 */
function generateStayId_() {
  return 'ST-' + Utilities.getUuid().replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase();
}

/**
 * Sanitize scenario payload
 */
function sanitizeScenarioPayload_(payload) {
  const nowIso = new Date().toISOString();
  const scenarioId = sanitizeString_(payload.scenarioId) || generateScenarioId_();
  const startDate = sanitizeISODate_(payload.startDate || payload.scenarioStart || payload.start);
  const endDate = sanitizeISODate_(payload.endDate || payload.scenarioEnd || payload.end) || startDate;

  return {
    scenarioId,
    headline: sanitizeString_(payload.headline || payload.scenarioHeadline),
    createdBy: sanitizeString_(payload.createdBy || payload.scenarioCreatedBy) || 'Kimber',
    rating: clampNumber_(payload.rating ?? payload.scenarioRating, 0, 5, 0),
    startDate,
    endDate,
    summary: sanitizeString_(payload.summary || payload.scenarioSummary),
    icon: sanitizeString_(payload.icon || payload.scenarioIcon),
    accommodationType: sanitizeString_(payload.accommodationType),
    lastUpdated: sanitizeString_(payload.lastUpdated) || nowIso
  };
}

/**
 * Sanitize scenario stays
 */
function sanitizeScenarioStays_(stays, scenarioId) {
  if (!Array.isArray(stays)) {
    return [];
  }

  return stays.map(stay => {
    const startDate = sanitizeISODate_(stay.startDate || stay.start);
    const endDate = sanitizeISODate_(stay.endDate || stay.end) || startDate;
    const scopeRaw = sanitizeString_(stay.profileScope || stay.scope || 'both').toLowerCase();
    const scope = SUPPORTED_SCENARIO_PROFILE_SCOPES.includes(scopeRaw) ? scopeRaw : 'both';

    return {
      scenarioId,
      stayId: sanitizeString_(stay.stayId) || generateStayId_(),
      profileScope: scope,
      country: sanitizeString_(stay.country),
      city: sanitizeString_(stay.city),
      startDate,
      endDate,
      notes: sanitizeString_(stay.notes),
      accommodationType: sanitizeString_(stay.accommodationType || stay.lodgingType),
      routeNotes: sanitizeString_(stay.routeNotes || stay.keyCities)
    };
  }).filter(stay => stay.country && stay.startDate);
}

/**
 * Sanitize scenario bundle
 */
function sanitizeScenarioBundle_(payload) {
  const scenario = sanitizeScenarioPayload_(payload || {});
  const stays = sanitizeScenarioStays_(payload.stays || [], scenario.scenarioId);
  return { scenario, stays };
}

/**
 * Calculate scenario duration in days
 */
function scenarioDurationInDays_(scenario) {
  const startDay = getDayNumber_(scenario.startDate);
  const endDay = getDayNumber_(scenario.endDate);
  if (!isFinite(startDay) || !isFinite(endDay)) return 0;
  return (endDay - startDay) + 1;
}

/**
 * Upsert scenario entry
 */
function upsertScenarioEntry_(payload) {
  const bundle = sanitizeScenarioBundle_(payload || {});
  const validation = validateScenarioBundle_(bundle);
  if (validation.errors.length > 0) {
    return {
      success: false,
      scenario: bundle.scenario,
      stays: bundle.stays,
      validation
    };
  }

  writeScenarioMetadata_(bundle.scenario);
  overwriteScenarioStays_(bundle.scenario.scenarioId, bundle.stays);
  // Note: ScenarioCalendar removed - data can be derived from ScenarioStays when needed
  
  // Note: ScenarioCache removed - not used in frontend, data calculated on demand

  return {
    success: true,
    scenario: bundle.scenario,
    stays: bundle.stays,
    validation
  };
}

/**
 * Delete scenario entry
 */
function deleteScenarioEntry_(scenarioId) {
  const id = sanitizeString_(scenarioId);
  if (!id) return false;

  const scenarioSheet = getSheetByExpectedName(FUTURE_SCENARIOS_SHEET_NAME);
  const staysSheet = getSheetByExpectedName(SCENARIO_STAYS_SHEET_NAME);
  // Note: ScenarioCalendar removed - data can be derived from ScenarioStays when needed

  let deleted = false;

  if (scenarioSheet) {
    const data = scenarioSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const currentId = sanitizeString_(data[i][0]);
      if (currentId === id) {
        scenarioSheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
  }

  if (staysSheet) {
    const data = staysSheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const currentScenarioId = sanitizeString_(data[i][0]);
      if (currentScenarioId === id) {
        staysSheet.deleteRow(i + 1);
      }
    }
  }

  // Note: ScenarioCache removed - not used in frontend, data calculated on demand

  return deleted;
}

/**
 * Validate scenario payload
 */
function validateScenarioPayload_(payload) {
  const bundle = sanitizeScenarioBundle_(payload || {});
  const validation = validateScenarioBundle_(bundle);
  return {
    scenario: bundle.scenario,
    stays: bundle.stays,
    errors: validation.errors,
    warnings: validation.warnings,
    breakdown: validation.breakdown
  };
}

/**
 * Validate scenario bundle
 */
function validateScenarioBundle_(bundle) {
  const { scenario, stays } = bundle;
  const errors = [];
  const warnings = [];

  if (!scenario.startDate || !scenario.endDate) {
    errors.push('Scenario start and end dates are required.');
  }

  const duration = scenarioDurationInDays_(scenario);
  if (duration > DEFAULT_SCENARIO_MAX_DURATION_DAYS) {
    errors.push(`Scenario duration exceeds the ${DEFAULT_SCENARIO_WINDOW_DAYS}-day planning window.`);
  }

  if (!stays.length) {
    warnings.push('Scenario does not contain any stays.');
  }

  const staysOutsideScenario = stays.filter(stay => {
    const stayStart = getDayNumber_(stay.startDate);
    const stayEnd = getDayNumber_(stay.endDate);
    const scenarioStart = getDayNumber_(scenario.startDate);
    const scenarioEnd = getDayNumber_(scenario.endDate);
    if (!isFinite(stayStart) || !isFinite(stayEnd) || !isFinite(scenarioStart) || !isFinite(scenarioEnd)) {
      return false;
    }
    return stayStart < scenarioStart || stayEnd > scenarioEnd;
  });

  if (staysOutsideScenario.length > 0) {
    errors.push('All stays must fall within the scenario start and end dates.');
  }

  const visaValidation = validateScenarioVisaRules_(scenario, stays);
  errors.push(...visaValidation.errors);
  warnings.push(...visaValidation.warnings);

  return {
    errors,
    warnings,
    breakdown: visaValidation.breakdown,
    dailyEntries: visaValidation.dailyEntries
  };
}

/**
 * Write scenario metadata
 */
function writeScenarioMetadata_(scenario) {
  const sheet = getSheetByExpectedName(FUTURE_SCENARIOS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${FUTURE_SCENARIOS_SHEET_NAME}" not found.`);
  }

  const headers = sheet.getDataRange().getValues();
  const rows = headers;
  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const currentId = sanitizeString_(rows[i][0]);
    if (currentId === scenario.scenarioId) {
      targetRowIndex = i + 1;
      break;
    }
  }

  const values = [
    scenario.scenarioId,
    scenario.headline,
    scenario.createdBy,
    scenario.rating,
    scenario.startDate,
    scenario.endDate,
    scenario.summary,
    scenario.icon,
    scenario.accommodationType,
    scenario.lastUpdated
  ];

  if (targetRowIndex === -1) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(targetRowIndex, 1, 1, values.length).setValues([values]);
  }
}

/**
 * Overwrite scenario stays
 */
function overwriteScenarioStays_(scenarioId, stays) {
  const sheet = getSheetByExpectedName(SCENARIO_STAYS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${SCENARIO_STAYS_SHEET_NAME}" not found.`);
  }

  const data = sheet.getDataRange().getValues();
  const existingRowIndices = [];
  for (let i = 1; i < data.length; i++) {
    const currentScenarioId = sanitizeString_(data[i][0]);
    if (currentScenarioId === scenarioId) {
      existingRowIndices.push(i + 1); // 1-based row number
    }
  }

  const newRows = stays.map(stay => [
    stay.scenarioId,
    stay.stayId,
    stay.profileScope,
    stay.country,
    stay.city,
    stay.startDate,
    stay.endDate,
    stay.notes,
    stay.accommodationType,
    stay.routeNotes
  ]);

  // Overwrite existing rows
  const rowsToOverwrite = Math.min(existingRowIndices.length, newRows.length);
  if (rowsToOverwrite > 0) {
    for (let i = 0; i < rowsToOverwrite; i++) {
      const rowNum = existingRowIndices[i];
      sheet.getRange(rowNum, 1, 1, newRows[i].length).setValues([newRows[i]]);
    }
  }

  // Append any extra new rows
  if (newRows.length > existingRowIndices.length) {
    const extraRows = newRows.slice(existingRowIndices.length);
    sheet.getRange(sheet.getLastRow() + 1, 1, extraRows.length, extraRows[0].length).setValues(extraRows);
  }

  // Delete excess old rows for this scenario (if any)
  // We only delete rows for this specific scenario, so it's safe to delete them
  if (existingRowIndices.length > newRows.length) {
    const rowsToDelete = existingRowIndices.slice(newRows.length);
    // Delete from bottom to top to maintain indices
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
  }
}

/**
 * Build scenario daily entries (derived from stays - no longer stored in separate sheet)
 * This function is kept for validation purposes but ScenarioCalendar sheet was removed
 * as it was redundant - all data can be derived from ScenarioStays
 */
function buildScenarioDailyEntries_(scenarioId, stays) {
  const entries = [];
  stays.forEach(stay => {
    const startDay = getDayNumber_(stay.startDate);
    const endDay = getDayNumber_(stay.endDate);
    if (!isFinite(startDay) || !isFinite(endDay)) return;

    const profiles = stay.profileScope === 'both' ? ['kimber', 'siona'] : [stay.profileScope];
    for (let day = startDay; day <= endDay; day++) {
      const date = new Date(day * 24 * 60 * 60 * 1000);
      const iso = date.toISOString().split('T')[0];
      profiles.forEach(profile => {
        entries.push({
          scenarioId,
          profileId: profile,
          date: iso,
          country: stay.country,
          jurisdiction: getJurisdictionForCountry_(stay.country),
          validationStatus: 'pending',
          notes: stay.notes || ''
        });
      });
    }
  });
  return entries;
}

/**
 * Validate scenario visa rules
 */
function validateScenarioVisaRules_(scenario, stays) {
  const rules = loadVisaRules_();
  const errors = [];
  const warnings = [];
  const breakdown = [];
  const dailyEntries = [];

  // Get scenario start date (first stay date or scenario startDate)
  const scenarioStartDate = stays && stays.length > 0 && stays[0].startDate
    ? stays[0].startDate
    : (scenario.startDate || '');
  const scenarioStartDayNumber = getDayNumber_(scenarioStartDate);
  
  if (!isFinite(scenarioStartDayNumber)) {
    errors.push('Scenario must have a valid start date.');
    return { errors, warnings, breakdown, dailyEntries };
  }

  const scenarioEntriesByProfile = buildScenarioEntriesByProfile_(stays);

  ['kimber', 'siona'].forEach(profileId => {
    const historyEntries = buildHistoryEntries_(profileId);
    const scenarioEntries = scenarioEntriesByProfile[profileId] || [];
    
    // Filter history entries up to scenario start date (baseline calculation)
    const historyUpToScenarioStart = historyEntries.filter(entry => {
      const entryDay = getDayNumber_(entry.date);
      return isFinite(entryDay) && entryDay < scenarioStartDayNumber;
    });
    
    // Check if day before scenario start is US (for ESTA reset)
    const dayBeforeScenarioStart = scenarioStartDayNumber - 1;
    const dayBeforeEntry = historyEntries.find(entry => {
      const entryDay = getDayNumber_(entry.date);
      return isFinite(entryDay) && entryDay === dayBeforeScenarioStart;
    });
    const dayBeforeIsUS = dayBeforeEntry && (
      normalizeCountryName(dayBeforeEntry.country) === normalizeCountryName('United States') ||
      normalizeCountryName(dayBeforeEntry.country) === normalizeCountryName('United States of America')
    );
    
    // For ESTA baseline: if day before is US, exclude it (it's an exit/reset)
    const estaBaselineEntries = dayBeforeIsUS 
      ? historyUpToScenarioStart.filter(entry => {
          const entryDay = getDayNumber_(entry.date);
          return entryDay !== dayBeforeScenarioStart;
        })
      : historyUpToScenarioStart;
    
    const mergedEntries = mergeHistoryAndScenarioEntries_(historyEntries, scenarioEntries);

    // For rolling windows, we need history within the window period before scenario start
    const ruleSchengen = rules.find(r => (r.ruleId || r.jurisdiction) === 'SCHENGEN-ROLLING' || r.jurisdiction === 'SCHENGEN') || DEFAULT_VISA_RULES[3];
    const ruleUS365 = rules.find(r => (r.ruleId || r.jurisdiction) === 'US-ROLLING365' || r.jurisdiction === 'US365') || DEFAULT_VISA_RULES[1];

    const schengenWindowStart = scenarioStartDayNumber - ruleSchengen.windowDays;
    const us365WindowStart = scenarioStartDayNumber - ruleUS365.windowDays;

    const historyForSchengenBaseline = historyEntries.filter(entry => {
      const entryDay = getDayNumber_(entry.date);
      return isFinite(entryDay) && entryDay >= schengenWindowStart && entryDay < scenarioStartDayNumber;
    });

    const historyForUS365Baseline = historyEntries.filter(entry => {
      const entryDay = getDayNumber_(entry.date);
      return isFinite(entryDay) && entryDay >= us365WindowStart && entryDay < scenarioStartDayNumber;
    });

    const historyByJurisdiction = {
      US: collectDayNumbersForJurisdiction_(historyUpToScenarioStart, 'US'),
      US365: collectDayNumbersForJurisdiction_(historyForUS365Baseline, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction_(historyForSchengenBaseline, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction_(historyUpToScenarioStart, 'UK')
    };

    // For ESTA (US), filter with contiguous territory logic for scenario entries
    const estaFilteredEntries = filterMergedEntriesForESTA_(mergedEntries, scenarioEntries);
    
    const projectedByJurisdiction = {
      US: collectDayNumbersForJurisdiction_(estaFilteredEntries, 'US'),
      US365: collectDayNumbersForJurisdiction_(mergedEntries, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction_(mergedEntries, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction_(mergedEntries, 'UK')
    };
    
    // Check which jurisdictions have days in scenario
    // For US, check actual US days (not Canada/Mexico) to determine if visa should show
    const hasUSDays = scenarioEntries.some(entry => {
      const normalized = normalizeCountryName(entry.country);
      return normalized === normalizeCountryName('United States') || 
             normalized === normalizeCountryName('United States of America');
    });
    const hasSchengenDays = scenarioEntries.some(entry => isSchengenCountry(entry.country));
    const hasUKDays = scenarioEntries.some(entry => 
      normalizeCountryName(entry.country) === normalizeCountryName('United Kingdom')
    );
    
    const scenarioByJurisdiction = {
      US: collectDayNumbersForJurisdiction_(scenarioEntries, 'US'),
      US365: collectDayNumbersForJurisdiction_(scenarioEntries, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction_(scenarioEntries, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction_(scenarioEntries, 'UK')
    };

    const scenarioDayStatus = new Map();

    if (profileId === 'kimber' && hasUSDays) {
      const rule = rules.find(r => (r.ruleId || r.jurisdiction) === 'US-ADMISSION' || r.jurisdiction === 'US') || DEFAULT_VISA_RULES[0];
      
      // If day before scenario start is US, ESTA resets (baseline = 0)
      // Otherwise, calculate baseline admission length at scenario start
      let baselineAdmissionLength = 0;
      if (!dayBeforeIsUS) {
        // Check if scenario starts on a US day (from history or scenario)
        const scenarioStartEntryFromHistory = historyUpToScenarioStart.find(entry => {
          const entryDay = getDayNumber_(entry.date);
          return entryDay === scenarioStartDayNumber;
        });
        const scenarioStartEntryFromScenario = scenarioEntries.find(entry => {
          const entryDay = getDayNumber_(entry.date);
          return entryDay === scenarioStartDayNumber;
        });
        const scenarioStartIsUS = (scenarioStartEntryFromHistory && isUSOrContiguous_(scenarioStartEntryFromHistory.country)) ||
                                   (scenarioStartEntryFromScenario && isUSOrContiguous_(scenarioStartEntryFromScenario.country));
        
        if (scenarioStartIsUS && scenarioStartEntryFromHistory) {
          // Find the admission block length at scenario start (from history only)
          const baseline = analyzeUSAdmissions_(estaBaselineEntries, scenarioStartDayNumber, rule.maxDays);
          baselineAdmissionLength = baseline.dayLengths.get(scenarioStartDayNumber) || 0;
        }
        // If scenario starts on non-US day (or only in scenario, not history), baseline remains 0 (new admission)
      }
      
      // Calculate projected including scenario
      // If day-before was US (exit), exclude it from projected calculation too
      const projectedEntries = dayBeforeIsUS
        ? estaFilteredEntries.filter(entry => {
            const entryDay = getDayNumber_(entry.date);
            return entryDay !== dayBeforeScenarioStart;
          })
        : estaFilteredEntries;
      const projected = analyzeUSAdmissions_(projectedEntries, scenarioStartDayNumber, rule.maxDays);
      
      // Get projected max admission length
      const scenarioMax = projected.maxLength;
      const delta = scenarioMax - baselineAdmissionLength;
      
      // Calculate remaining days (limit - projected length at scenario end)
      const scenarioEndDayNumber = scenarioEntries.length > 0 
        ? Math.max(...scenarioEntries.map(e => e.dayNumber))
        : scenarioStartDayNumber;
      const projectedLengthAtEnd = projected.dayLengths.get(scenarioEndDayNumber) || 0;
      const remaining = rule.maxDays - projectedLengthAtEnd;

      if (scenarioMax > rule.maxDays) {
        const violationDate = projected.violationDay || scenarioStartDayNumber;
        const violationIso = dayNumberToDate_(violationDate).toISOString().split('T')[0];
        errors.push(`Kimber would exceed the US ESTA 90-day admission limit (${scenarioMax}/${rule.maxDays}) on ${violationIso}.`);
      }

      breakdown.push({
        profileId,
        ruleId: 'US-ADMISSION',
        label: 'Kimber – US ESTA 90-day admission',
        baseline: baselineAdmissionLength,
        projected: scenarioMax,
        delta,
        limit: rule.maxDays,
        remaining,
        status: scenarioMax > rule.maxDays ? 'error' : 'ok'
      });

      scenarioEntries.forEach(entry => {
        const normalized = normalizeCountryName(entry.country);
        const isUS = normalized === normalizeCountryName('United States') || 
                     normalized === normalizeCountryName('United States of America');
        if (!isUS) return;
        
        const length = projected.dayLengths.get(entry.dayNumber) || 0;
        const note = `ESTA ${length}/${rule.maxDays}`;
        const existing = scenarioDayStatus.get(entry.date) || { status: 'ok', notes: [] };
        if (length > rule.maxDays) existing.status = 'error';
        existing.notes.push(note);
        scenarioDayStatus.set(entry.date, existing);
      });
    }

    if (profileId === 'siona' && hasUSDays) {
      const rule = rules.find(r => (r.ruleId || r.jurisdiction) === 'US-ROLLING365' || r.jurisdiction === 'US365') || DEFAULT_VISA_RULES[1];
      
      // Calculate baseline: count at scenario start date within rolling window
      // Count how many US365 days in history are within 365 days before scenario start
      const windowStart = scenarioStartDayNumber - rule.windowDays;
      const baselineCountAtStart = historyByJurisdiction.US365.filter(day => day >= windowStart).length;
      
      // Calculate baseline max count for comparison
      const baseline = analyzeRollingWindow_(historyByJurisdiction.US365, rule.windowDays, rule.maxDays);
      
      // Calculate projected including scenario
      const projected = analyzeRollingWindow_(projectedByJurisdiction.US365, rule.windowDays, rule.maxDays);
      
      // Get projected count at scenario end
      const scenarioEndDayNumber = scenarioEntries.length > 0 
        ? Math.max(...scenarioEntries.map(e => e.dayNumber))
        : scenarioStartDayNumber;
      const projectedCountAtEnd = projected.countsByDay && projected.countsByDay.get(scenarioEndDayNumber)
        ? projected.countsByDay.get(scenarioEndDayNumber)
        : projected.maxCount;
      
      const delta = projected.maxCount - baselineCountAtStart;
      const remaining = rule.maxDays - projectedCountAtEnd;

      if (projected.maxCount > rule.maxDays) {
        const violationDate = projected.violationDay || scenarioStartDayNumber;
        const violationIso = dayNumberToDate_(violationDate).toISOString().split('T')[0];
        errors.push(`Siona would exceed the US B1/B2 365-day limit (${projected.maxCount}/${rule.maxDays}) on ${violationIso}.`);
      }

      breakdown.push({
        profileId,
        ruleId: 'US-ROLLING365',
        label: 'Siona – US B1/B2 rolling 365',
        baseline: baselineCountAtStart,
        projected: projected.maxCount,
        delta,
        limit: rule.maxDays,
        remaining,
        status: projected.maxCount > rule.maxDays ? 'error' : 'ok'
      });

      scenarioEntries.forEach(entry => {
        if (normalizeCountryName(entry.country) !== normalizeCountryName('United States')) return;
        const count = projected.countsByDay.get(entry.dayNumber) || 0;
        const note = `B1/B2 ${count}/${rule.maxDays}`;
        const existing = scenarioDayStatus.get(entry.date) || { status: 'ok', notes: [] };
        if (count > rule.maxDays) existing.status = 'error';
        existing.notes.push(note);
        scenarioDayStatus.set(entry.date, existing);
      });
    }

    if (hasSchengenDays) {
      const rule = rules.find(r => (r.ruleId || r.jurisdiction) === 'SCHENGEN-ROLLING' || r.jurisdiction === 'SCHENGEN') || DEFAULT_VISA_RULES[3];
      
      // Calculate baseline: count at scenario start date within rolling window
      // Count how many Schengen days in history are within 180 days before scenario start
      const windowStart = scenarioStartDayNumber - rule.windowDays;
      const baselineCountAtStart = historyByJurisdiction.SCHENGEN.filter(day => day >= windowStart).length;
      
      // Calculate baseline max count for comparison
      const baseline = analyzeRollingWindow_(historyByJurisdiction.SCHENGEN, rule.windowDays, rule.maxDays);
      
      // Calculate projected including scenario
      const projected = analyzeRollingWindow_(projectedByJurisdiction.SCHENGEN, rule.windowDays, rule.maxDays);
      
      // Get projected count at scenario end
      const scenarioEndDayNumber = scenarioEntries.length > 0 
        ? Math.max(...scenarioEntries.map(e => e.dayNumber))
        : scenarioStartDayNumber;
      const projectedCountAtEnd = projected.countsByDay && projected.countsByDay.get(scenarioEndDayNumber)
        ? projected.countsByDay.get(scenarioEndDayNumber)
        : projected.maxCount;
      
      const delta = projected.maxCount - baselineCountAtStart;
      const remaining = rule.maxDays - projectedCountAtEnd;

      if (projected.maxCount > rule.maxDays) {
        const violationDate = projected.violationDay || scenarioStartDayNumber;
        const violationIso = dayNumberToDate_(violationDate).toISOString().split('T')[0];
        errors.push(`${profileId === 'kimber' ? 'Kimber' : 'Siona'} would exceed the Schengen limit (${projected.maxCount}/${rule.maxDays}) on ${violationIso}.`);
      }

      breakdown.push({
        profileId,
        ruleId: 'SCHENGEN-ROLLING',
        label: `${profileId === 'kimber' ? 'Kimber' : 'Siona'} – Schengen rolling 180`,
        baseline: baselineCountAtStart,
        projected: projected.maxCount,
        delta,
        limit: rule.maxDays,
        remaining,
        status: projected.maxCount > rule.maxDays ? 'error' : 'ok'
      });

      scenarioEntries.forEach(entry => {
        if (!isSchengenCountry(entry.country)) return;
        const count = projected.countsByDay.get(entry.dayNumber) || 0;
        const note = `Schengen ${count}/${rule.maxDays}`;
        const existing = scenarioDayStatus.get(entry.date) || { status: 'ok', notes: [] };
        if (count > rule.maxDays) existing.status = 'error';
        existing.notes.push(note);
        scenarioDayStatus.set(entry.date, existing);
      });
    }

    if (hasUKDays) {
      const rule = rules.find(r => (r.ruleId || r.jurisdiction) === 'UK-TAX' || r.jurisdiction === 'UK') || DEFAULT_VISA_RULES[2];
      
      // Get tax year for scenario start date
      const scenarioStartTaxYearStart = getTaxYearStartDay_(scenarioStartDayNumber);
      
      // Get UK days in the same tax year as scenario start, before scenario start
      const ukDaysInTaxYearBeforeScenario = historyByJurisdiction.UK.filter(day => {
        const taxYearStart = getTaxYearStartDay_(day);
        return taxYearStart === scenarioStartTaxYearStart && day < scenarioStartDayNumber;
      });
      
      // Calculate baseline at scenario start (within its tax year)
      // Count UK days from tax year start to scenario start
      let baselineCountAtStart = ukDaysInTaxYearBeforeScenario.length;
      
      // Get scenario UK days
      const ukDaysInScenario = scenarioByJurisdiction.UK || [];
      
      // Get scenario end date
      const scenarioEndDayNumber = scenarioEntries.length > 0 
        ? Math.max(...scenarioEntries.map(e => e.dayNumber))
        : scenarioStartDayNumber;
      
      // Count scenario UK days that are in the current tax year (after tax year reset if applicable)
      // If scenario bridges tax year, only count days after the tax year reset
      const scenarioEndTaxYearStart = getTaxYearStartDay_(scenarioEndDayNumber);
      
      // Count UK days in scenario that are in the current tax year
      let scenarioDaysInCurrentTaxYear = 0;
      if (scenarioStartTaxYearStart === scenarioEndTaxYearStart) {
        // Scenario is entirely within one tax year
        // Count all UK days in scenario
        scenarioDaysInCurrentTaxYear = ukDaysInScenario.length;
      } else {
        // Scenario bridges tax year boundary
        // Only count UK days after the tax year reset (in the new tax year)
        scenarioDaysInCurrentTaxYear = ukDaysInScenario.filter(day => {
          const taxYearStart = getTaxYearStartDay_(day);
          return taxYearStart === scenarioEndTaxYearStart; // New tax year
        }).length;
        // Reset baseline to 0 for new tax year
        baselineCountAtStart = 0;
      }
      
      // End days = baseline + scenario days in current tax year
      const projectedCountAtEnd = baselineCountAtStart + scenarioDaysInCurrentTaxYear;
      
      // Calculate projected including scenario for violation checking
      const projected = analyzeUKTax_(projectedByJurisdiction.UK, rule.maxDays);
      
      // Get max projected count across all tax years covered by scenario
      let maxProjectedAcrossTaxYears = 0;
      const taxYearsInScenario = new Set();
      taxYearsInScenario.add(scenarioStartTaxYearStart);
      taxYearsInScenario.add(scenarioEndTaxYearStart);
      
      // Check if scenario bridges tax year boundary
      for (let day = scenarioStartDayNumber; day <= scenarioEndDayNumber; day++) {
        const taxYearStart = getTaxYearStartDay_(day);
        taxYearsInScenario.add(taxYearStart);
      }
      
      taxYearsInScenario.forEach(taxYearStart => {
        const taxYearMax = (projected.maxCountByTaxYear && projected.maxCountByTaxYear.get(taxYearStart)) || 0;
        if (taxYearMax > maxProjectedAcrossTaxYears) {
          maxProjectedAcrossTaxYears = taxYearMax;
        }
      });
      
      const delta = projectedCountAtEnd - baselineCountAtStart;
      const remaining = rule.maxDays - projectedCountAtEnd;
      
      // Check violation: if any tax year exceeds limit
      const hasViolation = Array.from(taxYearsInScenario).some(taxYearStart => {
        const taxYearMax = (projected.maxCountByTaxYear && projected.maxCountByTaxYear.get(taxYearStart)) || 0;
        return taxYearMax > rule.maxDays;
      });

      if (hasViolation) {
        const violationDate = projected.violationDay || scenarioStartDayNumber;
        const violationIso = dayNumberToDate_(violationDate).toISOString().split('T')[0];
        errors.push(`${profileId === 'kimber' ? 'Kimber' : 'Siona'} would exceed the UK tax-year limit (${maxProjectedAcrossTaxYears}/${rule.maxDays}) on ${violationIso}.`);
      }

      breakdown.push({
        profileId,
        ruleId: 'UK-TAX',
        label: `${profileId === 'kimber' ? 'Kimber' : 'Siona'} – UK tax year`,
        baseline: baselineCountAtStart,
        projected: projectedCountAtEnd,
        delta,
        limit: rule.maxDays,
        remaining,
        status: hasViolation ? 'error' : 'ok',
        maxProjected: maxProjectedAcrossTaxYears // Keep max for violation checking
      });

      scenarioEntries.forEach(entry => {
        if (normalizeCountryName(entry.country) !== normalizeCountryName('United Kingdom')) return;
        const count = projected.countsByDay.get(entry.dayNumber) || 0;
        const note = `UK ${count}/${rule.maxDays}`;
        const existing = scenarioDayStatus.get(entry.date) || { status: 'ok', notes: [] };
        if (count > rule.maxDays) existing.status = 'error';
        existing.notes.push(note);
        scenarioDayStatus.set(entry.date, existing);
      });
    }

    scenarioEntries.forEach(entry => {
      const status = scenarioDayStatus.get(entry.date);
      if (!status) return;
      dailyEntries.push({
        scenarioId: scenario.scenarioId,
        profileId,
        date: entry.date,
        country: entry.country,
        jurisdiction: status.notes.join(' | ').includes('B1/B2') ? 'US' : getJurisdictionForCountry_(entry.country) || 'OTHER',
        validationStatus: status.status,
        notes: status.notes.join(' | ')
      });
    });
  });

  return { errors, warnings, breakdown, dailyEntries };
}

// ============================================================================
// SCENARIO CACHE FUNCTIONS
// ============================================================================
// NOTE: ScenarioCache sheets removed - they were redundant and not used in frontend.
// Data is calculated on-demand from FutureScenarios and ScenarioStays sheets.
// If performance becomes an issue, consider in-memory caching or re-implementing
// a consolidated cache system with proper frontend integration.
//
// Functions below are kept for reference but are disabled:
//
// const SCENARIO_CACHE_METADATA_SHEET = 'ScenarioCacheMetadata';
// const SCENARIO_CACHE_DAYS_SHEET = 'ScenarioCacheDays';
// const SCENARIO_CACHE_SUMMARY_SHEET = 'ScenarioCacheSummary';

/**
 * Entry point to rebuild the scenario cache.
 * DISABLED: Cache sheets removed due to redundancy - not used in frontend.
 * Data is calculated on-demand from source sheets.
 */
function rebuildScenarioCache() {
  console.log('⚠️ ScenarioCache has been removed - data calculated on-demand from source sheets');
  return;
  const scenarios = loadScenarioRows_();
  const staysByScenario = loadScenarioStaysGrouped_();
  const relationshipHistory = cacheBuildHistoricalDayNumbers_();
  const visaRules = loadVisaRules_();

  const metadataRows = [];
  const daysRows = [];
  const summaryRows = [];

  scenarios.forEach(scenarioRow => {
    const scenario = normalizeScenarioRow(scenarioRow);
    if (!scenario || !scenario.scenarioId) {
      return;
    }

    const scenarioStays = (staysByScenario.get(scenario.scenarioId) || [])
      .map(normalizeScenarioStayRow)
      .filter(Boolean);

    // Keep derived model identical to production logic
    const derived = computeScenarioDerivedData(scenario, scenarioStays);
    Object.assign(scenario, derived);
    scenario.stays = scenarioStays;

    metadataRows.push(buildScenarioMetadataRow_(scenario));

    ['kimber', 'siona'].forEach(profileId => {
      const historyEntries = relationshipHistory[profileId] || { US: [], US365: [], SCHENGEN: [], UK: [] };
      const scenarioEntries = scenarioEntriesForProfile_(scenario, scenarioStays, profileId);
      const mergedEntries = mergeHistoryAndScenarioEntries_(historyEntries.__all || [], scenarioEntries.__all || []);

      // Flatten scenario-only day numbers for quick incremental math.
      Object.keys(scenarioEntries.byJurisdiction).forEach(jurisdiction => {
        const dayNumbers = scenarioEntries.byJurisdiction[jurisdiction];
        if (dayNumbers && dayNumbers.length) {
          daysRows.push([
            scenario.scenarioId,
            profileId,
            jurisdiction,
            JSON.stringify(dayNumbers),
            new Date().toISOString()
          ]);
        }
      });

      // Precompute visa summaries using existing helpers.
      const historyByJurisdiction = {
        __all: historyEntries.__all || [], // Full historical entries for ESTA baseline
        US: historyEntries.US || [],
        US365: historyEntries.US365 || [],
        SCHENGEN: historyEntries.SCHENGEN || [],
        UK: historyEntries.UK || []
      };
      
      // For ESTA (US), filter with contiguous territory logic for scenario entries
      const estaFilteredEntries = filterMergedEntriesForESTA_(mergedEntries, scenarioEntries.__all || []);
      const projectedByJurisdiction = {
        US: collectDayNumbersForJurisdiction_(estaFilteredEntries, 'US'),
        US365: collectDayNumbersForJurisdiction_(mergedEntries, 'US365'),
        SCHENGEN: collectDayNumbersForJurisdiction_(mergedEntries, 'SCHENGEN'),
        UK: collectDayNumbersForJurisdiction_(mergedEntries, 'UK')
      };

      summaryRows.push(...buildVisaSummaryRows_(
        scenario,
        profileId,
        visaRules,
        historyByJurisdiction,
        projectedByJurisdiction,
        mergedEntries
      ));
    });
  });

  writeScenarioCacheSheet_(SCENARIO_CACHE_METADATA_SHEET, [
    ['ScenarioId', 'Headline', 'StartDate', 'EndDate', 'DurationDays', 'CountryCount', 'Travellers', 'LastSynced']
  ], metadataRows);

  writeScenarioCacheSheet_(SCENARIO_CACHE_DAYS_SHEET, [
    ['ScenarioId', 'ProfileId', 'Jurisdiction', 'ScenarioDayNumbersJson', 'LastSynced']
  ], daysRows);

  writeScenarioCacheSheet_(SCENARIO_CACHE_SUMMARY_SHEET, [
    ['ScenarioId', 'ProfileId', 'Jurisdiction', 'BaselineDays', 'ProjectedDays', 'RemainingDays', 'Limit', 'Status', 'ViolationDate', 'SummaryJson', 'LastSynced']
  ], summaryRows);

  console.log(`Scenario cache rebuilt at ${new Date().toISOString()}: ${metadataRows.length} scenarios.`);
}

/**
 * Loads rows from FutureScenarios sheet
 */
function loadScenarioRows_() {
  const sheet = getSheetByExpectedName(FUTURE_SCENARIOS_SHEET_NAME);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  return values.slice(1); // drop header
}

/**
 * Loads ScenarioStays grouped by scenarioId
 */
function loadScenarioStaysGrouped_() {
  const sheet = getSheetByExpectedName(SCENARIO_STAYS_SHEET_NAME);
  const map = new Map();
  if (!sheet) return map;
  const values = sheet.getDataRange().getValues();
  values.slice(1).forEach(row => {
    const scenarioId = (row[0] || '').toString().trim();
    if (!scenarioId) return;
    if (!map.has(scenarioId)) {
      map.set(scenarioId, []);
    }
    map.get(scenarioId).push(row);
  });
  return map;
}

/**
 * Builds metadata cache row for quick list rendering
 */
function buildScenarioMetadataRow_(scenario) {
  const travellers = Array.from(new Set((scenario.stays || []).map(stay => stay.profileScope || 'both')));
  const travellerLabel = travellers.length === 1 && travellers[0] !== 'both'
    ? travellers[0]
    : travellers.includes('both')
      ? 'both'
      : travellers.join(', ');

  return [
    scenario.scenarioId,
    scenario.headline || 'Untitled Scenario',
    scenario.startDate || '',
    scenario.endDate || '',
    scenario.durationDays || '',
    scenario.countryCount || '',
    travellerLabel,
    new Date().toISOString()
  ];
}

/**
 * Builds scenario entries per profile using existing helpers
 */
function scenarioEntriesForProfile_(scenario, stays, profileId) {
  const entries = buildScenarioEntriesByProfile_(stays);
  const profileEntries = entries[profileId] || [];
  return {
    __all: mergeHistoryAndScenarioEntries_([], profileEntries),
    byJurisdiction: {
      US: collectDayNumbersForJurisdiction_(profileEntries, 'US'),
      US365: collectDayNumbersForJurisdiction_(profileEntries, 'US365'),
      SCHENGEN: collectDayNumbersForJurisdiction_(profileEntries, 'SCHENGEN'),
      UK: collectDayNumbersForJurisdiction_(profileEntries, 'UK')
    }
  };
}

/**
 * Builds summary rows for visa rules using the same logic as validateScenarioVisaRules_
 */
function buildVisaSummaryRows_(scenario, profileId, visaRules, historyByJurisdiction, projectedByJurisdiction, mergedEntries) {
  const rows = [];
  const today = getTodayStart_();
  const todayDayNumber = getDayNumberFromDate_(today);

  function pushSummary(ruleId, label, baseline, projected, limit, violationDate, status, remaining, notes) {
    rows.push([
      scenario.scenarioId,
      profileId,
      ruleId,
      baseline || 0,
      projected || 0,
      remaining != null ? remaining : '',
      limit || '',
      status,
      violationDate ? dayNumberToDate_(violationDate).toISOString().split('T')[0] : '',
      JSON.stringify(notes || []),
      new Date().toISOString()
    ]);
  }

  if (profileId === 'kimber') {
    const rule = visaRules.find(r => (r.ruleId || r.jurisdiction) === 'US-ADMISSION' || r.jurisdiction === 'US') || DEFAULT_VISA_RULES[0];
    const historyEntriesForBaseline = (historyByJurisdiction.__all || []).filter(entry => 
      entry && entry.country && isUSOrContiguous_(entry.country)
    );
    const baseline = analyzeUSAdmissions_(historyEntriesForBaseline, todayDayNumber, rule.maxDays);
    const scenarioEntries = (mergedEntries || []).filter(entry => entry && entry.source === 'scenario');
    const estaFilteredEntries = filterMergedEntriesForESTA_(mergedEntries, scenarioEntries);
    const projected = analyzeUSAdmissions_(estaFilteredEntries, todayDayNumber, rule.maxDays);
    const baselineCurrentAdmission = baseline.todayLength || 0;
    const projectedMaxAdmission = projected.maxLength;
    const status = projectedMaxAdmission > rule.maxDays ? 'error' : 'ok';
    const remaining = rule.maxDays - projected.todayLength;
    pushSummary('US-ADMISSION', 'US ESTA 90-day admission', baselineCurrentAdmission, projectedMaxAdmission, rule.maxDays, projected.violationDay, status, remaining, []);
  }

  if (profileId === 'siona') {
    const rule = visaRules.find(r => (r.ruleId || r.jurisdiction) === 'US-ROLLING365' || r.jurisdiction === 'US365') || DEFAULT_VISA_RULES[1];
    const baseline = analyzeRollingWindow_(historyByJurisdiction.US365, rule.windowDays, rule.maxDays);
    const projected = analyzeRollingWindow_(projectedByJurisdiction.US365, rule.windowDays, rule.maxDays);
    const status = projected.maxCount > rule.maxDays ? 'error' : 'ok';
    const remaining = rule.maxDays - projected.maxCount;
    pushSummary('US-ROLLING365', 'US B1/B2 rolling 365', baseline.maxCount, projected.maxCount, rule.maxDays, projected.violationDay, status, remaining, []);
  }

  {
    const rule = visaRules.find(r => (r.ruleId || r.jurisdiction) === 'SCHENGEN-ROLLING' || r.jurisdiction === 'SCHENGEN') || DEFAULT_VISA_RULES[3];
    const baseline = analyzeRollingWindow_(historyByJurisdiction.SCHENGEN, rule.windowDays, rule.maxDays);
    const projected = analyzeRollingWindow_(projectedByJurisdiction.SCHENGEN, rule.windowDays, rule.maxDays);
    const status = projected.maxCount > rule.maxDays ? 'error' : 'ok';
    const remaining = rule.maxDays - projected.maxCount;
    pushSummary('SCHENGEN-ROLLING', 'Schengen rolling 180', baseline.maxCount, projected.maxCount, rule.maxDays, projected.violationDay, status, remaining, []);
  }

  {
    const rule = visaRules.find(r => (r.ruleId || r.jurisdiction) === 'UK-TAX' || r.jurisdiction === 'UK') || DEFAULT_VISA_RULES[2];
    const baseline = analyzeUKTax_(historyByJurisdiction.UK, rule.maxDays);
    const projected = analyzeUKTax_(projectedByJurisdiction.UK, rule.maxDays);
    const currentTaxYearStart = getTaxYearStartDay_(todayDayNumber);
    const currentTaxYearBaselineMax = (baseline.maxCountByTaxYear && baseline.maxCountByTaxYear.get(currentTaxYearStart)) || 0;
    const currentTaxYearProjectedMax = (projected.maxCountByTaxYear && projected.maxCountByTaxYear.get(currentTaxYearStart)) || 0;
    const remaining = rule.maxDays - currentTaxYearProjectedMax;
    const status = projected.maxCount > rule.maxDays ? 'error' : 'ok';
    pushSummary('UK-TAX', 'UK tax year', currentTaxYearBaselineMax, currentTaxYearProjectedMax, rule.maxDays, projected.violationDay, status, remaining, []);
  }

  return rows;
}

/**
 * Writes cache data to sheet (clearing first) with provided header
 */
function writeScenarioCacheSheet_(sheetName, headerRow, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  const allRows = headerRow.concat(rows);
  if (allRows.length > 0) {
    sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
  }
  sheet.autoResizeColumns(1, allRows[0].length);
}

/**
 * Builds historical entries per profile/jurisdiction and caches in memory
 * Optimized: Uses consolidated helper to read RelationshipLog once per profile
 */
function cacheBuildHistoricalDayNumbers_() {
  const map = { kimber: {}, siona: {} };
  
  // Use consolidated helper to read RelationshipLog once per profile
  const kimberData = buildHistoryDataForProfile_('kimber');
  const sionaData = buildHistoryDataForProfile_('siona');
  
  map.kimber = Object.assign({ __all: kimberData.entries }, kimberData.byJurisdiction);
  map.siona = Object.assign({ __all: sionaData.entries }, sionaData.byJurisdiction);
  
  return map;
}

/**
 * Normalizes a scenario row from sheet data or object
 */
function normalizeScenarioRow(row) {
  if (!row) return null;
  if (Array.isArray(row)) {
    return {
      scenarioId: (row[0] || '').toString().trim(),
      headline: (row[1] || '').toString().trim() || 'Untitled Scenario',
      createdBy: (row[2] || 'kimber').toString().trim().toLowerCase(),
      rating: Number(row[3]) || 0,
      startDate: sanitizeISODate_(row[4]),
      endDate: sanitizeISODate_(row[5]),
      summary: (row[6] || '').toString().trim(),
      icon: (row[7] || 'future').toString().trim(),
      accommodationType: (row[8] || '').toString().trim(),
      lastUpdated: normalizeDateTime_(row[9])
    };
  }
  return {
    scenarioId: (row.scenarioId || '').toString().trim(),
    headline: (row.headline || '').toString().trim() || 'Untitled Scenario',
    createdBy: (row.createdBy || 'kimber').toString().trim().toLowerCase(),
    rating: Number(row.rating) || 0,
    startDate: sanitizeISODate_(row.startDate),
    endDate: sanitizeISODate_(row.endDate),
    summary: (row.summary || '').toString().trim(),
    icon: (row.icon || 'future').toString().trim(),
    accommodationType: (row.accommodationType || '').toString().trim(),
    lastUpdated: normalizeDateTime_(row.lastUpdated)
  };
}

/**
 * Normalizes a scenario stay row from sheet data or object
 */
function normalizeScenarioStayRow(row) {
  if (!row) return null;
  if (Array.isArray(row)) {
    return {
      scenarioId: (row[0] || '').toString().trim(),
      stayId: (row[1] || '').toString().trim(),
      profileScope: (row[2] || 'both').toString().trim().toLowerCase(),
      country: (row[3] || '').toString().trim(),
      city: (row[4] || '').toString().trim(),
      startDate: sanitizeISODate_(row[5]),
      endDate: sanitizeISODate_(row[6]),
      notes: (row[7] || '').toString().trim(),
      accommodationType: (row[8] || '').toString().trim(),
      routeNotes: (row[9] || '').toString().trim()
    };
  }
  return {
    scenarioId: (row.scenarioId || '').toString().trim(),
    stayId: (row.stayId || '').toString().trim(),
    profileScope: (row.profileScope || 'both').toString().trim().toLowerCase(),
    country: (row.country || '').toString().trim(),
    city: (row.city || '').toString().trim(),
    startDate: sanitizeISODate_(row.startDate),
    endDate: sanitizeISODate_(row.endDate),
    notes: (row.notes || '').toString().trim(),
    accommodationType: (row.accommodationType || '').toString().trim(),
    routeNotes: (row.routeNotes || '').toString().trim()
  };
}

/**
 * Normalizes a date/time value to ISO string
 */
function normalizeDateTime_(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return new Date(value).toISOString();
  }
  return value.toString();
}

/**
 * Computes derived data for a scenario based on its stays
 */
function computeScenarioDerivedData(baseScenario, stays) {
  const startDates = stays.map(stay => stay.startDate).filter(Boolean).sort();
  const endDates = stays.map(stay => stay.endDate).filter(Boolean).sort();

  const startDate = startDates[0] || baseScenario.startDate || '';
  const endDate = endDates[endDates.length - 1] || baseScenario.endDate || startDate;

  const startDay = getDayNumber_(startDate);
  const endDay = getDayNumber_(endDate);
  const durationDays = (isFinite(startDay) && isFinite(endDay)) ? ((endDay - startDay) + 1) : 0;
  
  const countries = Array.from(new Set(stays.map(stay => stay.country).filter(Boolean)));
  const travellers = Array.from(new Set(stays.map(stay => stay.profileScope || 'both')));

  return {
    startDate,
    endDate,
    durationDays,
    countries,
    countryCount: countries.length,
    travellers
  };
}

/**
 * Optional helper to refresh cache from UI manually
 * DISABLED: ScenarioCache has been removed - data calculated on-demand
 */
function manualRebuildScenarioCache() {
  SpreadsheetApp.getUi().alert('Scenario cache has been removed. Data is calculated on-demand from source sheets.');
}

/**
 * Optional: Remove scenario cache sheets completely
 * DISABLED: ScenarioCache sheets already removed - function kept for reference
 */
function clearScenarioCacheSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cacheSheetNames = ['ScenarioCacheMetadata', 'ScenarioCacheDays', 'ScenarioCacheSummary'];
  cacheSheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      ss.deleteSheet(sheet);
    }
  });
  SpreadsheetApp.getUi().alert('Scenario cache sheets removed (if any existed).');
}

