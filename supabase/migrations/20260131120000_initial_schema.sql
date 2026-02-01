-- Travel Planner v2 - Initial Supabase Schema
-- Maps to Google Sheets structure for migration from v1

-- Profiles: User profiles (Kimber, Siona)
CREATE TABLE profiles (
  profile_id TEXT PRIMARY KEY,
  full_name TEXT,
  dob DATE,
  passport_number TEXT,
  passport_expiry DATE,
  passport_issued DATE,
  passport2_number TEXT,
  passport2_country TEXT,
  passport2_expiry DATE,
  us_visa_number TEXT,
  us_visa_expiry DATE,
  us_visa_issued DATE,
  frequent_flyer_1 TEXT,
  frequent_flyer_2 TEXT,
  frequent_flyer_3 TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Countries: Master country list
CREATE TABLE countries (
  id BIGSERIAL PRIMARY KEY,
  country_name TEXT NOT NULL,
  iso3 TEXT,
  iso2 TEXT,
  UNIQUE(country_name)
);

-- RelationshipLog: Daily travel log since 2023-09-30
CREATE TABLE relationship_log (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  kimber_country TEXT,
  siona_country TEXT,
  notes TEXT,
  ks_uk_work_days TEXT,
  ss_uk_work_days TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistics: Auto-calculated country stats
CREATE TABLE statistics (
  id BIGSERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  country_code TEXT,
  kimber_days INTEGER DEFAULT 0,
  siona_days INTEGER DEFAULT 0,
  together_days INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  rank INTEGER,
  kimber_visited BOOLEAN DEFAULT FALSE,
  siona_visited BOOLEAN DEFAULT FALSE,
  together_visited BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PresentBookings: Current travel bookings
CREATE TABLE present_bookings (
  booking_id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(profile_id),
  type TEXT,
  sub_type TEXT,
  start_date DATE,
  end_date DATE,
  country TEXT,
  city TEXT,
  details TEXT,
  linked_booking_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FutureScenarios: Scenario-level metadata
CREATE TABLE future_scenarios (
  scenario_id TEXT PRIMARY KEY,
  headline TEXT,
  created_by TEXT,
  rating INTEGER,
  start_date DATE,
  end_date DATE,
  summary TEXT,
  icon TEXT,
  accommodation_type TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ScenarioStays: Detailed stays within a scenario
CREATE TABLE scenario_stays (
  id BIGSERIAL PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES future_scenarios(scenario_id) ON DELETE CASCADE,
  stay_id TEXT NOT NULL,
  profile_scope TEXT,
  country TEXT,
  city TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  accommodation_type TEXT,
  route_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, stay_id)
);

-- ToBook: Tasks to book
CREATE TABLE to_book (
  task_id TEXT PRIMARY KEY,
  assignee TEXT,
  booking_type TEXT,
  start_date DATE,
  end_date DATE,
  instruction TEXT,
  deadline DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BookedUpcoming: Confirmed bookings
CREATE TABLE booked_upcoming (
  booking_id TEXT PRIMARY KEY,
  type TEXT,
  dates TEXT,
  travellers TEXT,
  details TEXT,
  headline TEXT,
  start_date DATE,
  end_date DATE,
  confirmation_data TEXT,
  notes TEXT,
  created_from_task TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BookingTypeMeta: Booking type metadata
CREATE TABLE booking_type_meta (
  type TEXT PRIMARY KEY,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VisaRules: Visa rule definitions
CREATE TABLE visa_rules (
  rule_id TEXT PRIMARY KEY,
  jurisdiction TEXT,
  window_days INTEGER,
  max_days INTEGER,
  contiguous_territory BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PreRelationshipCountries: Countries visited before relationship
CREATE TABLE pre_relationship_countries (
  id BIGSERIAL PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(profile_id),
  country_name TEXT NOT NULL,
  visited_before BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BucketList: Bucket list items
CREATE TABLE bucket_list (
  id TEXT PRIMARY KEY,
  "user" TEXT,
  country TEXT,
  icon TEXT,
  description TEXT,
  notes TEXT,
  image_url TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: Start with permissive policies for 2 users with password gate
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE present_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE booked_upcoming ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_type_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_relationship_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow all for anon/authenticated - tighten later)
CREATE POLICY "Allow all for anon" ON profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON countries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON relationship_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON statistics FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON present_bookings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON future_scenarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON scenario_stays FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON to_book FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON booked_upcoming FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON booking_type_meta FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON visa_rules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON pre_relationship_countries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON bucket_list FOR ALL TO anon USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_relationship_log_date ON relationship_log(date);
CREATE INDEX idx_statistics_country ON statistics(country);
CREATE INDEX idx_present_bookings_profile ON present_bookings(profile_id);
CREATE INDEX idx_scenario_stays_scenario ON scenario_stays(scenario_id);
CREATE INDEX idx_pre_relationship_profile ON pre_relationship_countries(profile_id);
