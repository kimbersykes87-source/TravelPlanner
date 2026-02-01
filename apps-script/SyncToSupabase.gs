/**
 * Travel Planner v2 - Google Sheets to Supabase Sync
 *
 * Add this script to your existing Google Apps Script project.
 * Create a custom menu: Travel Planner -> Sync to Supabase
 *
 * Setup:
 * 1. In Apps Script: File -> Project properties -> Script properties
 * 2. Add: SUPABASE_URL = https://YOUR_PROJECT.supabase.co
 * 3. Add: SUPABASE_ANON_KEY = your_anon_key
 *
 * Usage: Run onAddTravelPlannerMenu() once to add the menu, or add to onOpen trigger.
 */

function onAddTravelPlannerMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Travel Planner')
    .addItem('Sync to Supabase', 'syncToSupabase')
    .addToUi();
}

function onOpen() {
  onAddTravelPlannerMenu();
}

function syncToSupabase() {
  const ui = SpreadsheetApp.getUi();
  const url = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const key = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY');

  if (!url || !key) {
    ui.alert('Setup required: Add SUPABASE_URL and SUPABASE_ANON_KEY to Script properties (File -> Project properties -> Script properties).');
    return;
  }

  ui.alert('Starting sync to Supabase. This may take a minute...');
  const result = syncAllSheetsToSupabase(url, key);
  ui.alert(result.message || (result.success ? 'Sync completed.' : 'Sync failed. Check logs.'));
}

/** Run sync from a time-based trigger (no UI). Logs result. Keeps Supabase active within 7-day free tier. */
function runScheduledSync() {
  const url = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  const key = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY');
  if (!url || !key) {
    console.error('Sync skipped: SUPABASE_URL or SUPABASE_ANON_KEY not set.');
    return;
  }
  const result = syncAllSheetsToSupabase(url, key);
  console.log('Scheduled sync: ' + result.message);
}

function syncAllSheetsToSupabase(baseUrl, anonKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const base = baseUrl.replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey,
    'Prefer': 'resolution=merge-duplicates'
  };

  const tables = [
    { sheet: getSheet_(ss, 'Profiles'), table: 'profiles', mapper: mapProfiles_, onConflict: 'profile_id' },
    { sheet: getSheet_(ss, 'Countries'), table: 'countries', mapper: mapCountries_, onConflict: 'country_name' },
    { sheet: getSheet_(ss, 'RelationshipLog'), table: 'relationship_log', mapper: mapRelationshipLog_, onConflict: 'date' },
    { sheet: getSheet_(ss, 'Statistics'), table: 'statistics', mapper: mapStatistics_, onConflict: 'country' },
    { sheet: getSheet_(ss, 'PresentBookings'), table: 'present_bookings', mapper: mapPresentBookings_, onConflict: 'booking_id' },
    { sheet: getSheet_(ss, 'VisaRules'), table: 'visa_rules', mapper: mapVisaRules_, onConflict: 'rule_id' },
    { sheet: getSheet_(ss, 'PreRelationshipCountries'), table: 'pre_relationship_countries', mapper: mapPreRelationshipCountries_, onConflict: 'profile_id,country_name' },
    { sheet: getSheet_(ss, 'BucketList'), table: 'bucket_list', mapper: mapBucketList_, onConflict: 'id' }
  ];

  let ok = 0;
  let fail = 0;
  const failedTables = [];

  for (const t of tables) {
    if (!t.sheet) continue;
    const rows = t.sheet.getDataRange().getValues();
    if (rows.length < 2) continue;
    const header = rows[0];
    const dataRows = rows.slice(1);
    let payload = dataRows.map(row => t.mapper(row, header)).filter(Boolean);

    if (payload.length === 0) continue;

    if (t.table === 'countries') {
      const seen = new Set();
      payload = payload.filter(row => {
        const key = (row.country_name || '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (t.table === 'relationship_log') {
      const byDate = new Map();
      payload.forEach(row => { byDate.set(row.date || '', row); });
      payload = Array.from(byDate.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
    if (t.table === 'statistics') {
      const byCountry = new Map();
      payload.forEach(row => { byCountry.set((row.country || '').toLowerCase(), row); });
      payload = Array.from(byCountry.values());
    }

    try {
      const url = base + '/rest/v1/' + t.table + (t.onConflict ? '?on_conflict=' + encodeURIComponent(t.onConflict) : '');
      const resp = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
        ok++;
      } else {
        fail++;
        const errText = resp.getContentText();
        failedTables.push(t.table + ': ' + (errText.length > 80 ? errText.substring(0, 80) + '...' : errText));
        console.error('Sync failed for ' + t.table + ': ' + errText);
      }
    } catch (e) {
      fail++;
      failedTables.push(t.table + ': ' + e.message);
      console.error('Sync error for ' + t.table + ': ' + e.message);
    }
  }

  let msg = 'Synced ' + ok + ' tables.';
  if (fail > 0) {
    msg += ' ' + fail + ' failed:\n' + failedTables.join('\n');
  }
  return {
    success: fail === 0,
    message: msg
  };
}

function getSheet_(ss, name) {
  return ss.getSheetByName(name) || null;
}

function col_(row, header, name) {
  const i = header.map(h => String(h || '').toLowerCase()).indexOf(String(name || '').toLowerCase());
  return i >= 0 ? (row[i] != null ? String(row[i]).trim() : '') : '';
}

function colRaw_(row, header, name) {
  const i = header.map(h => String(h || '').toLowerCase()).indexOf(String(name || '').toLowerCase());
  return i >= 0 ? row[i] : null;
}

/** Normalize date to YYYY-MM-DD for Postgres (avoids "gmt-0500" timezone errors) */
function toIsoDate_(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  const s = String(val).trim();
  if (!s) return null;
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return null;
}

/** Combine program + number (from named col, next cell, or same cell) + tier. Formats as "Program - Number (Tier)". */
function buildFrequentFlyer_(row, h, n) {
  var program = col_(row, h, 'FrequentFlyer' + n) || col_(row, h, 'Frequent Flyer ' + n) || col_(row, h, 'FF' + n);
  var number = col_(row, h, 'FrequentFlyer' + n + 'Number') || col_(row, h, 'Frequent Flyer ' + n + ' Number') ||
    col_(row, h, 'FrequentFlyer' + n + 'No') || col_(row, h, 'Frequent Flyer ' + n + ' No');
  var tier = col_(row, h, 'FrequentFlyer' + n + 'Tier') || col_(row, h, 'Frequent Flyer ' + n + ' Tier');
  if (!number) {
    var idx = headerIndex_(h, 'FrequentFlyer' + n);
    if (idx < 0) idx = headerIndex_(h, 'Frequent Flyer ' + n);
    if (idx >= 0 && idx + 1 < row.length) {
      var next = row[idx + 1];
      if (next != null && String(next).trim() !== '') number = String(next).trim();
    }
  }
  if (!program && !number) return '';
  if (program && !number && /[\d]{6,}/.test(program)) {
    var m = String(program).match(/^(.+?)\s*[-:]\s*(\d[\d\s]*)$/) || String(program).match(/^(.+?)\s+(\d[\d\s]*)\s*$/);
    if (m) {
      program = m[1].trim();
      number = m[2].replace(/\s/g, '');
    }
  }
  var parts = [];
  if (program) parts.push(program.trim());
  if (number) parts.push(number);
  var main = parts.join(' - ');
  if (tier && String(tier).trim()) main += ' (' + String(tier).trim() + ')';
  return main;
}

function headerIndex_(header, name) {
  return header.map(function(h) { return String(h || '').toLowerCase(); }).indexOf(String(name || '').toLowerCase());
}

function mapProfiles_(row, h) {
  const id = col_(row, h, 'ProfileID') || col_(row, h, 'profile_id');
  if (!id) return null;
  return {
    profile_id: id,
    full_name: col_(row, h, 'FullName') || col_(row, h, 'full_name'),
    dob: toIsoDate_(colRaw_(row, h, 'DOB')) || toIsoDate_(col_(row, h, 'dob')) || null,
    passport_number: col_(row, h, 'PassportNumber'),
    passport_expiry: toIsoDate_(colRaw_(row, h, 'PassportExpiry')) || toIsoDate_(col_(row, h, 'PassportExpiry')) || null,
    passport_issued: toIsoDate_(colRaw_(row, h, 'PassportIssued')) || toIsoDate_(col_(row, h, 'PassportIssued')) || null,
    passport2_number: col_(row, h, 'Passport2Number'),
    passport2_country: col_(row, h, 'Passport2Country'),
    passport2_expiry: toIsoDate_(colRaw_(row, h, 'Passport2Expiry')) || toIsoDate_(col_(row, h, 'Passport2Expiry')) || null,
    us_visa_number: col_(row, h, 'USVisaNumber'),
    us_visa_expiry: toIsoDate_(colRaw_(row, h, 'USVisaExpiry')) || toIsoDate_(col_(row, h, 'USVisaExpiry')) || null,
    us_visa_issued: toIsoDate_(colRaw_(row, h, 'USVisaIssued')) || toIsoDate_(col_(row, h, 'USVisaIssued')) || null,
    frequent_flyer_1: buildFrequentFlyer_(row, h, 1),
    frequent_flyer_2: buildFrequentFlyer_(row, h, 2),
    frequent_flyer_3: buildFrequentFlyer_(row, h, 3),
    profile_picture_url: col_(row, h, 'ProfilePictureURL')
  };
}

function mapCountries_(row, h) {
  const name = col_(row, h, 'CountryName') || col_(row, h, 'Country Name') || col_(row, h, 'country_name') || col_(row, h, 'Country') || col_(row, h, 'Name');
  if (!name) return null;
  return {
    country_name: String(name).trim(),
    iso3: col_(row, h, 'Alpha3Code') || col_(row, h, 'Country Code') || col_(row, h, 'CountryCode') || col_(row, h, 'ISO3') || col_(row, h, 'iso3') || col_(row, h, 'Alpha-3') || col_(row, h, 'Alpha3'),
    iso2: col_(row, h, 'Alpha2Code') || col_(row, h, 'Alpha-2 Code') || col_(row, h, 'Alpha-2') || col_(row, h, 'ISO2') || col_(row, h, 'iso2')
  };
}

function mapRelationshipLog_(row, h) {
  const dateVal = toIsoDate_(colRaw_(row, h, 'Date')) || toIsoDate_(col_(row, h, 'Date')) || toIsoDate_(col_(row, h, 'date'));
  if (!dateVal) return null;
  return {
    date: dateVal,
    kimber_country: col_(row, h, 'KimberCountry'),
    siona_country: col_(row, h, 'SionaCountry'),
    notes: col_(row, h, 'Notes'),
    ks_uk_work_days: col_(row, h, 'KSUKWorkDays'),
    ss_uk_work_days: col_(row, h, 'SSUKWorkDays')
  };
}

function mapStatistics_(row, h) {
  const country = col_(row, h, 'Country') || col_(row, h, 'country');
  if (!country) return null;
  // Skip summary section rows (not real country data)
  const c = String(country).trim().toLowerCase();
  if (['summary', 'kimber total countries', 'siona total countries', 'together total countries', 'last updated'].indexOf(c) >= 0) return null;
  const n = (v) => { const x = parseInt(v, 10); return isNaN(x) ? 0 : x; };
  const yesNo = (val) => (String(val || '').toLowerCase() === 'yes' || String(val || '').toLowerCase() === 'true' || String(val || '').toLowerCase() === '1');
  return {
    country: country,
    country_code: col_(row, h, 'Country_Code') || col_(row, h, 'Country Code') || col_(row, h, 'country_code') || col_(row, h, 'ISO3'),
    together_days: n(col_(row, h, 'Together_Days') || col_(row, h, 'Together Days')),
    kimber_visited: yesNo(col_(row, h, 'Kimber_Visited') || col_(row, h, 'Kimber Visited')),
    siona_visited: yesNo(col_(row, h, 'Siona_Visited') || col_(row, h, 'Siona Visited')),
    together_visited: yesNo(col_(row, h, 'Together_Visited') || col_(row, h, 'Together Visited'))
  };
}

function mapPresentBookings_(row, h) {
  const id = col_(row, h, 'BookingID') || col_(row, h, 'booking_id');
  if (!id) return null;
  return {
    booking_id: id,
    profile_id: col_(row, h, 'ProfileID') || col_(row, h, 'profile_id'),
    type: col_(row, h, 'Type'),
    sub_type: col_(row, h, 'SubType'),
    start_date: toIsoDate_(colRaw_(row, h, 'StartDate')) || toIsoDate_(col_(row, h, 'StartDate')) || null,
    end_date: toIsoDate_(colRaw_(row, h, 'EndDate')) || toIsoDate_(col_(row, h, 'EndDate')) || null,
    country: col_(row, h, 'Country'),
    city: col_(row, h, 'City'),
    details: col_(row, h, 'Details'),
    linked_booking_id: col_(row, h, 'LinkedBookingID')
  };
}

function mapVisaRules_(row, h) {
  const id = col_(row, h, 'RuleID') || col_(row, h, 'rule_id');
  if (!id) return null;
  const n = (v) => { const x = parseInt(v, 10); return isNaN(x) ? null : x; };
  return {
    rule_id: id,
    jurisdiction: col_(row, h, 'Jurisdiction'),
    window_days: n(col_(row, h, 'WindowDays')),
    max_days: n(col_(row, h, 'MaxDays')),
    contiguous_territory: (col_(row, h, 'ContiguousTerritory') || '').toLowerCase() === 'yes',
    notes: col_(row, h, 'Notes')
  };
}

function mapPreRelationshipCountries_(row, h) {
  const pid = col_(row, h, 'ProfileID') || col_(row, h, 'profile_id');
  const country = col_(row, h, 'CountryName') || col_(row, h, 'country_name');
  if (!pid || !country) return null;
  return {
    profile_id: pid,
    country_name: country,
    visited_before: (col_(row, h, 'VisitedBefore') || '').toLowerCase() !== 'no'
  };
}

function mapBucketList_(row, h) {
  const id = col_(row, h, 'ID') || col_(row, h, 'id') || 'BL-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  return {
    id: id,
    user: col_(row, h, 'User'),
    country: col_(row, h, 'Country'),
    icon: col_(row, h, 'Icon'),
    description: col_(row, h, 'Description'),
    notes: col_(row, h, 'Notes'),
    image_url: col_(row, h, 'ImageUrl'),
    completed: (col_(row, h, 'Completed') || '').toLowerCase() === 'yes',
    completed_date: toIsoDate_(colRaw_(row, h, 'CompletedDate')) || toIsoDate_(col_(row, h, 'CompletedDate')) || null
  };
}
