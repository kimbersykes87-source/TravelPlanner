-- Remove tables that are no longer used (both were empty on 20 Sep 2026):
--   pre_relationship_countries: "visited before we met" is covered by the
--     Kimber_Visited / Siona_Visited flags in the Statistics tab.
--   present_bookings: replaced by to_book and booked_upcoming.
DROP TABLE IF EXISTS pre_relationship_countries;
DROP TABLE IF EXISTS present_bookings;
