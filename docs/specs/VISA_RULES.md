# Visa and residency rules

Implemented in `src/lib/visa/`, tested in `src/lib/visa/engine.test.js`.
The input is the daily RelationshipLog. Days after today are treated as the
plan. Limits come from the VisaRules tab (matched on RuleID) with these
defaults:

| RuleID | Who | Rule | Default |
|--------|-----|------|---------|
| `US-ADMISSION` | Kimber (ESTA) | Days per admission | 90 |
| `US-ROLLING365` | Siona (10-year B1/B2) | Guide: days in the US in any 365 | 180 |
| `SCHENGEN-ROLLING` | Both (British passports) | Days in any 180 | 90 |
| `UK-TAX` | Both | UK days per tax year (6 Apr to 5 Apr) | 120 |
| `UK-WORK` | Both | UK work days per tax year; 40+ creates a work tie | 39 |

## How countries are matched

Names are resolved to ISO codes by **exact** (normalised) match: case, accents,
"St"/"Saint" and "&"/"and" do not matter, but "Australia" is never mistaken
for the US and "Ukraine" never for the UK. Names from the Countries tab are
registered first, then the full ISO list and common aliases (England, Holland,
St Maarten, ...).

| Group | Countries |
|-------|-----------|
| US soil | United States, Puerto Rico, US Virgin Islands, Guam, Northern Mariana Islands, American Samoa |
| ESTA "contiguous" | Canada, Mexico, Bermuda, Saint Pierre and Miquelon, and the Caribbean islands |
| Schengen | The 29 members (including Bulgaria and Romania from 1 Jan 2025) plus Monaco, San Marino, Vatican |
| UK | United Kingdom only (not Jersey, Guernsey, Isle of Man) |

## ESTA (Kimber)

- An admission starts on the first day on US soil.
- Side trips to Canada, Mexico or the Caribbean do not reset the clock; it
  keeps running. Leaving for anywhere else ends the admission.
- Over the limit = on US soil after day 90 of the admission.
- The tile shows day X of 90, the must-leave-by date and the planned exit, or,
  when outside the US, the last stay and the next planned entry.

## B1/B2 (Siona)

Each stay's legal limit is the I-94 date given at entry, which the app cannot
know. The tile is a guide: days on US soil in the last 365 days against 180, to
avoid looking like a resident.

## Schengen

Days in the Schengen area in the 180 days ending today (inclusive), against 90.
The tile also flags the first planned day that would go over, and the date you
are back to a full 90 if you stay out.

## UK tax year

Days in the UK from 6 April to today, plus planned days to 5 April shown
separately. Work days count rows marked `Yes` in KSUKWorkDays/SSUKWorkDays.

## Scenario Visa Check

Scenario stays replace the log for their dates, then each rule relevant to
the trip is checked for each traveller:

- **baseline**: days already counted before the trip starts
- **peak**: the highest count reached during the trip
- **left**: headroom at the end of the trip (negative = over)

Being over a limit is shown as a warning, not a blocker, so what-if plans can
still be saved.

Warnings turn amber when fewer than: ESTA 14, B1/B2 30, Schengen 14, UK days
15, UK work days 5 days are left.
