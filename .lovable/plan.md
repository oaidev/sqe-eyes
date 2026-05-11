# Plan: Export all COSMOS UI pages as high-res PNGs

Capture every authenticated page in the app at a high-resolution desktop viewport and save the PNGs to `/mnt/documents/` so you can download them and drop into Figma as references.

## Pages to capture

1. `/auth` — Sign in (logged-out, no auth needed)
2. `/` — Dashboard
3. `/workers` — Workers list
4. `/zones` — Zones & Cameras
5. `/users` — User management
6. `/roles` — Roles & Permissions
7. `/simulate` — Detection Simulation
8. `/operator-validation` — Operator validation queue
9. `/supervisor-validation` — Supervisor validation queue
10. `/404` — Not Found page

Optional extras (open dialogs/modals) if you want them too:
- Worker create dialog, CSV import dialog, Face enroll dialog
- Zone create dialog with PPE matrix
- User invite dialog

## Approach

1. Use `browser--navigate_to_sandbox` at viewport **1920×1200** (high-res desktop) for each route.
2. For authenticated pages, you must already be logged in inside the preview — I'll verify on first navigation; if I hit `/auth`, I'll stop and ask you to sign in.
3. For each route: navigate → wait for content → `browser--screenshot` → save as `/mnt/documents/cosmos-ui/<page>.png`.
4. After capture, present each PNG via `<lov-artifact>` so you can preview/download.

## Output

A folder of PNGs at `/mnt/documents/cosmos-ui/`, one per page, named e.g. `01-auth.png`, `02-dashboard.png`, etc. Both Indonesian and English versions are possible — by default I'll capture in the **current language** set in the preview. Tell me if you also want a parallel set in the other language (would double the screenshot count).

## Notes / limits

- Screenshots are bitmap references, not editable Figma components — you'll still need html.to.design or manual rebuild for editable layers.
- Pages with empty states will show empty states; pages with data will show whatever's currently in the database.
- Modals/dialogs require a click to open — only included if you confirm you want them.

## Questions before I run

- Capture **only the main pages**, or also **dialogs/modals**?
- Capture **current language only**, or **both ID + EN**?
