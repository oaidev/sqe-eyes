

## Plan: CSV Import Progress Bar, Form Validations, Remove Status from Edit, CSV Jabatan/Departemen Validation

### Changes to `src/pages/Workers.tsx`

#### 1. CSV Import Progress Bar
- Add state: `csvImporting` (boolean) and `csvProgress` (number 0-100)
- Show a progress bar (using existing `Progress` component) during import
- Steps: parse CSV (30%) → validate (60%) → insert to DB (90%) → done (100%)
- Display progress in a small overlay or inline near the Import CSV button

#### 2. Form Validation Info
- Add helper text under each field in the Add/Edit dialog:
  - **SID**: mandatory, format hint "SID-2024-XXX"
  - **Nama**: mandatory, max 100 characters
  - **Jabatan**: mandatory, must select from dropdown
  - **Departemen**: mandatory, must select from dropdown
- Add `maxLength={100}` to Nama input
- Show character count for Nama field

#### 3. Remove Status Dropdown from Edit Dialog
- Remove the `{editing && ...}` block (lines 242-253) that shows the status dropdown
- Also remove `is_active` from the edit mutation update payload since status is now automated

#### 4. CSV Jabatan & Departemen Validation
- After parsing CSV rows, validate each row's `jabatan` against `JABATAN_OPTIONS` and `departemen` against `DEPT_OPTIONS`
- Collect invalid rows with specific error messages ("Baris X: Jabatan tidak terdaftar" / "Baris X: Departemen tidak terdaftar")
- If any invalid rows exist, show a destructive toast listing the errors and skip the import
- Only proceed with insert if all rows pass validation

### Files Changed
- `src/pages/Workers.tsx` — all 4 changes in this single file

