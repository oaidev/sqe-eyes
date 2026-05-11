
# Capture Indonesian popup screenshots + filled validation tables

Continue the COSMOS UI screenshot series in **ID locale @ 1920×1080**, saving to `/mnt/documents/cosmos-ui/`.

## Part 1 — Popup / dialog captures

For each page, navigate, trigger the dialog, screenshot, save. Filenames use the `NN-page-id-popup-name.png` convention.

### `/workers` — 4 dialogs
- `11-workers-id-add.png` — "Tambah Pekerja" dialog (form to add new worker)
- `12-workers-id-edit.png` — Edit dialog (pencil icon on a row)
- `13-workers-id-delete.png` — Delete confirmation dialog
- `14-workers-id-enroll.png` — `EnrollFaceDialog` (camera icon on an enrolled-eligible worker)

### `/zones` — 2 dialogs
- `15-zones-id-zone.png` — Add/Edit zone dialog
- `16-zones-id-camera.png` — Add/Edit camera dialog (full PPE matrix + off-time form, the largest dialog)

### `/users` — 4 dialogs
- `17-users-id-invite.png` — Invite user dialog
- `18-users-id-credentials.png` — Created credentials success dialog (will be opened by submitting the invite form with a throwaway `qa+screenshot-<ts>@example.com` address; the resulting auth user will be deleted afterwards via the same delete flow already in the page)
- `19-users-id-edit-role.png` — Edit role dialog
- `20-users-id-delete.png` — Delete user `AlertDialog`

### `/simulate` — no dialogs
The Simulate page has **no popups** (results render inline in panels). Skipping. If you want me to capture specific inline states (e.g. with a sample image uploaded and detection results filled), say the word and I'll add it.

### `/operator-validation` — 1 dialog
- `21-operator-validation-id-detail.png` — Event detail dialog (opened by clicking a row)

### `/supervisor-validation` — 1 dialog
- `22-supervisor-validation-id-detail.png` — Event detail dialog (opened by clicking a row)

## Part 2 — Filled validation tables

Both validation pages default to "today only" and the seeded data from the previous run was already reverted, so the tables are empty. Re-seed temporarily:

1. Snapshot ~30 alerts → temp table `_validation_seed_backup` (id + original `created_at`, `status`).
2. Backdate them to **today** with a healthy mix of `BARU` / `DIVALIDASI` statuses and varied `alert_type`s so both the operator queue (pending) and the supervisor queue (escalated) have rows.
3. Insert ~10 `supervisor_validations` rows with `validation_level = 'operator'` so the supervisor page (which lists operator-validated alerts awaiting Level 2) is also populated.
4. Capture:
   - `23-operator-validation-id-filled.png` — `/operator-validation` with rows in the table
   - `24-supervisor-validation-id-filled.png` — `/supervisor-validation` with rows in the table
5. Restore from `_validation_seed_backup` and delete the seeded validations (`komentar = 'seed-validation-table'`), drop temp table.

Once the tables are filled, also re-capture the detail dialogs (21, 22) on top of real rows so the dialog opens with realistic data.

## Order of operations

```text
1. Seed validation data (Part 2 setup)
2. Capture filled tables (23, 24)
3. Capture detail dialogs (21, 22) using a real row
4. Capture all other dialogs (11–20) — independent of seed data
5. Revert seed (restore backup, delete seeded validations, drop temp table)
6. Hand back all 14 new PNGs as <lov-artifact> tags
```

## Notes

- Viewport stays at 1920×1080, language stays on **ID** (already toggled from the prior run; will re-verify after each navigation).
- Throwaway invite email (for the credentials dialog) uses a `qa+screenshot-<timestamp>@example.com` pattern; the created user is deleted right after the screenshot via the existing delete flow.
- All seeded data is fully reverted; nothing permanent is written to the database.
- EN versions are still out of scope.
