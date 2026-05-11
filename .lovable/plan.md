Capture two additional high-res PNGs at 1920×1080 showing the detail popup for an **unvalidated** (status `BARU`) alert on both validation pages.

## Steps

1. Navigate to `/operator-validation` at 1920×1080, ID locale.
2. Find a row with status `BARU` (unvalidated) and click to open the detail dialog.
3. Capture `25-operator-validation-id-detail-unvalidated.png`.
4. Navigate to `/supervisor-validation`, click a `BARU`/`DITERUSKAN` row that has not yet been validated by supervisor.
5. Capture `26-supervisor-validation-id-detail-unvalidated.png`.
6. Save both to `/mnt/documents/` and return as artifacts.

## Notes
- Uses existing seed data already in DB (no new migration).
- No code changes; capture-only run.
- Will continue with remaining unfinished captures (Workers enroll, Zones, Users dialogs) and seed revert in a separate follow-up if you still want them.
