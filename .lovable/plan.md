
# Capture remaining COSMOS pages in Indonesian (with populated dashboard charts)

Continue the screenshot series in `id` locale at **1920×1080** and save to `/mnt/documents/cosmos-ui/`. The dashboard already has 380 alerts in the database, but **0 fall within the last 7 days**, so the charts render empty. Plan below seeds realistic 7-day data so designers see the filled state.

## Pages to capture (in this order)

| # | Route | File |
|---|---|---|
| 02 | `/` | `02-dashboard-id.png` |
| 03 | `/workers` | `03-workers-id.png` |
| 04 | `/zones` | `04-zones-id.png` |
| 05 | `/users` | `05-users-id.png` |
| 06 | `/roles` | `06-roles-id.png` |
| 07 | `/simulate` | `07-simulate-id.png` |
| 08 | `/operator-validation` | `08-operator-validation-id.png` |
| 09 | `/supervisor-validation` | `09-supervisor-validation-id.png` |
| 10 | `/404` (via `/this-route-doesnt-exist`) | `10-not-found-id.png` |

Language toggle stays on **ID** for the whole run (already set from the previous capture).

## Populating the dashboard charts

Goal: all three 7-day stacked bar charts on `/` show varied, realistic bars across every day so the layout is fully exercised.

Approach — temporary, reversible data seeding:

1. **Backdate ~70 existing alerts** by spreading `created_at` evenly across the last 7 days (10/day), with a healthy mix of `APD_VIOLATION`, `UNKNOWN_PERSON`, and `UNAUTHORIZED_EXIT` types so all three charts are populated.
2. **Insert ~40 `supervisor_validations`** rows tied to a subset of those alerts, mixing `VALID` and `TIDAK_VALID` statuses, leaving the remainder un-validated. This makes every stack segment (sudah/belum, valid/tidak_valid/belum) visible.
3. Capture the dashboard screenshot.
4. **Revert the seed**: restore original `created_at` values from a snapshot table and delete the inserted validations, leaving the database exactly as it was.

The seed script will:
- First snapshot the affected alerts to a temp table `_chart_seed_backup` (id + original created_at).
- Apply the backdating + insert validations.
- Take screenshots.
- Restore from `_chart_seed_backup` and drop it.

## Steps

1. Snapshot + seed the dashboard data (one SQL transaction).
2. Navigate to `/` (already authenticated, viewport 1920×1080, language = ID), screenshot, save as `02-dashboard-id.png`.
3. For each remaining route: navigate → screenshot → save with the matching filename.
4. Restore the dashboard data from the snapshot (one SQL transaction) and drop the temp table.
5. Hand back the full `/mnt/documents/cosmos-ui/` set as `<lov-artifact>` tags (each PNG individually).

## Notes

- Modals/dialogs and EN versions are out of scope for this run — happy to follow up.
- The `/404` page will be captured by navigating to a deliberately invalid route.
- If any protected route bounces to `/auth`, I'll stop and ask you to re-sign-in.
- All seeded data is fully reverted; nothing permanent is written.
