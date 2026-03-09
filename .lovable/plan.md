

## 6 Perbaikan UI pada Kelola Pengguna, Validasi Operator & Supervisor

### 1. Users.tsx — Empty state "Tidak ada data pengguna"
**Baris ~130** (setelah `isLoading`): Tambahkan kondisi `filteredUsers.length === 0` dengan teks "Tidak ada data pengguna" (format sama seperti Workers.tsx — `TableRow` dengan `TableCell colSpan`).

### 2. OperatorValidation.tsx & SupervisorValidation.tsx — Validasi end date ≥ start date
Pada `onChange` handler `dateTo`, tambahkan pengecekan:
```tsx
// Pada setDateTo
const handleDateTo = (val: string) => {
  if (val < dateFrom) {
    toast({ title: 'Tanggal akhir harus sama atau lebih besar dari tanggal awal', variant: 'destructive' });
    return;
  }
  setDateTo(val);
};
```
Juga validasi `dateFrom` agar jika diubah melebihi `dateTo`, reset `dateTo` = `dateFrom`.

### 3. Empty state — Ubah teks menjadi "Tidak ada alert"
- **OperatorValidation.tsx baris 293**: `"Tidak ada event"` → `"Tidak ada alert"`
- **SupervisorValidation.tsx baris 318**: `"Belum ada event yang tervalidasi operator"` → `"Tidak ada alert"`

### 4. Ubah teks "event" → "alert" di UI labels
- **OperatorValidation.tsx**:
  - Baris 231: `"Total Event"` → `"Total Alert"`
  - Baris 320: Dialog title `"Detail Event"` → `"Detail Alert"`
  - Baris 321: Dialog description tetap
- **SupervisorValidation.tsx**:
  - Baris 263: `"Event Tervalidasi"` → `"Alert Tervalidasi"`
  - Baris 347: Dialog title `"Detail & Validasi Final"` → `"Detail Alert & Validasi Final"`

### 5. Operator — Total Pelanggaran = total status VALID pada filter
**Baris 152**: Ubah dari menghitung semua event yang punya alert, menjadi hanya yang statusnya VALID:
```tsx
const totalViolations = filtered.filter(e => {
  const alert = e.alerts?.[0];
  if (!alert) return false;
  return validationMap[alert.id]?.status === 'VALID';
}).length;
```

### 6. Supervisor — Final Supervisor = total VALID + TIDAK VALID pada filter
**Baris 264**: Ubah dari `supervisorValidations.length` (global) menjadi hitungan dari `filtered` yang sudah punya supervisor validation:
```tsx
const finalSupervisorCount = filtered.filter(e => {
  const alert = e.alerts?.[0];
  if (!alert) return false;
  const sup = supValidationMap[alert.id];
  return sup?.status === 'VALID' || sup?.status === 'TIDAK_VALID';
}).length;
```

### Files to modify
- `src/pages/Users.tsx` — empty state
- `src/pages/OperatorValidation.tsx` — date validation, empty text, "event"→"alert", total pelanggaran logic
- `src/pages/SupervisorValidation.tsx` — date validation, empty text, "event"→"alert", final supervisor logic

