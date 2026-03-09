

## 6 Perbaikan Detail Alert di Validasi Operator & Supervisor

### 1. Searchable SID dropdown di Operator (Popover + Command)
Ganti `Select` pada "Revisi SID" di OperatorValidation dialog (baris 396-403) dengan komponen Popover + Command (cmdk) agar bisa di-search. Import `Popover`, `Command`, `CommandInput`, `CommandEmpty`, `CommandGroup`, `CommandItem` dari komponen UI yang sudah ada. Tampilkan input pencarian dan daftar pekerja yang bisa difilter.

### 2. Remove dropdown Jenis Pelanggaran, tampilkan di header — Operator
- Hapus field "Jenis Pelanggaran" dari form validasi (baris 405-412)
- Tambahkan info jenis pelanggaran di area header detail (baris 345, di samping Status), mengambil dari `selectedEvent.cameras?.jenis_pelanggaran`
- `jenisPelanggaran` state tetap diset dari camera data (sudah dilakukan di `openEventDialog`), tapi tidak ditampilkan sebagai dropdown

### 3. Tampilkan info validasi setelah simpan — Operator
Saat `getEventStatus(selectedEvent) !== 'BARU'` (sudah tervalidasi), tampilkan section informasi validasi:
- Query `operator-validations` sudah ada tapi hanya select `alert_id, status, validation_level, jenis_pelanggaran`. Perlu tambah field: `alasan_type, alasan_text, supervisor_id, created_at` ke query validations di OperatorValidation.
- Buat `validationMap` menyimpan objek lengkap (bukan hanya status & jenis_pelanggaran)
- Query profiles untuk mendapatkan nama pengguna validator
- Tampilkan: alasan (alasan_type/alasan_text), nama validator, waktu validasi

### 4. Info nama & waktu operator di Supervisor dialog
Di bagian "Validasi Operator" (baris 372-384), tambahkan:
- Nama pengguna operator: dari `profiles` table, lookup `opVal.supervisor_id`
- Waktu validasi: dari `opVal.created_at`
- Query profiles sudah perlu dilakukan (bisa shared)

### 5. Remove dropdown Jenis Pelanggaran — Supervisor
- Hapus field "Jenis Pelanggaran" dari form validasi final (baris 441-448)
- Tambahkan info jenis pelanggaran di header detail (baris 368-369, di samping info lain)
- `jenisPelanggaran` tetap diset dari camera/operator data

### 6. Tampilkan info supervisor setelah simpan final — Supervisor
Saat alert sudah punya `supValidationMap[alert.id]`:
- Sembunyikan form validasi final (baris 427-476)
- Sembunyikan tombol "Simpan Final" (baris 481-484)
- Tampilkan section "Validasi Supervisor" di bawah "Validasi Operator" berisi: waktu validasi, nama validator, status, alasan
- Query profiles untuk nama supervisor

### Perubahan Data Query
**OperatorValidation.tsx**: Ubah query validations (baris 92) dari `select('alert_id, status, validation_level, jenis_pelanggaran')` menjadi `select('*')` agar dapat `supervisor_id`, `created_at`, `alasan_type`, `alasan_text`.

**Kedua file**: Tambah query `profiles` untuk lookup nama validator berdasarkan `supervisor_id`.

### Files to modify
- `src/pages/OperatorValidation.tsx`
- `src/pages/SupervisorValidation.tsx`

