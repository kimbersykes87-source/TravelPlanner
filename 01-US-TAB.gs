/**
 * US TAB - US Visa and ESTA Calculations
 * Functions specific to US visa rules, ESTA, and US admission analysis
 */

/**
 * Check if country is US or contiguous territory
 */
function isUSOrContiguous_(country) {
  if (!country) return false;
  const normalized = normalizeCountryName(country);
  return US_CONTIGUOUS_TERRITORIES.some(name => normalizeCountryName(name) === normalized);
}

/**
 * Filters merged entries for ESTA calculation.
 * Historical entries: include contiguous territory (Canada/Mexico) as per ESTA rules.
 * Scenario entries: include US and Canada/Mexico if adjacent to US.
 */
function filterMergedEntriesForESTA_(mergedEntries, scenarioEntries) {
  if (!mergedEntries || !Array.isArray(mergedEntries)) return [];
  
  // Build a set of scenario day numbers for quick lookup
  const scenarioDayNumbers = new Set();
  if (scenarioEntries && Array.isArray(scenarioEntries)) {
    scenarioEntries.forEach(entry => {
      if (entry && entry.dayNumber) scenarioDayNumbers.add(entry.dayNumber);
    });
  }
  
  // Build a map of scenario countries by day number
  const scenarioCountriesByDay = new Map();
  if (scenarioEntries && Array.isArray(scenarioEntries)) {
    scenarioEntries.forEach(entry => {
      if (entry && entry.dayNumber && entry.country) {
        scenarioCountriesByDay.set(entry.dayNumber, entry.country);
      }
    });
  }
  
  return mergedEntries.filter(entry => {
    if (!entry || !entry.country) return false;
    
    // For historical entries, include contiguous territory (normal ESTA behavior)
    if (entry.source === 'history') {
      return isUSOrContiguous_(entry.country);
    }
    
    // For scenario entries, include US and Canada/Mexico if adjacent to US
    if (entry.source === 'scenario') {
      const normalized = normalizeCountryName(entry.country);
      const isUS = normalized === normalizeCountryName('United States') || 
                   normalized === normalizeCountryName('United States of America');
      const isCanada = normalized === normalizeCountryName('Canada');
      const isMexico = normalized === normalizeCountryName('Mexico');
      
      // Always include US
      if (isUS) return true;
      
      // Include Canada/Mexico if adjacent to US in scenario
      if (isCanada || isMexico) {
        const dayNum = entry.dayNumber;
        const prevDayCountry = scenarioCountriesByDay.get(dayNum - 1);
        const nextDayCountry = scenarioCountriesByDay.get(dayNum + 1);
        
        const prevIsUS = prevDayCountry && (
          normalizeCountryName(prevDayCountry) === normalizeCountryName('United States') ||
          normalizeCountryName(prevDayCountry) === normalizeCountryName('United States of America')
        );
        const nextIsUS = nextDayCountry && (
          normalizeCountryName(nextDayCountry) === normalizeCountryName('United States') ||
          normalizeCountryName(nextDayCountry) === normalizeCountryName('United States of America')
        );
        
        return prevIsUS || nextIsUS;
      }
      
      return false;
    }
    
    // Fallback: use normal contiguous territory logic
    return isUSOrContiguous_(entry.country);
  });
}

/**
 * Analyze US admissions (ESTA 90-day rule)
 * Tracks contiguous blocks of US/Canada/Mexico days
 */
function analyzeUSAdmissions_(entries, todayDayNumber, limit) {
  const resultsByDay = new Map();
  const blocks = [];
  let currentBlock = null;

  entries.forEach(entry => {
    const isContiguous = isUSOrContiguous_(entry.country);
    if (!isContiguous) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      return;
    }

    if (!currentBlock) {
      currentBlock = {
        startDay: entry.dayNumber,
        endDay: entry.dayNumber,
        days: [entry.dayNumber]
      };
    } else {
      const prevDay = currentBlock.endDay;
      if (entry.dayNumber === prevDay + 1) {
        currentBlock.endDay = entry.dayNumber;
        currentBlock.days.push(entry.dayNumber);
      } else {
        blocks.push(currentBlock);
        currentBlock = {
          startDay: entry.dayNumber,
          endDay: entry.dayNumber,
          days: [entry.dayNumber]
        };
      }
    }
  });

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  let maxLength = 0;
  let violationDay = null;
  let todayBlockLength = 0;

  blocks.forEach(block => {
    const length = block.days.length;
    if (length > maxLength) {
      maxLength = length;
    }
    if (length > limit && violationDay === null) {
      violationDay = block.startDay;
    }
    block.days.forEach(dayNumber => {
      resultsByDay.set(dayNumber, length);
      if (dayNumber === todayDayNumber) {
        todayBlockLength = length;
      }
    });
  });

  return {
    dayLengths: resultsByDay,
    maxLength,
    todayLength: todayBlockLength,
    violationDay
  };
}

/**
 * Analyze rolling window (for US B1/B2 365-day rule and Schengen)
 */
function analyzeRollingWindow_(dayNumbers, windowDays, limit) {
  const countsByDay = new Map();
  let maxCount = 0;
  let violationDay = null;
  let left = 0;

  for (let right = 0; right < dayNumbers.length; right++) {
    const currentDay = dayNumbers[right];
    while (left <= right && currentDay - dayNumbers[left] >= windowDays) {
      left++;
    }
    const count = right - left + 1;
    countsByDay.set(currentDay, count);
    if (count > maxCount) {
      maxCount = count;
    }
    if (violationDay === null && count > limit) {
      violationDay = currentDay;
    }
  }

  return {
    countsByDay,
    maxCount,
    violationDay
  };
}


