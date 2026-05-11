Resuming the previously approved capture run.

## Steps

1. Navigate to `/` at 1920×1080 to verify the session is authenticated and ID locale is active.
2. Capture filled validation tables (seed already in DB):
   - `23-operator-validation-id-filled.png`
   - `24-supervisor-validation-id-filled.png`
3. Open a real row on each page and capture detail dialogs:
   - `21-operator-validation-id-detail.png`
   - `22-supervisor-validation-id-detail.png`
4. Capture remaining dialog screenshots:
   - Workers: `11-add`, `12-edit`, `13-delete`, `14-enroll`
   - Zones: `15-zone`, `16-camera`
   - Users: `17-invite`, `18-credentials`, `19-edit-role`, `20-delete`
5. Run `revert.sql` to restore alerts/events and remove seeded validations; remove temp backup file.
6. Return all 14 PNGs as `<lov-artifact>` tags.

## Notes
- Viewport stays at 1920×1080, ID locale enforced after each navigate.
- Throwaway invite uses `qa+screenshot-<ts>@example.com`; the seeded auth user is deleted right after the credentials capture.
- All seed data fully reverted at the end; no permanent DB changes.
