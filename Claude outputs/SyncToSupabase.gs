/**
 * Travel Planner v2: Google Sheets -> Supabase sync
 *
 * The Sheet is the source of truth for Profiles, Countries, RelationshipLog,
 * Statistics and VisaRules. Each sync:
 *   1. reads those tabs and checks the data (duplicate or missing dates,
 *      unknown country names, expiry dates before issue dates)
 *   2. upserts every row into Supabase, in batches
 *   3. deletes rows from Supabase that are no longer in the Sheet
 *   4. records the run in the `sync_runs` table so the app can show
 *      "Synced x hours ago" and any data warnings
 *
 * Setup (Apps Script: Project Settings > Script properties):
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service role key (Supabase > Project Settings > API)
 *   SUPABASE_ANON_KEY          optional fallback, only works while the database is still open
 *
 * Menu: Travel Planner > Sync to Supabase / Check data only
 * Trigger: add a daily time-based trigger for runScheduledSync.
 */

var SYNC_BATCH_SIZE = 500;
/** Safety net: never delete more than this share of a table in one run. */
var MAX_DELETE_FRACTION = 0.25;

function onOpen() {
  onAddTravelPlannerMenu();
}

function onAddTravelPlannerMenu() {
  SpreadsheetApp.getUi()
    .createMenu('Travel Planner')
    .addItem('Sync to Supabase', 'syncToSupabase')
    .addItem('Check data only (no sync)', 'checkSheetData')
    .addToUi();
}

/** Menu: full sync with a summary dialog. */
function syncToSupabase() {
  var ui = SpreadsheetApp.getUi();
  var config = getSyncConfig_();
  if (!config) {
    ui.alert('Setup required: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Project Settings > Script properties.');
    return;
  }
  var result = runSync_(config);
  ui.alert(result.message);
}

/** Menu: validate the Sheet without touching Supabase. */
function checkSheetData() {
  var extracted = extractAll_(SpreadsheetApp.getActiveSpreadsheet());
  var problems = extracted.problems;
  SpreadsheetApp.getUi().alert(
    problems.length ? 'Found ' + problems.length + ' issue(s):\n\n' + problems.slice(0, 30).join('\n') : 'No problems found.'
  );
}

/** Time-based trigger entry point (no UI). */
function runScheduledSync() {
  var config = getSyncConfig_();
  if (!config) {
    console.error('Sync skipped: SUPABASE_URL or a Supabase key is not set in Script properties.');
    return;
  }
  var result = runSync_(config);
  console.log(result.message);
  if (!result.ok) throw new Error(result.message); // makes the failure visible in Executions and failure emails
}

function getSyncConfig_() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY') || props.getProperty('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return { base: url.replace(/\/$/, ''), key: key };
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

var TABLES_ = [
  { sheet: 'Profiles', table: 'profiles', key: 'profile_id', mapper: mapProfiles_ },
  { sheet: 'Countries', table: 'countries', key: 'country_name', mapper: mapCountries_ },
  { sheet: 'RelationshipLog', table: 'relationship_log', key: 'date', mapper: mapRelationshipLog_ },
  { sheet: 'Statistics', table: 'statistics', key: 'country', mapper: mapStatistics_ },
  { sheet: 'VisaRules', table: 'visa_rules', key: 'rule_id', mapper: mapVisaRules_ }
];

function runSync_(config) {
  var startedAt = new Date();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var extracted = extractAll_(ss);
  var tableResults = {};
  var errors = [];

  TABLES_.forEach(function (t) {
    var rows = extracted.rows[t.table];
    if (!rows) {
      tableResults[t.table] = { skipped: 'tab not found' };
      return;
    }
    if (!rows.length) {
      tableResults[t.table] = { skipped: 'no rows' };
      return;
    }
    try {
      upsertRows_(config, t.table, t.key, rows);
      var deleted = deleteMissingRows_(config, t.table, t.key, rows);
      tableResults[t.table] = { upserted: rows.length, deleted: deleted.count };
      if (deleted.skippedReason) errors.push(t.table + ': ' + deleted.skippedReason);
    } catch (e) {
      tableResults[t.table] = { error: String(e.message || e) };
      errors.push(t.table + ': ' + String(e.message || e).substring(0, 200));
    }
  });

  var ok = errors.length === 0;
  var summary = Object.keys(tableResults)
    .map(function (name) {
      var r = tableResults[name];
      if (r.error) return name + ': FAILED';
      if (r.skipped) return name + ': skipped (' + r.skipped + ')';
      return name + ': ' + r.upserted + ' rows' + (r.deleted ? ', ' + r.deleted + ' removed' : '');
    })
    .join('\n');
  var message = (ok ? 'Sync complete.' : 'Sync finished with errors:\n' + errors.join('\n')) + '\n\n' + summary;
  if (extracted.problems.length) {
    message += '\n\nData warnings (' + extracted.problems.length + '):\n' + extracted.problems.slice(0, 15).join('\n');
  }

  try {
    recordRun_(config, {
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      ok: ok,
      message: ok ? 'ok' : errors.join('; ').substring(0, 1000),
      tables: tableResults,
      problems: extracted.problems.slice(0, 100)
    });
  } catch (e) {
    console.warn('Could not record sync run (has the sync_runs migration been applied?): ' + e.message);
  }

  return { ok: ok, message: message };
}

function headers_(config, extra) {
  var h = {
    apikey: config.key,
    Authorization: 'Bearer ' + config.key,
    'Content-Type': 'application/json'
  };
  for (var k in extra || {}) h[k] = extra[k];
  return h;
}

function request_(config, method, path, body, extraHeaders) {
  var resp = UrlFetchApp.fetch(config.base + '/rest/v1/' + path, {
    method: method,
    headers: headers_(config, extraHeaders),
    payload: body == null ? undefined : JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(method.toUpperCase() + ' ' + path.split('?')[0] + ' -> HTTP ' + code + ': ' + resp.getContentText().substring(0, 300));
  }
  var text = resp.getContentText();
  return text ? JSON.parse(text) : null;
}

function upsertRows_(config, table, key, rows) {
  for (var i = 0; i < rows.length; i += SYNC_BATCH_SIZE) {
    request_(
      config,
      'post',
      table + '?on_conflict=' + encodeURIComponent(key),
      rows.slice(i, i + SYNC_BATCH_SIZE),
      { Prefer: 'resolution=merge-duplicates,return=minimal' }
    );
  }
}

/** Remove Supabase rows whose key no longer exists in the Sheet. */
function deleteMissingRows_(config, table, key, rows) {
  var inSheet = {};
  rows.forEach(function (r) { inSheet[String(r[key])] = true; });

  var existing = [];
  for (var from = 0; ; from += 1000) {
    var page = request_(
      config,
      'get',
      table + '?select=' + encodeURIComponent(key) + '&order=' + encodeURIComponent(key) + '&limit=1000&offset=' + from,
      null
    );
    existing = existing.concat(page || []);
    if (!page || page.length < 1000) break;
  }
  var stale = existing
    .map(function (r) { return String(r[key]); })
    .filter(function (k) { return !inSheet[k]; });

  if (!stale.length) return { count: 0 };
  if (stale.length > Math.max(5, existing.length * MAX_DELETE_FRACTION)) {
    return {
      count: 0,
      skippedReason: 'would remove ' + stale.length + ' of ' + existing.length + ' rows, so nothing was deleted. Check the tab, then delete manually if intended.'
    };
  }
  for (var i = 0; i < stale.length; i += 100) {
    var list = stale.slice(i, i + 100).map(function (k) { return '"' + k.replace(/"/g, '\\"') + '"'; }).join(',');
    request_(config, 'delete', table + '?' + encodeURIComponent(key) + '=in.(' + encodeURIComponent(list) + ')', null, {
      Prefer: 'return=minimal'
    });
  }
  return { count: stale.length };
}

function recordRun_(config, run) {
  request_(config, 'post', 'sync_runs', run, { Prefer: 'return=minimal' });
}

/* ------------------------------------------------------------------ */
/* Read + validate the Sheet                                           */
/* ------------------------------------------------------------------ */

function extractAll_(ss) {
  var tz = ss.getSpreadsheetTimeZone();
  var rowsByTable = {};
  var problems = [];

  TABLES_.forEach(function (t) {
    var sheet = ss.getSheetByName(t.sheet);
    if (!sheet) {
      rowsByTable[t.table] = null;
      problems.push('Tab "' + t.sheet + '" not found.');
      return;
    }
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      rowsByTable[t.table] = [];
      return;
    }
    var header = values[0];
    var mapper = t.mapper;
    var mapped = [];
    for (var i = 1; i < values.length; i++) {
      var row = mapper(values[i], header, tz);
      if (row) mapped.push(row);
    }
    rowsByTable[t.table] = dedupe_(mapped, t.key, t.sheet, problems);
  });

  validateLog_(rowsByTable.relationship_log, rowsByTable.countries, problems);
  validateProfiles_(rowsByTable.profiles, problems);
  return { rows: rowsByTable, problems: problems };
}

/** Keep the last row per key and report duplicates. */
function dedupe_(rows, key, sheetName, problems) {
  var byKey = {};
  var order = [];
  rows.forEach(function (r) {
    var k = String(r[key]).toLowerCase();
    if (byKey[k]) problems.push(sheetName + ': "' + r[key] + '" appears more than once (last one used).');
    else order.push(k);
    byKey[k] = r;
  });
  return order.map(function (k) { return byKey[k]; });
}

function validateLog_(log, countries, problems) {
  if (!log || !log.length) return;
  var known = {};
  (countries || []).forEach(function (c) { known[String(c.country_name).toLowerCase()] = true; });
  var unknown = {};
  var dates = log.map(function (r) { return r.date; }).sort();
  for (var i = 1; i < dates.length; i++) {
    var gap = dayDiff_(dates[i - 1], dates[i]);
    if (gap > 1) problems.push('RelationshipLog: ' + (gap - 1) + ' missing day(s) between ' + dates[i - 1] + ' and ' + dates[i] + '.');
  }
  log.forEach(function (r) {
    [r.kimber_country, r.siona_country].forEach(function (c) {
      if (c && countries && countries.length && !known[c.toLowerCase()]) unknown[c] = true;
    });
  });
  Object.keys(unknown).forEach(function (c) {
    problems.push('RelationshipLog: "' + c + '" is not in the Countries tab (check the spelling).');
  });
}

function validateProfiles_(profiles, problems) {
  (profiles || []).forEach(function (p) {
    [
      ['passport', p.passport_issued, p.passport_expiry],
      ['second passport', null, p.passport2_expiry],
      ['US visa', p.us_visa_issued, p.us_visa_expiry]
    ].forEach(function (x) {
      if (x[1] && x[2] && x[2] <= x[1]) {
        problems.push('Profiles: ' + p.profile_id + ' ' + x[0] + ' expiry (' + x[2] + ') is before its issue date (' + x[1] + '). Swapped?');
      }
    });
  });
}

function dayDiff_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Column helpers and row mappers                                      */
/* ------------------------------------------------------------------ */

function headerIndex_(header, name) {
  var target = String(name || '').toLowerCase();
  for (var i = 0; i < header.length; i++) {
    if (String(header[i] || '').trim().toLowerCase() === target) return i;
  }
  return -1;
}

/** First matching column (by any of the names) as trimmed text. */
function col_(row, header) {
  for (var a = 2; a < arguments.length; a++) {
    var i = headerIndex_(header, arguments[a]);
    if (i >= 0 && row[i] != null && String(row[i]).trim() !== '') return String(row[i]).trim();
  }
  return '';
}

function colRaw_(row, header, name) {
  var i = headerIndex_(header, name);
  return i >= 0 ? row[i] : null;
}

/** Normalise a cell to YYYY-MM-DD using the spreadsheet's time zone. */
function toIsoDate_(val, tz) {
  if (val == null || val === '') return null;
  if (Object.prototype.toString.call(val) === '[object Date]') {
    if (isNaN(val.getTime())) return null;
    return Utilities.formatDate(val, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  var dmy = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); // UK style 20/09/2026
  if (dmy) return dmy[3] + '-' + ('0' + dmy[2]).slice(-2) + '-' + ('0' + dmy[1]).slice(-2);
  return null;
}

function dateCol_(row, header, name, tz) {
  return toIsoDate_(colRaw_(row, header, name), tz);
}

/** "Program - Number (Tier)" from FrequentFlyerN / FFNumberN / FFStatusN. */
function buildFrequentFlyer_(row, h, n) {
  var program = col_(row, h, 'FrequentFlyer' + n, 'Frequent Flyer ' + n, 'FF' + n);
  var number = col_(row, h, 'FFNumber' + n, 'FrequentFlyer' + n + 'Number', 'Frequent Flyer ' + n + ' Number');
  var tier = col_(row, h, 'FFStatus' + n, 'FrequentFlyer' + n + 'Tier', 'Frequent Flyer ' + n + ' Tier');
  if (!program && !number) return '';
  var main = [program, number].filter(Boolean).join(' - ');
  return tier ? main + ' (' + tier + ')' : main;
}

function mapProfiles_(row, h, tz) {
  var id = col_(row, h, 'ProfileID', 'profile_id');
  if (!id) return null;
  return {
    profile_id: id,
    full_name: col_(row, h, 'FullName', 'full_name'),
    dob: dateCol_(row, h, 'DOB', tz),
    passport_number: col_(row, h, 'PassportNumber'),
    passport_expiry: dateCol_(row, h, 'PassportExpiry', tz),
    passport_issued: dateCol_(row, h, 'PassportIssued', tz),
    passport2_number: col_(row, h, 'Passport2Number'),
    passport2_country: col_(row, h, 'Passport2Country'),
    passport2_expiry: dateCol_(row, h, 'Passport2Expiry', tz),
    us_visa_number: col_(row, h, 'USVisaNumber'),
    us_visa_expiry: dateCol_(row, h, 'USVisaExpiry', tz),
    us_visa_issued: dateCol_(row, h, 'USVisaIssued', tz),
    frequent_flyer_1: buildFrequentFlyer_(row, h, 1),
    frequent_flyer_2: buildFrequentFlyer_(row, h, 2),
    frequent_flyer_3: buildFrequentFlyer_(row, h, 3),
    frequent_flyer_4: buildFrequentFlyer_(row, h, 4),
    profile_picture_url: col_(row, h, 'ProfilePictureURL')
  };
}

function mapCountries_(row, h) {
  var name = col_(row, h, 'CountryName', 'Country Name', 'country_name', 'Country', 'Name');
  if (!name) return null;
  return {
    country_name: name,
    iso3: col_(row, h, 'Alpha3Code', 'Country Code', 'CountryCode', 'ISO3', 'Alpha-3', 'Alpha3'),
    iso2: col_(row, h, 'Alpha2Code', 'Alpha-2 Code', 'Alpha-2', 'ISO2')
  };
}

function mapRelationshipLog_(row, h, tz) {
  var date = dateCol_(row, h, 'Date', tz);
  if (!date) return null;
  return {
    date: date,
    kimber_country: col_(row, h, 'KimberCountry'),
    siona_country: col_(row, h, 'SionaCountry'),
    notes: col_(row, h, 'Notes'),
    ks_uk_work_days: col_(row, h, 'KSUKWorkDays'),
    ss_uk_work_days: col_(row, h, 'SSUKWorkDays')
  };
}

function mapStatistics_(row, h) {
  var country = col_(row, h, 'Country', 'country');
  if (!country) return null;
  var c = country.toLowerCase();
  if (['summary', 'kimber total countries', 'siona total countries', 'together total countries', 'last updated'].indexOf(c) >= 0) return null;
  var n = function (v) { var x = parseInt(v, 10); return isNaN(x) ? 0 : x; };
  var yes = function (v) { v = String(v || '').toLowerCase(); return v === 'yes' || v === 'true' || v === '1'; };
  return {
    country: country,
    country_code: col_(row, h, 'Country_Code', 'Country Code', 'country_code', 'ISO3'),
    together_days: n(col_(row, h, 'Together_Days', 'Together Days')),
    kimber_visited: yes(col_(row, h, 'Kimber_Visited', 'Kimber Visited')),
    siona_visited: yes(col_(row, h, 'Siona_Visited', 'Siona Visited')),
    together_visited: yes(col_(row, h, 'Together_Visited', 'Together Visited'))
  };
}

function mapVisaRules_(row, h) {
  var id = col_(row, h, 'RuleID', 'rule_id');
  if (!id) return null;
  var n = function (v) { var x = parseInt(v, 10); return isNaN(x) ? null : x; };
  return {
    rule_id: id,
    jurisdiction: col_(row, h, 'Jurisdiction'),
    window_days: n(col_(row, h, 'WindowDays')),
    max_days: n(col_(row, h, 'MaxDays')),
    contiguous_territory: col_(row, h, 'ContiguousTerritory').toLowerCase() === 'yes',
    notes: col_(row, h, 'Notes')
  };
}
