

## 8 Perbaikan: Kelola Pekerja & Validasi Supervisor

### 1. Searchable SID di Supervisor (`src/pages/SupervisorValidation.tsx`)
Ganti `Select` revisi SID (baris 493-500) dengan `Popover + Command` persis seperti di OperatorValidation. Import `Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `Check`, `ChevronsUpDown`, `cn`. Tambah state `sidPopoverOpen`.

### 2. Template CSV (`src/pages/Workers.tsx`)
Tambah tombol "Download Template" di samping tombol "Import CSV". Fungsi `downloadTemplate` membuat blob CSV dengan header `sid,nama,jabatan,departemen` dan satu baris contoh, lalu trigger download `template_pekerja.csv`.

### 3. Hapus dropdown Status di Tambah Pekerja
- Ubah `emptyForm` default `is_active: false` (bukan `true`)
- Hapus blok dropdown status (baris 234-243) saat `!editing` (tambah pekerja)
- Di `saveMutation`, saat insert, paksa `is_active: false`
- Saat edit, tetap sembunyikan status juga (poin 7)

### 4. Dropdown Jabatan & Departemen diurutkan abjad
Sort `JABATAN_OPTIONS` dan `DEPT_OPTIONS` secara ascending:
```tsx
const JABATAN_OPTIONS = ['Driver', 'Electrician', 'Helper', 'Mekanik', 'Operator Alat Berat', 'Supervisor Lapangan', 'Welder'];
const DEPT_OPTIONS = ['Engineering', 'HRD', 'Logistik', 'Maintenance', 'Plant', 'Produksi', 'SHE'];
```

### 5. Progress bar import CSV
Tambah state `importProgress` (null | { current, total }). Ubah `handleCSVImport` untuk insert baris satu per satu (atau batch kecil) sambil update progress. Tampilkan `Progress` bar di atas tabel saat import berjalan.

### 6. Validasi form tambah pekerja
Sudah ada: `!form.sid || !form.nama || !form.jabatan || !form.departemen` disabled button.
Tambah:
- SID: maxLength 100, hanya ditampilkan saat `!editing` (sudah ada di memory)
- Nama: maxLength 100
- Tampilkan hint teks di bawah input: "Maks. 100 karakter"
- SID required, Nama required, Jabatan required, Departemen required

### 7. Remove status di Edit Pekerja
Hapus blok dropdown status (baris 234-243) sepenuhnya — baik tambah maupun edit tidak menampilkan dropdown status. Saat edit, jangan kirim `is_active` dalam update (biarkan nilai DB).

### 8. Validasi jabatan & departemen di import CSV
Dalam `handleCSVImport`, setelah parsing setiap baris, cek apakah `jabatan` ada di `JABATAN_OPTIONS` dan `departemen` ada di `DEPT_OPTIONS`. Kumpulkan error per baris. Jika ada error, tampilkan toast dengan detail baris yang gagal (misal "Baris 3: Jabatan tidak terdaftar") dan jangan insert data.

### Files to modify
- `src/pages/Workers.tsx` — poin 2, 3, 4, 5, 6, 7, 8
- `src/pages/SupervisorValidation.tsx` — poin 1

