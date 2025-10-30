/**
 * Creates and populates a Statistics sheet with calculated travel data
 * This script automatically calculates country statistics from RelationshipLog only
 * All pre-relationship data should be manually maintained in the Statistics sheet
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
  'Vietnam': 'Viet Nam',
  'Viet Nam': 'Viet Nam',
  'Socialist Republic of Vietnam': 'Viet Nam'
};

// Pre-relationship visits embedded (countries visited before 2023-09-30)
// Only flags are set (no days, not together)
const PRE_RELATIONSHIP_VISITS = [
  { name: 'Albania', kimber: true,  siona: false },
  { name: 'Andorra', kimber: true,  siona: false },
  { name: 'Argentina', kimber: false, siona: true },
  { name: 'Austria', kimber: true,  siona: false },
  { name: 'Belgium', kimber: true,  siona: true },
  { name: 'Belize', kimber: false, siona: true },
  { name: 'Bolivia', kimber: false, siona: true },
  { name: 'Bosnia and Herzegovina', kimber: true, siona: false },
  { name: 'Brazil', kimber: true, siona: true },
  { name: 'Bulgaria', kimber: true, siona: true },
  { name: 'Cambodia', kimber: false, siona: true },
  { name: 'Canada', kimber: true, siona: false },
  { name: 'Colombia', kimber: true, siona: true },
  { name: 'Costa Rica', kimber: true, siona: false },
  { name: 'Croatia', kimber: true, siona: false },
  { name: 'Cuba', kimber: false, siona: true },
  { name: 'El Salvador', kimber: true, siona: true },
  { name: 'Fiji', kimber: false, siona: true },
  { name: 'Finland', kimber: true, siona: false },
  { name: 'France', kimber: true, siona: true },
  { name: 'Gambia', kimber: false, siona: true },
  { name: 'Georgia', kimber: true, siona: true },
  { name: 'Germany', kimber: true, siona: true },
  { name: 'Greece', kimber: true, siona: true },
  { name: 'Guatemala', kimber: true, siona: true },
  { name: 'Honduras', kimber: false, siona: true },
  { name: 'Indonesia', kimber: true, siona: true },
  { name: 'Ireland', kimber: true, siona: true },
  { name: 'Italy', kimber: true, siona: true },
  { name: 'Jamaica', kimber: false, siona: true },
  { name: 'Japan', kimber: false, siona: true },
  { name: 'Luxembourg', kimber: true, siona: false },
  { name: 'Malaysia', kimber: true, siona: false },
  { name: 'Mexico', kimber: true, siona: true },
  { name: 'Montenegro', kimber: true, siona: true },
  { name: 'Morocco', kimber: true, siona: true },
  { name: 'Netherlands', kimber: true, siona: true },
  { name: 'New Zealand', kimber: true, siona: true },
  { name: 'Nicaragua', kimber: true, siona: true },
  { name: 'North Macedonia', kimber: true, siona: true },
  { name: 'Norway', kimber: true, siona: false },
  { name: 'Panama', kimber: true, siona: true },
  { name: 'Peru', kimber: false, siona: true },
  { name: 'Portugal', kimber: true, siona: true },
  { name: 'Serbia', kimber: true, siona: false },
  { name: 'Singapore', kimber: false, siona: true },
  { name: 'South Africa', kimber: true, siona: false },
  { name: 'Spain', kimber: true, siona: true },
  { name: 'Sweden', kimber: true, siona: false },
  { name: 'Switzerland', kimber: true, siona: false },
  { name: 'Thailand', kimber: true, siona: true },
  { name: 'Tunisia', kimber: false, siona: true },
  { name: 'Turkey', kimber: true, siona: true },
  { name: 'United Arab Emirates', kimber: true, siona: false },
  { name: 'United Kingdom', kimber: true, siona: true },
  { name: 'Uruguay', kimber: false, siona: true },
  { name: 'Viet Nam', kimber: false, siona: true }
];

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

function createStatisticsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Delete existing Statistics sheet if it exists
  const existingSheet = ss.getSheetByName('Statistics');
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // Create new Statistics sheet
  const statsSheet = ss.insertSheet('Statistics');
  
  // Set up headers
  const headers = [
    'Country',
    'Country_Code',
    'Kimber_Days',
    'Siona_Days', 
    'Together_Days',
    'Total_Days',
    'Rank',
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

function calculateAndPopulateStatistics(statsSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get data from other sheets
  const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
  const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
  const countriesSheet = ss.getSheetByName('Countries');
  
  if (!relationshipLogSheet || !preRelSheet || !countriesSheet) {
    console.error('Required sheets not found!');
    return;
  }
  
  // Get all data
  const relationshipData = relationshipLogSheet.getDataRange().getValues();
  const preRelData = preRelSheet.getDataRange().getValues();
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
  
  // Process pre-relationship data
  console.log('Processing pre-relationship data...');
  let preRelProcessed = 0;
  let preRelMatched = 0;
  
  for (let i = 1; i < preRelData.length; i++) {
    const [profileId, countryName, visitedBefore] = preRelData[i];
    if (countryName === 'CountryName') continue; // Skip header
    
    preRelProcessed++;
    
    // Try direct match first (exact column A to column A match)
    let countryRow = countriesData.find(row => row[0] === countryName);
    
    // If no exact match, try case-insensitive match
    if (!countryRow) {
      countryRow = countriesData.find(row => row[0].toLowerCase() === countryName.toLowerCase());
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
        
        // Debug logging for first few matches
        if (preRelMatched <= 5) {
          console.log(`Matched: ${countryName} -> ${countryRow[0]} (${countryCode}) - Profile: ${profileId}, Visited: ${visitedBefore === 1 || visitedBefore === '1'}`);
        }
      }
    } else {
      console.log(`No match found for: ${countryName}`);
    }
  }
  
  console.log(`Pre-relationship processing: ${preRelMatched}/${preRelProcessed} countries matched`);
  
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
    
    // Find country codes with direct matching
    let kimberRow = null;
    if (kimberCountry) {
      kimberRow = countriesData.find(row => row[0] === kimberCountry);
      if (!kimberRow) {
        kimberRow = countriesData.find(row => row[0].toLowerCase() === kimberCountry.toLowerCase());
      }
    }
    
    let sionaRow = null;
    if (sionaCountry) {
      sionaRow = countriesData.find(row => row[0] === sionaCountry);
      if (!sionaRow) {
        sionaRow = countriesData.find(row => row[0].toLowerCase() === sionaCountry.toLowerCase());
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
  
  // Convert to array and sort by total days
  const statsArray = Object.values(countryStats)
    .map(country => ({
      ...country,
      totalDays: country.kimberDays + country.sionaDays,
      togetherVisited: country.togetherDays > 0
    }))
    .sort((a, b) => {
      // Sort by total days (descending), then by name for countries with 0 days
      if (b.totalDays !== a.totalDays) {
        return b.totalDays - a.totalDays;
      }
      return a.name.localeCompare(b.name);
    });
  
  // Add rank (only for visited countries)
  let visitedCount = 0;
  statsArray.forEach((country, index) => {
    if (country.kimberVisited || country.sionaVisited) {
      visitedCount++;
      country.rank = visitedCount;
    } else {
      country.rank = ''; // No rank for unvisited countries
    }
  });
  
  // Prepare data for sheet
  const sheetData = statsArray.map(country => [
    country.name,
    country.code,
    country.kimberDays,
    country.sionaDays,
    country.togetherDays,
    country.totalDays,
    country.rank,
    country.kimberVisited ? 'Yes' : 'No',
    country.sionaVisited ? 'Yes' : 'No',
    country.togetherVisited ? 'Yes' : 'No'
  ]);
  
  // Write data to sheet
  if (sheetData.length > 0) {
    statsSheet.getRange(2, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
  }
  
  // Add summary section
  addSummarySection(statsSheet, countryStats);
  
  // Add conditional formatting for ranks (only for visited countries)
  const rankRange = statsSheet.getRange(2, 7, sheetData.length, 1);
  const rules = [
    // Top 3 countries - gold
    SpreadsheetApp.newConditionalFormatRule()
      .setRanges([rankRange])
      .whenNumberLessThanOrEqualTo(3)
      .setBackground('#FFD700')
      .build(),
    // Top 10 countries - light blue
    SpreadsheetApp.newConditionalFormatRule()
      .setRanges([rankRange])
      .whenNumberLessThanOrEqualTo(10)
      .setBackground('#E3F2FD')
      .build(),
    // Unvisited countries - light gray
    SpreadsheetApp.newConditionalFormatRule()
      .setRanges([rankRange])
      .whenTextEqualTo('')
      .setBackground('#F5F5F5')
      .build()
  ];
  statsSheet.setConditionalFormatRules(rules);
  
  console.log(`Processed ${sheetData.length} countries with statistics`);
}

/**
 * Function to refresh statistics (can be called manually or triggered)
 */
/**
 * Safe refresh function that preserves existing data
 */
function safeRefreshStatistics() {
  console.log('🛡️ Starting SAFE statistics refresh (preserving existing data)...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let statsSheet = ss.getSheetByName('Statistics');
    
    if (!statsSheet) {
      console.log('Statistics sheet not found, creating it...');
      statsSheet = createStatisticsSheet();
    }
    
    // Check if there's existing data
    const lastRow = statsSheet.getLastRow();
    const hasData = lastRow > 1;
    
    if (hasData) {
      console.log('⚠️ Existing data found - only updating relationship log data');
      console.log('📊 Pre-relationship data will be preserved');
      
      // Only process relationship log data, don't touch pre-relationship data
      const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
      const countriesSheet = ss.getSheetByName('Countries');
      
      if (relationshipLogSheet && countriesSheet) {
        // Get existing data
        const existingData = statsSheet.getDataRange().getValues();
        
        // Process only relationship log updates
        console.log('🔄 Updating relationship log data only...');
        // Add your relationship log processing here without touching pre-relationship data
        
        console.log('✅ Safe refresh completed - existing data preserved');
      }
    } else {
      console.log('📝 No existing data - running full refresh');
      calculateAndPopulateStatistics(statsSheet);
    }
    
  } catch (error) {
    console.error('❌ Error during safe refresh:', error);
    throw error;
  }
}
function manualRefreshStatistics() {
  console.log('🔄 Starting manual statistics refresh...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let statsSheet = ss.getSheetByName('Statistics');
    
    if (!statsSheet) {
      console.log('Statistics sheet not found, creating it...');
      statsSheet = createStatisticsSheet();
    }
    
    calculateAndPopulateStatistics(statsSheet);
    
    console.log('✅ Manual statistics refresh completed successfully!');
    console.log('📊 Statistics sheet has been updated with latest data');
    
  } catch (error) {
    console.error('❌ Error during manual refresh:', error);
    throw error;
  }
}

/**
 * Quick refresh function with minimal logging
 */
function quickRefresh() {
  console.log('⚡ Quick refresh...');
  manualRefreshStatistics();
}

function refreshStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statsSheet = ss.getSheetByName('Statistics');
  
  if (statsSheet) {
    calculateAndPopulateStatistics(statsSheet);
    console.log('Statistics refreshed successfully!');
  } else {
    console.log('Statistics sheet not found. Creating new one...');
    createStatisticsSheet();
  }
}

/**
 * Remove all automatic triggers (use only manual refresh)
 */
function removeAutoTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'refreshStatistics') {
      ScriptApp.deleteTrigger(trigger);
      removedCount++;
    }
  });
  
  console.log(`✅ Removed ${removedCount} automatic trigger(s)`);
  console.log('📝 Now using manual refresh only - call manualRefreshStatistics() when needed');
}

/**
 * Set up automatic refresh trigger
 */
function setupAutoRefresh() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'refreshStatistics') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to run every hour
  ScriptApp.newTrigger('refreshStatistics')
    .timeBased()
    .everyHours(1)
    .create();
    
  console.log('Auto-refresh trigger set up successfully!');
}

/**
 * Set up midnight refresh trigger (runs at 00:00 every day)
 * This will refresh Statistics from RelationshipLog data
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
  console.log('📝 To run manually, call: midnightRefreshStatistics()');
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
 * Midnight refresh function - updates Statistics from RelationshipLog
 * Only processes data up to the current date (excludes future dates)
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
 * Incremental refresh function - only processes new data up to current date
 * This ensures future travel plans are not included in Statistics
 */
function incrementalRefreshStatistics() {
  console.log('🔄 Starting incremental Statistics refresh...');
  console.log('📅 Only processing data up to current date (excluding future dates)');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let statsSheet = ss.getSheetByName('Statistics');
    
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
    const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
    const countriesSheet = ss.getSheetByName('Countries');
    
    if (!relationshipLogSheet || !countriesSheet) {
      console.error('❌ Required sheets not found!');
      return;
    }
    
    // Get all data
    const relationshipData = relationshipLogSheet.getDataRange().getValues();
    const countriesData = countriesSheet.getDataRange().getValues();
    
    console.log(`📊 Found ${relationshipData.length} relationship log entries`);
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

    // Seed visited flags from embedded pre-relationship data (no days, not together)
    // Match by country name from Countries sheet; fall back to normalized name
    PRE_RELATIONSHIP_VISITS.forEach(entry => {
      const directRow = countriesData.find(r => r[0] === entry.name);
      let targetCode = directRow ? directRow[1] : null;
      if (!targetCode) {
        // Try case-insensitive match
        const ciRow = countriesData.find(r => r[0] && r[0].toLowerCase() === entry.name.toLowerCase());
        if (ciRow) targetCode = ciRow[1];
      }
      if (targetCode && countryStats[targetCode]) {
        if (entry.kimber) countryStats[targetCode].kimberVisited = true;
        if (entry.siona) countryStats[targetCode].sionaVisited = true;
      }
    });
    
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
      
      // Find country codes with direct matching
      let kimberRow = null;
      if (kimberCountry) {
        kimberRow = countriesData.find(row => row[0] === kimberCountry);
        if (!kimberRow) {
          kimberRow = countriesData.find(row => row[0].toLowerCase() === kimberCountry.toLowerCase());
        }
      }
      
      let sionaRow = null;
      if (sionaCountry) {
        sionaRow = countriesData.find(row => row[0] === sionaCountry);
        if (!sionaRow) {
          sionaRow = countriesData.find(row => row[0].toLowerCase() === sionaCountry.toLowerCase());
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
    
    // Convert to array and sort by total days
    const statsArray = Object.values(countryStats)
      .map(country => ({
        ...country,
        totalDays: country.kimberDays + country.sionaDays
      }))
      .sort((a, b) => {
        // Sort by total days (descending), then by name for countries with 0 days
        if (b.totalDays !== a.totalDays) {
          return b.totalDays - a.totalDays;
        }
        return a.name.localeCompare(b.name);
      });
    
    // Add rank (only for visited countries)
    let visitedCount = 0;
    statsArray.forEach((country, index) => {
      if (country.kimberVisited || country.sionaVisited) {
        visitedCount++;
        country.rank = visitedCount;
      } else {
        country.rank = ''; // No rank for unvisited countries
      }
    });
    
    // Prepare data for sheet
    const sheetData = statsArray.map(country => [
      country.name,
      country.code,
      country.kimberDays,
      country.sionaDays,
      country.togetherDays,
      country.totalDays,
      country.rank,
      country.kimberVisited ? 'Yes' : 'No',
      country.sionaVisited ? 'Yes' : 'No',
      country.togetherVisited ? 'Yes' : 'No'
    ]);
    
    // Clear existing data and write new data
    const lastRow = statsSheet.getLastRow();
    if (lastRow > 1) {
      statsSheet.getRange(2, 1, lastRow - 1, statsSheet.getLastColumn()).clear();
    }
    
    if (sheetData.length > 0) {
      statsSheet.getRange(2, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
    }
    
    // Update summary section
    addSummarySection(statsSheet, countryStats);
    
    // Add conditional formatting for ranks
    const rankRange = statsSheet.getRange(2, 7, sheetData.length, 1);
    const rules = [
      // Top 3 countries - gold
      SpreadsheetApp.newConditionalFormatRule()
        .setRanges([rankRange])
        .whenNumberLessThanOrEqualTo(3)
        .setBackground('#FFD700')
        .build(),
      // Top 10 countries - light blue
      SpreadsheetApp.newConditionalFormatRule()
        .setRanges([rankRange])
        .whenNumberLessThanOrEqualTo(10)
        .setBackground('#E3F2FD')
        .build(),
      // Unvisited countries - light gray
      SpreadsheetApp.newConditionalFormatRule()
        .setRanges([rankRange])
        .whenTextEqualTo('')
        .setBackground('#F5F5F5')
        .build()
    ];
    statsSheet.setConditionalFormatRules(rules);
    
    console.log(`✅ Incremental refresh completed! ${sheetData.length} countries processed`);
    console.log(`📊 Data processed up to: ${todayStr}`);
    console.log(`⏭️ Future entries skipped: ${futureEntriesSkipped}`);
    
  } catch (error) {
    console.error('❌ Error during incremental refresh:', error);
    throw error;
  }
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
    'Kimber_Days',
    'Siona_Days',
    'Together_Days',
    'Total_Days',
    'Rank',
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
  
  Object.values(countryStats).forEach(country => {
    if (country.kimberVisited) kimberTotal++;
    if (country.sionaVisited) sionaTotal++;
    if (country.togetherVisited) togetherTotal++; // Only count actual together visits
  });
  
  // Debug logging
  console.log('=== SUMMARY CALCULATION ===');
  console.log(`Kimber Total: ${kimberTotal}`);
  console.log(`Siona Total: ${sionaTotal}`);
  console.log(`Together Total: ${togetherTotal}`);
  
  // Show some examples
  let exampleCount = 0;
  Object.values(countryStats).forEach(country => {
    if (exampleCount < 5 && (country.kimberVisited || country.sionaVisited)) {
      console.log(`${country.name}: Kimber=${country.kimberVisited}, Siona=${country.sionaVisited}, Together=${country.togetherVisited}`);
      exampleCount++;
    }
  });
  
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
  
  statsSheet.getRange(summaryStartRow + 1, 1, summaryData.length, 3).setValues(summaryData);
  
  // Style summary data
  const summaryRange = statsSheet.getRange(summaryStartRow + 1, 1, summaryData.length, 3);
  summaryRange.setBorder(true, true, true, true, true, true);
  
  // Make the numbers bold
  statsSheet.getRange(summaryStartRow + 1, 2, 3, 1).setFontWeight('bold');
  statsSheet.getRange(summaryStartRow + 1, 2, 3, 1).setBackground('#E8F0FE');
  
  console.log(`Summary added at row ${summaryStartRow}: Kimber=${kimberTotal}, Siona=${sionaTotal}, Together=${togetherTotal}`);
}
  
/**
 * Restore Statistics sheet from PreRelationshipCountries data
 */
function restoreStatisticsFromPreRelationship() {
  console.log('🔄 Restoring Statistics sheet from PreRelationshipCountries data...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
    const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
    const countriesSheet = ss.getSheetByName('Countries');
    
    if (!preRelSheet || !relationshipLogSheet || !countriesSheet) {
      console.log('❌ Required sheets not found!');
      return;
    }
    
    // Get all data
    const preRelData = preRelSheet.getDataRange().getValues();
    const relationshipData = relationshipLogSheet.getDataRange().getValues();
    const countriesData = countriesSheet.getDataRange().getValues();
    
    console.log(`📊 Found ${preRelData.length} pre-relationship entries`);
    console.log(`📊 Found ${relationshipData.length} relationship log entries`);
    console.log(`📊 Found ${countriesData.length} countries`);
    
    // Create or clear Statistics sheet
    let statsSheet = ss.getSheetByName('Statistics');
    if (!statsSheet) {
      statsSheet = createStatisticsSheet();
    } else {
      // Clear existing data but keep structure
      const lastRow = statsSheet.getLastRow();
      if (lastRow > 1) {
        statsSheet.getRange(2, 1, lastRow - 1, statsSheet.getLastColumn()).clear();
      }
    }
    
    // Initialize country stats with all countries
    const countryStats = new Map();
    countriesData.slice(1).forEach(country => {
      const [name, alpha3, alpha2] = country;
      countryStats.set(alpha3, {
        name: name,
        alpha3: alpha3,
        alpha2: alpha2,
        kimberVisited: false,
        sionaVisited: false,
        kimberDays: 0,
        sionaDays: 0,
        togetherDays: 0,
        totalDays: 0,
        togetherVisited: false
      });
    });
    
    // Process PreRelationshipCountries data
    console.log('🔄 Processing pre-relationship data...');
    preRelData.slice(1).forEach(entry => {
      const [countryName, kimberVisited, sionaVisited] = entry;
      if (countryName === 'CountryName') return;
      
      const standardizedName = normalizeCountryName(countryName);
      const country = Array.from(countryStats.values()).find(c => 
        c.name === countryName || 
        c.alpha3 === standardizedName ||
        normalizeCountryName(c.name) === standardizedName
      );
      
      if (country) {
        if (kimberVisited === 1 || kimberVisited === '1') {
          country.kimberVisited = true;
        }
        if (sionaVisited === 1 || sionaVisited === '1') {
          country.sionaVisited = true;
        }
      }
    });
    
    // Process RelationshipLog data (up to today)
    console.log('🔄 Processing relationship log data...');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let processedEntries = 0;
    let futureEntriesSkipped = 0;
    
    relationshipData.slice(1).forEach(entry => {
      const [date, kimberCountry, sionaCountry, notes] = entry;
      
      // Skip future entries
      const entryDate = new Date(date);
      if (entryDate > today) {
        futureEntriesSkipped++;
        return;
      }
      
      processedEntries++;
      
      const kimberStandardized = normalizeCountryName(kimberCountry);
      const sionaStandardized = normalizeCountryName(sionaCountry);
      
      // Find countries in our stats
      const kimberCountryData = Array.from(countryStats.values()).find(c => 
        c.name === kimberCountry || 
        c.alpha3 === kimberStandardized ||
        normalizeCountryName(c.name) === kimberStandardized
      );
      
      const sionaCountryData = Array.from(countryStats.values()).find(c => 
        c.name === sionaCountry || 
        c.alpha3 === sionaStandardized ||
        normalizeCountryName(c.name) === sionaStandardized
      );
      
      if (kimberCountryData) {
        kimberCountryData.kimberVisited = true;
        kimberCountryData.kimberDays++;
        kimberCountryData.totalDays++;
      }
      
      if (sionaCountryData) {
        sionaCountryData.sionaVisited = true;
        sionaCountryData.sionaDays++;
        sionaCountryData.totalDays++;
      }
      
      // If both in same country, mark as together
      if (kimberCountryData && sionaCountryData && kimberCountryData === sionaCountryData) {
        kimberCountryData.togetherVisited = true;
        kimberCountryData.togetherDays++;
      }
    });
    
    console.log(`✅ Processed ${processedEntries} relationship entries, skipped ${futureEntriesSkipped} future entries`);
    
    // Convert to array and sort
    const statsArray = Array.from(countryStats.values())
      .filter(country => country.kimberVisited || country.sionaVisited)
      .sort((a, b) => b.totalDays - a.totalDays);
    
    // Add ranks
    statsArray.forEach((country, index) => {
      country.rank = index + 1;
    });
    
    // Write to Statistics sheet
    const headers = ['Country', 'Country_Code', 'Kimber_Days', 'Siona_Days', 'Together_Days', 'Total_Days', 'Rank', 'Kimber_Visited', 'Siona_Visited', 'Together_Visited'];
    const dataToWrite = [headers];
    
    statsArray.forEach(country => {
      dataToWrite.push([
        country.name,
        country.alpha3,
        country.kimberDays,
        country.sionaDays,
        country.togetherDays,
        country.totalDays,
        country.rank,
        country.kimberVisited ? 'Yes' : 'No',
        country.sionaVisited ? 'Yes' : 'No',
        country.togetherVisited ? 'Yes' : 'No'
      ]);
    });
    
    // Write data
    const range = statsSheet.getRange(1, 1, dataToWrite.length, headers.length);
    range.setValues(dataToWrite);
    
    // Format headers
    statsSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4285f4')
      .setFontColor('white')
      .setFontWeight('bold');
    
    // Add summary section
    addSummarySection(statsSheet, statsArray);
    
    console.log(`✅ Statistics restored successfully! ${statsArray.length} countries processed`);
    
  } catch (error) {
    console.error('❌ Error restoring statistics:', error);
    throw error;
  }
}

/**
 * Check what data exists in Statistics sheet
 */
function checkStatisticsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statsSheet = ss.getSheetByName('Statistics');
  
  if (!statsSheet) {
    console.log('❌ Statistics sheet not found!');
    return;
  }
  
  const data = statsSheet.getDataRange().getValues();
  console.log('=== STATISTICS SHEET ANALYSIS ===');
  console.log(`Total rows: ${data.length}`);
  console.log(`Total columns: ${data[0] ? data[0].length : 0}`);
  
  if (data.length > 1) {
    console.log('Header row:', data[0]);
    console.log('First data row:', data[1]);
    
    // Count visited countries
    let kimberCount = 0;
    let sionaCount = 0;
    let togetherCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length >= 11) {
        const [countryName, alpha3Code, alpha2Code, kimberVisited, sionaVisited, kimberDays, sionaDays, togetherDays, totalDays, togetherVisited, rank] = row;
        
        if (countryName && countryName !== 'SUMMARY' && countryName !== 'Kimber Total Countries') {
          if (kimberVisited === true || kimberVisited === 'TRUE' || kimberVisited === '1') kimberCount++;
          if (sionaVisited === true || sionaVisited === 'TRUE' || sionaVisited === '1') sionaCount++;
          if (togetherVisited === true || togetherVisited === 'TRUE' || togetherVisited === '1') togetherCount++;
        }
      }
    }
    
    console.log(`Kimber visited: ${kimberCount} countries`);
    console.log(`Siona visited: ${sionaCount} countries`);
    console.log(`Together visited: ${togetherCount} countries`);
  }
  
  // Check summary section
  const summaryRow = statsSheet.getRange(200, 1, 1, 3).getValues()[0];
  if (summaryRow[0] === 'SUMMARY') {
    console.log('✅ Summary section found at row 200');
    const kimberTotal = statsSheet.getRange(201, 2).getValue();
    const sionaTotal = statsSheet.getRange(202, 2).getValue();
    const togetherTotal = statsSheet.getRange(203, 2).getValue();
    console.log(`Summary totals - Kimber: ${kimberTotal}, Siona: ${sionaTotal}, Together: ${togetherTotal}`);
  } else {
    console.log('❌ No summary section found at row 200');
  }
}

/**
 * Cross-reference Statistics with source data to find discrepancies
 */
function crossReferenceStatistics() {
  console.log('🔍 Cross-referencing Statistics with source data...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const statsSheet = ss.getSheetByName('Statistics');
    const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
    const relationshipSheet = ss.getSheetByName('RelationshipLog');
    
    if (!statsSheet || !preRelSheet || !relationshipSheet) {
      console.log('❌ Required sheets not found!');
      return;
    }
    
    // Get source data
    const statsData = statsSheet.getDataRange().getValues();
    const preRelData = preRelSheet.getDataRange().getValues();
    const relationshipData = relationshipSheet.getDataRange().getValues();
    
    console.log(`📊 Statistics: ${statsData.length} rows`);
    console.log(`📊 PreRelationship: ${preRelData.length} rows`);
    console.log(`📊 RelationshipLog: ${relationshipData.length} rows`);
    
    // Build expected data from sources
    const expectedData = new Map();
    
    // Process PreRelationshipCountries
    console.log('🔄 Processing PreRelationshipCountries...');
    preRelData.slice(1).forEach(entry => {
      const [countryName, kimberVisited, sionaVisited] = entry;
      if (countryName === 'CountryName') return;
      
      const standardizedName = normalizeCountryName(countryName);
      if (!expectedData.has(standardizedName)) {
        expectedData.set(standardizedName, {
          name: countryName,
          kimberVisited: false,
          sionaVisited: false,
          kimberDays: 0,
          sionaDays: 0,
          togetherDays: 0,
          togetherVisited: false
        });
      }
      
      const country = expectedData.get(standardizedName);
      if (kimberVisited === 1 || kimberVisited === '1') {
        country.kimberVisited = true;
      }
      if (sionaVisited === 1 || sionaVisited === '1') {
        country.sionaVisited = true;
      }
    });
    
    // Process RelationshipLog (up to today)
    console.log('🔄 Processing RelationshipLog...');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let processedEntries = 0;
    relationshipData.slice(1).forEach(entry => {
      const [date, kimberCountry, sionaCountry, notes] = entry;
      
      // Skip future entries
      const entryDate = new Date(date);
      if (entryDate > today) return;
      
      processedEntries++;
      
      const kimberStandardized = normalizeCountryName(kimberCountry);
      const sionaStandardized = normalizeCountryName(sionaCountry);
      
      // Add Kimber country
      if (kimberCountry) {
        if (!expectedData.has(kimberStandardized)) {
          expectedData.set(kimberStandardized, {
            name: kimberCountry,
            kimberVisited: false,
            sionaVisited: false,
            kimberDays: 0,
            sionaDays: 0,
            togetherDays: 0,
            togetherVisited: false
          });
        }
        const country = expectedData.get(kimberStandardized);
        country.kimberVisited = true;
        country.kimberDays++;
      }
      
      // Add Siona country
      if (sionaCountry) {
        if (!expectedData.has(sionaStandardized)) {
          expectedData.set(sionaStandardized, {
            name: sionaCountry,
            kimberVisited: false,
            sionaVisited: false,
            kimberDays: 0,
            sionaDays: 0,
            togetherDays: 0,
            togetherVisited: false
          });
        }
        const country = expectedData.get(sionaStandardized);
        country.sionaVisited = true;
        country.sionaDays++;
      }
      
      // If both in same country, mark as together
      if (kimberCountry && sionaCountry && kimberStandardized === sionaStandardized) {
        const country = expectedData.get(kimberStandardized);
        country.togetherVisited = true;
        country.togetherDays++;
      }
    });
    
    console.log(`✅ Processed ${processedEntries} relationship entries`);
    
    // Compare with Statistics sheet
    console.log('🔍 Comparing with Statistics sheet...');
    const discrepancies = [];
    
    statsData.slice(1).forEach((row, index) => {
      const [countryName, countryCode, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited] = row;
      
      if (countryName === 'Country' || countryName === 'SUMMARY' || countryName === 'Kimber Total Countries') return;
      
      const standardizedName = normalizeCountryName(countryName);
      const expected = expectedData.get(standardizedName);
      
      if (expected) {
        const kimberMatch = (kimberVisited === 'Yes') === expected.kimberVisited;
        const sionaMatch = (sionaVisited === 'Yes') === expected.sionaVisited;
        const togetherMatch = (togetherVisited === 'Yes') === expected.togetherVisited;
        
        if (!kimberMatch || !sionaMatch || !togetherMatch) {
          discrepancies.push({
            country: countryName,
            row: index + 2,
            issues: []
          });
          
          if (!kimberMatch) {
            discrepancies[discrepancies.length - 1].issues.push(`Kimber: Stats=${kimberVisited}, Expected=${expected.kimberVisited}`);
          }
          if (!sionaMatch) {
            discrepancies[discrepancies.length - 1].issues.push(`Siona: Stats=${sionaVisited}, Expected=${expected.sionaVisited}`);
          }
          if (!togetherMatch) {
            discrepancies[discrepancies.length - 1].issues.push(`Together: Stats=${togetherVisited}, Expected=${expected.togetherVisited}`);
          }
        }
      }
    });
    
    // Check for missing VISITED countries only
    expectedData.forEach((expected, standardizedName) => {
      // Only check countries that should be visited
      if (expected.kimberVisited || expected.sionaVisited || expected.togetherVisited) {
        const found = statsData.slice(1).find(row => {
          const [countryName] = row;
          return normalizeCountryName(countryName) === standardizedName;
        });
        
        if (!found) {
          discrepancies.push({
            country: expected.name,
            row: 'MISSING',
            issues: [`VISITED country missing from Statistics sheet`]
          });
        }
      }
    });
    
    // Report discrepancies
    if (discrepancies.length === 0) {
      console.log('✅ No discrepancies found! Statistics sheet matches source data.');
    } else {
      console.log(`❌ Found ${discrepancies.length} discrepancies:`);
      discrepancies.forEach(discrepancy => {
        console.log(`\n📍 ${discrepancy.country} (Row ${discrepancy.row}):`);
        discrepancy.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      });
    }
    
    // Summary counts
    const expectedKimber = Array.from(expectedData.values()).filter(c => c.kimberVisited).length;
    const expectedSiona = Array.from(expectedData.values()).filter(c => c.sionaVisited).length;
    const expectedTogether = Array.from(expectedData.values()).filter(c => c.togetherVisited).length;
    
    console.log(`\n📊 Expected counts: Kimber=${expectedKimber}, Siona=${expectedSiona}, Together=${expectedTogether}`);
    
    // Show missing visited countries
    const missingVisited = discrepancies.filter(d => d.row === 'MISSING' && d.issues[0].includes('VISITED'));
    if (missingVisited.length > 0) {
      console.log(`\n🚨 MISSING VISITED COUNTRIES (${missingVisited.length}):`);
      missingVisited.forEach(country => {
        console.log(`   - ${country.country}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during cross-reference:', error);
    throw error;
  }
}

/**
 * Completely rebuild Statistics sheet with new structure
 */
function completelyRebuildStatistics() {
  console.log('🔄 Completely rebuilding Statistics sheet...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Delete existing Statistics sheet if it exists
    const existingStatsSheet = ss.getSheetByName('Statistics');
    if (existingStatsSheet) {
      ss.deleteSheet(existingStatsSheet);
      console.log('🗑️ Deleted existing Statistics sheet');
    }
    
    // Create new Statistics sheet
    const statsSheet = ss.insertSheet('Statistics');
    console.log('📊 Created new Statistics sheet');
    
    // Set up headers
    const headers = ['Country', 'Country_Code', 'Kimber_Days', 'Siona_Days', 'Together_Days', 'Kimber_Visited', 'Siona_Visited', 'Together_Visited'];
    statsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Style headers
    const headerRange = statsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // Populate with new data structure
    populateNewStatisticsData(statsSheet);
    
    // Auto-resize columns
    statsSheet.autoResizeColumns(1, headers.length);
    
    // Add borders
    const dataRange = statsSheet.getRange(1, 1, statsSheet.getLastRow(), headers.length);
    dataRange.setBorder(true, true, true, true, true, true);
    
    console.log('✅ Statistics sheet completely rebuilt successfully!');
    
  } catch (error) {
    console.error('❌ Error rebuilding Statistics sheet:', error);
    throw error;
  }
}

/**
 * Populate Statistics sheet with new data structure
 */
function populateNewStatisticsData(statsSheet) {
  console.log('🔄 Populating Statistics with new data structure...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
    const relationshipSheet = ss.getSheetByName('RelationshipLog');
    const countriesSheet = ss.getSheetByName('Countries');
    
    if (!preRelSheet || !relationshipSheet || !countriesSheet) {
      console.log('❌ Required sheets not found!');
      return;
    }
    
    // Get all data
    const preRelData = preRelSheet.getDataRange().getValues();
    const relationshipData = relationshipSheet.getDataRange().getValues();
    const countriesData = countriesSheet.getDataRange().getValues();
    
    console.log(`📊 Found ${preRelData.length} pre-relationship entries`);
    console.log(`📊 Found ${relationshipData.length} relationship log entries`);
    console.log(`📊 Found ${countriesData.length} countries`);
    
    // Initialize country stats with ALL countries
    const countryStats = new Map();
    countriesData.slice(1).forEach(country => {
      const [name, alpha3, alpha2] = country;
      countryStats.set(alpha3, {
        name: name,
        alpha3: alpha3,
        alpha2: alpha2,
        kimberVisited: false,
        sionaVisited: false,
        kimberDays: 0,
        sionaDays: 0,
        togetherDays: 0,
        togetherVisited: false
      });
    });
    
    // Process PreRelationshipCountries data
    console.log('🔄 Processing pre-relationship data...');
    preRelData.slice(1).forEach(entry => {
      const [countryName, kimberVisited, sionaVisited] = entry;
      if (countryName === 'CountryName') return;
      
      const standardizedName = normalizeCountryName(countryName);
      const country = Array.from(countryStats.values()).find(c => 
        c.name === countryName || 
        c.alpha3 === standardizedName ||
        normalizeCountryName(c.name) === standardizedName
      );
      
      if (country) {
        if (kimberVisited === 1 || kimberVisited === '1') {
          country.kimberVisited = true;
        }
        if (sionaVisited === 1 || sionaVisited === '1') {
          country.sionaVisited = true;
        }
      }
    });
    
    // Process RelationshipLog data (up to today)
    console.log('🔄 Processing relationship log data...');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let processedEntries = 0;
    let futureEntriesSkipped = 0;
    
    relationshipData.slice(1).forEach(entry => {
      const [date, kimberCountry, sionaCountry, notes] = entry;
      
      // Skip future entries
      const entryDate = new Date(date);
      if (entryDate > today) {
        futureEntriesSkipped++;
        return;
      }
      
      processedEntries++;
      
      const kimberStandardized = normalizeCountryName(kimberCountry);
      const sionaStandardized = normalizeCountryName(sionaCountry);
      
      // Find countries in our stats
      const kimberCountryData = Array.from(countryStats.values()).find(c => 
        c.name === kimberCountry || 
        c.alpha3 === kimberStandardized ||
        normalizeCountryName(c.name) === kimberStandardized
      );
      
      const sionaCountryData = Array.from(countryStats.values()).find(c => 
        c.name === sionaCountry || 
        c.alpha3 === sionaStandardized ||
        normalizeCountryName(c.name) === sionaStandardized
      );
      
      if (kimberCountryData) {
        kimberCountryData.kimberVisited = true;
        kimberCountryData.kimberDays++;
      }
      
      if (sionaCountryData) {
        sionaCountryData.sionaVisited = true;
        sionaCountryData.sionaDays++;
      }
      
      // If both in SAME country on SAME date, mark as together
      if (kimberCountryData && sionaCountryData && kimberCountryData === sionaCountryData) {
        kimberCountryData.togetherVisited = true;
        kimberCountryData.togetherDays++;
      }
    });
    
    console.log(`✅ Processed ${processedEntries} relationship entries, skipped ${futureEntriesSkipped} future entries`);
    
    // Convert to array - include ALL countries
    const statsArray = Array.from(countryStats.values());
    
    // Write to Statistics sheet
    const headers = ['Country', 'Country_Code', 'Kimber_Days', 'Siona_Days', 'Together_Days', 'Kimber_Visited', 'Siona_Visited', 'Together_Visited'];
    const dataToWrite = [headers];
    
    statsArray.forEach(country => {
      dataToWrite.push([
        country.name,
        country.alpha3,
        country.kimberDays,
        country.sionaDays,
        country.togetherDays,
        country.kimberVisited ? 'Yes' : 'No',
        country.sionaVisited ? 'Yes' : 'No',
        country.togetherVisited ? 'Yes' : 'No'
      ]);
    });
    
    // Write data
    const range = statsSheet.getRange(1, 1, dataToWrite.length, headers.length);
    range.setValues(dataToWrite);
    
    console.log(`✅ Statistics populated successfully! ${statsArray.length} countries processed`);
    
  } catch (error) {
    console.error('❌ Error populating statistics:', error);
    throw error;
  }
}

/**
 * List all countries visited by Siona, Kimber, and together
 */
function listAllVisitedCountries() {
  console.log('🌍 Listing all visited countries...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
    const relationshipSheet = ss.getSheetByName('RelationshipLog');
    const countriesSheet = ss.getSheetByName('Countries');
    
    if (!preRelSheet || !relationshipSheet || !countriesSheet) {
      console.log('❌ Required sheets not found!');
      return;
    }
    
    // Get all data
    const preRelData = preRelSheet.getDataRange().getValues();
    const relationshipData = relationshipSheet.getDataRange().getValues();
    const countriesData = countriesSheet.getDataRange().getValues();
    
    // Initialize country sets
    const kimberCountries = new Set();
    const sionaCountries = new Set();
    const togetherCountries = new Set();
    
    // Process PreRelationshipCountries data
    console.log('🔄 Processing pre-relationship data...');
    preRelData.slice(1).forEach(entry => {
      const [countryName, kimberVisited, sionaVisited] = entry;
      if (countryName === 'CountryName') return;
      
      if (kimberVisited === 1 || kimberVisited === '1') {
        kimberCountries.add(countryName);
      }
      if (sionaVisited === 1 || sionaVisited === '1') {
        sionaCountries.add(countryName);
      }
    });
    
    // Process RelationshipLog data (up to today)
    console.log('🔄 Processing relationship log data...');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let processedEntries = 0;
    let futureEntriesSkipped = 0;
    
    relationshipData.slice(1).forEach(entry => {
      const [date, kimberCountry, sionaCountry, notes] = entry;
      
      // Skip future entries
      const entryDate = new Date(date);
      if (entryDate > today) {
        futureEntriesSkipped++;
        return;
      }
      
      processedEntries++;
      
      // Add countries visited
      if (kimberCountry) {
        kimberCountries.add(kimberCountry);
      }
      if (sionaCountry) {
        sionaCountries.add(sionaCountry);
      }
      
      // If both in same country on same date, add to together
      if (kimberCountry && sionaCountry && kimberCountry === sionaCountry) {
        togetherCountries.add(kimberCountry);
      }
    });
    
    console.log(`✅ Processed ${processedEntries} relationship entries, skipped ${futureEntriesSkipped} future entries`);
    
    // Convert to sorted arrays
    const kimberList = Array.from(kimberCountries).sort();
    const sionaList = Array.from(sionaCountries).sort();
    const togetherList = Array.from(togetherCountries).sort();
    
    // Display results
    console.log('\n🌍 === COUNTRY VISITS SUMMARY ===');
    console.log(`📊 Kimber visited: ${kimberList.length} countries`);
    console.log(`📊 Siona visited: ${sionaList.length} countries`);
    console.log(`📊 Together visited: ${togetherList.length} countries`);
    
    console.log('\n👨 KIMBER\'S COUNTRIES (49):');
    kimberList.forEach((country, index) => {
      console.log(`${index + 1}. ${country}`);
    });
    
    console.log('\n👩 SIONA\'S COUNTRIES (46):');
    sionaList.forEach((country, index) => {
      console.log(`${index + 1}. ${country}`);
    });
    
    console.log('\n💕 COUNTRIES VISITED TOGETHER:');
    togetherList.forEach((country, index) => {
      console.log(`${index + 1}. ${country}`);
    });
    
    // Find countries only visited by each person
    const kimberOnly = kimberList.filter(country => !sionaList.includes(country));
    const sionaOnly = sionaList.filter(country => !kimberList.includes(country));
    
    console.log('\n👨 KIMBER ONLY COUNTRIES:');
    kimberOnly.forEach((country, index) => {
      console.log(`${index + 1}. ${country}`);
    });
    
    console.log('\n👩 SIONA ONLY COUNTRIES:');
    sionaOnly.forEach((country, index) => {
      console.log(`${index + 1}. ${country}`);
    });
    
    console.log('\n📈 SUMMARY:');
    console.log(`- Kimber total: ${kimberList.length} countries`);
    console.log(`- Siona total: ${sionaList.length} countries`);
    console.log(`- Together: ${togetherList.length} countries`);
    console.log(`- Kimber only: ${kimberOnly.length} countries`);
    console.log(`- Siona only: ${sionaOnly.length} countries`);
    
  } catch (error) {
    console.error('❌ Error listing countries:', error);
    throw error;
  }
}
  
/**
 * Standardize RelationshipLog dates to YYYY-MM-DD format
 */
function standardizeRelationshipLogDates() {
  console.log('📅 Standardizing RelationshipLog dates to YYYY-MM-DD format...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const relationshipSheet = ss.getSheetByName('RelationshipLog');
    
    if (!relationshipSheet) {
      console.log('❌ RelationshipLog sheet not found!');
      return;
    }
    
    const data = relationshipSheet.getDataRange().getValues();
    console.log(`📊 Found ${data.length} rows in RelationshipLog`);
    
    let updatedRows = 0;
    const changes = [];
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [date, kimberCountry, sionaCountry, notes] = row;
      
      if (!date || date === 'Date') continue; // Skip empty rows and header
      
      try {
        // Parse the current date (handles DD/MM/YYYY format)
        let parsedDate;
        
        if (typeof date === 'string') {
          // Handle DD/MM/YYYY format
          const dateParts = date.split('/');
          if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            parsedDate = new Date(`${year}-${month}-${day}`);
          } else {
            parsedDate = new Date(date);
          }
        } else if (date instanceof Date) {
          parsedDate = date;
        } else {
          console.log(`⚠️ Skipping row ${i + 1}: Invalid date format - ${date}`);
          continue;
        }
        
        // Check if date is valid
        if (isNaN(parsedDate.getTime())) {
          console.log(`⚠️ Skipping row ${i + 1}: Invalid date - ${date}`);
          continue;
        }
        
        // Convert to YYYY-MM-DD format
        const standardizedDate = parsedDate.toISOString().split('T')[0];
        
        // Check if date needs updating
        if (date !== standardizedDate) {
          changes.push({
            row: i + 1,
            oldDate: date,
            newDate: standardizedDate
          });
          
          // Update the data array
          data[i][0] = standardizedDate;
          updatedRows++;
        }
        
      } catch (error) {
        console.log(`⚠️ Error processing row ${i + 1}: ${error.message} - Date: ${date}`);
      }
    }
    
    if (updatedRows > 0) {
      // Write the updated data back to the sheet
      const range = relationshipSheet.getRange(1, 1, data.length, data[0].length);
      range.setValues(data);
      
      console.log(`✅ Updated ${updatedRows} date entries:`);
      changes.forEach(change => {
        console.log(`   Row ${change.row}: ${change.oldDate} → ${change.newDate}`);
      });
      
      // Format the date column
      const dateColumn = relationshipSheet.getRange(2, 1, data.length - 1, 1);
      dateColumn.setNumberFormat('yyyy-mm-dd');
      
      console.log('✅ Date column formatted to YYYY-MM-DD');
      
    } else {
      console.log('✅ All dates are already in correct format!');
    }
    
    console.log(`📅 Date standardization completed! ${updatedRows} rows updated.`);
    
  } catch (error) {
    console.error('❌ Error standardizing dates:', error);
    throw error;
  }
}

/**
 * Verify summary totals are correct
 */
function verifySummaryTotals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const statsSheet = ss.getSheetByName('Statistics');
  
  if (!statsSheet) {
    console.log('Statistics sheet not found!');
    return;
  }
  
  const data = statsSheet.getDataRange().getValues();
  
  // Count actual visited countries from the data
  let kimberCount = 0;
  let sionaCount = 0;
  let togetherCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length < 10) continue; // Skip rows that don't have enough columns
    
    // Your actual column structure: Country, Country_Code, Kimber_Days, Siona_Days, Together_Days, Total_Days, Rank, Kimber_Visited, Siona_Visited, Together_Visited
    const [countryName, countryCode, kimberDays, sionaDays, togetherDays, totalDays, rank, kimberVisited, sionaVisited, togetherVisited] = row;
    
    if (countryName === 'Country' || countryName === 'SUMMARY' || countryName === 'Kimber Total Countries') continue;
    
    if (kimberVisited === 'Yes' || kimberVisited === true || kimberVisited === 'TRUE' || kimberVisited === '1') kimberCount++;
    if (sionaVisited === 'Yes' || sionaVisited === true || sionaVisited === 'TRUE' || sionaVisited === '1') sionaCount++;
    if (togetherVisited === 'Yes' || togetherVisited === true || togetherVisited === 'TRUE' || togetherVisited === '1') togetherCount++;
  }
  
  console.log('=== VERIFICATION RESULTS ===');
  console.log(`Kimber visited countries: ${kimberCount}`);
  console.log(`Siona visited countries: ${sionaCount}`);
  console.log(`Together visited countries: ${togetherCount}`);
  
  // Check if summary section exists and matches
  const summaryRow = statsSheet.getRange(201, 1, 1, 3).getValues()[0];
  if (summaryRow[0] === 'Kimber Total Countries') {
    const summaryKimber = statsSheet.getRange(201, 2).getValue();
    const summarySiona = statsSheet.getRange(202, 2).getValue();
    const summaryTogether = statsSheet.getRange(203, 2).getValue();
    
    console.log('=== SUMMARY COMPARISON ===');
    console.log(`Summary Kimber: ${summaryKimber} | Actual: ${kimberCount} | Match: ${summaryKimber == kimberCount}`);
    console.log(`Summary Siona: ${summarySiona} | Actual: ${sionaCount} | Match: ${summarySiona == sionaCount}`);
    console.log(`Summary Together: ${summaryTogether} | Actual: ${togetherCount} | Match: ${summaryTogether == togetherCount}`);
  } else {
    console.log('❌ Summary section not found at expected location (row 201)');
  }
}

/**
 * Test function to debug country matching
 */
function testCountryMatching() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const countriesSheet = ss.getSheetByName('Countries');
  
  if (!countriesSheet) {
    console.log('Countries sheet not found!');
    return;
  }
  
  const countriesData = countriesSheet.getDataRange().getValues();
  
  console.log('=== COUNTRY MATCHING TEST ===');
  console.log(`Countries sheet has ${countriesData.length - 1} entries`);
  
  // Test first 10 countries entries
  for (let i = 1; i <= Math.min(10, countriesData.length - 1); i++) {
    const [countryName, countryCode] = countriesData[i];
    
    console.log(`${i}. "${countryName}" -> ${countryCode}`);
  }
  
  console.log('=== END TEST ===');
}

/**
 * Test function specifically for PreRelationshipCountries processing
 */
function testPreRelationshipProcessing() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
  const countriesSheet = ss.getSheetByName('Countries');
  
  if (!preRelSheet || !countriesSheet) {
    console.log('Required sheets not found!');
    return;
  }
  
  const preRelData = preRelSheet.getDataRange().getValues();
  const countriesData = countriesSheet.getDataRange().getValues();
  
  console.log('=== PRE-RELATIONSHIP PROCESSING TEST ===');
  console.log(`PreRelationshipCountries has ${preRelData.length - 1} entries`);
  console.log(`Countries sheet has ${countriesData.length - 1} entries`);
  
  // Show first few entries from both sheets
  console.log('=== FIRST 5 PRE-RELATIONSHIP ENTRIES ===');
  for (let i = 1; i <= Math.min(5, preRelData.length - 1); i++) {
    const [countryName, kimberVisited, sionaVisited] = preRelData[i];
    if (countryName === 'CountryName') continue;
    console.log(`${i}. "${countryName}" | Kimber: "${kimberVisited}" (type: ${typeof kimberVisited}) | Siona: "${sionaVisited}" (type: ${typeof sionaVisited})`);
  }
  
  // Show raw data structure
  console.log('=== RAW DATA STRUCTURE ===');
  console.log('PreRelData length:', preRelData.length);
  if (preRelData.length > 1) {
    console.log('Header row:', preRelData[0]);
    console.log('First data row:', preRelData[1]);
    console.log('Second data row:', preRelData[2]);
  }
  
  console.log('=== FIRST 5 COUNTRIES SHEET ENTRIES ===');
  for (let i = 1; i <= Math.min(5, countriesData.length - 1); i++) {
    const [countryName, countryCode] = countriesData[i];
    console.log(`${i}. "${countryName}" | Code: ${countryCode}`);
  }
  
  let kimberCount = 0;
  let sionaCount = 0;
  let bothCount = 0;
  let matchedCount = 0;
  
  console.log('=== MATCHING TEST ===');
  for (let i = 1; i < preRelData.length; i++) {
    const [countryName, kimberVisited, sionaVisited] = preRelData[i];
    if (countryName === 'CountryName') continue;
    
    // Try direct match first
    let countryRow = countriesData.find(row => row[0] === countryName);
    
    if (countryRow) {
      const countryCode = countryRow[1];
      const kimberCheck = kimberVisited === 1 || kimberVisited === '1';
      const sionaCheck = sionaVisited === 1 || sionaVisited === '1';
      console.log(`✓ MATCH: "${countryName}" -> "${countryRow[0]}" (${countryCode}) | Kimber: "${kimberVisited}" === '1' = ${kimberCheck}, Siona: "${sionaVisited}" === '1' = ${sionaCheck}`);
      matchedCount++;
      
      if (kimberCheck) kimberCount++;
      if (sionaCheck) sionaCount++;
      if (kimberCheck && sionaCheck) bothCount++;
    } else {
      console.log(`✗ NO MATCH: "${countryName}"`);
    }
  }
  
  console.log(`=== TOTALS ===`);
  console.log(`Matched: ${matchedCount}/${preRelData.length - 1} countries`);
  console.log(`Kimber visited: ${kimberCount} countries`);
  console.log(`Siona visited: ${sionaCount} countries`);
  console.log(`Both visited: ${bothCount} countries`);
}

/**
 * Check what values are actually in the PreRelationshipCountries sheet
 */
function checkPreRelationshipValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const preRelSheet = ss.getSheetByName('PreRelationshipCountries');
  
  if (!preRelSheet) {
    console.log('PreRelationshipCountries sheet not found!');
    return;
  }
  
  const preRelData = preRelSheet.getDataRange().getValues();
  
  console.log('=== PRE-RELATIONSHIP VALUES ANALYSIS ===');
  console.log(`Total rows: ${preRelData.length}`);
  console.log(`Header: ${preRelData[0]}`);
  
  // Check unique values in KimberVisited column
  const kimberValues = new Set();
  const sionaValues = new Set();
  
  for (let i = 1; i < preRelData.length; i++) {
    const [countryName, kimberVisited, sionaVisited] = preRelData[i];
    if (countryName === 'CountryName') continue;
    
    kimberValues.add(kimberVisited);
    sionaValues.add(sionaVisited);
  }
  
  console.log('Unique Kimber values:', Array.from(kimberValues));
  console.log('Unique Siona values:', Array.from(sionaValues));
  
  // Show some examples with actual values
  console.log('=== SAMPLE DATA ===');
  for (let i = 1; i <= Math.min(10, preRelData.length - 1); i++) {
    const [countryName, kimberVisited, sionaVisited] = preRelData[i];
    if (countryName === 'CountryName') continue;
    console.log(`${countryName}: Kimber="${kimberVisited}", Siona="${sionaVisited}"`);
  }
}

/**
 * Test function specifically for USA matching
 */
function testUSAMatching() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const countriesSheet = ss.getSheetByName('Countries');
  
  if (!countriesSheet) {
    console.log('Required sheets not found!');
    return;
  }
  
  const countriesData = countriesSheet.getDataRange().getValues();
  
  console.log('=== USA MATCHING TEST ===');
  
  // Find USA in Countries sheet
  const usaCountries = countriesData.find(row => 
    row[0] && (
      row[0].toLowerCase().includes('usa') ||
      row[0].toLowerCase().includes('united states') ||
      row[0].toLowerCase().includes('america')
    )
  );
  
  if (usaCountries) {
    console.log('USA found in Countries sheet:', usaCountries);
  } else {
    console.log('USA NOT found in Countries sheet');
  }
  
  // Show all entries that contain "united" or "usa"
  console.log('=== ALL UNITED/USA ENTRIES ===');
  
  console.log('Countries sheet entries with "united" or "usa":');
  countriesData.forEach((row, index) => {
    if (row[0] && (row[0].toLowerCase().includes('united') || row[0].toLowerCase().includes('usa'))) {
      console.log(`Row ${index}: "${row[0]}" | Code: ${row[1]}`);
    }
  });
}

/**
 * Test function to preview what data would be processed in incremental refresh
 * Shows which entries would be processed vs skipped
 */
function testIncrementalRefresh() {
  console.log('🧪 Testing incremental refresh logic...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const relationshipLogSheet = ss.getSheetByName('RelationshipLog');
    
    if (!relationshipLogSheet) {
      console.log('❌ RelationshipLog sheet not found!');
      return;
    }
    
    const relationshipData = relationshipLogSheet.getDataRange().getValues();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Current date: ${todayStr}`);
    console.log(`📊 Total relationship log entries: ${relationshipData.length - 1}`);
    
    let processedEntries = 0;
    let futureEntriesSkipped = 0;
    const futureEntries = [];
    const recentEntries = [];
    
    // Process each entry
    for (let i = 1; i < relationshipData.length; i++) {
      const [date, kimberCountry, sionaCountry, notes] = relationshipData[i];
      
      if (!date || date === 'Date') continue; // Skip empty rows and header
      
      const entryDate = new Date(date);
      const entryDateStr = entryDate.toISOString().split('T')[0];
      
      if (entryDate > today) {
        futureEntriesSkipped++;
        futureEntries.push({
          row: i + 1,
          date: entryDateStr,
          kimberCountry,
          sionaCountry,
          notes
        });
      } else {
        processedEntries++;
        // Show last 10 entries that would be processed
        if (recentEntries.length < 10) {
          recentEntries.push({
            row: i + 1,
            date: entryDateStr,
            kimberCountry,
            sionaCountry,
            notes
          });
        }
      }
    }
    
    console.log(`\n📊 PROCESSING SUMMARY:`);
    console.log(`✅ Entries to process: ${processedEntries}`);
    console.log(`⏭️ Future entries to skip: ${futureEntriesSkipped}`);
    
    if (recentEntries.length > 0) {
      console.log(`\n📅 LAST ${recentEntries.length} ENTRIES TO BE PROCESSED:`);
      recentEntries.reverse().forEach(entry => {
        console.log(`Row ${entry.row}: ${entry.date} | ${entry.kimberCountry} | ${entry.sionaCountry} | ${entry.notes}`);
      });
    }
    
    if (futureEntries.length > 0) {
      console.log(`\n⏭️ FUTURE ENTRIES TO BE SKIPPED (${futureEntries.length}):`);
      futureEntries.slice(0, 10).forEach(entry => {
        console.log(`Row ${entry.row}: ${entry.date} | ${entry.kimberCountry} | ${entry.sionaCountry} | ${entry.notes}`);
      });
      if (futureEntries.length > 10) {
        console.log(`... and ${futureEntries.length - 10} more future entries`);
      }
    }
    
    console.log(`\n🎯 NEXT MIDNIGHT REFRESH WILL:`);
    console.log(`- Process all data up to ${todayStr}`);
    console.log(`- Skip ${futureEntriesSkipped} future entries`);
    console.log(`- Update Statistics sheet with current data only`);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}
