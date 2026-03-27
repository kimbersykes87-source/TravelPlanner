-- Fourth frequent-flyer slot (Profiles sheet: FrequentFlyer4, FFNumber4, FFStatus4)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS frequent_flyer_4 TEXT;
