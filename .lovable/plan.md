

## Plan: Fix Jenis Pelanggaran — Prioritas Data Kamera, Update Setelah Validasi

### Masalah
`getEventJenisPelanggaran` (Operator) dan `getJenisPelanggaran` (Supervisor) hanya mengecek data validasi (`supervisor_validations`). Event baru yang belum divalidasi tidak punya record, sehingga return `null` → tampil "-".

Logika seharusnya: **default dari kamera** (`e.cameras?.jenis_pelanggaran`), lalu **di-override oleh hasil validasi** jika sudah ada.

### Perubahan

**1. `src/pages/OperatorValidation.tsx`** — line 127-131, ubah `getEventJenisPelanggaran`:
```ts
const getEventJenisPelanggaran = (event: EventRow) => {
  const alert = event.alerts?.[0];
  if (!alert) return event.cameras?.jenis_pelanggaran || null;
  return validationMap[alert.id]?.jenis_pelanggaran || event.cameras?.jenis_pelanggaran || null;
};
```

**2. `src/pages/SupervisorValidation.tsx`** — line 170-177, ubah `getJenisPelanggaran`:
```ts
const getJenisPelanggaran = (e: EventRow) => {
  const alert = e.alerts?.[0];
  if (!alert) return e.cameras?.jenis_pelanggaran || null;
  const sup = supValidationMap[alert.id];
  if (sup?.jenis_pelanggaran) return sup.jenis_pelanggaran;
  const op = opValidationMap[alert.id];
  return op?.jenis_pelanggaran || e.cameras?.jenis_pelanggaran || null;
};
```

Kedua perubahan: default dari kamera, override setelah validasi manual.

