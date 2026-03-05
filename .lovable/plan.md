

## Plan: Hide PPE Matrix for Keluar Zona & Update Wording

### Changes

#### 1. Hide PPE Matrix for "Keluar Zona" cameras (`Simulate.tsx`)
- Line 215-219: Wrap `PpeMatrixDisplay` with a condition to only show when `jenis_pelanggaran !== 'KELUAR_TANPA_IZIN'`

#### 2. Update detection output wording (`Simulate.tsx`)
- Line 414: Replace `"Tidak Ada Izin"` with `"Pekerja Keluar Dari Area Kerja"`

#### 3. Update validation reason labels (`OperatorValidation.tsx` & `SupervisorValidation.tsx`)
- Line 40 in both files: Change `label: 'Tidak Ada Izin'` to `label: 'Pekerja Keluar Dari Area Kerja'`

### Files Changed
- `src/pages/Simulate.tsx` — conditional PPE matrix + updated description
- `src/pages/OperatorValidation.tsx` — updated reason label
- `src/pages/SupervisorValidation.tsx` — updated reason label

