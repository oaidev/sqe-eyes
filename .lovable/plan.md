

## Plan: Fix Simulasi Deteksi, Update Branding, Tambah Jenis Pelanggaran, Analisis Snapshot & Confidence

### 1. Fix Edge Function `detect-event` (Error 400)

**Root cause**: Line 120 requires `camera_id` — simulation page only sends `image_base64` without `camera_id`.

**Fix**: Make `camera_id` optional. When absent, skip camera/zone lookup and run face recognition + PPE detection only (simulation mode). Also upload base64 image to storage bucket `event-snapshots` and save as `snapshot_url`.

- Create new storage bucket `event-snapshots` (public) via migration
- In `detect-event/index.ts`: if no `camera_id`, skip camera lookup and zone PPE rules, still do face search + PPE detection, upload image to storage, insert event with a dummy/null `camera_id`

**Problem**: `events.camera_id` is `NOT NULL`. Need migration to make it nullable, or use a "simulation" camera approach. Making it nullable is cleaner.

- Migration: `ALTER TABLE events ALTER COLUMN camera_id DROP NOT NULL;`

### 2. Replace "SQE Eyes" branding with "COSMOS"

Files to update:
- `src/pages/Auth.tsx` line 76: `© 2026 SQE COSMOS` → `© 2026 COSMOS`
- `src/pages/Auth.tsx` lines 40-41: Replace text header with PROXIS logo image
- `src/pages/NotFound.tsx` line 14: alt text `SQE Eyes` → `COSMOS`
- `src/components/ui/LoadingScreen.tsx` line 7: alt text `SQE Eyes` → `COSMOS`
- Edge functions `collectionId = "sqe-eyes-workers"` — this is the AWS Rekognition collection name, NOT user-facing, leave as-is

### 3. Snapshot/Video Storage Analysis

**Current state**: `snapshot_url` is only saved when `image_url` is passed (line 323: `snapshot_url: image_url || null`). For simulation (base64), it's always null. No video clip is ever saved.

**Fix**: In `detect-event`, when `image_base64` is provided, upload to `event-snapshots` bucket and store the public URL as `snapshot_url`. This way validation pages will show the photo evidence.

### 4. Add "Jenis Pelanggaran" Dropdown

Add a `jenis_pelanggaran` column to `supervisor_validations` table.

**Migration**: `ALTER TABLE supervisor_validations ADD COLUMN jenis_pelanggaran text;`

**Options**: APD Tidak Lengkap, Masuk Tanpa Izin, Keluar Tanpa Izin, Orang Tidak Dikenal, Lainnya

**UI changes**:
- `OperatorValidation.tsx`: Add dropdown before status dropdown in validation form, show in table list
- `SupervisorValidation.tsx`: Same — add dropdown in final form, show in table list + operator validation info section
- Both pages: Add "Jenis Pelanggaran" column to table and CSV export

### 5. Confidence showing "-"

**Analysis**: Confidence is null when `SearchFacesByImage` finds no match (no `FaceMatches`), or face search throws an error. This is expected — "-" means no face was recognized.

**Fix**: Display "N/A" instead of "-" for clarity, with a tooltip "Wajah tidak cocok".

### 6. Revisi SID reflection in list

**Current issue**: After SID revision via `events.update({ worker_id })`, queries are invalidated but the `events` table has an UPDATE RLS policy that blocks updates (`Can't UPDATE records`). This means SID revision silently fails.

**Fix**: Add UPDATE RLS policy for operators/admins on `events` table via migration.

---

### Summary of Changes

**Database migrations** (3):
1. Make `events.camera_id` nullable
2. Add UPDATE policy on `events` for operators/admins/supervisors
3. Add `jenis_pelanggaran` column to `supervisor_validations`
4. Create `event-snapshots` storage bucket with RLS

**Edge function** (`detect-event/index.ts`):
- Make `camera_id` optional — simulation mode
- Upload base64 image to storage, save URL as `snapshot_url`

**Frontend files** (5):
- `Auth.tsx`: Replace header text with PROXIS logo, fix copyright
- `NotFound.tsx`: Fix alt text
- `LoadingScreen.tsx`: Fix alt text
- `OperatorValidation.tsx`: Add jenis pelanggaran dropdown + table column, fix confidence display
- `SupervisorValidation.tsx`: Add jenis pelanggaran dropdown + table column, fix confidence display

