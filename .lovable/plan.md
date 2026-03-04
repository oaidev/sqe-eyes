

# Plan: Multiple UI & Logic Changes

## DB Migrations Required

### 1. Fix user_roles unique constraint for invite flow
The `upsert` uses `onConflict: "user_id"` but the unique constraint is `(user_id, role)`. Need to add a unique constraint on just `user_id` (drop old one, add new one).

```sql
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
```

### 2. Add camera fields: off-time + detection models
```sql
ALTER TABLE public.cameras
  ADD COLUMN off_time_start time DEFAULT NULL,
  ADD COLUMN off_time_end time DEFAULT NULL,
  ADD COLUMN detection_models text[] DEFAULT '{}';
```

## File Changes

### `src/pages/Index.tsx` — Dashboard stat cards + 7-day chart
- Replace current 5 stat cards with: Pekerja Aktif, Zona Aktif, Kamera Aktif, Alert Hari Ini, Valid Hari Ini, Tidak Valid Hari Ini (6 cards, grid 3x2 or 6-col)
- Add bar chart (recharts `BarChart`) showing last 7 days with stacked bars for Valid vs Tidak Valid
- Query `supervisor_validations` grouped by date for last 7 days

### `src/pages/Workers.tsx` — Remove shift
- Remove `shift` from `FormState`, `emptyForm`, form dialog, table column, filter, CSV import
- Remove `SHIFTS` constant and shift filter dropdown
- Remove shift column from table header and body

### `src/pages/Zones.tsx` — Remove shift/time from zona, remove APD count, add camera fields
- **Zone form**: Remove shift, shift_start, shift_end fields from form and display
- **Zone list**: Remove shift info from subtitle text
- **Camera list**: Remove "APD" badge column showing `camPpeCount`
- **Camera form**: Add "Waktu Kamera Off" section (time start/end inputs), add "Model Deteksi" multi-select (checkboxes: "Deteksi APD", "Deteksi Wajah")
- **Tipe dropdown**: Change from entry/exit/area to only "Area Kerja" and "Keluar" (values `area` and `exit`)

### `src/pages/OperatorValidation.tsx` — Multiple changes
- **List table**: Show `SID + Nama` in Pekerja column (e.g. "SID-001 - Budi")
- **Evidence in detail**: Show inline `<img>` for snapshot and `<video>` for clip (not just download buttons)
- **Alasan mapping**: If `validationStatus === 'VALID'` → dropdown: APD Tidak Lengkap, Tidak Ada Izin, Alasan Lainnya. If `TIDAK_VALID` → dropdown: APD Lengkap, Sudah Ada Izin, Alasan Lainnya
- **SID revision**: Add optional searchable dropdown to revise worker SID (search by SID/nama, show "SID - Nama")
- **Status badge**: Valid = red (`destructive`), Pelanggaran badge = no red (use `secondary` or `outline`)

### `src/pages/SupervisorValidation.tsx` — Mirror operator changes
- Same evidence display (inline photo/video)
- Same alasan mapping (Valid/Tidak Valid → different dropdown options)
- Same SID revision dropdown
- Rename "Override" → "Final" everywhere (button text, dialog title, column header)
- Same status color fix (Valid = red)
- Show SID + Nama in list

### `src/pages/Auth.tsx` — Cleanup
- Remove "Belum punya akun? Daftar" toggle section (lines 116-126)
- Remove signup form entirely (only login)
- Remove `isLogin` state, `fullName` state, `signUp` usage
- Remove description text "Safety Monitoring System — PT Bukit Makmur Mandiri Utama" (line 51-53)
- Change footer: `© 2026 SQE COSMOS - Computer Vision for Mining Operation & Safety`

### `src/components/layout/AppSidebar.tsx` — Branding
- Remove logo image import, replace header with text-only: title "COSMOS", description "Computer Vision for Mining Operation & Safety"

### `supabase/functions/manage-users/index.ts` — Fix invite upsert
- Change `onConflict: "user_id"` to match the new unique constraint (just `user_id`)
- This will work after the DB migration adds the unique constraint on `user_id` alone

## Summary of changes
- 1 DB migration (fix constraint + add camera columns)
- 8 files modified
- No new files created

