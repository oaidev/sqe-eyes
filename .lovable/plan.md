Resuming the previously approved capture plan now that the preview session is authenticated.

## Steps

1. Verify auth by navigating to `/` at 1920×1080; confirm ID locale is active.
2. Capture filled validation tables (seed already in DB):
   - `23-operator-validation-id-filled.png`
   - `24-supervisor-validation-id-filled.png`
3. Capture detail dialogs on real rows:
   - `21-operator-validation-id-detail.png`
   - `22-supervisor-validation-id-detail.png`
4. Capture remaining dialogs:
   - Workers: `11-add`, `12-edit`, `13-delete`, `14-enroll`
   - Zones: `15-zone`, `16-camera`
   - Users: `17-invite`, `18-credentials`, `19-edit-role`, `20-delete`
5. Run `revert.sql` to restore alerts/events and delete seeded validations; drop temp backup.
6. Hand back all 14 PNGs as `<lov-artifact>` tags.

## Notes
- Throwaway invite email pattern: `qa+screenshot-<ts>@example.com`; the seeded auth user is deleted via the existing flow right after the credentials screenshot.
- Viewport stays 1920×1080, ID locale enforced after each navigate.
- All seed data fully reverted; no permanent DB changes.
