/**
 * PAST TAB - Historical Data Processing and Statistics
 * Functions for processing RelationshipLog, PreRelationshipCountries, and Statistics
 */

/**
 * Build existing statistics map from sheet
 */
function buildExistingStatisticsMap_(statsSheet) {
  const map = {};
  if (!statsSheet) return map;

  const rows = statsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const entry = {
      name: row[0] || '',
      code: row[1] || '',
      togetherDays: Number(row[2]) || 0,
      kimberVisited: normalizeYesFlag_(row[3]),
      sionaVisited: normalizeYesFlag_(row[4]),
      togetherVisited: normalizeYesFlag_(row[5])
    };

    const nameKey = normalizeKey_(entry.name);
    const codeKey = normalizeKey_(entry.code);
    if (nameKey) map[nameKey] = entry;
    if (codeKey) map[codeKey] = entry;
  }

  return map;
}

/**
 * Lookup existing statistics entry
 */
function lookupExistingStatisticsEntry_(existingMap, name, code) {
  const codeKey = normalizeKey_(code);
  if (codeKey && existingMap[codeKey]) return existingMap[codeKey];
  const nameKey = normalizeKey_(name);
  if (nameKey && existingMap[nameKey]) return existingMap[nameKey];
  return null;
}

/**
 * Build statistics rows from country stats
 */
function buildStatisticsRows_(countryStats, existingStatsMap) {
  const entries = Object.values(countryStats).map(country => {
    const existing = lookupExistingStatisticsEntry_(existingStatsMap, country.name, country.code) || {};

    const togetherDays = country.togetherDays > 0 ? country.togetherDays : (existing.togetherDays || 0);
    const totalDays = country.kimberDays + country.sionaDays;

    const kimberVisitedStr = (country.kimberVisited || existing.kimberVisited) ? 'Yes' : 'No';
    const sionaVisitedStr = (country.sionaVisited || existing.sionaVisited) ? 'Yes' : 'No';
    const togetherVisitedStr = (country.togetherVisited || existing.togetherVisited) ? 'Yes' : 'No';

    return {
      name: country.name,
      code: country.code,
      togetherDays,
      totalDays,
      kimberVisitedStr,
      sionaVisitedStr,
      togetherVisitedStr,
      kimberVisited: kimberVisitedStr === 'Yes',
      sionaVisited: sionaVisitedStr === 'Yes',
      togetherVisited: togetherVisitedStr === 'Yes'
    };
  }).sort((a, b) => {
    if (b.totalDays !== a.totalDays) {
      return b.totalDays - a.totalDays;
    }
    return a.name.localeCompare(b.name);
  });

  const sheetData = entries.map(entry => [
    entry.name,
    entry.code,
    entry.togetherDays,
    entry.kimberVisitedStr,
    entry.sionaVisitedStr,
    entry.togetherVisitedStr
  ]);

  return { sheetData, summaryEntries: entries };
}

/**
 * Creates a new Statistics sheet and populates it with calculated data
 */
function createStatisticsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Delete existing Statistics sheet if it exists
  const existingSheet = getSheetByExpectedName('Statistics');
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // Create new Statistics sheet
  const statsSheet = ss.insertSheet('Statistics');
  
  // Set up headers
  const headers = [
    'Country',
    'Country_Code',
    'Together_Days',
    'Kimber_Visited',
    'Siona_Visited',
    'Together_Visited'
  ];
  
  statsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Style headers
  const headerRange = statsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  // Calculate and populate statistics
  calculateAndPopulateStatistics(statsSheet);
  
  // Auto-resize columns
  statsSheet.autoResizeColumns(1, headers.length);
  
  // Add borders
  const dataRange = statsSheet.getRange(1, 1, statsSheet.getLastRow(), headers.length);
  dataRange.setBorder(true, true, true, true, true, true);
  
  console.log('Statistics sheet created and populated successfully!');
}

/**
 * Main function to calculate and populate statistics
 * Reads from PreRelationshipCountries sheet and RelationshipLog sheet
 */
function calculateAndPopulateStatistics(statsSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get data from other sheets
  const relationshipLogSheet = getSheetByExpectedName('RelationshipLog');
  const preRelSheet = getSheetByExpectedName('PreRelationshipCountries');
  const countriesSheet = getSheetByExpectedName('Countries');
  
  if (!relationshipLogSheet || !countriesSheet) {
    const missing = [
      !relationshipLogSheet ? 'RelationshipLog' : null,
      !countriesSheet ? 'Countries' : null
    ].filter(Boolean);
    console.error(`Required sheets not found: ${missing.join(', ')}`);
    return;
  }
  
  // Get all data
  const relationshipData = relationshipLogSheet.getDataRange().getValues();
  const preRelData = preRelSheet ? preRelSheet.getDataRange().getValues() : [];
  const countriesData = countriesSheet.getDataRange().getValues();
  
  // Create country statistics object
  const countryStats = {};
  
  // Initialize with all countries from Countries sheet
  for (let i = 1; i < countriesData.length; i++) {
    const countryName = countriesData[i][0];
    const countryCode = countriesData[i][1];
    countryStats[countryCode] = {
      name: countryName,
      code: countryCode,
      kimberDays: 0,
      sionaDays: 0,
      togetherDays: 0,
      kimberVisited: false,
      sionaVisited: false
    };
  }
  
  // Process pre-relationship data from PreRelationshipCountries sheet
  if (preRelData.length > 1) {
    console.log('Processing pre-relationship data...');
    let preRelProcessed = 0;
    let preRelMatched = 0;
    
    for (let i = 1; i < preRelData.length; i++) {
      const [profileId, countryName, visitedBefore] = preRelData[i];
      if (countryName === 'CountryName') continue; // Skip header
      
      preRelProcessed++;
      
      // Normalize country name for better matching
      const normalizedInput = normalizeCountryName(countryName);
      
      // Try direct match first (exact column A to column A match)
      let countryRow = countriesData.find(row => row[0] === countryName || row[0] === normalizedInput);
      
      // If no exact match, try case-insensitive match
      if (!countryRow) {
        countryRow = countriesData.find(row => 
          row[0].toLowerCase() === countryName.toLowerCase() ||
          row[0].toLowerCase() === normalizedInput.toLowerCase()
        );
      }
      
      // If still no match, try matching normalized names
      if (!countryRow) {
        countryRow = countriesData.find(row => {
          const normalizedRow = normalizeCountryName(row[0]);
          return normalizedRow.toLowerCase() === normalizedInput.toLowerCase();
        });
      }
      
      // If still no match, try partial matching
      if (!countryRow) {
        countryRow = countriesData.find(row => 
          row[0].toLowerCase().includes(countryName.toLowerCase()) ||
          countryName.toLowerCase().includes(row[0].toLowerCase())
        );
      }
      
      if (countryRow) {
        const countryCode = countryRow[1];
        if (countryStats[countryCode]) {
          // Update visit status based on PreRelationshipCountries
          if (profileId === 'kimber' && (visitedBefore === 1 || visitedBefore === '1')) {
            countryStats[countryCode].kimberVisited = true;
          }
          if (profileId === 'siona' && (visitedBefore === 1 || visitedBefore === '1')) {
            countryStats[countryCode].sionaVisited = true;
          }
          // Pre-relationship visits are NOT together visits
          // countryStats[countryCode].togetherVisited remains false
          
          preRelMatched++;
        }
      } else {
        console.log(`No match found for: ${countryName}`);
      }
    }
    
    console.log(`Pre-relationship processing: ${preRelMatched}/${preRelProcessed} countries matched`);
  } else {
    console.log('Skipping pre-relationship processing (sheet not present or empty).');
  }
  
  // Process relationship log data (up to today)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  console.log('Processing relationship log data...');
  let relLogProcessed = 0;
  let relLogMatched = 0;
  let futureEntriesSkipped = 0;
  
  for (let i = 1; i < relationshipData.length; i++) {
    const [date, kimberCountry, sionaCountry, notes] = relationshipData[i];
    const entryDate = new Date(date);
    
    // Skip future dates
    if (entryDate > today) {
      futureEntriesSkipped++;
      continue;
    }
    
    relLogProcessed++;
    
    // Find country codes with improved matching using normalization
    let kimberRow = null;
    if (kimberCountry) {
      const normalizedKimber = normalizeCountryName(kimberCountry);
      kimberRow = countriesData.find(row => row[0] === kimberCountry || row[0] === normalizedKimber);
      if (!kimberRow) {
        kimberRow = countriesData.find(row => 
          row[0].toLowerCase() === kimberCountry.toLowerCase() ||
          row[0].toLowerCase() === normalizedKimber.toLowerCase()
        );
      }
      if (!kimberRow) {
        kimberRow = countriesData.find(row => {
          const normalizedRow = normalizeCountryName(row[0]);
          return normalizedRow.toLowerCase() === normalizedKimber.toLowerCase();
        });
      }
    }
    
    let sionaRow = null;
    if (sionaCountry) {
      const normalizedSiona = normalizeCountryName(sionaCountry);
      sionaRow = countriesData.find(row => row[0] === sionaCountry || row[0] === normalizedSiona);
      if (!sionaRow) {
        sionaRow = countriesData.find(row => 
          row[0].toLowerCase() === sionaCountry.toLowerCase() ||
          row[0].toLowerCase() === normalizedSiona.toLowerCase()
        );
      }
      if (!sionaRow) {
        sionaRow = countriesData.find(row => {
          const normalizedRow = normalizeCountryName(row[0]);
          return normalizedRow.toLowerCase() === normalizedSiona.toLowerCase();
        });
      }
    }
    
    if (kimberRow && countryStats[kimberRow[1]]) {
      countryStats[kimberRow[1]].kimberDays++;
      countryStats[kimberRow[1]].kimberVisited = true;
      relLogMatched++;
    }
    
    if (sionaRow && countryStats[sionaRow[1]]) {
      countryStats[sionaRow[1]].sionaDays++;
      countryStats[sionaRow[1]].sionaVisited = true;
      relLogMatched++;
    }
    
    // Count together days and mark as together visited
    if (kimberCountry === sionaCountry && kimberRow) {
      countryStats[kimberRow[1]].togetherDays++;
      countryStats[kimberRow[1]].togetherVisited = true;
    }
  }
  
  console.log(`Relationship log processing: ${relLogMatched} matches from ${relLogProcessed} entries, ${futureEntriesSkipped} future entries skipped`);
  
  const existingStatsMap = buildExistingStatisticsMap_(statsSheet);
  const { sheetData, summaryEntries } = buildStatisticsRows_(countryStats, existingStatsMap);

  if (sheetData.length > 0) {
    statsSheet.getRange(2, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
  }

  addSummarySection(statsSheet, summaryEntries);

  console.log(`Processed ${sheetData.length} countries with statistics`);
}

/**
 * Highlights today's date row in RelationshipLog sheet
 * Clears previous highlights and applies color to today's row
 */
function highlightTodaysRowInRelationshipLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
  
  if (!relationshipLogSheet) {
    console.log('⚠️ RelationshipLog sheet not found');
    return;
  }
  
  // Get today's date (start of day for comparison)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Get all data from RelationshipLog
  const relationshipData = relationshipLogSheet.getDataRange().getValues();
  const lastRow = relationshipData.length;
  const lastCol = relationshipLogSheet.getLastColumn();
  
  // Clear all background colors from data rows (skip header)
  if (lastRow > 1 && lastCol > 0) {
    const dataRange = relationshipLogSheet.getRange(2, 1, lastRow - 1, lastCol);
    dataRange.setBackground(null);
  }
  
  // Find today's row
  let todaysRowNumber = null;
  for (let i = 1; i < relationshipData.length; i++) {
    const [date] = relationshipData[i];
    if (!date) continue;
    
    // Parse the date (handle both Date objects and strings)
    let entryDate;
    if (date instanceof Date) {
      entryDate = new Date(date);
    } else if (typeof date === 'string') {
      entryDate = new Date(date);
    } else {
      continue;
    }
    
    entryDate.setHours(0, 0, 0, 0);
    const entryDateStr = entryDate.toISOString().split('T')[0];
    
    // Check if this row matches today
    if (entryDateStr === todayStr) {
      todaysRowNumber = i + 1; // +1 because array is 0-indexed, sheet rows are 1-indexed
      break;
    }
  }
  
  // Highlight today's row if found
  if (todaysRowNumber) {
    const todaysRowRange = relationshipLogSheet.getRange(todaysRowNumber, 1, 1, lastCol);
    todaysRowRange.setBackground('#FFF9C4'); // Light yellow color
    console.log(`✅ Highlighted today's row (row ${todaysRowNumber}) in RelationshipLog`);
  } else {
    console.log(`ℹ️ Today's date (${todayStr}) not found in RelationshipLog`);
  }
}

/**
 * Incremental refresh function - only processes data up to current date
 * This ensures future travel plans are not included in Statistics
 * Uses PreRelationshipCountries sheet for pre-relationship data
 * Also highlights today's row in RelationshipLog
 */
function incrementalRefreshStatistics() {
  console.log('🔄 Starting incremental Statistics refresh...');
  console.log('📅 Only processing data up to current date (excluding future dates)');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let statsSheet = getSheetByExpectedName('Statistics');
    
    if (!statsSheet) {
      console.log('Statistics sheet not found, creating it...');
      statsSheet = createStatisticsSheet();
      return;
    }
    
    // Get current date (end of day)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Processing data up to: ${todayStr}`);
    
    // Get required sheets
    const relationshipLogSheet = getSheetByExpectedName('RelationshipLog');
    const preRelSheet = getSheetByExpectedName('PreRelationshipCountries');
    const countriesSheet = getSheetByExpectedName('Countries');
    
    if (!relationshipLogSheet || !countriesSheet) {
      const missing = [
        !relationshipLogSheet ? 'RelationshipLog' : null,
        !countriesSheet ? 'Countries' : null
      ].filter(Boolean);
      console.error(`❌ Required sheets not found: ${missing.join(', ')}`);
      return;
    }
    
    // Get all data
    const relationshipData = relationshipLogSheet.getDataRange().getValues();
    const preRelData = preRelSheet ? preRelSheet.getDataRange().getValues() : [];
    const countriesData = countriesSheet.getDataRange().getValues();
    
    console.log(`📊 Found ${relationshipData.length} relationship log entries`);
    if (preRelSheet) {
      console.log(`📊 Found ${preRelData.length} pre-relationship entries`);
    } else {
      console.log('ℹ️ PreRelationshipCountries sheet not found; skipping pre-relationship visits.');
    }
    console.log(`📊 Found ${countriesData.length} countries`);
    
    // Initialize country statistics with all countries
    const countryStats = {};
    for (let i = 1; i < countriesData.length; i++) {
      const countryName = countriesData[i][0];
      const countryCode = countriesData[i][1];
      countryStats[countryCode] = {
        name: countryName,
        code: countryCode,
        kimberDays: 0,
        sionaDays: 0,
        togetherDays: 0,
        kimberVisited: false,
        sionaVisited: false,
        togetherVisited: false
      };
    }

    // Process pre-relationship data from PreRelationshipCountries sheet
    if (preRelData.length > 1) {
      console.log('🔄 Processing pre-relationship data from PreRelationshipCountries sheet...');
      for (let i = 1; i < preRelData.length; i++) {
        const [profileId, countryName, visitedBefore] = preRelData[i];
        if (countryName === 'CountryName') continue; // Skip header
        
        // Normalize country name for better matching
        const normalizedInput = normalizeCountryName(countryName);
        
        // Try direct match first (exact column A to column A match)
        let countryRow = countriesData.find(row => row[0] === countryName || row[0] === normalizedInput);
        
        // If no exact match, try case-insensitive match
        if (!countryRow) {
          countryRow = countriesData.find(row => 
            row[0].toLowerCase() === countryName.toLowerCase() ||
            row[0].toLowerCase() === normalizedInput.toLowerCase()
          );
        }
        
        // If still no match, try matching normalized names
        if (!countryRow) {
          countryRow = countriesData.find(row => {
            const normalizedRow = normalizeCountryName(row[0]);
            return normalizedRow.toLowerCase() === normalizedInput.toLowerCase();
          });
        }
        
        // If still no match, try partial matching
        if (!countryRow) {
          countryRow = countriesData.find(row => 
            row[0].toLowerCase().includes(countryName.toLowerCase()) ||
            countryName.toLowerCase().includes(row[0].toLowerCase())
          );
        }
        
        if (countryRow) {
          const countryCode = countryRow[1];
          if (countryStats[countryCode]) {
            // Update visit status based on PreRelationshipCountries
            if (profileId === 'kimber' && (visitedBefore === 1 || visitedBefore === '1')) {
              countryStats[countryCode].kimberVisited = true;
            }
            if (profileId === 'siona' && (visitedBefore === 1 || visitedBefore === '1')) {
              countryStats[countryCode].sionaVisited = true;
            }
          }
        }
      }
    }
    
    // Process relationship log data (ONLY up to today)
    console.log('🔄 Processing relationship log data (up to current date only)...');
    let processedEntries = 0;
    let futureEntriesSkipped = 0;
    
    for (let i = 1; i < relationshipData.length; i++) {
      const [date, kimberCountry, sionaCountry, notes] = relationshipData[i];
      
      // Skip future entries - this is the key part!
      const entryDate = new Date(date);
      if (entryDate > today) {
        futureEntriesSkipped++;
        continue;
      }
      
      processedEntries++;
      
      // Find country codes with improved matching using normalization
      let kimberRow = null;
      if (kimberCountry) {
        const normalizedKimber = normalizeCountryName(kimberCountry);
        kimberRow = countriesData.find(row => row[0] === kimberCountry || row[0] === normalizedKimber);
        if (!kimberRow) {
          kimberRow = countriesData.find(row => 
            row[0].toLowerCase() === kimberCountry.toLowerCase() ||
            row[0].toLowerCase() === normalizedKimber.toLowerCase()
          );
        }
        if (!kimberRow) {
          kimberRow = countriesData.find(row => {
            const normalizedRow = normalizeCountryName(row[0]);
            return normalizedRow.toLowerCase() === normalizedKimber.toLowerCase();
          });
        }
      }
      
      let sionaRow = null;
      if (sionaCountry) {
        const normalizedSiona = normalizeCountryName(sionaCountry);
        sionaRow = countriesData.find(row => row[0] === sionaCountry || row[0] === normalizedSiona);
        if (!sionaRow) {
          sionaRow = countriesData.find(row => 
            row[0].toLowerCase() === sionaCountry.toLowerCase() ||
            row[0].toLowerCase() === normalizedSiona.toLowerCase()
          );
        }
        if (!sionaRow) {
          sionaRow = countriesData.find(row => {
            const normalizedRow = normalizeCountryName(row[0]);
            return normalizedRow.toLowerCase() === normalizedSiona.toLowerCase();
          });
        }
      }
      
      if (kimberRow && countryStats[kimberRow[1]]) {
        countryStats[kimberRow[1]].kimberDays++;
        countryStats[kimberRow[1]].kimberVisited = true;
      }
      
      if (sionaRow && countryStats[sionaRow[1]]) {
        countryStats[sionaRow[1]].sionaDays++;
        countryStats[sionaRow[1]].sionaVisited = true;
      }
      
      // Count together days and mark as together visited
      if (kimberCountry === sionaCountry && kimberRow) {
        countryStats[kimberRow[1]].togetherDays++;
        countryStats[kimberRow[1]].togetherVisited = true;
      }
    }
    
    console.log(`✅ Processed ${processedEntries} relationship entries`);
    console.log(`⏭️ Skipped ${futureEntriesSkipped} future entries (after ${todayStr})`);
    
    const existingStatsMap = buildExistingStatisticsMap_(statsSheet);
    const { sheetData, summaryEntries } = buildStatisticsRows_(countryStats, existingStatsMap);
    
    // Clear existing data and write new data
    const lastRow = statsSheet.getLastRow();
    if (lastRow > 1) {
      statsSheet.getRange(2, 1, lastRow - 1, statsSheet.getLastColumn()).clear();
    }
    
    if (sheetData.length > 0) {
      statsSheet.getRange(2, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
    }
    
    // Update summary section
    addSummarySection(statsSheet, summaryEntries);
    
    // Highlight today's row in RelationshipLog
    highlightTodaysRowInRelationshipLog();
    
    console.log(`✅ Incremental refresh completed! ${sheetData.length} countries processed`);
    console.log(`📊 Data processed up to: ${todayStr}`);
    console.log(`⏭️ Future entries skipped: ${futureEntriesSkipped}`);
    
  } catch (error) {
    console.error('❌ Error during incremental refresh:', error);
    throw error;
  }
}

/**
 * Midnight refresh function - called by time-based trigger
 * Updates Statistics from RelationshipLog and highlights today's row
 */
function midnightRefreshStatistics() {
  console.log('🌙 Running midnight refresh of Statistics...');
  console.log('⏰ Current time:', new Date().toLocaleString());
  
  try {
    incrementalRefreshStatistics();
    console.log('✅ Midnight refresh completed successfully!');
  } catch (error) {
    console.error('❌ Error during midnight refresh:', error);
    // You could add email notification here if needed
  }
}

/**
 * Set up midnight refresh trigger (runs at 00:00 every day)
 * This will refresh Statistics from RelationshipLog data and highlight today's row
 */
function setupMidnightRefresh() {
  // Delete existing midnight triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'midnightRefreshStatistics') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run at midnight every day
  // Note: This uses the timezone of your Google Apps Script project
  ScriptApp.newTrigger('midnightRefreshStatistics')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
    
  console.log('✅ Midnight refresh trigger set up successfully! Statistics will refresh at 00:00 daily.');
  console.log('📝 To run manually, call: midnightRefreshStatistics() or incrementalRefreshStatistics()');
  console.log('📝 To remove the trigger, call: removeMidnightRefresh()');
}

/**
 * Remove midnight refresh trigger
 */
function removeMidnightRefresh() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'midnightRefreshStatistics') {
      ScriptApp.deleteTrigger(trigger);
      removedCount++;
    }
  });
  
  console.log(`✅ Removed ${removedCount} midnight refresh trigger(s)`);
}

/**
 * Utility: Reset the Statistics header row to the expected labels
 * Run once if your headers look shifted or incorrect
 */
function fixStatisticsHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statsSheet = ss.getSheetByName('Statistics');
  if (!statsSheet) {
    console.log('❌ Statistics sheet not found');
    return;
  }
  const headers = [
    'Country',
    'Country_Code',
    'Together_Days',
    'Kimber_Visited',
    'Siona_Visited',
    'Together_Visited'
  ];
  statsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  // Basic header styling to match other creators in this file
  const headerRange = statsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  console.log('✅ Statistics headers reset successfully');
}

/**
 * Add summary section with country counts
 */
function addSummarySection(statsSheet, countryStats) {
  // Calculate totals
  let kimberTotal = 0;
  let sionaTotal = 0;
  let togetherTotal = 0;

  const iterable = Array.isArray(countryStats) ? countryStats : Object.values(countryStats || {});
  iterable.forEach(country => {
    if (normalizeYesFlag_(country.kimberVisited)) kimberTotal++;
    if (normalizeYesFlag_(country.sionaVisited)) sionaTotal++;
    if (normalizeYesFlag_(country.togetherVisited)) togetherTotal++;
  });
  
  // Debug logging
  console.log('=== SUMMARY CALCULATION ===');
  console.log(`Kimber Total: ${kimberTotal}`);
  console.log(`Siona Total: ${sionaTotal}`);
  console.log(`Together Total: ${togetherTotal}`);
  
  // Check if summary already exists and preserve it
  const summaryStartRow = 200;
  const existingSummary = statsSheet.getRange(summaryStartRow, 1, 1, 1).getValue();
  
  // Only clear if there's no existing summary or it's not properly formatted
  if (existingSummary !== 'SUMMARY') {
    statsSheet.getRange(summaryStartRow, 1, 15, 3).clear();
  } else {
    console.log('⚠️ Summary section already exists - preserving existing data');
    return; // Don't overwrite existing summary
  }
  
  // Add summary headers
  statsSheet.getRange(summaryStartRow, 1, 1, 3).setValues([['SUMMARY', '', '']]);
  statsSheet.getRange(summaryStartRow, 1, 1, 3).setBackground('#4285f4');
  statsSheet.getRange(summaryStartRow, 1, 1, 3).setFontColor('white');
  statsSheet.getRange(summaryStartRow, 1, 1, 3).setFontWeight('bold');
  statsSheet.getRange(summaryStartRow, 1, 1, 3).setHorizontalAlignment('center');
  
  // Add summary data
  const summaryData = [
    ['Kimber Total Countries', kimberTotal, ''],
    ['Siona Total Countries', sionaTotal, ''],
    ['Together Total Countries', togetherTotal, ''],
    ['', '', ''],
    ['Last Updated', new Date().toLocaleString(), '']
  ];
  
  statsSheet.getRange(summaryStartRow + 1, 1, summaryStartRow + summaryData.length, 3).setValues(summaryData);
  
  // Style summary data
  const summaryRange = statsSheet.getRange(summaryStartRow + 1, 1, summaryData.length, 3);
  summaryRange.setBorder(true, true, true, true, true, true);
  
  // Make the numbers bold
  statsSheet.getRange(summaryStartRow + 1, 2, 3, 1).setFontWeight('bold');
  statsSheet.getRange(summaryStartRow + 1, 2, 3, 1).setBackground('#E8F0FE');
  
  console.log(`Summary added at row ${summaryStartRow}: Kimber=${kimberTotal}, Siona=${sionaTotal}, Together=${togetherTotal}`);
}

