# Viewer mode (read-only share link)

A read-only version of the app for family and friends. Live since 21 September
2026 (`viewer-data` Edge Function). See [GO_LIVE_2026-09.md](../deployment/GO_LIVE_2026-09.md).

## Sharing

Us tab > **Read-only share link**:

- **Create link** makes a link like `https://travelplanner-ks.pages.dev/view?k=<token>`.
- **Copy link** puts it on the clipboard.
- **Make a new link** switches off the current link and creates a new one.

## What viewers see

- Past (All Time, Relationship, Map), Present (To Book, Booked), Future
  (Scenarios, Bucket List), including Scenario overview.
- No create, edit or delete buttons.
- The Us tab says "Hidden for obvious reasons".

## What is never sent to viewers

Passport numbers, US visa details, dates of birth, frequent-flyer numbers and
UK work-day flags. The `viewer-data` Edge Function builds the viewer's data on
the server with only the allowed columns; viewers have no access to the
database itself.

A link without a valid token shows "This share link is not valid".
