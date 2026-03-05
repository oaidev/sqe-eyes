

## Plan: 7 Perubahan UI

### 1. Rename "Keluar Tanpa Izin" → "Keluar Zona"
Update label text di semua file. Value enum `KELUAR_TANPA_IZIN` tetap sama (tidak ubah DB), hanya label display yang berubah.

**Files**: `OperatorValidation.tsx`, `SupervisorValidation.tsx`, `Zones.tsx`, `Simulate.tsx`, `Index.tsx`

### 2. Filter Status di Kelola Pekerja
Tambah dropdown filter status (Aktif / Tidak Aktif) di samping filter Departemen yang sudah ada. Update `filtered` logic.

**File**: `Workers.tsx`

### 3. Edit Role → Icon Pensil (tanpa border) di Kelola Pengguna
Ganti `<Button size="sm" variant="outline">` dengan `<Button variant="ghost" size="icon">` + icon `Pencil` (bukan `Shield`). Samakan format dengan tombol aksi di Workers/Zones (ghost, icon-only, tanpa border).

**File**: `Users.tsx`

### 4. Search & Filter Role di Kelola Pengguna
Tambah search input (filter by email & nama) dan dropdown filter role di atas tabel. Filter data secara client-side dari `users` array.

**File**: `Users.tsx`

### 5. Hapus Kolom Status di Kelola Pengguna
Hapus kolom "Status" (email_confirmed_at) dari tabel header dan body.

**File**: `Users.tsx`

### 6. Default Tanggal Hari Ini di Validasi Operator & Supervisor
Ubah `dateFrom` default dari `subDays(new Date(), 30)` menjadi `format(new Date(), 'yyyy-MM-dd')` (hari ini saja).

**Files**: `OperatorValidation.tsx`, `SupervisorValidation.tsx`

### 7. Filter Jenis Pelanggaran di Validasi Operator & Supervisor
Tambah dropdown filter "Jenis Pelanggaran" (Semua / APD Tidak Lengkap / Keluar Zona) di bar filter. Update `filtered` logic untuk match `cameras.jenis_pelanggaran`.

**Files**: `OperatorValidation.tsx`, `SupervisorValidation.tsx`

### Files Changed
- `src/pages/OperatorValidation.tsx`
- `src/pages/SupervisorValidation.tsx`
- `src/pages/Workers.tsx`
- `src/pages/Users.tsx`
- `src/pages/Zones.tsx`
- `src/pages/Simulate.tsx`
- `src/pages/Index.tsx`

