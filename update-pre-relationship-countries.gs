function updatePreRelationshipCountries() {
  const spreadsheetId = '1OcJ76HBPrdN461U7NEgM9Tsazf78WcFUh24zjXN-Q-8';
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // Get the Countries sheet to get all country names
  const countriesSheet = spreadsheet.getSheetByName('Countries');
  const countriesData = countriesSheet.getDataRange().getValues();
  const countryNames = countriesSheet.getRange(2, 1, countriesData.length - 1, 1).getValues().map(row => row[0]);
  
  // Define the visited countries for each person
  const kimberVisited = [
    'Albania', 'Andorra', 'Austria', 'Belgium', 'Belize', 'Bosnia and Herzegovina', 
    'Brazil', 'Bulgaria', 'Canada', 'Colombia', 'Costa Rica', 'Croatia', 'Denmark', 
    'El Salvador', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 
    'Guatemala', 'Honduras', 'Indonesia', 'Ireland', 'Italy', 'Japan', 'Kosovo', 
    'Luxembourg', 'Malaysia', 'Mexico', 'Montenegro', 'Morocco', 'Netherlands', 
    'New Zealand', 'Nicaragua', 'North Macedonia', 'Norway', 'Panama', 'Portugal', 
    'Qatar', 'Serbia', 'Singapore', 'Slovenia', 'South Africa', 'Spain', 'Sweden', 
    'Switzerland', 'Thailand', 'Turkey', 'United Arab Emirates', 'United Kingdom', 
    'United States of America'
  ];
  
  const sionaVisited = [
    'Albania', 'Argentina', 'Belgium', 'Belize', 'Bolivia', 'Bosnia and Herzegovina', 
    'Brazil', 'Bulgaria', 'Cambodia', 'Colombia', 'Croatia', 'Cuba', 'El Salvador', 
    'Fiji', 'France', 'Gambia', 'Georgia', 'Germany', 'Greece', 'Guatemala', 
    'Honduras', 'India', 'Indonesia', 'Ireland', 'Italy', 'Jamaica', 'Japan', 
    'Kosovo', 'Luxembourg', 'Mexico', 'Montenegro', 'Morocco', 'Netherlands', 
    'New Zealand', 'Nicaragua', 'North Macedonia', 'Panama', 'Peru', 'Portugal', 
    'Serbia', 'Singapore', 'Slovenia', 'Spain', 'Thailand', 'Tunisia', 'Turkey', 
    'United Kingdom', 'United States of America', 'Uruguay', 'Vatican City', 'Vietnam'
  ];
  
  // Create the new data structure
  const newData = [['CountryName', 'KimberVisited', 'SionaVisited']];
  
  countryNames.forEach(countryName => {
    const kimberVisitedFlag = kimberVisited.includes(countryName) ? '1' : '';
    const sionaVisitedFlag = sionaVisited.includes(countryName) ? '1' : '';
    
    newData.push([countryName, kimberVisitedFlag, sionaVisitedFlag]);
  });
  
  // Clear the existing PreRelationshipCountries sheet
  const preRelSheet = spreadsheet.getSheetByName('PreRelationshipCountries');
  if (preRelSheet) {
    preRelSheet.clear();
  } else {
    // Create the sheet if it doesn't exist
    const newSheet = spreadsheet.insertSheet('PreRelationshipCountries');
    newSheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
    return;
  }
  
  // Populate the new data
  preRelSheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
  
  // Format the header row
  const headerRange = preRelSheet.getRange(1, 1, 1, 3);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f0f0f0');
  
  // Auto-resize columns
  preRelSheet.autoResizeColumns(1, 3);
  
  // Add borders
  const dataRange = preRelSheet.getRange(1, 1, newData.length, 3);
  dataRange.setBorder(true, true, true, true, true, true);
  
  console.log(`Updated PreRelationshipCountries sheet with ${countryNames.length} countries`);
  console.log(`Kimber visited: ${kimberVisited.length} countries`);
  console.log(`Siona visited: ${sionaVisited.length} countries`);
  
  // Log some statistics
  const kimberCount = newData.filter(row => row[1] === '1').length;
  const sionaCount = newData.filter(row => row[2] === '1').length;
  const bothCount = newData.filter(row => row[1] === '1' && row[2] === '1').length;
  
  console.log(`Final counts:`);
  console.log(`- Kimber only: ${kimberCount - bothCount}`);
  console.log(`- Siona only: ${sionaCount - bothCount}`);
  console.log(`- Both visited: ${bothCount}`);
}

// Helper function to run the update
function runUpdate() {
  try {
    updatePreRelationshipCountries();
    console.log('PreRelationshipCountries sheet updated successfully!');
  } catch (error) {
    console.error('Error updating PreRelationshipCountries sheet:', error);
  }
}

