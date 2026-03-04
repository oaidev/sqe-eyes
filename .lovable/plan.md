

# Fix: Dashboard Tally, Dialog Crash, Supervisor Default Status

## 3 Issues Identified

### 1. Dashboard tally tidak cocok
**Penyebab**: "Alert Hari Ini" menghitung dari tabel `alerts` (14), tapi "Valid/Tidak Valid Hari Ini" menghitung dari tabel `supervisor_validations`. Alert yang belum divalidasi tidak terhitung di mana-mana.

**Fix di `src/pages/Index.tsx`**:
- Ganti kartu "Valid Hari Ini" dan "Tidak Valid Hari Ini" menjadi menghitung berdasarkan `alerts` yang sudah punya validasi
- Atau lebih jelas: ubah label menjadi "Sudah Divalidasi" dan "Belum Divalidasi" agar tally dengan Alert Hari Ini
- **Pendekatan**: Query alerts hari ini + join ke supervisor_validations. Hitung: validated = alerts yang punya validasi, unvalidated = alerts - validated. Ini akan tally: Alert = Validated + Unvalidated.

### 2. Dialog crash (Radix Select `value=""`)
**Penyebab**: `<SelectItem value="">Tidak ada revisi</SelectItem>` di kedua file. Radix UI tidak mendukung empty string sebagai value.

**Fix di `OperatorValidation.tsx` (line 360) dan `SupervisorValidation.tsx` (line 380)**:
- Ganti `value=""` → `value="__none__"`
- Init `reviseSid` state ke `'__none__'` (line 66 Operator, line 76 Supervisor)
- Update row onClick: `setReviseSid('__none__')` (line 280, 293)
- Update submit logic: check `reviseSid !== '__none__'` instead of truthy (line 153 Operator, line 174 Supervisor)

### 3. Supervisor "Status Final" menampilkan status operator jika belum divalidasi supervisor
**Penyebab**: `getStatus()` (line 157-164 SupervisorValidation) returns `op?.status` ketika `sup` belum ada, membuat kolom "Status Final" terlihat sudah diisi padahal belum.

**Fix di `SupervisorValidation.tsx`**:
- `getStatus()`: jika tidak ada supervisor validation, return `'BELUM'` bukan fallback ke operator status
- Tambah case di `statusBadge`: `'BELUM'` → `<Badge variant="secondary">Belum</Badge>`

## Files Changed
- `src/pages/Index.tsx` — dashboard tally logic
- `src/pages/OperatorValidation.tsx` — fix `value=""`, reviseSid init
- `src/pages/SupervisorValidation.tsx` — fix `value=""`, reviseSid init, getStatus fallback

