

## Plan: Dashboard Chart Fix, Camera Redesign, Remove Confidence, Validation Logic Update

### 1. Dashboard Chart — Match Cards (Sudah/Belum Divalidasi)

Currently the chart shows "Valid" vs "Tidak Valid" from `supervisor_validations.status`. The cards show "Sudah Divalidasi" (alerts with any validation) vs "Belum Divalidasi" (alerts without).

**Fix**: Change chart to count alerts per day that have/don't have validations, matching the card logic. Query `alerts` grouped by day, cross-reference with `supervisor_validations` to split into "Sudah Divalidasi" and "Belum Divalidasi".

**File**: `src/pages/Index.tsx`

### 2. Remove ALL Confidence Scores from Web

Remove confidence column, rendering, and references from:
- `src/pages/OperatorValidation.tsx` — table column, detail dialog, CSV export, `renderConfidence` function
- `src/pages/SupervisorValidation.tsx` — same
- `src/pages/Simulate.tsx` — confidence badge in results panel
- Remove `confidence` from `DetectionResult` interface in Simulate

### 3. Camera Dialog Redesign (Zones.tsx)

Replace "Tipe" and "Model Deteksi" sections with:
- **Jenis Pelanggaran** dropdown: "APD Tidak Lengkap" or "Keluar Tanpa Izin"
- If "APD Tidak Lengkap" → show APD Matrix (general + per jabatan) below
- If "Keluar Tanpa Izin" → show Waktu Kamera Off below
- Remove `point_type` selector and `detection_models` checkboxes from dialog
- Camera list table: replace "Tipe" column with "Jenis Pelanggaran"

**DB migration**: Add `jenis_pelanggaran` column to `cameras` table to store "APD_TIDAK_LENGKAP" or "KELUAR_TANPA_IZIN". Keep `point_type` for backward compat but derive it from jenis_pelanggaran (KELUAR_TANPA_IZIN → exit, APD_TIDAK_LENGKAP → area).

### 4. Simulation Requires Camera Selection

Add a camera dropdown (mandatory) to the Simulate page. Send `camera_id` with the detection request so the edge function can determine jenis_pelanggaran from camera config and apply zone PPE rules.

**File**: `src/pages/Simulate.tsx` — add camera query + dropdown before capture

### 5. Validation Alasan Logic (Operator + Supervisor)

Change jenis pelanggaran options to only 2: "APD Tidak Lengkap" and "Keluar Tanpa Izin".

Conditional alasan logic based on jenis_pelanggaran + status:
- APD Tidak Lengkap + Valid → ["APD Tidak Lengkap", "Alasan Lainnya"]
- APD Tidak Lengkap + Tidak Valid → ["APD Lengkap", "Alasan Lainnya"]
- Keluar Tanpa Izin + Valid → ["Tidak Ada Izin", "Alasan Lainnya"]
- Keluar Tanpa Izin + Tidak Valid → ["Sudah Ada Izin", "Alasan Lainnya"]

**Files**: `src/pages/OperatorValidation.tsx`, `src/pages/SupervisorValidation.tsx`

### 6. Remove "Tipe" from Validation List & Filters

Remove:
- `filterType` state and "Tipe" filter dropdown
- "Tipe" column from table headers and rows
- "Tipe" from CSV export
- "Tipe" from detail dialog

**Files**: `src/pages/OperatorValidation.tsx`, `src/pages/SupervisorValidation.tsx`

---

### Summary

| Area | Files Changed |
|------|--------------|
| Dashboard chart | `Index.tsx` |
| Remove confidence | `OperatorValidation.tsx`, `SupervisorValidation.tsx`, `Simulate.tsx` |
| Camera redesign | `Zones.tsx` + DB migration (add `jenis_pelanggaran` to cameras) |
| Simulate camera required | `Simulate.tsx` |
| Validation alasan logic | `OperatorValidation.tsx`, `SupervisorValidation.tsx` |
| Remove tipe filter/column | `OperatorValidation.tsx`, `SupervisorValidation.tsx` |

**DB Migration**: `ALTER TABLE cameras ADD COLUMN jenis_pelanggaran text DEFAULT 'APD_TIDAK_LENGKAP';`

