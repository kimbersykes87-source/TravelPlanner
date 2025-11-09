/**
 * Digital Nomad Planner - Google Sheets Setup Script
 * Run this script to create and populate your Travel Planner spreadsheet
 */

function createTravelPlannerSpreadsheet() {
  // Create new spreadsheet
  const spreadsheet = SpreadsheetApp.create('Travel Planner - Digital Nomad');
  const spreadsheetId = spreadsheet.getId();
  
  console.log('Created spreadsheet with ID:', spreadsheetId);
  console.log('Spreadsheet URL:', spreadsheet.getUrl());
  
  // Create all sheets
  createProfilesSheet(spreadsheet);
  createCountriesSheet(spreadsheet);
  createPreRelationshipCountriesSheet(spreadsheet);
  createRelationshipLogSheet(spreadsheet);
  createPresentBookingsSheet(spreadsheet);
  createToBookSheet(spreadsheet);
  createFutureScenariosSheet(spreadsheet);
  
  // Set permissions
  spreadsheet.addEditor(Session.getActiveUser().getEmail());
  
  console.log('✅ Travel Planner spreadsheet created successfully!');
  console.log('📋 Spreadsheet ID:', spreadsheetId);
  console.log('🔗 URL:', spreadsheet.getUrl());
  
  return spreadsheetId;
}

function createProfilesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Profiles');
  
  // Headers - Updated to match final design
  // Note: New columns added AFTER ProfilePictureURL to avoid conflicts with existing data
  const headers = [
    'ProfileID', 'FullName', 'DOB', 'PassportNumber', 'PassportExpiry', 'PassportIssued', 
    'PlaceOfBirth', 'FrequentFlyer1', 'FFNumber1', 'FFStatus1', 
    'FrequentFlyer2', 'FFNumber2', 'FFStatus2', 
    'FrequentFlyer3', 'FFNumber3', 'FFStatus3', 'ProfilePictureURL',
    'Passport2Number', 'Passport2Country', 'Passport2Expiry', 'Passport2Issued',
    'USVisaNumber', 'USVisaExpiry', 'USVisaIssued'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample data - Kimber and Siona with accurate information and real profile pictures
  const profiles = [
    [
      'kimber', 'Kimber', '1987-06-04', '149026510', '2034-06-25', '2024-06-25',
      'Subiaco Australia', 
      'British Airways', '60199179', 'Gold',
      'Miles & Bonus', '182081351', 'Blue',
      'KTN', '168032115', '',
      'https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Kimber_Profile_Pic.jpg',
      '', 'Australia', '', '',  // Second passport (Australian) - to be filled in
      '', '', ''  // US Visa (not applicable for Kimber - has ESTA)
    ],
    [
      'siona', 'Siona', '1984-07-24', '147550348', '2034-04-24', '2024-04-24',
      'Rochdale UK',
      'British Airways', '3346361', 'Silver',
      'ConnectMiles', '117310957', 'Blue',
      'KTN', '0', '',
      'https://raw.githubusercontent.com/kimbersykes87-source/TravelPlanner/main/Siona_Profile_Pic.jpg',
      '', '', '', '',  // Second passport (not applicable)
      '', '', ''  // US B1/B2 Visa - to be filled in
    ]
  ];
  
  sheet.getRange(2, 1, profiles.length, headers.length).setValues(profiles);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ Profiles sheet created');
}

function createCountriesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('Countries');
  
  // Headers
  const headers = ['CountryName', 'Alpha3Code', 'Alpha2Code', 'FlagSVG'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // All UN-recognized countries with country-flag-icons URLs (sorted alphabetically)
  const countries = [
    ['Afghanistan', 'AFG', 'AF', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/af.svg'],
    ['Albania', 'ALB', 'AL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/al.svg'],
    ['Algeria', 'DZA', 'DZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/dz.svg'],
    ['Andorra', 'AND', 'AD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ad.svg'],
    ['Angola', 'AGO', 'AO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ao.svg'],
    ['Antigua and Barbuda', 'ATG', 'AG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ag.svg'],
    ['Argentina', 'ARG', 'AR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ar.svg'],
    ['Armenia', 'ARM', 'AM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/am.svg'],
    ['Australia', 'AUS', 'AU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/au.svg'],
    ['Austria', 'AUT', 'AT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/at.svg'],
    ['Azerbaijan', 'AZE', 'AZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/az.svg'],
    ['Bahamas', 'BHS', 'BS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bs.svg'],
    ['Bahrain', 'BHR', 'BH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bh.svg'],
    ['Bangladesh', 'BGD', 'BD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bd.svg'],
    ['Barbados', 'BRB', 'BB', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bb.svg'],
    ['Belarus', 'BLR', 'BY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/by.svg'],
    ['Belgium', 'BEL', 'BE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/be.svg'],
    ['Belize', 'BLZ', 'BZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bz.svg'],
    ['Benin', 'BEN', 'BJ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bj.svg'],
    ['Bhutan', 'BTN', 'BT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bt.svg'],
    ['Bolivia', 'BOL', 'BO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bo.svg'],
    ['Bosnia and Herzegovina', 'BIH', 'BA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ba.svg'],
    ['Botswana', 'BWA', 'BW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bw.svg'],
    ['Brazil', 'BRA', 'BR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/br.svg'],
    ['Brunei', 'BRN', 'BN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bn.svg'],
    ['Bulgaria', 'BGR', 'BG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bg.svg'],
    ['Burkina Faso', 'BFA', 'BF', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bf.svg'],
    ['Burundi', 'BDI', 'BI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/bi.svg'],
    ['Cambodia', 'KHM', 'KH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kh.svg'],
    ['Cameroon', 'CMR', 'CM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cm.svg'],
    ['Canada', 'CAN', 'CA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ca.svg'],
    ['Cape Verde', 'CPV', 'CV', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cv.svg'],
    ['Central African Republic', 'CAF', 'CF', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cf.svg'],
    ['Chad', 'TCD', 'TD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/td.svg'],
    ['Chile', 'CHL', 'CL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cl.svg'],
    ['China', 'CHN', 'CN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cn.svg'],
    ['Colombia', 'COL', 'CO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/co.svg'],
    ['Comoros', 'COM', 'KM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/km.svg'],
    ['Congo', 'COG', 'CG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cg.svg'],
    ['Congo, Democratic Republic of the', 'COD', 'CD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cd.svg'],
    ['Costa Rica', 'CRI', 'CR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cr.svg'],
    ['Côte d\'Ivoire', 'CIV', 'CI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ci.svg'],
    ['Croatia', 'HRV', 'HR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/hr.svg'],
    ['Cuba', 'CUB', 'CU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cu.svg'],
    ['Cyprus', 'CYP', 'CY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cy.svg'],
    ['Czech Republic', 'CZE', 'CZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/cz.svg'],
    ['Denmark', 'DNK', 'DK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/dk.svg'],
    ['Djibouti', 'DJI', 'DJ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/dj.svg'],
    ['Dominica', 'DMA', 'DM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/dm.svg'],
    ['Dominican Republic', 'DOM', 'DO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/do.svg'],
    ['Ecuador', 'ECU', 'EC', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ec.svg'],
    ['Egypt', 'EGY', 'EG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/eg.svg'],
    ['El Salvador', 'SLV', 'SV', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sv.svg'],
    ['Equatorial Guinea', 'GNQ', 'GQ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gq.svg'],
    ['Eritrea', 'ERI', 'ER', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/er.svg'],
    ['Estonia', 'EST', 'EE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ee.svg'],
    ['Eswatini', 'SWZ', 'SZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sz.svg'],
    ['Ethiopia', 'ETH', 'ET', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/et.svg'],
    ['Fiji', 'FJI', 'FJ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/fj.svg'],
    ['Finland', 'FIN', 'FI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/fi.svg'],
    ['France', 'FRA', 'FR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/fr.svg'],
    ['Gabon', 'GAB', 'GA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ga.svg'],
    ['Gambia', 'GMB', 'GM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gm.svg'],
    ['Georgia', 'GEO', 'GE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ge.svg'],
    ['Germany', 'DEU', 'DE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/de.svg'],
    ['Ghana', 'GHA', 'GH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gh.svg'],
    ['Greece', 'GRC', 'GR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gr.svg'],
    ['Grenada', 'GRD', 'GD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gd.svg'],
    ['Guatemala', 'GTM', 'GT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gt.svg'],
    ['Guinea', 'GIN', 'GN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gn.svg'],
    ['Guinea-Bissau', 'GNB', 'GW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gw.svg'],
    ['Guyana', 'GUY', 'GY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gy.svg'],
    ['Haiti', 'HTI', 'HT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ht.svg'],
    ['Honduras', 'HND', 'HN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/hn.svg'],
    ['Hungary', 'HUN', 'HU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/hu.svg'],
    ['Iceland', 'ISL', 'IS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/is.svg'],
    ['India', 'IND', 'IN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/in.svg'],
    ['Indonesia', 'IDN', 'ID', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/id.svg'],
    ['Iran', 'IRN', 'IR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ir.svg'],
    ['Iraq', 'IRQ', 'IQ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/iq.svg'],
    ['Ireland', 'IRL', 'IE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ie.svg'],
    ['Israel', 'ISR', 'IL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/il.svg'],
    ['Italy', 'ITA', 'IT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/it.svg'],
    ['Jamaica', 'JAM', 'JM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/jm.svg'],
    ['Japan', 'JPN', 'JP', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/jp.svg'],
    ['Jordan', 'JOR', 'JO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/jo.svg'],
    ['Kazakhstan', 'KAZ', 'KZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kz.svg'],
    ['Kenya', 'KEN', 'KE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ke.svg'],
    ['Kiribati', 'KIR', 'KI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ki.svg'],
    ['Kosovo', 'XKX', 'XK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/xk.svg'],
    ['Korea, Democratic People\'s Republic of', 'PRK', 'KP', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kp.svg'],
    ['Korea, Republic of', 'KOR', 'KR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kr.svg'],
    ['Kuwait', 'KWT', 'KW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kw.svg'],
    ['Kyrgyzstan', 'KGZ', 'KG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kg.svg'],
    ['Lao People\'s Democratic Republic', 'LAO', 'LA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/la.svg'],
    ['Latvia', 'LVA', 'LV', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lv.svg'],
    ['Lebanon', 'LBN', 'LB', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lb.svg'],
    ['Lesotho', 'LSO', 'LS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ls.svg'],
    ['Liberia', 'LBR', 'LR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lr.svg'],
    ['Libya', 'LBY', 'LY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ly.svg'],
    ['Liechtenstein', 'LIE', 'LI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/li.svg'],
    ['Lithuania', 'LTU', 'LT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lt.svg'],
    ['Luxembourg', 'LUX', 'LU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lu.svg'],
    ['Madagascar', 'MDG', 'MG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mg.svg'],
    ['Malawi', 'MWI', 'MW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mw.svg'],
    ['Malaysia', 'MYS', 'MY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/my.svg'],
    ['Maldives', 'MDV', 'MV', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mv.svg'],
    ['Mali', 'MLI', 'ML', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ml.svg'],
    ['Malta', 'MLT', 'MT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mt.svg'],
    ['Marshall Islands', 'MHL', 'MH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mh.svg'],
    ['Mauritania', 'MRT', 'MR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mr.svg'],
    ['Mauritius', 'MUS', 'MU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mu.svg'],
    ['Mexico', 'MEX', 'MX', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mx.svg'],
    ['Micronesia', 'FSM', 'FM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/fm.svg'],
    ['Moldova', 'MDA', 'MD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/md.svg'],
    ['Monaco', 'MCO', 'MC', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mc.svg'],
    ['Mongolia', 'MNG', 'MN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mn.svg'],
    ['Montenegro', 'MNE', 'ME', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/me.svg'],
    ['Morocco', 'MAR', 'MA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ma.svg'],
    ['Mozambique', 'MOZ', 'MZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mz.svg'],
    ['Myanmar', 'MMR', 'MM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mm.svg'],
    ['Namibia', 'NAM', 'NA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/na.svg'],
    ['Nauru', 'NRU', 'NR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/nr.svg'],
    ['Nepal', 'NPL', 'NP', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/np.svg'],
    ['Netherlands', 'NLD', 'NL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/nl.svg'],
    ['New Zealand', 'NZL', 'NZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/nz.svg'],
    ['Nicaragua', 'NIC', 'NI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ni.svg'],
    ['Niger', 'NER', 'NE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ne.svg'],
    ['Nigeria', 'NGA', 'NG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ng.svg'],
    ['North Macedonia', 'MKD', 'MK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/mk.svg'],
    ['Norway', 'NOR', 'NO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/no.svg'],
    ['Oman', 'OMN', 'OM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/om.svg'],
    ['Pakistan', 'PAK', 'PK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pk.svg'],
    ['Palau', 'PLW', 'PW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pw.svg'],
    ['Panama', 'PAN', 'PA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pa.svg'],
    ['Papua New Guinea', 'PNG', 'PG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pg.svg'],
    ['Paraguay', 'PRY', 'PY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/py.svg'],
    ['Peru', 'PER', 'PE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pe.svg'],
    ['Philippines', 'PHL', 'PH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ph.svg'],
    ['Poland', 'POL', 'PL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pl.svg'],
    ['Portugal', 'PRT', 'PT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/pt.svg'],
    ['Qatar', 'QAT', 'QA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/qa.svg'],
    ['Romania', 'ROU', 'RO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ro.svg'],
    ['Russian Federation', 'RUS', 'RU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ru.svg'],
    ['Rwanda', 'RWA', 'RW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/rw.svg'],
    ['Saint Kitts and Nevis', 'KNA', 'KN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/kn.svg'],
    ['Saint Lucia', 'LCA', 'LC', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lc.svg'],
    ['Saint Vincent and the Grenadines', 'VCT', 'VC', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/vc.svg'],
    ['Samoa', 'WSM', 'WS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ws.svg'],
    ['San Marino', 'SMR', 'SM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sm.svg'],
    ['Sao Tome and Principe', 'STP', 'ST', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/st.svg'],
    ['Saudi Arabia', 'SAU', 'SA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sa.svg'],
    ['Senegal', 'SEN', 'SN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sn.svg'],
    ['Serbia', 'SRB', 'RS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/rs.svg'],
    ['Seychelles', 'SYC', 'SC', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sc.svg'],
    ['Sierra Leone', 'SLE', 'SL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sl.svg'],
    ['Singapore', 'SGP', 'SG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sg.svg'],
    ['Slovakia', 'SVK', 'SK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sk.svg'],
    ['Slovenia', 'SVN', 'SI', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/si.svg'],
    ['Solomon Islands', 'SLB', 'SB', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sb.svg'],
    ['Somalia', 'SOM', 'SO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/so.svg'],
    ['South Africa', 'ZAF', 'ZA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/za.svg'],
    ['South Sudan', 'SSD', 'SS', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ss.svg'],
    ['Spain', 'ESP', 'ES', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/es.svg'],
    ['Sri Lanka', 'LKA', 'LK', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/lk.svg'],
    ['Sudan', 'SDN', 'SD', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sd.svg'],
    ['Suriname', 'SUR', 'SR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sr.svg'],
    ['Sweden', 'SWE', 'SE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/se.svg'],
    ['Switzerland', 'CHE', 'CH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ch.svg'],
    ['Syrian Arab Republic', 'SYR', 'SY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/sy.svg'],
    ['Tajikistan', 'TJK', 'TJ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tj.svg'],
    ['Tanzania', 'TZA', 'TZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tz.svg'],
    ['Thailand', 'THA', 'TH', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/th.svg'],
    ['Timor-Leste', 'TLS', 'TL', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tl.svg'],
    ['Togo', 'TGO', 'TG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tg.svg'],
    ['Tonga', 'TON', 'TO', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/to.svg'],
    ['Trinidad and Tobago', 'TTO', 'TT', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tt.svg'],
    ['Tunisia', 'TUN', 'TN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tn.svg'],
    ['Turkey', 'TUR', 'TR', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tr.svg'],
    ['Turkmenistan', 'TKM', 'TM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tm.svg'],
    ['Tuvalu', 'TUV', 'TV', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/tv.svg'],
    ['Uganda', 'UGA', 'UG', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ug.svg'],
    ['Ukraine', 'UKR', 'UA', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ua.svg'],
    ['United Arab Emirates', 'ARE', 'AE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ae.svg'],
    ['United Kingdom', 'GBR', 'GB', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/gb.svg'],
    ['United States', 'USA', 'US', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/us.svg'],
    ['Uruguay', 'URY', 'UY', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/uy.svg'],
    ['Uzbekistan', 'UZB', 'UZ', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/uz.svg'],
    ['Vanuatu', 'VUT', 'VU', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/vu.svg'],
    ['Venezuela', 'VEN', 'VE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ve.svg'],
    ['Viet Nam', 'VNM', 'VN', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/vn.svg'],
    ['Yemen', 'YEM', 'YE', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/ye.svg'],
    ['Zambia', 'ZMB', 'ZM', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/zm.svg'],
    ['Zimbabwe', 'ZWE', 'ZW', 'https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/zw.svg']
  ];
  
  sheet.getRange(2, 1, countries.length, headers.length).setValues(countries);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ Countries sheet created with', countries.length, 'UN-recognized countries');
}


function createPreRelationshipCountriesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('PreRelationshipCountries');
  
  // Headers
  const headers = ['ProfileID', 'CountryName', 'VisitedBefore'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Actual countries visited before relationship start (30 Sep 2023)
  const preRelationshipData = [
    // Kimber's pre-relationship countries (actual list)
    ['kimber', 'Albania', '1'],
    ['kimber', 'Andorra', '1'],
    ['kimber', 'Austria', '1'],
    ['kimber', 'Belgium', '1'],
    ['kimber', 'Bosnia and Herzegovina', '1'],
    ['kimber', 'Brazil', '1'],
    ['kimber', 'Canada', '1'],
    ['kimber', 'Colombia', '1'],
    ['kimber', 'Costa Rica', '1'],
    ['kimber', 'Croatia', '1'],
    ['kimber', 'Denmark', '1'],
    ['kimber', 'El Salvador', '1'],
    ['kimber', 'Fiji', '1'],
    ['kimber', 'Finland', '1'],
    ['kimber', 'France', '1'],
    ['kimber', 'Germany', '1'],
    ['kimber', 'Greece', '1'],
    ['kimber', 'Guatemala', '1'],
    ['kimber', 'Honduras', '1'],
    ['kimber', 'Indonesia', '1'],
    ['kimber', 'Italy', '1'],
    ['kimber', 'Kosovo', '1'],
    ['kimber', 'Luxembourg', '1'],
    ['kimber', 'Malaysia', '1'],
    ['kimber', 'Mexico', '1'],
    ['kimber', 'Montenegro', '1'],
    ['kimber', 'Morocco', '1'],
    ['kimber', 'Netherlands', '1'],
    ['kimber', 'New Zealand', '1'],
    ['kimber', 'Nicaragua', '1'],
    ['kimber', 'North Macedonia', '1'],
    ['kimber', 'Norway', '1'],
    ['kimber', 'Portugal', '1'],
    ['kimber', 'Qatar', '1'],
    ['kimber', 'Serbia', '1'],
    ['kimber', 'Singapore', '1'],
    ['kimber', 'Slovenia', '1'],
    ['kimber', 'South Africa', '1'],
    ['kimber', 'Spain', '1'],
    ['kimber', 'Sweden', '1'],
    ['kimber', 'Switzerland', '1'],
    ['kimber', 'Thailand', '1'],
    ['kimber', 'United Arab Emirates', '1'],
    ['kimber', 'United Kingdom', '1'],
    ['kimber', 'United States', '1'],
    
    // Siona's pre-relationship countries (actual list)
    ['siona', 'Argentina', '1'],
    ['siona', 'Belize', '1'],
    ['siona', 'Bolivia', '1'],
    ['siona', 'Brazil', '1'],
    ['siona', 'Cambodia', '1'],
    ['siona', 'Colombia', '1'],
    ['siona', 'Cuba', '1'],
    ['siona', 'El Salvador', '1'],
    ['siona', 'Fiji', '1'],
    ['siona', 'France', '1'],
    ['siona', 'Gambia', '1'],
    ['siona', 'Germany', '1'],
    ['siona', 'Greece', '1'],
    ['siona', 'Guatemala', '1'],
    ['siona', 'Honduras', '1'],
    ['siona', 'India', '1'],
    ['siona', 'Indonesia', '1'],
    ['siona', 'Ireland', '1'],
    ['siona', 'Italy', '1'],
    ['siona', 'Jamaica', '1'],
    ['siona', 'Japan', '1'],
    ['siona', 'Mexico', '1'],
    ['siona', 'Morocco', '1'],
    ['siona', 'New Zealand', '1'],
    ['siona', 'Nicaragua', '1'],
    ['siona', 'Panama', '1'],
    ['siona', 'Peru', '1'],
    ['siona', 'Portugal', '1'],
    ['siona', 'Singapore', '1'],
    ['siona', 'Spain', '1'],
    ['siona', 'Thailand', '1'],
    ['siona', 'Tunisia', '1'],
    ['siona', 'United Kingdom', '1'],
    ['siona', 'United States', '1'],
    ['siona', 'Uruguay', '1'],
    ['siona', 'Vatican City', '1'],
    ['siona', 'Vietnam', '1']
  ];
  
  sheet.getRange(2, 1, preRelationshipData.length, headers.length).setValues(preRelationshipData);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ PreRelationshipCountries sheet created with', preRelationshipData.length, 'entries');
}


function createRelationshipLogSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('RelationshipLog');
  
  // Headers - Updated to match final design (daily rows format)
  const headers = ['Date', 'KimberCountry', 'SionaCountry', 'Notes'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Generate daily rows from 30/09/2023 onwards with realistic travel patterns
  const relationshipLogData = [];
  const startDate = new Date('2023-09-30');
  const endDate = new Date('2025-12-31');
  
  // Sample periods showing together/apart patterns
  const periods = [
    // September 30 - November 6, 2023: Both in Australia
    { start: '2023-09-30', end: '2023-11-06', kimber: 'Australia', siona: 'Australia', notes: 'Together in Australia' },
    
    // November 7 - December 2, 2023: Kimber in UAE, Siona in Australia (SEPARATE)
    { start: '2023-11-07', end: '2023-12-02', kimber: 'United Arab Emirates', siona: 'Australia', notes: 'Kimber in UAE, Siona in Australia' },
    
    // December 3-5, 2023: Kimber in UK, Siona in Australia (SEPARATE)
    { start: '2023-12-03', end: '2023-12-05', kimber: 'United Kingdom', siona: 'Australia', notes: 'Kimber in UK, Siona in Australia' },
    
    // December 6-12, 2023: Kimber in UAE, Siona in Australia (SEPARATE)
    { start: '2023-12-06', end: '2023-12-12', kimber: 'United Arab Emirates', siona: 'Australia', notes: 'Kimber in UAE, Siona in Australia' },
    
    // December 13, 2023 - January 28, 2024: Both in Australia
    { start: '2023-12-13', end: '2024-01-28', kimber: 'Australia', siona: 'Australia', notes: 'Together in Australia' },
    
    // January 29 - February 13, 2024: Kimber in USA, Siona in Australia (SEPARATE)
    { start: '2024-01-29', end: '2024-02-13', kimber: 'United States', siona: 'Australia', notes: 'Kimber in USA, Siona in Australia' },
    
    // February 14 - March 17, 2024: Both in USA
    { start: '2024-02-14', end: '2024-03-17', kimber: 'United States', siona: 'United States', notes: 'Together in USA' },
    
    // March 18 - April 2, 2024: Kimber in USA, Siona in Australia (SEPARATE)
    { start: '2024-03-18', end: '2024-04-02', kimber: 'United States', siona: 'Australia', notes: 'Kimber in USA, Siona in Australia' },
    
    // April 3-30, 2024: Both in Australia
    { start: '2024-04-03', end: '2024-04-30', kimber: 'Australia', siona: 'Australia', notes: 'Together in Australia' },
    
    // May 1-20, 2024: Kimber travels Europe, Siona in Australia (SEPARATE)
    { start: '2024-05-01', end: '2024-05-02', kimber: 'Portugal', siona: 'Australia', notes: 'Kimber in Portugal, Siona in Australia' },
    { start: '2024-05-03', end: '2024-05-06', kimber: 'Spain', siona: 'Australia', notes: 'Kimber in Spain, Siona in Australia' },
    { start: '2024-05-07', end: '2024-05-09', kimber: 'United Kingdom', siona: 'Australia', notes: 'Kimber in UK, Siona in Australia' },
    { start: '2024-05-10', end: '2024-05-13', kimber: 'Netherlands', siona: 'Australia', notes: 'Kimber in Netherlands, Siona in Australia' },
    { start: '2024-05-14', end: '2024-05-19', kimber: 'Spain', siona: 'Australia', notes: 'Kimber in Spain, Siona in Australia' },
    { start: '2024-05-20', end: '2024-06-20', kimber: 'United Kingdom', siona: 'Australia', notes: 'Kimber in UK, Siona in Australia' },
    
    // June 21 - July 27, 2024: Both in Mexico
    { start: '2024-06-21', end: '2024-07-27', kimber: 'Mexico', siona: 'Mexico', notes: 'Together in Mexico' },
    
    // July 28 - August 25, 2024: Kimber in USA, Siona in Mexico (SEPARATE)
    { start: '2024-07-28', end: '2024-08-25', kimber: 'United States', siona: 'Mexico', notes: 'Kimber in USA, Siona in Mexico' },
    
    // August 26 - September 7, 2024: Both in USA
    { start: '2024-08-26', end: '2024-09-07', kimber: 'United States', siona: 'United States', notes: 'Together in USA' },
    
    // September 8-10, 2024: Both in Spain
    { start: '2024-09-08', end: '2024-09-10', kimber: 'Spain', siona: 'Spain', notes: 'Together in Spain' },
    
    // September 11-16, 2024: Both in France
    { start: '2024-09-11', end: '2024-09-16', kimber: 'France', siona: 'France', notes: 'Together in France' },
    
    // September 17-26, 2024: Both in UK
    { start: '2024-09-17', end: '2024-09-26', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // September 27-29, 2024: Both in Netherlands
    { start: '2024-09-27', end: '2024-09-29', kimber: 'Netherlands', siona: 'Netherlands', notes: 'Together in Netherlands' },
    
    // September 30, 2024: Both in Belgium
    { start: '2024-09-30', end: '2024-09-30', kimber: 'Belgium', siona: 'Belgium', notes: 'Together in Belgium' },
    
    // October 1-3, 2024: Both in France
    { start: '2024-10-01', end: '2024-10-03', kimber: 'France', siona: 'France', notes: 'Together in France' },
    
    // October 4-11, 2024: Both in Italy
    { start: '2024-10-04', end: '2024-10-11', kimber: 'Italy', siona: 'Italy', notes: 'Together in Italy' },
    
    // October 12, 2024: Both in Italy
    { start: '2024-10-12', end: '2024-10-12', kimber: 'Italy', siona: 'Italy', notes: 'Together in Italy' },
    
    // October 13-16, 2024: Both in France
    { start: '2024-10-13', end: '2024-10-16', kimber: 'France', siona: 'France', notes: 'Together in France' },
    
    // October 17-24, 2024: Both in Italy
    { start: '2024-10-17', end: '2024-10-24', kimber: 'Italy', siona: 'Italy', notes: 'Together in Italy' },
    
    // October 25-27, 2024: Both in Spain
    { start: '2024-10-25', end: '2024-10-27', kimber: 'Spain', siona: 'Spain', notes: 'Together in Spain' },
    
    // October 28 - November 5, 2024: Both in Italy
    { start: '2024-10-28', end: '2024-11-05', kimber: 'Italy', siona: 'Italy', notes: 'Together in Italy' },
    
    // November 6, 2024: Both in Albania
    { start: '2024-11-06', end: '2024-11-06', kimber: 'Albania', siona: 'Albania', notes: 'Together in Albania' },
    
    // November 7-13, 2024: Both in Montenegro
    { start: '2024-11-07', end: '2024-11-13', kimber: 'Montenegro', siona: 'Montenegro', notes: 'Together in Montenegro' },
    
    // November 14, 2024: Both in Kosovo
    { start: '2024-11-14', end: '2024-11-14', kimber: 'Kosovo', siona: 'Kosovo', notes: 'Together in Kosovo' },
    
    // November 15-22, 2024: Both in North Macedonia
    { start: '2024-11-15', end: '2024-11-22', kimber: 'North Macedonia', siona: 'North Macedonia', notes: 'Together in North Macedonia' },
    
    // November 23, 2024: Both in Bulgaria
    { start: '2024-11-23', end: '2024-11-23', kimber: 'Bulgaria', siona: 'Bulgaria', notes: 'Together in Bulgaria' },
    
    // November 24 - December 6, 2024: Both in Turkey
    { start: '2024-11-24', end: '2024-12-06', kimber: 'Turkey', siona: 'Turkey', notes: 'Together in Turkey' },
    
    // December 7-8, 2024: Kimber in Georgia, Siona in Turkey (SEPARATE)
    { start: '2024-12-07', end: '2024-12-08', kimber: 'Georgia', siona: 'Turkey', notes: 'Kimber in Georgia, Siona in Turkey' },
    
    // December 9, 2024 - January 3, 2025: Both in Georgia
    { start: '2024-12-09', end: '2025-01-03', kimber: 'Georgia', siona: 'Georgia', notes: 'Together in Georgia' },
    
    // January 4, 2025: Both in Turkey
    { start: '2025-01-04', end: '2025-01-04', kimber: 'Turkey', siona: 'Turkey', notes: 'Together in Turkey' },
    
    // January 5, 2025: Both in Bulgaria
    { start: '2025-01-05', end: '2025-01-05', kimber: 'Bulgaria', siona: 'Bulgaria', notes: 'Together in Bulgaria' },
    
    // January 6, 2025: Both in Austria
    { start: '2025-01-06', end: '2025-01-06', kimber: 'Austria', siona: 'Austria', notes: 'Together in Austria' },
    
    // January 7, 2025: Both in Germany
    { start: '2025-01-07', end: '2025-01-07', kimber: 'Germany', siona: 'Germany', notes: 'Together in Germany' },
    
    // January 8, 2025: Both in Netherlands
    { start: '2025-01-08', end: '2025-01-08', kimber: 'Netherlands', siona: 'Netherlands', notes: 'Together in Netherlands' },
    
    // January 9-11, 2025: Both in UK
    { start: '2025-01-09', end: '2025-01-11', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // January 12 - February 1, 2025: Kimber travels alone, Siona in UK (SEPARATE)
    { start: '2025-01-12', end: '2025-01-12', kimber: 'Croatia', siona: 'United Kingdom', notes: 'Kimber in Croatia, Siona in UK' },
    { start: '2025-01-13', end: '2025-01-13', kimber: 'Qatar', siona: 'United Kingdom', notes: 'Kimber in Qatar, Siona in UK' },
    { start: '2025-01-14', end: '2025-02-01', kimber: 'Australia', siona: 'United Kingdom', notes: 'Kimber in Australia, Siona in UK' },
    
    // February 2-13, 2025: Kimber in Australia, Siona travels Europe (SEPARATE)
    { start: '2025-02-02', end: '2025-02-02', kimber: 'Australia', siona: 'Italy', notes: 'Kimber in Australia, Siona in Italy' },
    { start: '2025-02-03', end: '2025-02-10', kimber: 'Australia', siona: 'United Kingdom', notes: 'Kimber in Australia, Siona in UK' },
    { start: '2025-02-11', end: '2025-02-12', kimber: 'Australia', siona: 'Italy', notes: 'Kimber in Australia, Siona in Italy' },
    { start: '2025-02-13', end: '2025-03-13', kimber: 'Australia', siona: 'United Kingdom', notes: 'Kimber in Australia, Siona in UK' },
    
    // March 14-22, 2025: Both in UK
    { start: '2025-03-14', end: '2025-03-22', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // March 23-28, 2025: Both in Italy
    { start: '2025-03-23', end: '2025-03-28', kimber: 'Italy', siona: 'Italy', notes: 'Together in Italy' },
    
    // March 29 - May 22, 2025: Both in UK
    { start: '2025-03-29', end: '2025-05-22', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // May 23-28, 2025: Kimber in Netherlands, Siona in Germany (SEPARATE)
    { start: '2025-05-23', end: '2025-05-28', kimber: 'Netherlands', siona: 'Germany', notes: 'Kimber in Netherlands, Siona in Germany' },
    
    // May 29 - June 3, 2025: Both in UK
    { start: '2025-05-29', end: '2025-06-03', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // June 4-7, 2025: Both in Ireland
    { start: '2025-06-04', end: '2025-06-07', kimber: 'Ireland', siona: 'Ireland', notes: 'Together in Ireland' },
    
    // June 8 - July 11, 2025: Both in UK
    { start: '2025-06-08', end: '2025-07-11', kimber: 'United Kingdom', siona: 'United Kingdom', notes: 'Together in UK' },
    
    // July 12, 2025: Both in France
    { start: '2025-07-12', end: '2025-07-12', kimber: 'France', siona: 'France', notes: 'Together in France' },
    
    // July 13, 2025: Both in Spain
    { start: '2025-07-13', end: '2025-07-13', kimber: 'Spain', siona: 'Spain', notes: 'Together in Spain' },
    
    // July 14 - September 7, 2025: Both in USA
    { start: '2025-07-14', end: '2025-09-07', kimber: 'United States', siona: 'United States', notes: 'Together in USA' },
    
    // September 8-27, 2025: Both in Nicaragua
    { start: '2025-09-08', end: '2025-09-27', kimber: 'Nicaragua', siona: 'Nicaragua', notes: 'Together in Nicaragua' },
    
    // September 28-29, 2025: Both in Panama
    { start: '2025-09-28', end: '2025-09-29', kimber: 'Panama', siona: 'Panama', notes: 'Together in Panama' },
    
    // September 30 - October 27, 2025: Both in Colombia
    { start: '2025-09-30', end: '2025-10-27', kimber: 'Colombia', siona: 'Colombia', notes: 'Together in Colombia' }
  ];
  
  // Generate daily rows for each period
  periods.forEach(period => {
    const start = new Date(period.start);
    const end = new Date(period.end);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      relationshipLogData.push([
        Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        period.kimber,
        period.siona,
        period.notes
      ]);
    }
  });
  
  // Add remaining days to end of 2025 (both in Colombia)
  const lastPeriod = periods[periods.length - 1];
  const lastDate = new Date(lastPeriod.end);
  const finalEndDate = new Date('2025-12-31');
  
  for (let d = new Date(lastDate); d <= finalEndDate; d.setDate(d.getDate() + 1)) {
    relationshipLogData.push([
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      lastPeriod.kimber,
      lastPeriod.siona,
      'Together in Colombia (projected)'
    ]);
  }
  
  sheet.getRange(2, 1, relationshipLogData.length, headers.length).setValues(relationshipLogData);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ RelationshipLog sheet created with', relationshipLogData.length, 'daily entries');
}

function createPresentBookingsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('PresentBookings');
  
  // Headers - Updated to match final design
  const headers = ['BookingID', 'ProfileID', 'Type', 'SubType', 'StartDate', 'EndDate', 'Country', 'City', 'Details', 'LinkedBookingID'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample booking data showing together/separate patterns
  const bookings = [
    // Current bookings (example)
    ['BK001', 'kimber', 'Accommodation', 'Hotel', '2025-01-15', '2025-01-20', 'Australia', 'Sydney', 'Business trip hotel booking', ''],
    ['BK002', 'siona', 'Transport', 'Flight', '2025-01-18', '2025-01-18', 'United Kingdom', 'London', 'BA123 LHR-SYD', ''],
    ['BK003', 'kimber', 'Transport', 'Flight', '2025-01-20', '2025-01-20', 'Australia', 'Sydney', 'QF456 SYD-LHR', ''],
    ['BK004', 'siona', 'Accommodation', 'Airbnb', '2025-02-01', '2025-02-15', 'Italy', 'Rome', 'Rome apartment rental', ''],
    ['BK005', 'kimber', 'Accommodation', 'Airbnb', '2025-02-01', '2025-02-15', 'Italy', 'Rome', 'Rome apartment rental', 'BK004'],
    ['BK006', 'siona', 'Transport', 'Flight', '2025-02-01', '2025-02-01', 'United Kingdom', 'London', 'BA789 LHR-FCO', 'BK007'],
    ['BK007', 'kimber', 'Transport', 'Flight', '2025-02-01', '2025-02-01', 'Australia', 'Sydney', 'QF012 SYD-FCO', 'BK006'],
    ['BK008', 'kimber', 'Transport', 'Flight', '2025-02-15', '2025-02-15', 'Italy', 'Rome', 'QF345 FCO-SYD', ''],
    ['BK009', 'siona', 'Transport', 'Flight', '2025-02-15', '2025-02-15', 'Italy', 'Rome', 'BA678 FCO-LHR', '']
  ];
  
  sheet.getRange(2, 1, bookings.length, headers.length).setValues(bookings);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ PresentBookings sheet created with', bookings.length, 'sample bookings');
}

function createToBookSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('ToBook');
  
  // Headers
  const headers = ['ReminderID', 'AssignedTo', 'ItemType', 'SpecificDates', 'Deadline', 'Notes', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ ToBook sheet created');
}

function createFutureScenariosSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('FutureScenarios');
  
  // Headers - Updated to match final design (multi-mode structure)
  const headers = [
    'ScenarioID', 'CreatedBy', 'ScenarioName', 'SectionID', 'StartDate', 'EndDate', 
    'KimberCountry', 'SionaCountry', 'KimberCities', 'SionaCities', 
    'KimberAccommodation', 'SionaAccommodation', 'KimberNotes', 'SionaNotes', 'CoordinationNotes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Sample scenario data showing together/separate planning
  const scenarios = [
    // Scenario 1: Summer 2025 Europe Trip
    ['SC001', 'kimber', 'Summer 2025 Europe Adventure', 'SEC001', '2025-06-01', '2025-06-15', 
     'France', 'France', 'Paris, Nice', 'Paris, Nice', 
     'Paris Airbnb, Nice Hotel', 'Paris Airbnb, Nice Hotel', 
     'Work remotely from Paris', 'Work remotely from Paris', 'Together in France for 2 weeks'],
    
    ['SC001', 'kimber', 'Summer 2025 Europe Adventure', 'SEC002', '2025-06-16', '2025-06-30', 
     'Italy', 'Italy', 'Rome, Florence', 'Rome, Florence', 
     'Rome Airbnb, Florence Hotel', 'Rome Airbnb, Florence Hotel', 
     'Continue remote work', 'Continue remote work', 'Together in Italy for 2 weeks'],
    
    ['SC001', 'kimber', 'Summer 2025 Europe Adventure', 'SEC003', '2025-07-01', '2025-07-15', 
     'Spain', 'Germany', 'Barcelona, Madrid', 'Berlin, Munich', 
     'Barcelona Airbnb, Madrid Hotel', 'Berlin Airbnb, Munich Hotel', 
     'Work from Spain', 'Work from Germany', 'Separate countries - Kimber in Spain, Siona in Germany'],
    
    ['SC001', 'kimber', 'Summer 2025 Europe Adventure', 'SEC004', '2025-07-16', '2025-07-31', 
     'United Kingdom', 'United Kingdom', 'London, Edinburgh', 'London, Edinburgh', 
     'London Airbnb, Edinburgh Hotel', 'London Airbnb, Edinburgh Hotel', 
     'Meet up in UK', 'Meet up in UK', 'Reunite in UK for final 2 weeks'],
    
    // Scenario 2: Winter 2025 Asia Trip
    ['SC002', 'siona', 'Winter 2025 Asia Exploration', 'SEC005', '2025-12-01', '2025-12-15', 
     'Japan', 'Japan', 'Tokyo, Kyoto', 'Tokyo, Kyoto', 
     'Tokyo Hotel, Kyoto Ryokan', 'Tokyo Hotel, Kyoto Ryokan', 
     'Explore Japan together', 'Explore Japan together', 'Together in Japan for 2 weeks'],
    
    ['SC002', 'siona', 'Winter 2025 Asia Exploration', 'SEC006', '2025-12-16', '2025-12-31', 
     'Thailand', 'Vietnam', 'Bangkok, Chiang Mai', 'Ho Chi Minh City, Hanoi', 
     'Bangkok Hotel, Chiang Mai Airbnb', 'Ho Chi Minh Hotel, Hanoi Airbnb', 
     'Work from Thailand', 'Work from Vietnam', 'Separate countries - Kimber in Thailand, Siona in Vietnam'],
    
    // Scenario 3: Spring 2026 Americas Trip
    ['SC003', 'kimber', 'Spring 2026 Americas Circuit', 'SEC007', '2026-03-01', '2026-03-15', 
     'Mexico', 'Mexico', 'Mexico City, Cancun', 'Mexico City, Cancun', 
     'Mexico City Airbnb, Cancun Resort', 'Mexico City Airbnb, Cancun Resort', 
     'Work from Mexico', 'Work from Mexico', 'Together in Mexico for 2 weeks'],
    
    ['SC003', 'kimber', 'Spring 2026 Americas Circuit', 'SEC008', '2026-03-16', '2026-03-31', 
     'United States', 'Canada', 'New York, Los Angeles', 'Toronto, Vancouver', 
     'NYC Hotel, LA Airbnb', 'Toronto Airbnb, Vancouver Hotel', 
     'Work from USA', 'Work from Canada', 'Separate countries - Kimber in USA, Siona in Canada'],
    
    ['SC003', 'kimber', 'Spring 2026 Americas Circuit', 'SEC009', '2026-04-01', '2026-04-15', 
     'Brazil', 'Brazil', 'Rio de Janeiro, São Paulo', 'Rio de Janeiro, São Paulo', 
     'Rio Airbnb, São Paulo Hotel', 'Rio Airbnb, São Paulo Hotel', 
     'Meet up in Brazil', 'Meet up in Brazil', 'Reunite in Brazil for final 2 weeks']
  ];
  
  sheet.getRange(2, 1, scenarios.length, headers.length).setValues(scenarios);
  
  // Format headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  
  console.log('✅ FutureScenarios sheet created with', scenarios.length, 'scenario sections');
}

// Helper function to run the complete setup
function setupCompleteTravelPlanner() {
  try {
    const spreadsheetId = createTravelPlannerSpreadsheet();
    
    console.log('🎉 SUCCESS! Your Travel Planner is ready!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Copy the Spreadsheet ID:', spreadsheetId);
    console.log('2. Open digital-nomad-planner.html in your browser');
    console.log('3. Enter your API key and this Spreadsheet ID');
    console.log('4. Click "Test Connection"');
    console.log('5. Start using your Digital Nomad Planner!');
    console.log('');
    console.log('🔗 Spreadsheet URL:', SpreadsheetApp.getActiveSpreadsheet().getUrl());
    
    return spreadsheetId;
  } catch (error) {
    console.error('❌ Error creating spreadsheet:', error);
    throw error;
  }
}
