

## Plan: CSV Import Validation Improvements

### Changes in `src/pages/Workers.tsx`

#### 1. Duplicate SID error — include row number (line 158-160)
When DB insert fails with duplicate key, currently shows generic "SID sudah terdaftar". Since bulk insert doesn't tell us which row, switch to inserting rows one-by-one (or check existing SIDs before insert) to report the exact row. Simpler approach: pre-check existing SIDs against DB before insert and add to `errors[]` with row number.

#### 2. Name length validation in CSV import (after line 127)
Add validation: if `row.nama.length > 100`, push error `Baris X: Nama harus kurang dari 100 karakter`.

#### 3. Standardize error titles for jabatan/departemen validation (lines 136-137)
Change toast title from `` `${errors.length} baris gagal validasi` `` to `"Error Import"` to match the duplicate key error title.

### Implementation Details

**Pre-check SIDs** (before DB insert):
- Query existing SIDs from `workers` table
- Also check for duplicates within the CSV itself
- Add per-row errors like `Baris X: SID sudah terdaftar`

**Name validation** — add after departemen check:
```typescript
if (row.nama.length > 100) {
  errors.push(`Baris ${i + 1}: Nama harus kurang dari 100 karakter`);
  continue;
}
```

**Toast title** — change line 137 from dynamic count to `'Error Import'`.

### Files Changed
- `src/pages/Workers.tsx`

