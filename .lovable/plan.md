

# Restructuring Menu & Fitur SQE Eyes

## Ringkasan Perubahan

Ini adalah restructuring besar yang menyederhanakan navigasi dan menggabungkan fitur-fitur yang terkait. Total ada 9 poin perubahan.

## Detail Perubahan

### 1. Kelola Pekerja — Simplify form & list
- Ubah jabatan, departemen menjadi **dropdown** (ambil unique values dari DB + allow custom input)
- Shift dropdown: hanya **day / night** (hapus `rotating`)
- Tambah dropdown **status**: Aktif / Tidak Aktif (set `is_active`)
- Hapus kolom **Enrollment** dari tabel dan badge persentase
- Hapus tombol **Daftarkan Wajah** (icon Camera) dari list
- Sebagai gantinya: jika worker sudah punya face enrollment, tampilkan **thumbnail foto** kecil di kolom nama (clickable untuk lihat full)
- Hapus import `EnrollFaceDialog` (tetap simpan file untuk dipakai di tempat lain jika perlu)
- Update form add/edit: semua field menggunakan dropdown yang konsisten

**File**: `src/pages/Workers.tsx`
**DB Migration**: Update enum `worker_shift` hapus `rotating` (atau biarkan di DB, hanya hide di UI)

### 2. Zona & Kamera — Gabungkan aturan akses + APD
**Level Zona:**
- Hapus badge status Aktif/Nonaktif dari zona
- Tambah field **shift** (dropdown day/night) dengan **waktu mulai** dan **waktu selesai** di form zona (simpan ke `zone_access_rules` atau tambah kolom ke `zones`)
- Hapus referensi `is_active` dari zona di UI

**Level Kamera (tambah APD matrix):**
- Di dialog tambah/edit kamera, tambahkan section **Matrix APD** dengan 5 toggle:
  - Helm (`HEAD_COVER`)
  - Sarung Tangan (`HAND_COVER`)
  - Kacamata Safety (`SAFETY_GLASSES`) — **ganti** dari `FACE_COVER`/Masker
  - Sepatu Safety (`SAFETY_SHOES`)
  - Rompi Reflektif (`REFLECTIVE_VEST`)
- Tambah opsi **per jabatan**: toggle "APD berbeda per jabatan", jika aktif bisa set matrix per jabatan. Jika tidak di-set, pakai APD general.
- Data disimpan ke tabel `zone_ppe_rules` (linked via zone_id dari kamera)

**DB Migration:**
- Rename enum value `FACE_COVER` → `SAFETY_GLASSES` di `ppe_item` enum, atau tambah value baru
- Tambah kolom `shift`, `shift_start`, `shift_end` ke tabel `zones`

**File**: `src/pages/Zones.tsx`

### 3. Hapus Menu Aturan APD
- Hapus route `/ppe-rules` dari `App.tsx`
- Hapus dari sidebar `AppSidebar.tsx`
- Hapus halaman `src/pages/PpeRules.tsx`
- Hapus dari permission matrix

### 4. Hapus Menu Aturan Akses
- Hapus route `/access-rules` dari `App.tsx`
- Hapus dari sidebar `AppSidebar.tsx`
- Hapus halaman `src/pages/AccessRules.tsx`
- Hapus dari permission matrix

### 5. Kelola Role — Master Role Management
- Tambah halaman baru `/roles` di admin section
- UI: List semua role (admin, operator, supervisor)
- Untuk setiap role, bisa set **menu apa saja** yang bisa diakses dan **permission** (view/edit/delete)
- Data disimpan ke tabel baru `role_permissions` dengan kolom: `role`, `page_key`, `can_view`, `can_edit`, `can_delete`
- Permission matrix di `src/lib/permissions.ts` akan membaca dari DB bukan hardcoded
- Atau: tetap hardcoded tapi bisa di-override dari UI admin

**DB Migration:** Create table `role_permissions`
**File baru:** `src/pages/Roles.tsx`

### 6. Simulasi Deteksi → Menu Admin Baru
- Pindahkan dari Live Kamera ke menu terpisah di sidebar admin section
- Buat halaman `/simulate` yang me-render `SimulateCameraDialog` sebagai full page (bukan dialog)
- Hapus tombol "Simulasi Deteksi" dari `LiveCameras.tsx`
- Hapus halaman `LiveCameras.tsx` dan route-nya (karena operator juga tidak perlu Live Kamera)

### 7. Operator — Validasi Operator (mengganti Event, Live Kamera, Inbox Alert)
**Hapus menu:**
- Live Kamera (sudah dipindah simulasi ke admin)
- Inbox Alert
- Event Terkini

**Buat menu baru: Validasi Operator** (`/operator-validation`)
- **Filters:** Date range (default 30 hari), cari SID, status (Baru/Valid/Tidak Valid), tipe pelanggaran (APD/Orang Tidak Dikenal), zona, kamera
- **Summary cards:** Total Event, Total Pelanggaran (sesuai filter date)
- **List columns:** Tanggal & Waktu, Pekerja, Kamera, Tipe (Masuk/Keluar), Zona, Status, Tipe Pelanggaran, Confidence
- **Detail popup:** Semua data list + checklist APD terpenuhi/dilanggar + evidence foto & video (downloadable) + Validasi manual (Valid/Tidak Valid) + Alasan dropdown (APD ga lengkap / Sudah izin / Lainnya → free text)
- **Export Excel** seluruh list
- Hapus field "cek APD manual" dan "komentar" dari supervisor_validations

**File baru:** `src/pages/OperatorValidation.tsx`
**Hapus:** `src/pages/Events.tsx`, `src/pages/LiveCameras.tsx`, `src/pages/Alerts.tsx`

### 8. Supervisor — Validasi Supervisor (Level 2)
- Halaman `/supervisor-validation` — sama layout dengan operator
- **Bedanya:** Hanya tampilkan event yang **sudah dinilai** (status Valid/Tidak Valid oleh operator)
- Bisa **override** validasi operator: ubah status Valid/Tidak Valid + alasan
- Ini adalah level ke-2 validation

**File baru:** `src/pages/SupervisorValidation.tsx`
**Hapus:** `src/pages/Validations.tsx`, `src/pages/ExitPermits.tsx`

### 9. Hapus Role Safety Manager & Menu-nya
- Hapus `safety_manager` dari AppRole type
- Hapus dari permission matrix
- Hapus dari dropdown role di Users page
- Hapus halaman: `Compliance.tsx`, `Violations.tsx`, `Reports.tsx`
- Hapus route dari `App.tsx`
- Hapus dari sidebar

## Struktur Menu Baru

```text
Admin — Konfigurasi
  ├── Kelola Pekerja (/workers)
  ├── Zona & Kamera (/zones)
  ├── Kelola Pengguna (/users)
  ├── Kelola Role (/roles)
  └── Simulasi Deteksi (/simulate)

Operator — Monitoring
  └── Validasi Operator (/operator-validation)

Supervisor
  └── Validasi Supervisor (/supervisor-validation)
```

## DB Migrations Needed
1. Add `shift`, `shift_start`, `shift_end` columns to `zones` table
2. Add `SAFETY_GLASSES` to `ppe_item` enum (replace FACE_COVER usage)
3. Create `role_permissions` table for dynamic role management
4. Update `supervisor_validations` — add `validation_level` column (operator/supervisor), add `alasan_type` enum, remove `apd_manual_check` and `komentar`
5. Update `alert_status` enum to support operator validation flow (BARU → VALID/TIDAK_VALID by operator → overridden by supervisor)

## Files to Delete
- `src/pages/PpeRules.tsx`
- `src/pages/AccessRules.tsx`
- `src/pages/LiveCameras.tsx`
- `src/pages/Events.tsx`
- `src/pages/Alerts.tsx`
- `src/pages/Validations.tsx`
- `src/pages/ExitPermits.tsx`
- `src/pages/Compliance.tsx`
- `src/pages/Violations.tsx`
- `src/pages/Reports.tsx`

## Files to Create
- `src/pages/Roles.tsx`
- `src/pages/Simulate.tsx`
- `src/pages/OperatorValidation.tsx`
- `src/pages/SupervisorValidation.tsx`

## Files to Modify
- `src/pages/Workers.tsx` — simplify form/list
- `src/pages/Zones.tsx` — add shift to zona, APD matrix to kamera
- `src/pages/Users.tsx` — remove safety_manager role option
- `src/App.tsx` — update routes
- `src/components/layout/AppSidebar.tsx` — update menu structure
- `src/lib/permissions.ts` — remove safety_manager, update page keys
- `src/hooks/useAuth.tsx` — remove safety_manager from type
- `src/components/layout/ProtectedRoute.tsx` — no change needed
- `src/pages/Index.tsx` — minor, remove safety_manager references

